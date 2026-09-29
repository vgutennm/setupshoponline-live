<?php
declare(strict_types=1);
const WB_REDIRECT = 'https://setupshoponline.com/api/workbook/outlook-callback';
const WB_SCOPES = 'offline_access https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Send';
function wb_auth_table(): void {
    wb_db()->exec('CREATE TABLE IF NOT EXISTS outlook_auth (id INTEGER PRIMARY KEY CHECK(id=1), refresh_token TEXT NOT NULL, access_token TEXT NOT NULL, expires_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS oauth_states (state_hash TEXT PRIMARY KEY, browser_hash TEXT NOT NULL, verifier TEXT NOT NULL, expires_at INTEGER NOT NULL);');
}
function wb_connected(): bool {
    wb_auth_table(); return (bool)wb_query('SELECT id FROM outlook_auth WHERE id=1')->fetch();
}
function wb_token_request(array $params): array {
    $c=wb_config();
    [$code,$raw]=wb_http('https://login.microsoftonline.com/'.rawurlencode($c['M365_TENANT_ID']).'/oauth2/v2.0/token',http_build_query(array_merge(['client_id'=>$c['M365_CLIENT_ID'],'client_secret'=>$c['M365_CLIENT_SECRET']],$params)),['Content-Type: application/x-www-form-urlencoded']);
    $data=json_decode($raw,true);
    if ($code!==200 || empty($data['access_token'])) throw new RuntimeException('Microsoft authorization must be renewed.');
    return $data;
}
function wb_store_tokens(array $t, ?string $previous=null): void {
    $refresh=$t['refresh_token'] ?? $previous;
    if (!$refresh) throw new RuntimeException('Offline authorization missing.');
    wb_query('INSERT INTO outlook_auth(id,refresh_token,access_token,expires_at) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET refresh_token=excluded.refresh_token,access_token=excluded.access_token,expires_at=excluded.expires_at',[$refresh,$t['access_token'],time()+(int)($t['expires_in']??3600)]);
}
function wb_access_token(): string {
    wb_auth_table();
    $lock=fopen(dirname(__DIR__).'/data/token.lock','c');
    if (!$lock || !flock($lock,LOCK_EX)) throw new RuntimeException('Token lock unavailable.');
    try {
        $row=wb_query('SELECT * FROM outlook_auth WHERE id=1')->fetch();
        if (!$row) throw new RuntimeException('Outlook is not connected.');
        if ((int)$row['expires_at']>time()+120) return $row['access_token'];
        $t=wb_token_request(['grant_type'=>'refresh_token','refresh_token'=>$row['refresh_token'],'scope'=>WB_SCOPES]);
        wb_store_tokens($t,$row['refresh_token']);return $t['access_token'];
    } finally {flock($lock,LOCK_UN);fclose($lock);}
}
function wb_oauth_page(string $message, bool $form=false): void {
    header('Content-Type: text/html; charset=UTF-8'); header('Cache-Control: no-store');header('Referrer-Policy: no-referrer');
    echo '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Connect Outlook — Set Up Shop Online</title><body style="font:18px system-ui;max-width:680px;margin:60px auto;padding:24px"><h1>Connect Outlook</h1><p>'.htmlspecialchars($message,ENT_QUOTES,'UTF-8').'</p>';
    if($form)echo '<form method="post" action="/api/workbook/connect"><label>Private setup code<br><input type="password" name="setup_key" required autocomplete="off" style="width:100%;padding:12px;margin:12px 0"></label><button style="padding:12px">Connect vlad@setupshoponline.com</button></form><p>Use the setup code in your private cPanel setup-key.txt file. Microsoft will ask you to approve sending email from your mailbox.</p>';
    echo '</body></html>';exit;
}
function wb_oauth_route(string $path,string $method): void {
    wb_auth_table();
    if($path==='/api/workbook/connect') {
        if($method==='GET')wb_oauth_page('Authorize workbook delivery and lead notifications from your Outlook mailbox.',$form=true);
        if($method!=='POST'){http_response_code(405);exit;}
        wb_origin();
        $keyfile=dirname(__DIR__).'/setup-key.txt';$key=is_file($keyfile)?trim(file_get_contents($keyfile)):'';
        $supplied=$_POST['setup_key']??'';
        if(!$key || !is_string($supplied) || !hash_equals($key,trim($supplied))){http_response_code(403);wb_oauth_page('The setup code was not accepted.',true);}
        $c=wb_config();if(empty($c['M365_CLIENT_SECRET']))wb_oauth_page('Save the Microsoft client secret in the private cPanel config.php file first.');
        $state=bin2hex(random_bytes(32));$browser=bin2hex(random_bytes(32));$verifier=bin2hex(random_bytes(32));
        wb_query('DELETE FROM oauth_states WHERE expires_at<?',[time()]);
        wb_query('INSERT INTO oauth_states VALUES(?,?,?,?)',[hash('sha256',$state),hash('sha256',$browser),$verifier,time()+600]);
        setcookie('outlook_setup',$browser,['expires'=>time()+600,'path'=>'/api/workbook/','secure'=>true,'httponly'=>true,'samesite'=>'Lax']);
        $params=['client_id'=>$c['M365_CLIENT_ID'],'response_type'=>'code','redirect_uri'=>WB_REDIRECT,'response_mode'=>'query','scope'=>WB_SCOPES,'state'=>$state,'code_challenge'=>rtrim(strtr(base64_encode(hash('sha256',$verifier,true)),'+/','-_'),'='),'code_challenge_method'=>'S256','login_hint'=>WB_SENDER,'prompt'=>'consent'];
        header('Location: https://login.microsoftonline.com/'.rawurlencode($c['M365_TENANT_ID']).'/oauth2/v2.0/authorize?'.http_build_query($params));exit;
    }
    if($path==='/api/workbook/outlook-callback') {
        if($method!=='GET'){http_response_code(405);exit;}
        $state=$_GET['state']??'';$browser=$_COOKIE['outlook_setup']??'';
        if(!is_string($state)||!is_string($browser)){http_response_code(403);exit;}
        $db=wb_db();$db->exec('BEGIN IMMEDIATE');
        $row=wb_query('SELECT * FROM oauth_states WHERE state_hash=?',[hash('sha256',$state)])->fetch();
        if(!$row || $row['expires_at']<time() || !hash_equals($row['browser_hash'],hash('sha256',$browser))){$db->exec('ROLLBACK');http_response_code(403);wb_oauth_page('This authorization attempt expired. Start again using your private setup code.',true);}
        wb_query('DELETE FROM oauth_states WHERE state_hash=?',[hash('sha256',$state)]);$db->exec('COMMIT');
        if(!is_string($_GET['code']??null))wb_oauth_page('Authorization was not completed. Please try again.',true);
        try {
            $t=wb_token_request(['grant_type'=>'authorization_code','code'=>$_GET['code'],'redirect_uri'=>WB_REDIRECT,'code_verifier'=>$row['verifier'],'scope'=>WB_SCOPES]);
            $ch=curl_init('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName');
            curl_setopt_array($ch,[CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$t['access_token']],CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>15,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS]);
            $raw=curl_exec($ch);$code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);$me=json_decode($raw?:'',true);
            if($code!==200 || !in_array(WB_SENDER,[strtolower($me['mail']??''),strtolower($me['userPrincipalName']??'')],true))throw new RuntimeException('Please authorize vlad@setupshoponline.com.');
            wb_store_tokens($t);
            setcookie('outlook_setup','',['expires'=>time()-3600,'path'=>'/api/workbook/','secure'=>true,'httponly'=>true,'samesite'=>'Lax']);
            header('Location: /api/workbook/connected');exit;
        } catch(Throwable $e){wb_oauth_page('Microsoft authorization could not be completed. Check the registered redirect URL, private client secret and selected mailbox, then try again.',true);}
    }
    if($path==='/api/workbook/connected') wb_oauth_page(wb_connected()?'Outlook authorization is saved for vlad@setupshoponline.com. Email delivery still needs a test.':'Outlook is not connected.',!wb_connected());
}
