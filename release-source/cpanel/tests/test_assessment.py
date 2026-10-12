"""Exercise the native PHP backend in a temporary copy; never contact providers."""
import os,json,tempfile,subprocess,shutil,time,uuid,base64
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
PHP=[os.environ.get('PHP_BINARY','php')]
if os.environ.get('PHP_EXTENSION_DIR'):
 PHP+=['-n','-d','extension_dir='+os.environ['PHP_EXTENSION_DIR']]
 for ext in ['pdo','pdo_sqlite','sqlite3','curl','iconv']:PHP+=['-d','extension='+ext+'.so']
with tempfile.TemporaryDirectory(prefix='native-assessment-') as tmp:
 root=Path(tmp);app=root/'app';shutil.copytree(ROOT/'cpanel/server',app)
 (root/'config.php').write_text("<?php return ['RECAPTCHA_SITE_KEY'=>'test','RECAPTCHA_SECRET_KEY'=>'test'];")
 (root/'assessment-config.php').write_text("<?php return ['OPENAI_API_KEY'=>'fake-test-only'];")
 fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {sampleReport} from './scripts/growth-sample.mjs';console.log(JSON.stringify(sampleReport))"],cwd=ROOT))
 # Keep genuine schema validation. Map fixture citations to this questionnaire.
 for f in fixture['findings']:f['evidence_ids']=['Q1']
 (root/'report.json').write_text(json.dumps(fixture))
 s=(app/'app.php').read_text();a=s.index('function wb_enabled()');b=s.index('function wb_db()',a);s=s[:a]+"function wb_enabled(): bool {return true;}\n"+s[b:]
 s=s.replace("http_response_code($code); header('Content-Type: application/json'); echo json_encode($data, JSON_UNESCAPED_SLASHES); exit;", "echo json_encode(['code'=>$code,'data'=>$data,'cookies'=>$GLOBALS['cookies']??[]]);exit;")
 s=s.replace("file_get_contents('php://input', false, null, 0, $limit+1)","json_encode($GLOBALS['request']['body']??[])")
 a=s.index('function wb_http(');b=s.index('function wb_render(',a)
 s=s[:a]+'''function wb_http(string $url,string $body,array $headers): array {
 if($url==='https://www.google.com/recaptcha/api/siteverify')return [200,json_encode(['success'=>($GLOBALS['request']['captcha']??true),'hostname'=>'setupshoponline.com','challenge_ts'=>gmdate('c')])];
 if($url==='https://graph.microsoft.com/v1.0/me/sendMail'){file_put_contents(dirname(__DIR__).'/sent.jsonl',$body."\\n",FILE_APPEND);return [$GLOBALS['request']['mail_code']??202,''];}
 throw new RuntimeException('Unexpected external request');
}
''' +s[b:];(app/'app.php').write_text(s)
 # Replace OAuth in the temporary harness only.
 (app/'oauth.php').write_text("<?php function wb_access_token(): string {return 'test-token';}")
 s=(app/'assessment.php').read_text();a=s.index('function as_ai(');b=s.index('function as_payload(',a)
 s=s[:a]+'''function as_ai(string $method,string $path,?array $payload=null): array {
 if($method==='POST'){file_put_contents(dirname(__DIR__).'/ai.jsonl',json_encode($payload)."\\n",FILE_APPEND);if($GLOBALS['request']['timeout']??false)throw new RuntimeException('Simulated timeout');return [200,['id'=>'resp_'.(($payload['text']['format']['name']==='assessment_quality_review')?'review':'report')]];}
 $v=str_contains($path,'review')?['approved'=>!($GLOBALS['request']['reject']??false),'issues'=>($GLOBALS['request']['reject']??false)?['Unsupported conclusion']:[]]:json_decode(file_get_contents(dirname(__DIR__).'/report.json'),true);
 return [200,['status'=>'completed','output'=>[['type'=>'message','content'=>[['type'=>'output_text','text'=>json_encode($v)]]]]]];
}
''' +s[b:]
 s=s.replace('setcookie(', 'as_test_cookie(')
 (app/'assessment.php').write_text(s)
 (root/'run.php').write_text('''<?php
 $GLOBALS['request']=json_decode(stream_get_contents(STDIN),true);$r=$GLOBALS['request'];
 $_SERVER=['REQUEST_URI'=>'/api/'.($r['kind']??'agentic').'/'.$r['action'],'REQUEST_METHOD'=>$r['method']??(isset($r['body'])?'POST':'GET'),'CONTENT_TYPE'=>'application/json','HTTP_HOST'=>'setupshoponline.com','HTTP_ORIGIN'=>$r['origin']??'https://setupshoponline.com','REMOTE_ADDR'=>'127.0.0.1'];$_COOKIE=$r['cookies']??[];
 function as_test_cookie($name,$value,$options){$GLOBALS['cookies'][$name]=$value;return true;}
 require __DIR__.'/app/app.php';require __DIR__.'/app/assessment.php';as_init();
 if(($r['reset_poll']??false))wb_query('UPDATE local_assessments SET last_poll=0');
 if(($r['expire']??false))wb_query('UPDATE local_assessments SET expires_at=0');
 if($r['action']==='mail'){as_mail();wb_json(['sent'=>true]);}
 as_dispatch($r['kind']??'agentic');
 ''')
 cookies={}
 def call(action,body=None,**kw):
  v=dict(action=action,cookies=cookies,**kw)
  if body is not None:v['body']=body
  p=subprocess.run(PHP+[str(root/'run.php')],input=json.dumps(v),text=True,capture_output=True)
  assert p.returncode==0,(p.stdout,p.stderr)
  try:r=json.loads(p.stdout)
  except Exception:raise AssertionError((p.stdout,p.stderr))
  cookies.update(r.get('cookies',{}));return r
 c=call('config');assert c['code']==200 and c['data']['preview'] is False and len(c['data']['categories'])==1
 assert call('download')['code']==401
 contact=dict(full_name='Test Owner',email='owner@example.com',phone='2015550100',business_name='Test Business',submission_id=str(uuid.uuid4()),started_at=int(time.time()*1000)-3000,recaptcha_token='test')
 assert call('start',contact,origin='https://evil.example')['code']==403
 assert call('start',contact,captcha=False)['code']==400
 assert call('start',{**contact,'email':'bad'})['code']==400
 r=call('start',contact);assert r['code']==200,r;session=r['data']['session'];qs=r['data']['questions'];assert len(qs)==10 and session['category']=='agentic-readiness'
 assert call('start',contact)['data']['session']['id']==session['id']
 assert call('session',kind='growth')['data']['session'] is None
 assert call('category',{'category':'profitability'})['code']==400
 assert call('generate',{})['code']==400
 answers={q['id']:('A sample answer for this workflow.' if q['type']=='text' else q['options'][0] if q['type']=='single' else [q['options'][0]]) for q in qs}
 assert call('answers',{'answers':{**answers,'G5':'INVALID'},'step':10})['code']==400
 assert call('answers',{'answers':answers,'step':10})['code']==200
 assert call('session')['data']['session']['answers']==answers
 assert call('generate',{})['data']['session']['status']=='analyzing'
 assert call('answers',{'answers':answers,'step':10})['code']==409
 assert call('download')['code']==409
 r=call('status',reset_poll=True);assert r['data']['session']['status']=='reviewing',r
 r=call('status',reset_poll=True);assert r['data']['session']['status']=='ready',r
 # PDF is generated from the same validated content, outside the HTTP response harness.
 code="require '"+str(app/ 'app.php')+"'; require '"+str(app/'assessment.php')+"';as_init();echo as_report_pdf(as_get('"+session['id']+"'));"
 pdf=subprocess.check_output(PHP+['-r',code]);assert pdf.startswith(b'%PDF-1.4') and b'Your Agentic Readiness Report' in pdf
 Path('/workspace/scratch/8687fed32f36/native-assessment-sample.pdf').write_bytes(pdf)
 for payload in [json.loads(x) for x in (root/'ai.jsonl').read_text().splitlines()]:
  assert contact['email'] not in json.dumps(payload) and contact['phone'] not in json.dumps(payload) and contact['full_name'] not in json.dumps(payload)
 assert call('mail')['code']==200
 messages=[json.loads(x)['message'] for x in (root/'sent.jsonl').read_text().splitlines()]
 assert len(messages)==2
 assert {m['toRecipients'][0]['emailAddress']['address'] for m in messages}=={contact['email'],'vlad@setupshoponline.com'}
 assert all(base64.b64decode(m['attachments'][0]['contentBytes'])==pdf for m in messages)
 assert call('mail')['code']==200 and len((root/'sent.jsonl').read_text().splitlines())==2
 assert call('new',{})['code']==200
 assert call('answers',{'answers':answers,'step':10})['code']==200
 assert call('generate',{})['code']==429
 assert call('session',expire=True)['data']['session'] is None
 assert call('download')['code']==401
 print('PASS: native PHP config, CAPTCHA, origin checks, category/session isolation, saved answers, report and review lifecycle, PDF, email attachments, idempotency, daily limit, expired sessions, and contact exclusion from AI payloads. No external requests or emails.')
