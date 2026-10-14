<?php
declare(strict_types=1);
// Native cPanel backend. No requests to the Sites preview; no visitor cookies leave this server.
require_once __DIR__.'/assessment-report.php';
function as_config(): array { $p=defined('AS_CONFIG_PATH')?AS_CONFIG_PATH:dirname(__DIR__).'/assessment-config.php';return is_file($p)?(require $p):[]; }
function as_definition(): array { static $v;return $v??=json_decode(file_get_contents(__DIR__.'/assessment-definition.json'),true,512,JSON_THROW_ON_ERROR); }
function as_init(): void {
 wb_db()->exec("CREATE TABLE IF NOT EXISTS local_assessments(id TEXT PRIMARY KEY,kind TEXT NOT NULL,session_hash TEXT NOT NULL UNIQUE,expires_at INTEGER NOT NULL,contact_json TEXT NOT NULL,category TEXT NOT NULL,answers_json TEXT NOT NULL DEFAULT '{}',step INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'draft',response_id TEXT,report_json TEXT,review_json TEXT,error_code TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,submitted_at INTEGER,last_poll INTEGER NOT NULL DEFAULT 0); CREATE INDEX IF NOT EXISTS local_assessment_pending ON local_assessments(status,last_poll); CREATE TABLE IF NOT EXISTS local_assessment_mail(id TEXT PRIMARY KEY,assessment_id TEXT NOT NULL,kind TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',updated_at INTEGER NOT NULL,error_code TEXT);");
}
function as_get(string $id): ?array {return wb_query('SELECT * FROM local_assessments WHERE id=?',[$id])->fetch()?:null;}
function as_questions(string $category): array {return as_definition()['questions'][$category]??[];}
function as_session(string $kind): ?array {
 $t=$_COOKIE[$kind.'_access']??'';if(!is_string($t)||!preg_match('/^[a-f0-9]{64}$/D',$t))return null;
 return wb_query('SELECT * FROM local_assessments WHERE kind=? AND session_hash=? AND expires_at>?',[$kind,hash('sha256',$t),time()])->fetch()?:null;
}
function as_view(array $r): array {return ['id'=>$r['id'],'category'=>$r['category'],'contact'=>json_decode($r['contact_json'],true),'answers'=>json_decode($r['answers_json']),'step'=>(int)$r['step'],'status'=>$r['status'],'report'=>$r['status']==='ready'?json_decode($r['report_json'],true):null,'errorCode'=>$r['error_code'],'methodologyVersion'=>as_definition()['methodology'],'createdAt'=>gmdate('c',(int)$r['created_at'])];}
function as_error(string $message,int $code=400): void {wb_json(['error'=>$message],$code);}
function as_answers(array $input,string $category,bool $complete=false): array {
 if(!as_questions($category))throw new InvalidArgumentException('Please choose a category.');$out=[];
 foreach(as_questions($category) as $q){$v=$input[$q['id']]??null;if($v===null||$v===''||$v===[]){if($complete)throw new InvalidArgumentException('Please answer: '.$q['text']);continue;}
  if($q['type']==='text'){if(!is_string($v)||strlen(trim($v))<3||preg_match_all('/./us',$v)>$q['max']||preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/',$v))throw new InvalidArgumentException('Please check: '.$q['text']);$v=trim($v);}
  elseif($q['type']==='single'){if(!is_string($v)||!in_array($v,$q['options'],true))throw new InvalidArgumentException('Please check: '.$q['text']);}
  else {if(!is_array($v)||!array_is_list($v)||count($v)>$q['max'])throw new InvalidArgumentException('Please check: '.$q['text']);foreach($v as $x)if(!is_string($x)||!in_array($x,$q['options'],true))throw new InvalidArgumentException('Please check: '.$q['text']);if(count(array_unique($v))!==count($v))throw new InvalidArgumentException('Please check duplicate choices.');if(count($v)>1&&array_intersect($v,['None','None of these','Not sure','No inquiries yet']))throw new InvalidArgumentException('Choose an unknown or none answer on its own.');}
  $out[$q['id']]=$v;
 }return $out;
}
function as_schema($v,array $s): bool {
 switch($s['type']){
  case 'object':if(!is_array($v))return false;foreach($s['required']??[] as $k)if(!array_key_exists($k,$v))return false;foreach($v as $k=>$x){if(!isset($s['properties'][$k]))return false;if(!as_schema($x,$s['properties'][$k]))return false;}return true;
  case 'array':if(!is_array($v)||!array_is_list($v)||count($v)<($s['minItems']??0)||count($v)>($s['maxItems']??100))return false;foreach($v as $x)if(!as_schema($x,$s['items']))return false;return true;
  case 'string':return is_string($v)&&strlen($v)<=12000&&(!isset($s['enum'])||in_array($v,$s['enum'],true));
  case 'boolean':return is_bool($v);
 }return false;
}
function as_ai(string $method,string $path,?array $payload=null): array {
 if(!preg_match('#^/responses(?:/resp_[a-zA-Z0-9_-]+)?$#D',$path))throw new RuntimeException('Invalid AI operation');
 $c=as_config();if(empty($c['OPENAI_API_KEY']))throw new RuntimeException('AI configuration missing');
 $ch=curl_init('https://api.openai.com/v1'.$path);
 curl_setopt_array($ch,[CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$c['OPENAI_API_KEY'],'Content-Type: application/json'],CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>8,CURLOPT_TIMEOUT=>30,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2]);
 if($payload!==null)curl_setopt($ch,CURLOPT_POSTFIELDS,json_encode($payload,JSON_THROW_ON_ERROR));
 $raw=curl_exec($ch);$code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
 if($raw===false||$code===0)throw new RuntimeException('AI request unconfirmed');
 return [$code,json_decode($raw,true)];
}
function as_payload(array $row, bool $review=false): array {
 $d=as_definition();$answers=json_decode($row['answers_json'],true);$qs=as_questions($row['category']);$c=as_config();
 // Only questionnaire content is sent to OpenAI. Contact fields and browser/session tokens are excluded.
 $input=$review?['questions'=>$qs,'answers'=>$answers,'report'=>json_decode($row['report_json'],true)]:['category'=>$row['category'],'answers'=>array_map(static fn($q)=>['id'=>$q['id'],'question'=>$q['text'],'answer'=>$answers[$q['id']]??''],$qs)];
 return ['model'=>$c['OPENAI_MODEL']??'gpt-5.4-mini','background'=>true,'store'=>true,'max_output_tokens'=>$review?2500:10000,'instructions'=>$review?$d['reviewInstructions']:$d['assessmentInstructions']."\n".$d['instructions']."\n".$d['guidance'][$row['category']],'input'=>json_encode($input,JSON_UNESCAPED_UNICODE),'text'=>['format'=>['type'=>'json_schema','name'=>$review?'assessment_quality_review':'growth_strategy','strict'=>true,'schema'=>$review?$d['reviewSchema']:$d['reportSchema']]]];
}
function as_fail(string $id,string $status,string $code): void {wb_query('UPDATE local_assessments SET status=?,error_code=?,updated_at=? WHERE id=?',[$status,$code,time(),$id]);}
function as_start_ai(array $row,bool $review=false): void {
 try{[$code,$v]=as_ai('POST','/responses',as_payload($row,$review));if($code<200||$code>=300){as_fail($row['id'],'failed',$code===429?'api_quota_or_rate_limit':'api_rejected');return;}
 if(!is_array($v)||!preg_match('/^resp_[a-zA-Z0-9_-]+$/D',$v['id']??''))throw new RuntimeException('Unconfirmed response');
 wb_query('UPDATE local_assessments SET status=?,response_id=?,last_poll=0,updated_at=? WHERE id=?',[$review?'reviewing':'analyzing',$v['id'],time(),$row['id']]);
 }catch(Throwable $e){as_fail($row['id'],'uncertain',$review?'review_start_unconfirmed':'start_unconfirmed');}
}
function as_poll(array $row): array {
 if(!in_array($row['status'],['analyzing','reviewing'],true)||!$row['response_id']||time()-(int)$row['last_poll']<5)return $row;
 if(!wb_query('UPDATE local_assessments SET last_poll=? WHERE id=? AND last_poll=? AND status=?',[time(),$row['id'],$row['last_poll'],$row['status']])->rowCount())return as_get($row['id']);
 try{[$code,$v]=as_ai('GET','/responses/'.$row['response_id']);if($code!==200){if($code===404)as_fail($row['id'],'failed','response_unavailable');return as_get($row['id']);}
 if(($v['status']??'')==='completed'){
  $text='';foreach($v['output']??[] as $m)if(($m['type']??'')==='message')foreach($m['content']??[] as $c)if(($c['type']??'')==='output_text')$text.=$c['text'];
  $value=json_decode($text,true,512,JSON_THROW_ON_ERROR);$review=$row['status']==='reviewing';
  if(!as_schema($value,as_definition()[$review?'reviewSchema':'reportSchema']))throw new UnexpectedValueException('Invalid report');
  if(!$review){$ids=array_column(as_questions($row['category']),'id');foreach($value['findings'] as $f)foreach($f['evidence_ids'] as $id)if(!in_array($id,$ids,true))throw new UnexpectedValueException('Invalid evidence');
   if(wb_query("UPDATE local_assessments SET status='review_starting',report_json=?,updated_at=? WHERE id=? AND status='analyzing'",[json_encode($value),time(),$row['id']])->rowCount())as_start_ai(as_get($row['id']),true);
  }else {if($value['approved']===true&&$value['issues']===[]){as_report_pdf($row);wb_query("UPDATE local_assessments SET status='ready',review_json=?,error_code=NULL,updated_at=? WHERE id=? AND status='reviewing'",[json_encode($value),time(),$row['id']]);as_queue(as_get($row['id']));}else as_fail($row['id'],'failed','quality_review_failed');}
 }elseif(in_array($v['status']??'',['failed','cancelled','incomplete'],true))as_fail($row['id'],'failed','analysis_incomplete');
 }catch(JsonException|UnexpectedValueException $e){as_fail($row['id'],'failed','report_validation_failed');}catch(LengthException $e){as_fail($row['id'],'failed','report_page_limit_exceeded');}catch(Throwable $e){/* Transient polling errors are retried; never expose provider payloads. */}
 return as_get($row['id']);
}
function as_queue(array $row): void {foreach(['report_user','report_copy'] as $kind)wb_query("INSERT OR IGNORE INTO local_assessment_mail(id,assessment_id,kind,status,updated_at) VALUES(?,?,?,'pending',?)",[$row['id'].'-'.$kind,$row['id'],$kind,time()]);}
require_once __DIR__.'/assessment-emails.php';
function as_mail(): void {
 if(!wb_enabled())return;
 wb_query("UPDATE local_assessment_mail SET status='manual_review',error_code='interrupted_send' WHERE status='sending' AND updated_at<?",[time()-180]);
 foreach(wb_query("SELECT * FROM local_assessment_mail WHERE status IN ('pending','retry') AND updated_at<=? ORDER BY updated_at LIMIT 4",[time()])->fetchAll() as $job){
  try{$token=wb_access_token();}catch(Throwable $e){return;}
  if(!wb_query("UPDATE local_assessment_mail SET status='sending',updated_at=? WHERE id=? AND status IN ('pending','retry')",[time(),$job['id']])->rowCount())continue;
  $status='manual_review';$error='send_unconfirmed';
  try{$row=as_get($job['assessment_id']);$contact=json_decode($row['contact_json'],true);$isUser=$job['kind']==='report_user';$abandoned=$job['kind']==='abandoned';$title=$row['kind']==='agentic'?'Agentic Readiness Report':'Business Strategy Report';
   $body=as_client_email($row);
   if(!$isUser&&!$abandoned)$body=as_owner_summary($row)."\n\nCLIENT EMAIL COPY\n\n".$body;
   if($abandoned)$body='An assessment was started but not submitted after one hour. Contact details and saved answers: '.json_encode(['contact'=>$contact,'answers'=>json_decode($row['answers_json'],true)],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE);
   $body.="\n\n".<<<'SIGNATURE'
BR,
Vlad Gutenmakher
AI Consultant and Value Architect
Setup Shop Online Inc.
📞 Phone: 201-757-0134
📧 Email: Vlad@SetupShopOnline.com
🌐 Website: SetUpShopOnline.com (http://setupshoponline.com/)

Book Your FREE 1 Hour AI Strategy Session - Book a Zoom (https://calendly.com/meet_with_setupshoponline/1-hour-setupshoponline)

Disclaimer: This email, including any attached files, is intended only for the individual or entity to whom it is addressed and may contain confidential or legally privileged information. If you are not the intended recipient, or someone authorized to receive it on their behalf, you are hereby notified that reviewing, sharing, or duplicating this message is strictly forbidden. If you received this email in error, please notify us immediately by replying to this message and then permanently delete it and any attachments from your system.
SIGNATURE;
   $message=['message'=>['subject'=>$abandoned?'Unfinished assessment: '.$contact['business_name']:($isUser?'Your free '.$title.' is ready':'New '.$title.': '.$contact['business_name']),'body'=>['contentType'=>'HTML','content'=>as_email_html($body)],'toRecipients'=>[['emailAddress'=>['address'=>$isUser?$contact['email']:WB_SENDER]]],'replyTo'=>[['emailAddress'=>['address'=>$isUser?WB_SENDER:$contact['email']]]],'attachments'=>$abandoned?[]:[['@odata.type'=>'#microsoft.graph.fileAttachment','name'=>'Your_'.str_replace(' ','_',$title).'.pdf','contentType'=>'application/pdf','contentBytes'=>base64_encode(as_report_pdf($row))]]],'saveToSentItems'=>true];
   [$code,$raw]=wb_http('https://graph.microsoft.com/v1.0/me/sendMail',json_encode($message),['Authorization: Bearer '.$token,'Content-Type: application/json']);
   if($code===202){$status='accepted';$error=null;}elseif(in_array($code,[401,403,429],true)){$status='retry';$error='outlook_'.$code;}elseif($code>=400&&$code<500&&$code!==408){$status='failed';$error='outlook_'.$code;}
  }catch(Throwable $e){}
  wb_query('UPDATE local_assessment_mail SET status=?,error_code=?,updated_at=? WHERE id=?',[$status,$error,time()+($status==='retry'?3600:0),$job['id']]);
 }
}
function as_maintain(): void {
 as_init();wb_query("UPDATE local_assessments SET status='uncertain',error_code='start_unconfirmed' WHERE status IN ('creating','review_starting') AND updated_at<?",[time()-120]);
 foreach(wb_query("SELECT * FROM local_assessments WHERE status IN ('analyzing','reviewing') ORDER BY last_poll LIMIT 3")->fetchAll() as $r)as_poll($r);
 foreach(wb_query("SELECT * FROM local_assessments WHERE status='ready' AND NOT EXISTS(SELECT 1 FROM local_assessment_mail m WHERE m.assessment_id=local_assessments.id)")->fetchAll() as $r)as_queue($r);
 foreach(wb_query("SELECT * FROM local_assessments WHERE status='draft' AND created_at<?",[time()-3600])->fetchAll() as $r)wb_query("INSERT OR IGNORE INTO local_assessment_mail(id,assessment_id,kind,status,updated_at) VALUES(?,?,'abandoned','pending',?)",[$r['id'].'-abandoned',$r['id'],time()]);
 as_mail();
}
function as_dispatch(string $kind): void {
 header('Cache-Control: private, no-store');header('X-Content-Type-Options: nosniff');header('Referrer-Policy: no-referrer');
 try{as_init();$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);$method=$_SERVER['REQUEST_METHOD'];$landing=$kind==='agentic'?'/free-agentic-readiness-assessment':'/free-business-strategy';
 if(preg_match('#^/'.$kind.'-assessment(?:\.html)?/?$#D',$path)){
  if(!in_array($method,['GET','HEAD'],true))as_error('Method not allowed.',405);
  if(!as_session($kind)){header('Location: '.$landing,true,302);exit;}
  header('Content-Type: text/html; charset=UTF-8');if($method==='GET')readfile(dirname(__DIR__,2).'/public_html/'.$kind.'-assessment.html');exit;
 }
 $prefix='/api/'.$kind.'/';$action=str_starts_with($path,$prefix)?substr($path,strlen($prefix)):'';
 $methods=['config'=>'GET','session'=>'GET','start'=>'POST','category'=>'POST','answers'=>'POST','generate'=>'POST','status'=>'GET','download'=>'GET','new'=>'POST','retry'=>'POST'];
 if(!isset($methods[$action]))as_error('Not found.',404);if($method!==$methods[$action]&&!($action==='download'&&$method==='HEAD'))as_error('Method not allowed.',405);
 if($method==='POST')wb_origin();$ip=hash('sha256',$_SERVER['REMOTE_ADDR']??'unknown');if(!wb_rate('local-assessment-request:'.$ip,240,60))as_error('Please wait a minute and try again.',429);
 $data=$method==='POST'?wb_body(16000):[];$def=as_definition();$row=as_session($kind);
 if($action==='config')wb_json(['preview'=>false,'analysisReady'=>!empty(as_config()['OPENAI_API_KEY']),'emailEnabled'=>wb_enabled(),'recaptchaSiteKey'=>!empty(wb_config()['RECAPTCHA_SECRET_KEY'])?(wb_config()['RECAPTCHA_SITE_KEY']??''):'','categories'=>array_values(array_filter($def['categories'],static fn($c)=>($c['id']==='agentic-readiness')===($kind==='agentic'))),'methodology'=>$def['methodology']]);
 if($action==='session')wb_json(['session'=>$row?as_view($row):null,'questions'=>$row?as_questions($row['category']):[]]);
 if($action==='start'){
  $now=(int)(microtime(true)*1000);if(!empty($data['website'])||!is_numeric($data['started_at']??null)||$now-$data['started_at']<1200||$now-$data['started_at']>86400000)as_error('Please wait a moment and submit again.');
  $contact=[];foreach(['full_name'=>120,'email'=>254,'phone'=>40,'business_name'=>160] as $key=>$max){$v=$data[$key]??null;if(!is_string($v)||strlen(trim($v))<2||strlen($v)>$max||preg_match('/[\x00-\x1f\x7f]/',$v))as_error('Please check '.str_replace('_',' ',$key).'.');$contact[$key]=trim($v);}
  $contact['email']=strtolower($contact['email']);$digits=preg_replace('/\D/','',$contact['phone']);if(!filter_var($contact['email'],FILTER_VALIDATE_EMAIL)||!preg_match('/^[+0-9 ().-]+$/D',$contact['phone'])||strlen($digits)<7||strlen($digits)>15)as_error('Please enter a valid email and phone number.');
  $id=$data['submission_id']??'';if(!is_string($id)||!preg_match('/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iD',$id))as_error('Please refresh this form.');
  if($row&&$row['id']===$id)wb_json(['session'=>as_view($row),'questions'=>as_questions($row['category'])]);if(as_get($id))as_error('This request already exists. Reload to resume.',409);
  $captcha=wb_captcha_verify(is_string($data['recaptcha_token']??null)?$data['recaptcha_token']:'');if($captcha)wb_json($captcha[1],$captcha[0]);
  if(!wb_rate('local-assessment-start:'.$ip,20,3600)||!wb_rate('local-assessment-email:'.hash('sha256',$contact['email']),$contact['email']===WB_SENDER?20:6,86400))as_error('Please resume your saved assessment or try again later.',429);
  $category=$kind==='agentic'?'agentic-readiness':'unselected';$token=bin2hex(random_bytes(32));
  wb_query('INSERT INTO local_assessments(id,kind,session_hash,expires_at,contact_json,category,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',[$id,$kind,hash('sha256',$token),time()+86400,json_encode($contact),$category,time(),time()]);
  setcookie($kind.'_access',$token,['expires'=>time()+86400,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);wb_json(['session'=>as_view(as_get($id)),'questions'=>as_questions($category)]);
 }
 if(!$row)as_error('Please complete the contact form to start or resume.',401);
 if($action==='category'){if($row['status']!=='draft')as_error('This assessment is already submitted.',409);$cat=$data['category']??'';if(!is_string($cat)||!isset($def['questions'][$cat])||($cat==='agentic-readiness')!==($kind==='agentic'))as_error('Please choose a category.');$a=as_answers(json_decode($row['answers_json'],true),$cat);wb_query("UPDATE local_assessments SET category=?,answers_json=?,step=0,updated_at=? WHERE id=? AND status='draft'",[$cat,json_encode((object)$a),time(),$row['id']]);$row=as_get($row['id']);wb_json(['session'=>as_view($row),'questions'=>as_questions($cat)]);}
 if($action==='answers'){if($row['status']!=='draft')as_error('This assessment is already submitted.',409);if(!is_array($data['answers']??null)||!is_int($data['step']??null)||$data['step']<0||$data['step']>10)as_error('Please check your answers.');$a=as_answers($data['answers'],$row['category']);if(!wb_query("UPDATE local_assessments SET answers_json=?,step=?,updated_at=? WHERE id=? AND status='draft'",[json_encode((object)$a),$data['step'],time(),$row['id']])->rowCount())as_error('This assessment was already submitted.',409);wb_json(['saved'=>true]);}
 if($action==='retry'){if($row['status']!=='failed')as_error('Only a confirmed failed report can be retried.',409);wb_query("UPDATE local_assessments SET status='draft',response_id=NULL,report_json=NULL,review_json=NULL,error_code=NULL,updated_at=? WHERE id=? AND status='failed'",[time(),$row['id']]);wb_json(['session'=>as_view(as_get($row['id']))]);}
 if($action==='new'){if(!in_array($row['status'],['ready','failed'],true))as_error('Please finish this assessment first.',409);if(!wb_rate('local-assessment-new:'.$ip,20,3600))as_error('Please try again later.',429);$id=vsprintf('%s%s-%s-%s-%s-%s%s%s',str_split(bin2hex(random_bytes(16)),4));$token=bin2hex(random_bytes(32));$cat=$kind==='agentic'?'agentic-readiness':'unselected';wb_query('INSERT INTO local_assessments(id,kind,session_hash,expires_at,contact_json,category,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',[$id,$kind,hash('sha256',$token),time()+86400,$row['contact_json'],$cat,time(),time()]);setcookie($kind.'_access',$token,['expires'=>time()+86400,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);wb_json(['session'=>as_view(as_get($id)),'questions'=>as_questions($cat)]);}
 if($action==='generate'){
  if($row['status']!=='draft')wb_json(['session'=>as_view($row)]);if(empty(as_config()['OPENAI_API_KEY']))as_error('Your answers are saved. Report generation is temporarily unavailable.',503);as_answers(json_decode($row['answers_json'],true),$row['category'],true);
  $email=strtolower(json_decode($row['contact_json'],true)['email']);$limit=$email===WB_SENDER?10:1;$db=wb_db();$db->exec('BEGIN IMMEDIATE');
  try{$count=(int)wb_query("SELECT COUNT(*) FROM local_assessments WHERE lower(json_extract(contact_json,'$.email'))=? AND category=? AND submitted_at>? AND id<>? AND status<>'draft'",[$email,$row['category'],time()-86400,$row['id']])->fetchColumn();if($count>=$limit){$db->exec('ROLLBACK');as_error('This email has reached its report limit for this category. Your answers are saved.',429);}
   if(!wb_query("UPDATE local_assessments SET status='creating',submitted_at=COALESCE(submitted_at,?),updated_at=? WHERE id=? AND status='draft'",[time(),time(),$row['id']])->rowCount()){$db->exec('COMMIT');wb_json(['session'=>as_view(as_get($row['id']))]);}
   if(!wb_rate('local-assessment-reports',20,86400)){$db->exec('ROLLBACK');as_error('Today’s report capacity has been reached. Your answers are saved.',429);}$db->exec('COMMIT');
  }catch(Throwable $e){if($db->inTransaction())$db->exec('ROLLBACK');throw $e;}
  as_start_ai(as_get($row['id']));wb_json(['session'=>as_view(as_get($row['id']))],202);
 }
 if($action==='status'){if(in_array($row['status'],['creating','review_starting'],true)&&time()-(int)$row['updated_at']>120)as_fail($row['id'],'uncertain','start_unconfirmed');$row=as_poll(as_get($row['id']));if($row['status']==='ready')as_queue($row);wb_json(['session'=>as_view($row),'delivery'=>wb_query('SELECT kind,status,error_code FROM local_assessment_mail WHERE assessment_id=?',[$row['id']])->fetchAll()]);}
 if($action==='download'){if($row['status']!=='ready')as_error('Your report is not ready yet.',409);$pdf=as_report_pdf($row);header('Content-Type: application/pdf');header('Content-Disposition: inline; filename="'.($kind==='agentic'?'Your_Agentic_Readiness_Report.pdf':'Your_Business_Strategy_Report.pdf').'"');if($method!=='HEAD')echo $pdf;exit;}
 }catch(InvalidArgumentException $e){as_error($e->getMessage());}catch(Throwable $e){as_error('The assessment is temporarily unavailable. Your saved progress is safe.',503);}
}
