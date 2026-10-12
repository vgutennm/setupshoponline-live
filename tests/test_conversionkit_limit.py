"""Exercise the real PHP routes against a temporary database; no provider calls.

Run: python3 tests/test_conversionkit_limit.py
PHP_BINARY may be a shell-quoted PHP CLI command with PDO SQLite enabled.
"""
import base64
import concurrent.futures
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import tempfile
import uuid

ROOT = Path(__file__).resolve().parents[1]
PHP = shlex.split(os.environ.get("PHP_BINARY", "php"))
START = 1791849300  # 2026-10-12 23:55 UTC: the window must cross midnight.

with tempfile.TemporaryDirectory(prefix="conversionkit-limit-", dir=ROOT.parent) as tmp:
    root = Path(tmp)
    app = root / "app"
    app.mkdir()
    for name in ("app.php", "oauth.php", "conversionkit.php", "conversionkit.pdf"):
        shutil.copy2(ROOT / "server" / name, app / name)
    (root / "config.php").write_text("<?php return ['EMAIL_ENABLED'=>false];")
    source = (app / "app.php").read_text()
    source = source.replace("function wb_captcha_verify(", "function original_captcha_verify(")
    start, end = source.index("function wb_http("), source.index("function wb_render(")
    source = source[:start] + "function wb_http(string $url,string $body,array $headers): array {throw new RuntimeException('External HTTP forbidden in tests');}\n" + source[end:]
    (app / "app.php").write_text(source)
    for name in ("app.php", "conversionkit.php"):
        path = app / name
        path.write_text(path.read_text().replace("time()", "test_time()")
                        .replace("header(", "test_header(")
                        .replace("setcookie(", "test_cookie("))
    (root / "run.php").write_text(r'''<?php
$r=json_decode($argv[1],true);
function test_time(): int {return $GLOBALS['r']['now'];}
function test_header(string $value): void {$GLOBALS['headers'][]=$value;}
function test_cookie($name,$value,$options): bool {$GLOBALS['cookies'][$name]=$value;return true;}
function wb_captcha_verify(string $token): ?array {return $token==='test-captcha'?null:[400,['error'=>'CAPTCHA rejected']];}
$_SERVER=['REQUEST_URI'=>'/api/'.($r['resource']??'conversionkit').'/'.($r['action']??'subscribe'),
 'REQUEST_METHOD'=>$r['method']??'POST','CONTENT_TYPE'=>'application/json',
 'HTTP_HOST'=>'setupshoponline.com','HTTP_ORIGIN'=>'https://setupshoponline.com','REMOTE_ADDR'=>$r['ip']??'127.0.0.1'];
$_COOKIE=$r['cookies']??[];$_GET=$r['query']??[];
require __DIR__.'/app/app.php';require __DIR__.'/app/conversionkit.php';
ob_start();register_shutdown_function(static function(){
 $body=ob_get_clean();echo json_encode(['code'=>http_response_code()?:200,'body'=>base64_encode($body),
 'headers'=>$GLOBALS['headers']??[],'cookies'=>$GLOBALS['cookies']??[]]);
});
if(($r['action']??'')==='counts')wb_json(['leads'=>(int)wb_query('SELECT COUNT(*) FROM leads')->fetchColumn(),'jobs'=>(int)wb_query('SELECT COUNT(*) FROM jobs')->fetchColumn()]);
if(($r['action']??'')==='seed'){
 $id=$r['id'];$token=$r['token'];$data=['email'=>$r['email'],'source_page'=>$r['source']??'/conversionkit'];
 wb_query('INSERT INTO leads VALUES(?,?,?,?,?,?)',[$id,'legacy',json_encode($data),hash('sha256',$token),$token,$r['created_at']]);wb_json(['seeded'=>true]);
}
if(isset($r['body']['started_at']))$r['body']['started_at']=(int)round(microtime(true)*1000)-3000;
if(($r['resource']??'conversionkit')==='workbook')wb_dispatch();
ck_dispatch();
''')
    # Keep all production validation; replace only the CLI request-body input.
    path = app / "app.php"
    path.write_text(path.read_text().replace("file_get_contents('php://input', false, null, 0, $limit+1)", "json_encode($GLOBALS['r']['body']??[])") )

    def call(action="subscribe", **kwargs):
        request = {"action": action, "now": START, **kwargs}
        result = subprocess.run(PHP + [str(root / "run.php"), json.dumps(request)], capture_output=True, timeout=30)
        assert result.returncode == 0, result.stderr.decode()
        try:
            response = json.loads(result.stdout)
        except ValueError:
            raise AssertionError((result.stdout[:2000], result.stderr))
        response["raw"] = base64.b64decode(response["body"])
        assert not result.stderr, result.stderr.decode()
        if response["raw"].startswith(b"{"):
            response["json"] = json.loads(response["raw"])
        return response

    def contact(email="owner@example.com", **changes):
        return {"full_name": "Test Owner", "email": email, "phone": "2015550100",
                "submission_id": str(uuid.uuid4()), "started_at": 1,
                "recaptcha_token": "test-captcha", **changes}

    assert call("download", method="GET")["code"] == 403
    first = contact()
    invalid = call(body={**first, "recaptcha_token": "invalid"})
    assert invalid["code"] == 400
    assert call("counts")["json"] == {"leads": 0, "jobs": 0}
    accepted = call(body=first)
    assert accepted["code"] == 200, accepted
    cookie = accepted["cookies"]
    retry = call(body={**first, "recaptcha_token": ""})
    assert retry["code"] == 200 and retry["cookies"] == cookie
    assert call(body={**first, "full_name": "Different Name"})["code"] == 409
    assert call("counts")["json"] == {"leads": 1, "jobs": 2}

    blocked = call(body=contact("  OWNER@EXAMPLE.COM  ", full_name="Another Name", phone="2015550101"), ip="192.0.2.2", now=START+600)
    assert blocked["code"] == 429, blocked
    assert blocked["json"]["retryAfter"] == 86400-600
    assert "Retry-After: 85800" in blocked["headers"]
    assert "existing PDF" in blocked["json"]["error"]
    assert call("counts")["json"] == {"leads": 1, "jobs": 2}
    assert call(body=contact(), now=START+86399)["json"]["retryAfter"] == 1

    # Both kinds of download and token restoration remain usable after a rejection.
    expected_pdf = (app / "conversionkit.pdf").read_bytes()
    for query in ({}, {"download": "1"}, {}):
        download = call("download", method="GET", cookies=cookie, query=query)
        assert download["code"] == 200 and download["raw"] == expected_pdf
    assert call("download", method="HEAD", cookies=cookie)["raw"] == b""
    assert call("access", body={"token": cookie["conversionkit_access"]})["code"] == 200
    assert call("session", method="GET", cookies=cookie)["json"]["ready"] is True
    assert call("counts")["json"] == {"leads": 1, "jobs": 2}

    # A different email is independent. The original email can request again at exactly 24 hours.
    assert call(body=contact("another@example.com"))["code"] == 200
    renewed = call(body=contact(), now=START+86400)
    assert renewed["code"] == 200
    assert renewed["cookies"] != cookie
    assert call(body=contact(), now=START+86401)["json"]["retryAfter"] == 86399

    # Historical records are the source of truth; no new tracking table or backfill is needed.
    call("seed", id=str(uuid.uuid4()), token="a"*64, email="Legacy@Example.com", created_at=START-23*3600)
    legacy = call(body=contact("legacy@example.com"))
    assert legacy["code"] == 429 and legacy["json"]["retryAfter"] == 3600
    call("seed", id=str(uuid.uuid4()), token="b"*64, email="expired@example.com", created_at=START-86400)
    assert call(body=contact("expired@example.com"))["code"] == 200

    # Workbook submissions do not trigger this new kit-only rule, nor vice versa.
    workbook = call(resource="workbook", body=contact("workbook@example.com"))
    assert workbook["code"] == 200
    assert call(body=contact("workbook@example.com"))["code"] == 200
    assert call(resource="workbook", body=contact("workbook@example.com"))["code"] == 200
    assert call("download", method="GET", cookies={"conversionkit_access": workbook["cookies"]["workbook_access"]})["code"] == 403

    # Separate PHP processes exercise SQLite locking as cPanel workers would.
    before = call("counts")["json"]
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: call(body=contact("race@example.com"), ip="192.0.2.10", now=START+172800), range(2)))
    assert sorted(r["code"] for r in results) == [200, 429], results
    after = call("counts")["json"]
    assert after == {"leads": before["leads"]+1, "jobs": before["jobs"]+2}
    print("PASS: rolling 24-hour kit request limit, case/space normalization, historical records, midnight and expiry boundaries, idempotent retries, simultaneous requests, no duplicate leads/emails, independent emails, workbook behavior, and repeat PDF access.")
