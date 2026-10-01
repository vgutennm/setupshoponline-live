<?php
declare(strict_types=1);
// Invoked by the existing CLI cron; never served from public_html.
function growth_run_background(): void {
    $root=dirname(__DIR__);
    $file=$root.'/growth-runner-config.php';
    if (!is_file($file)) return;
    $c=require $file;
    if (($c['enabled']??false)!==true) return;
    if (!function_exists('curl_init') || strlen($c['runner_key']??'')<48 || empty($c['sites_token'])) {
        error_log('Growth runner configuration incomplete.');return;
    }
    $lock=fopen($root.'/data/growth-runner.lock','c');
    if (!$lock) return;
    if (!flock($lock,LOCK_EX|LOCK_NB)) {fclose($lock);return;}
    try {
        $ch=curl_init('https://setupshoponline.vlad554726.chatgpt.site/api/growth/runner');
        curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>'{}',CURLOPT_RETURNTRANSFER=>true,
            CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_TIMEOUT=>110,CURLOPT_FOLLOWLOCATION=>false,
            CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,
            CURLOPT_HTTPHEADER=>['Content-Type: application/json','OAI-Sites-Authorization: Bearer '.$c['sites_token'],'X-Growth-Runner-Key: '.$c['runner_key']]]);
        $raw=curl_exec($ch);$code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
        $result=is_string($raw)?json_decode($raw,true):null;
        $ok=$code===200&&is_array($result)&&($result['ok']??false)===true;
        // Operational status only: never persist credentials, contacts, or raw error pages.
        $status=['checked_at'=>gmdate('c'),'ok'=>$ok,'http_status'=>$code];
        if($ok){$status['reports_checked']=(int)($result['checked']??0);$status['delivery']=$result['delivery']??[];}
        file_put_contents($root.'/data/growth-runner-status.json',json_encode($status,JSON_PRETTY_PRINT),LOCK_EX);
        chmod($root.'/data/growth-runner-status.json',0600);
        if(!$ok)error_log('Growth runner check failed; HTTP '.$code.'.');
    } finally {flock($lock,LOCK_UN);fclose($lock);}
}
