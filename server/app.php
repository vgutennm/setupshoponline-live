<?php
declare(strict_types=1);
// All configuration, lead records and email jobs live outside public_html.
const WB_SENDER = 'vlad@setupshoponline.com';
const WB_FILENAME = 'More_Clients_Less_Busywork_Workbook_Simple.pdf';
function wb_config(): array {
    static $config;
    if ($config !== null) return $config;
    $file = dirname(__DIR__) . '/config.php';
    $config = is_file($file) ? require $file : [];
    if (!is_array($config)) throw new RuntimeException('Invalid configuration');
    return $config;
}
function wb_enabled(): bool {
    $c = wb_config();
    return ($c['EMAIL_ENABLED'] ?? false) === true && !empty($c['M365_TENANT_ID']) && !empty($c['M365_CLIENT_ID']) && !empty($c['M365_CLIENT_SECRET']) && function_exists('curl_init');
}
function wb_db(): PDO {
    static $db;
    if ($db) return $db;
    umask(0077);
    $dir = dirname(__DIR__) . '/data';
    if (!is_dir($dir) && !mkdir($dir, 0700, true)) throw new RuntimeException('Storage unavailable');
    $db = new PDO('sqlite:' . $dir . '/workbook.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $db->exec('PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
    $db->exec('CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, request_hash TEXT NOT NULL, data TEXT NOT NULL, download_hash TEXT NOT NULL UNIQUE, download_token TEXT NOT NULL, created_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(id), kind TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0, lock_until INTEGER NOT NULL DEFAULT 0, error_code TEXT, provider_id TEXT); CREATE INDEX IF NOT EXISTS jobs_due ON jobs(status,next_attempt); CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);');
    return $db;
}
function wb_query(string $sql, array $params = []): PDOStatement {
    $q = wb_db()->prepare($sql); $q->execute($params); return $q;
}
function wb_json(array $data, int $code = 200): void {
    http_response_code($code); header('Content-Type: application/json'); echo json_encode($data, JSON_UNESCAPED_SLASHES); exit;
}
function wb_cookie(string $token): void {
    setcookie('workbook_access', $token, ['expires' => time()+31536000, 'path'=>'/', 'secure'=>true, 'httponly'=>true, 'samesite'=>'Lax']);
}
function wb_body(int $limit = 8192): array {
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) wb_json(['error'=>'Please submit the form again.'],415);
    $raw = file_get_contents('php://input', false, null, 0, $limit+1);
    if (strlen($raw) > $limit) wb_json(['error'=>'Request is too large.'],413);
    $data = json_decode($raw, true);
    if (!is_array($data)) wb_json(['error'=>'Please check your form.'],400);
    return $data;
}
function wb_origin(): void {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if (!in_array($host,['setupshoponline.com','www.setupshoponline.com'],true) || ($_SERVER['HTTP_ORIGIN'] ?? '') !== 'https://'.$host) wb_json(['error'=>'Please submit this form from our website.'],403);
}
function wb_lead(): ?array {
    $token = $_COOKIE['workbook_access'] ?? '';
    if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/D',$token)) return null;
    return wb_query('SELECT * FROM leads WHERE download_hash=?',[hash('sha256',$token)])->fetch() ?: null;
}
function wb_rate(string $key, int $limit, int $seconds): bool {
    $bucket = intdiv(time(),$seconds); $key .= ':'.$bucket;
    wb_query('INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',[$key,($bucket+1)*$seconds]);
    return (int)wb_query('SELECT count FROM rate_limits WHERE key=?',[$key])->fetchColumn() <= $limit;
}
function wb_subscribe(array $d): array {
    $now = (int)round(microtime(true)*1000);
    if (!empty($d['website']) || !is_numeric($d['started_at'] ?? null) || $now-$d['started_at'] < 1200 || $now-$d['started_at'] > 86400000) return [400,['error'=>'Please wait a moment and submit again.']];
    $str = static fn($k) => is_string($d[$k] ?? null) ? trim($d[$k]) : '';
    $name=$str('full_name'); $email=strtolower($str('email')); $phone=$str('phone'); $id=$str('submission_id'); $fields=[];
    if (($d['human_confirmed'] ?? false) !== true) $fields['human_confirmed']='Please confirm that you are human.';
    if (strlen($name)<2 || strlen($name)>120 || preg_match('/[\x00-\x1f\x7f]/',$name)) $fields['full_name']='Please enter your full name.';
    if (strlen($email)>254 || !filter_var($email,FILTER_VALIDATE_EMAIL)) $fields['email']='Please enter a valid email address.';
    $digits=preg_replace('/\D/','',$phone);
    if (strlen($phone)>40 || !preg_match('/^[+0-9 ().-]+$/D',$phone) || strlen($digits)<7 || strlen($digits)>15) $fields['phone']='Please enter a phone number with 7–15 digits.';
    if ($fields) return [400,['error'=>'Please check the highlighted fields.','fields'=>$fields]];
    if (!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iD',$id)) return [400,['error'=>'Please refresh the form and try again.']];
    $requestHash=hash('sha256',json_encode([$name,$email,$phone]));
    $db=wb_db(); $db->exec('BEGIN IMMEDIATE');
    try {
        $old=wb_query('SELECT * FROM leads WHERE id=?',[$id])->fetch();
        if ($old) {
            $db->exec('COMMIT');
            if (!hash_equals($old['request_hash'],$requestHash)) return [409,['error'=>'Please refresh the form before changing your details.']];
            return [200,['saved'=>true],$old['download_token']];
        }
        $ip=hash('sha256',gmdate('Y-m-d').':'.($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
        if (!wb_rate('ip:'.$ip,8,3600) || !wb_rate('email:'.hash('sha256',$email),3,86400)) {
            $db->exec('COMMIT'); return [429,['error'=>'Too many requests. Please try again later.']];
        }
        $campaign=[];
        foreach (['utm_source','utm_medium','utm_campaign','utm_content','utm_term'] as $key) if (is_string($d['campaign'][$key] ?? null)) $campaign[$key]=substr(preg_replace('/[\x00-\x1f\x7f]/','',$d['campaign'][$key]),0,200);
        $tz=$str('timezone'); try {new DateTimeZone($tz);} catch (Throwable $e) {$tz='UTC';}
        $lead=['id'=>$id,'full_name'=>$name,'first_name'=>preg_split('/\s+/',$name)[0],'email'=>$email,'phone'=>$phone,'submitted_at'=>gmdate('c'),'timezone'=>$tz,'source_page'=>'/free-workbook','campaign'=>$campaign,'consent_version'=>'workbook-2026-09-28'];
        $token=bin2hex(random_bytes(32));
        wb_query('INSERT INTO leads VALUES(?,?,?,?,?,?)',[$id,$requestHash,json_encode($lead),hash('sha256',$token),$token,time()]);
        $status=wb_enabled()?'pending':'not_configured';
        foreach (['subscriber','notification'] as $kind) wb_query('INSERT INTO jobs(id,lead_id,kind,status) VALUES(?,?,?,?)',[$id.'-'.$kind,$id,$kind,$status]);
        wb_query('DELETE FROM rate_limits WHERE expires_at<?',[time()]);
        $db->exec('COMMIT'); return [200,['saved'=>true,'email_status'=>$status],$token];
    } catch (Throwable $e) { $db->exec('ROLLBACK'); throw $e; }
}
function wb_http(string $url, string $body, array $headers): array {
    $ch=curl_init($url);
    curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$body,CURLOPT_HTTPHEADER=>$headers,CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>5,CURLOPT_TIMEOUT=>15,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS]);
    $result=curl_exec($ch); $code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE); curl_close($ch);
    return [$code,$result===false?'':$result];
}
function wb_render(string $template, array $values, bool $html): string {
    return preg_replace_callback('/{{(\w+)}}/', static function($m) use ($values,$html) {
        $s=(string)($values[$m[1]] ?? ''); return $html?htmlspecialchars($s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8'):$s;
    },$template);
}
function wb_message(array $job, array $row): array {
    $lead=json_decode($row['data'],true); $kind=$job['kind'];
    $status=wb_query('SELECT status FROM jobs WHERE id=?',[$lead['id'].'-subscriber'])->fetchColumn();
    $values=array_merge($lead,$lead['campaign'],['download_url'=>'https://setupshoponline.com/workbook-access#'.$row['download_token'],'submitted_at_with_timezone'=>$lead['submitted_at'].'; visitor timezone: '.$lead['timezone'],'submission_id'=>$lead['id'],'delivery_status'=>$status]);
    $base=$kind==='subscriber'?'subscriber-email':'lead-notification-email';
    $html=wb_render(file_get_contents(__DIR__.'/templates/'.$base.'.html'),$values,true);
    $text=file_get_contents(__DIR__.'/templates/'.$base.'.txt'); $text=wb_render(substr($text,strpos($text,"\n\n")+2),$values,false);
    $boundary='wb_'.str_replace('-','',$job['id']); $alt=$boundary.'_alt';
    $subject=$kind==='subscriber'?'Your More Clients. Less Busywork. workbook is here':'New workbook lead: '.$lead['full_name'];
    $enc=static fn($s)=>rtrim(chunk_split(base64_encode($s),76,"\r\n"));
    $lines=['From: Vlad Gutenmakher <'.WB_SENDER.'>','To: '.($kind==='subscriber'?$lead['email']:WB_SENDER),'Reply-To: '.($kind==='subscriber'?WB_SENDER:$lead['email']),'Subject: =?UTF-8?B?'.base64_encode($subject).'?=','Message-ID: <'.$job['id'].'@setupshoponline.com>','MIME-Version: 1.0','Content-Type: multipart/mixed; boundary="'.$boundary.'"','','--'.$boundary,'Content-Type: multipart/alternative; boundary="'.$alt.'"','','--'.$alt,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',$enc($text),'--'.$alt,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',$enc($html),'--'.$alt.'--'];
    if ($kind==='subscriber') array_push($lines,'--'.$boundary,'Content-Type: application/pdf; name="'.WB_FILENAME.'"','Content-Transfer-Encoding: base64','Content-Disposition: attachment; filename="'.WB_FILENAME.'"','',$enc(file_get_contents(__DIR__.'/workbook.pdf')));
    array_push($lines,'--'.$boundary.'--','');
    return ['mime'=>base64_encode(implode("\r\n",$lines))];
}
function wb_process(int $limit=4): void {
    if (!wb_enabled()) return;
    wb_query("UPDATE jobs SET status='manual_review', error_code='interrupted_send' WHERE status='sending' AND lock_until<=?",[time()]);
    $jobs=wb_query("SELECT * FROM jobs WHERE status IN ('pending','not_configured','retry') AND next_attempt<=? ORDER BY CASE kind WHEN 'subscriber' THEN 0 ELSE 1 END,id LIMIT ".max(1,min(10,$limit)),[time()])->fetchAll();
    foreach ($jobs as $job) {
        $lock=wb_query("UPDATE jobs SET status='sending',attempts=attempts+1,lock_until=? WHERE id=? AND status IN ('pending','not_configured','retry') AND next_attempt<=?",[time()+120,$job['id'],time()]);
        if (!$lock->rowCount()) continue;
        $status='manual_review'; $error='send_unconfirmed'; $delay=3600;
        try {
            $c=wb_config();
            [$code,$body]=wb_http('https://login.microsoftonline.com/'.rawurlencode($c['M365_TENANT_ID']).'/oauth2/v2.0/token',http_build_query(['client_id'=>$c['M365_CLIENT_ID'],'client_secret'=>$c['M365_CLIENT_SECRET'],'scope'=>'https://graph.microsoft.com/.default','grant_type'=>'client_credentials']),['Content-Type: application/x-www-form-urlencoded']);
            $token=json_decode($body,true)['access_token'] ?? null;
            if ($code!==200 || !$token) {$status='retry';$error='m365_auth_'.$code;}
            else {
                $row=wb_query('SELECT * FROM leads WHERE id=?',[$job['lead_id']])->fetch();
                $msg=wb_message($job,$row);
                [$code]=wb_http('https://graph.microsoft.com/v1.0/users/vlad%40setupshoponline.com/sendMail',$msg['mime'],['Authorization: Bearer '.$token,'Content-Type: text/plain']);
                if ($code===202) {$status='accepted';$error=null;}
                elseif (in_array($code,[401,403,429],true)) {$status='retry';$error='m365_'.$code;}
                elseif ($code>=400 && $code<500 && $code!==408) {$status='failed';$error='m365_'.$code;}
            }
        } catch (Throwable $e) { /* Never log credentials, tokens or message bodies. */ }
        wb_query('UPDATE jobs SET status=?,error_code=?,next_attempt=?,lock_until=0 WHERE id=?',[$status,$error,time()+$delay,$job['id']]);
    }
}
function wb_dispatch(): void {
    header('Cache-Control: private, no-store'); header('X-Content-Type-Options: nosniff'); header('Referrer-Policy: no-referrer');
    try {
        $path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH); $method=$_SERVER['REQUEST_METHOD'];
        if ($path==='/api/workbook/config' && $method==='GET') wb_json(['emailEnabled'=>wb_enabled()]);
        if ($path==='/api/workbook/subscribe' && $method==='POST') {
            wb_origin(); $r=wb_subscribe(wb_body()); if (isset($r[2])) wb_cookie($r[2]);
            if ($r[0]===200 && wb_enabled()) register_shutdown_function(static function() { if(function_exists('fastcgi_finish_request')) fastcgi_finish_request(); wb_process(2); });
            wb_json($r[1],$r[0]);
        }
        if ($path==='/api/workbook/access' && $method==='POST') {
            wb_origin(); $d=wb_body(200); $t=$d['token'] ?? '';
            if (!is_string($t) || !preg_match('/^[a-f0-9]{64}$/D',$t) || !wb_query('SELECT id FROM leads WHERE download_hash=?',[hash('sha256',$t)])->fetch()) wb_json(['error'=>'Invalid download link. Please request the workbook again.'],403);
            wb_cookie($t); wb_json(['ready'=>true]);
        }
        if ($path==='/api/workbook/session' && $method==='GET') {
            $lead=wb_lead(); if (!$lead) wb_json(['ready'=>false]);
            wb_json(['ready'=>true,'email_status'=>wb_query('SELECT status FROM jobs WHERE id=?',[$lead['id'].'-subscriber'])->fetchColumn()]);
        }
        if ($path==='/api/workbook/download' && in_array($method,['GET','HEAD'],true)) {
            if (!wb_lead()) wb_json(['error'=>'Please request the workbook through the form first.'],403);
            header('Content-Type: application/pdf'); header('Content-Disposition: attachment; filename="'.WB_FILENAME.'"'); header('Content-Length: '.filesize(__DIR__.'/workbook.pdf'));
            if ($method==='GET') readfile(__DIR__.'/workbook.pdf'); exit;
        }
        wb_json(['error'=>'Not found.'],404);
    } catch (Throwable $e) { wb_json(['error'=>'We could not save or retrieve your workbook. Please try again shortly.'],503); }
}
