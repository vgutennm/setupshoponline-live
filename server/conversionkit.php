<?php
declare(strict_types=1);
const CK_FILENAME = 'Conversation-to-Client-Conversion-Kit-v3.pdf';
function ck_cookie(string $token): void {
    setcookie('conversionkit_access',$token,['expires'=>time()+31536000,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Lax']);
}
function ck_token_lead(string $token): ?array {
    if(!preg_match('/^[a-f0-9]{64}$/D',$token))return null;
    $row=wb_query('SELECT * FROM leads WHERE download_hash=?',[hash('sha256',$token)])->fetch();
    if(!$row || (json_decode($row['data'],true)['source_page']??'')!=='/conversionkit')return null;
    return $row;
}
function ck_lead(): ?array {
    $token=$_COOKIE['conversionkit_access']??'';
    return is_string($token)?ck_token_lead($token):null;
}
function ck_dispatch(): void {
    header('Cache-Control: private, no-store'); header('X-Content-Type-Options: nosniff'); header('Referrer-Policy: no-referrer');
    try {
        $path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH); $method=$_SERVER['REQUEST_METHOD'];
        if($path==='/api/conversionkit/config' && $method==='GET') {
            wb_json(['emailEnabled'=>wb_enabled(),'recaptchaSiteKey'=>!empty(wb_config()['RECAPTCHA_SECRET_KEY'])?(wb_config()['RECAPTCHA_SITE_KEY']??''):'']);
        }
        if($path==='/api/conversionkit/subscribe' && $method==='POST') {
            wb_origin();
            $d=wb_body();
            // This offer permits fulfillment only. Do not collect attribution or enroll marketing.
            $d=array_intersect_key($d,array_flip(['full_name','email','phone','submission_id','started_at','website','recaptcha_token']));
            $d['timezone']='UTC';
            $r=wb_subscribe($d,'conversionkit');
            if($r[0]===429 && isset($r[1]['retryAfter']))header('Retry-After: '.$r[1]['retryAfter']);
            if(isset($r[2]))ck_cookie($r[2]);
            if($r[0]===200){
                if(!isset($r[1]['email_status']))$r[1]['email_status']=wb_query('SELECT status FROM jobs WHERE id=?',[$d['submission_id'].'-subscriber'])->fetchColumn();
                if(wb_enabled())register_shutdown_function(static function(){if(function_exists('fastcgi_finish_request'))fastcgi_finish_request();wb_process(2);});
            }
            wb_json($r[1],$r[0]);
        }
        if($path==='/api/conversionkit/access' && $method==='POST') {
            wb_origin(); $d=wb_body(200); $t=$d['token']??'';
            if(!is_string($t)||!ck_token_lead($t))wb_json(['error'=>'This link is not valid. Please request your kit again.'],403);
            ck_cookie($t); wb_json(['ready'=>true]);
        }
        if($path==='/api/conversionkit/session' && $method==='GET') {
            $lead=ck_lead(); wb_json(['ready'=>(bool)$lead]);
        }
        if($path==='/api/conversionkit/download' && in_array($method,['GET','HEAD'],true)) {
            if(!ck_lead())wb_json(['error'=>'Please request your free conversion kit first.'],403);
            $pdf=__DIR__.'/conversionkit.pdf';
            if(!is_readable($pdf))throw new RuntimeException('Kit unavailable');
            header('Content-Type: application/pdf');
            header('Content-Disposition: '.(($_GET['download']??'')==='1'?'attachment':'inline').'; filename="'.CK_FILENAME.'"');
            header('Content-Length: '.filesize($pdf));
            if($method==='GET')readfile($pdf); exit;
        }
        wb_json(['error'=>'Not found.'],404);
    }catch(Throwable $e){wb_json(['error'=>'Your kit is temporarily unavailable. Please try again shortly.'],503);}
}
