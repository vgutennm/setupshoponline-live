<?php
declare(strict_types=1);
// Existing delegated Outlook credentials stay in private hosting storage.
function growth_mail_send(array $data): array {
    $id=$data['id']??'';$mime=$data['mime']??'';
    if(!is_string($id)||!preg_match('/^[a-f0-9-]{36}-(?:report-user|report-copy|report-summary|abandoned)$/D',$id)||!is_string($mime)||strlen($mime)>8000000)return ['status'=>'failed','error'=>'invalid_message'];
    $decoded=base64_decode($mime,true);
    if($decoded===false||!str_starts_with($decoded,"From: Vlad Gutenmakher <vlad@setupshoponline.com>\r\n")||!str_contains($decoded,"\r\nMessage-ID: <".$id."@setupshoponline.com>\r\n"))return ['status'=>'failed','error'=>'invalid_sender'];
    $db=wb_db();$db->exec('CREATE TABLE IF NOT EXISTS growth_mail_receipts (id TEXT PRIMARY KEY, digest TEXT NOT NULL, status TEXT NOT NULL, error TEXT, updated_at INTEGER NOT NULL)');
    $digest=hash('sha256',$mime);
    $row=wb_query('SELECT * FROM growth_mail_receipts WHERE id=?',[$id])->fetch();
    if($row){
        if(!hash_equals($row['digest'],$digest))return ['status'=>'failed','error'=>'message_conflict'];
        if(in_array($row['status'],['accepted','failed','manual_review','sending'],true))return ['status'=>$row['status']==='sending'?'manual_review':$row['status'],'error'=>$row['error'],'providerId'=>$id];
    }
    try{$token=wb_access_token();}catch(Throwable $e){return ['status'=>'retry','error'=>'outlook_reauthorization_required','delay'=>3600000];}
    // Atomic claim before send: an interrupted or unconfirmed send is never replayed.
    $db->exec('BEGIN IMMEDIATE');
    $row=wb_query('SELECT * FROM growth_mail_receipts WHERE id=?',[$id])->fetch();
    if($row&&($row['digest']!==$digest||$row['status']!=='retry')){$db->exec('ROLLBACK');return ['status'=>$row['digest']!==$digest?'failed':($row['status']==='sending'?'manual_review':$row['status']),'error'=>'already_processed','providerId'=>$id];}
    wb_query("INSERT INTO growth_mail_receipts(id,digest,status,updated_at) VALUES(?,?,'sending',?) ON CONFLICT(id) DO UPDATE SET status='sending',updated_at=excluded.updated_at",[$id,$digest,time()]);$db->exec('COMMIT');
    $result=['status'=>'manual_review','error'=>'outlook_send_unconfirmed'];
    try{
        [$code,$raw]=wb_http('https://graph.microsoft.com/v1.0/me/sendMail',$mime,['Authorization: Bearer '.$token,'Content-Type: text/plain']);
        if($code===202)$result=['status'=>'accepted','providerId'=>$id];
        elseif(in_array($code,[401,403,429],true))$result=['status'=>'retry','error'=>'outlook_'.$code,'delay'=>3600000];
        elseif($code>=400&&$code<500&&$code!==408)$result=['status'=>'failed','error'=>'outlook_'.$code];
    }catch(Throwable $e){}
    wb_query('UPDATE growth_mail_receipts SET status=?,error=?,updated_at=? WHERE id=?',[$result['status'],$result['error']??null,time(),$id]);
    return $result;
}
function growth_mail_route(string $method): void {
    if($method!=='POST')wb_json(['error'=>'Method not allowed.'],405);
    $file=dirname(__DIR__).'/growth-runner-config.php';$config=is_file($file)?require $file:[];
    $key=$config['runner_key']??'';$supplied=$_SERVER['HTTP_X_GROWTH_RUNNER_KEY']??'';
    if(strlen($key)<48||!is_string($supplied)||!hash_equals($key,$supplied))wb_json(['error'=>'Unauthorized.'],401);
    $data=wb_body(8100000);
    if(($data['action']??'')==='status'){
        $id=$data['id']??'';
        if(!is_string($id)||!preg_match('/^[a-f0-9-]{36}-(?:report-user|report-copy|report-summary|abandoned)$/D',$id))wb_json(['error'=>'Invalid message ID.'],400);
        $exists=wb_query("SELECT name FROM sqlite_master WHERE type='table' AND name='growth_mail_receipts'")->fetchColumn();
        $row=$exists?wb_query('SELECT status,error FROM growth_mail_receipts WHERE id=?',[$id])->fetch():false;
        wb_json(['recorded'=>(bool)$row,'status'=>$row['status']??null,'error'=>$row['error']??null]);
    }
    wb_json(growth_mail_send($data));
}
