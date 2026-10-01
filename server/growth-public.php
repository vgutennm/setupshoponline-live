<?php
declare(strict_types=1);
// Only the explicit visitor operations cross this gateway. No owner identity is fabricated.
function growth_public_request(string $action,string $method,?array $data=null,bool $verified=false): array {
    $file=dirname(__DIR__).'/growth-runner-config.php';$c=is_file($file)?require $file:[];
    if(($c['enabled']??false)!==true||strlen($c['runner_key']??'')<48||empty($c['sites_token']))throw new RuntimeException('Assessment unavailable');
    $headers=['Content-Type: application/json','OAI-Sites-Authorization: Bearer '.$c['sites_token'],'X-Growth-Runner-Key: '.$c['runner_key']];
    if($verified)$headers[]='X-Growth-Form-Verified: 1';
    $cookie=$_COOKIE['growth_access']??'';
    if(is_string($cookie)&&preg_match('/^[a-f0-9]{64}$/D',$cookie))$headers[]='Cookie: growth_access='.$cookie;
    $received=[];$ch=curl_init('https://setupshoponline.vlad554726.chatgpt.site/api/growth/public/'.$action);
    curl_setopt_array($ch,[CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>8,CURLOPT_TIMEOUT=>55,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_HTTPHEADER=>$headers,CURLOPT_HEADERFUNCTION=>static function($ch,$line)use(&$received){$parts=explode(':',$line,2);if(count($parts)===2){$name=strtolower(trim($parts[0]));$value=trim($parts[1]);if($name!=='set-cookie'||str_starts_with($value,'growth_access='))$received[$name]=$value;}return strlen($line);}]);
    if($data!==null)curl_setopt($ch,CURLOPT_POSTFIELDS,json_encode($data));
    $raw=curl_exec($ch);$code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
    if($raw===false||$code<200||$code>=500)throw new RuntimeException('Assessment connection unavailable');
    if($code>=300&&$code<400)throw new RuntimeException('Unexpected redirect');
    return [$code,$raw,$received];
}
function growth_public_dispatch(): void {
    header('Cache-Control: private, no-store');header('X-Content-Type-Options: nosniff');header('Referrer-Policy: no-referrer');
    try{
        $path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);$method=$_SERVER['REQUEST_METHOD'];
        $isPage=$path==='/growth-assessment'||$path==='/growth-assessment/'||$path==='/growth-assessment.html';
        if($isPage){
            if($method!=='GET'&&$method!=='HEAD')wb_json(['error'=>'Method not allowed.'],405);
            if(empty($_COOKIE['growth_access'])){header('Location: /free-business-strategy',true,302);exit;}
            [$code,$raw]=growth_public_request('session','GET');$data=json_decode($raw,true);
            if($code!==200||empty($data['session'])){header('Location: /free-business-strategy',true,302);exit;}
            header('Content-Type: text/html; charset=UTF-8');if($method==='GET')readfile(dirname(__DIR__,2).'/public_html/growth-assessment.html');exit;
        }
        $action=substr($path,strlen('/api/growth/'));
        $methods=['config'=>'GET','session'=>'GET','start'=>'POST','category'=>'POST','answers'=>'POST','generate'=>'POST','status'=>'GET','download'=>'GET','new'=>'POST','retry'=>'POST'];
        if(!isset($methods[$action]))wb_json(['error'=>'Not found.'],404);
        if($method!==$methods[$action]&&!($action==='download'&&$method==='HEAD'))wb_json(['error'=>'Method not allowed.'],405);
        if($method==='POST')wb_origin();
        $ip=hash('sha256',$_SERVER['REMOTE_ADDR']??'unknown');
        if(!wb_rate('growth-request:'.$ip,240,60))wb_json(['error'=>'Please wait a minute and try again.'],429);
        $data=$method==='POST'?wb_body(12000):null;$verified=false;
        if($action==='start'){
            $now=(int)round(microtime(true)*1000);
            if(!empty($data['website'])||!is_numeric($data['started_at']??null)||$now-$data['started_at']<1200||$now-$data['started_at']>86400000)wb_json(['error'=>'Please wait a moment and submit again.'],400);
            // Owner testing allowance; all other email limits remain unchanged.
            $testRun=strtolower(trim((string)($data['email']??'')))==='vlad@setupshoponline.com';
            if(!wb_rate('growth-start:'.$ip,$testRun?20:8,3600))wb_json(['error'=>'Please resume your saved assessment or try again later.'],429);
            $captcha=wb_captcha_verify(is_string($data['recaptcha_token']??null)?$data['recaptcha_token']:'');
            if($captcha!==null)wb_json($captcha[1],$captcha[0]);
            $email=is_string($data['email']??null)?strtolower(trim($data['email'])):'';
            if(!filter_var($email,FILTER_VALIDATE_EMAIL))wb_json(['error'=>'Please enter a valid email address.'],400);
            if(!wb_rate('growth-email:'.hash('sha256',$email),$testRun?10:3,86400))wb_json(['error'=>'Please resume your saved assessment or try again tomorrow.'],429);
            $data=array_intersect_key($data,array_flip(['full_name','email','phone','business_name','submission_id']));$data['email']=$email;$verified=true;
        }
        [$code,$raw,$headers]=growth_public_request($action,$method,$data,$verified);
        if(isset($headers['set-cookie'])&&preg_match('/^growth_access=([a-f0-9]{64}|);/D',$headers['set-cookie'],$m))setcookie('growth_access',$m[1],['expires'=>$m[1]===''?time()-3600:time()+86400,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);
        http_response_code($code);
        if($action==='download'&&$code===200){header('Content-Type: application/pdf');header('Content-Disposition: inline; filename=Your_Business_Strategy_Report.pdf');}
        else {header('Content-Type: application/json');if($action==='config'&&$code===200){$v=json_decode($raw,true);if(is_array($v)){$v['recaptchaSiteKey']=!empty(wb_config()['RECAPTCHA_SECRET_KEY'])?(wb_config()['RECAPTCHA_SITE_KEY']??''):'';$raw=json_encode($v);}}}
        if($method!=='HEAD')echo $raw;
    }catch(Throwable $e){wb_json(['error'=>'The assessment is temporarily unavailable. Your saved progress is safe. Please try again shortly.'],503);}
}
