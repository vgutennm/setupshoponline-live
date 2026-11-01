<?php
declare(strict_types=1);
// Loaded only from the existing private application directory, never public_html.
const AK_ORIGIN='https://setupshoponline.com';
const AK_BOOKING='https://calendly.com/meet_with_setupshoponline/15-minute-intro';
function ak_config(): array {
    $path=dirname(__DIR__).'/alignable-config.php';
    $c=is_file($path)?require $path:[];
    return array_merge(['BOOKING_VERIFIED'=>true],is_array($c)?$c:[]);
}
function ak_init(): void {
    wb_db()->exec("CREATE TABLE IF NOT EXISTS ak_orders (
      id TEXT PRIMARY KEY, request_hash TEXT NOT NULL, data TEXT NOT NULL, status TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL, token TEXT NOT NULL, session_id TEXT UNIQUE, checkout_url TEXT,
      payment_intent TEXT UNIQUE, charge_id TEXT, receipt_url TEXT, amount INTEGER NOT NULL DEFAULT 499,
      currency TEXT NOT NULL DEFAULT 'usd', paid_at INTEGER, created_at INTEGER NOT NULL,
      refunded_amount INTEGER NOT NULL DEFAULT 0, refund_state TEXT NOT NULL DEFAULT 'none',
      dispute_state TEXT NOT NULL DEFAULT 'none');
      CREATE TABLE IF NOT EXISTS ak_events (id TEXT PRIMARY KEY,type TEXT NOT NULL,created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS ak_jobs (id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES ak_orders(id),
      kind TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt INTEGER NOT NULL DEFAULT 0,lock_until INTEGER NOT NULL DEFAULT 0,error_code TEXT,provider_id TEXT);
      CREATE TABLE IF NOT EXISTS ak_metrics (id TEXT PRIMARY KEY,order_id TEXT,kind TEXT NOT NULL,created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS ak_refunds (id TEXT PRIMARY KEY,order_id TEXT NOT NULL,amount INTEGER NOT NULL,status TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS ak_jobs_due ON ak_jobs(status,next_attempt);");
}
function ak_q(string $sql,array $p=[]): PDOStatement { return wb_query($sql,$p); }
function ak_cookie(string $token): void { setcookie('alignable_order',$token,['expires'=>time()+31536000,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Lax']); }
function ak_order(string $token): ?array {
    if(!preg_match('/^[a-f0-9]{64}$/D',$token))return null;
    return ak_q('SELECT * FROM ak_orders WHERE token_hash=?',[hash('sha256',$token)])->fetch()?:null;
}
function ak_files(): array { return ['ebook'=>__DIR__.'/alignable-files/ebook.pdf','workbook'=>__DIR__.'/alignable-files/workbook.pdf']; }
function ak_ready(): bool {
    $c=ak_config();$mode=$c['STRIPE_MODE']??'';
    $prefix=$mode==='live'?'sk_live_':'sk_test_';
    return in_array($mode,['test','live'],true) && str_starts_with($c['STRIPE_SECRET_KEY']??'',$prefix)
      && str_starts_with($c['STRIPE_PRICE_ID']??'','price_') && str_starts_with($c['STRIPE_WEBHOOK_SECRET']??'','whsec_')
      && ($c['TAX_TOTAL_CONFIRMED']??false)===true && ($c['SENDER_VERIFIED']??false)===true
      && wb_enabled() && count(array_filter(ak_files(),'is_file'))===2;
}
function ak_stripe(string $method,string $path,array $data=[],?string $idempotency=null): array {
    $headers=['Authorization: Bearer '.(ak_config()['STRIPE_SECRET_KEY']??''),'Content-Type: application/x-www-form-urlencoded'];
    if($idempotency)$headers[]='Idempotency-Key: '.$idempotency;
    $url='https://api.stripe.com/v1/'.$path;
    if($method==='GET' && $data)$url.='?'.http_build_query($data);
    $ch=curl_init($url);curl_setopt_array($ch,[CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_HTTPHEADER=>$headers,CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>5,CURLOPT_TIMEOUT=>20,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS]);
    if($method!=='GET')curl_setopt($ch,CURLOPT_POSTFIELDS,http_build_query($data));
    $raw=curl_exec($ch);$code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);$result=is_string($raw)?json_decode($raw,true):null;
    if($code<200 || $code>=300 || !is_array($result))throw new RuntimeException('payment_provider_unavailable');
    return $result;
}
function ak_signature(string $raw,string $header,string $secret): bool {
    if($secret==='')return false;$timestamp=null;$signatures=[];
    foreach(explode(',',$header)as $part){$v=explode('=',trim($part),2);if(count($v)!==2)continue;if($v[0]==='t')$timestamp=ctype_digit($v[1])?(int)$v[1]:null;if($v[0]==='v1')$signatures[]=$v[1];}
    if($timestamp===null||abs(time()-$timestamp)>300)return false;
    $expected=hash_hmac('sha256',$timestamp.'.'.$raw,$secret);
    foreach($signatures as $signature)if(hash_equals($expected,$signature))return true;return false;
}
function ak_fields(array $d): array {
    $fields=[];$clean=static fn($k)=>is_string($d[$k]??null)?trim($d[$k]):'';
    $name=$clean('first_name');$email=strtolower($clean('email'));$business=$clean('business');
    if($name===''||strlen($name)>100||preg_match('/[\x00-\x1f\x7f]/',$name))$fields['first_name']='Please enter your first name.';
    if(strlen($email)>254||!filter_var($email,FILTER_VALIDATE_EMAIL))$fields['email']='Please enter a valid email address.';
    if(strlen($business)>200||preg_match('/[\x00-\x1f\x7f]/',$business))$fields['business']='Please shorten the business or website.';
    return [$fields,['first_name'=>$name,'email'=>$email,'business'=>$business]];
}
function ak_checkout(array $d): array {
    [$fields,$lead]=ak_fields($d);if($fields)return [400,['error'=>'Please check your details.','fields'=>$fields]];
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$d['submission_id']??''))return [400,['error'=>'Refresh the form and try again.']];
    $id=$d['submission_id'];$digest=hash('sha256',json_encode($lead));$existing=ak_q('SELECT * FROM ak_orders WHERE id=?',[$id])->fetch();
    if($existing&&!hash_equals($existing['request_hash'],$digest))return [409,['error'=>'Refresh the form before changing your details.']];
    if($existing&&$existing['status']==='paid')return [409,['error'=>'This order is already paid. Use the delivery email or contact Vlad.']];
    if($existing&&$existing['checkout_url']){ak_cookie($existing['token']);return [200,['url'=>$existing['checkout_url']]];}
    if(!ak_ready())return [503,['error'=>'Purchasing is not open yet. Please contact Vlad.']];
    if(!$existing){
      if(!empty($d['website'])||!is_numeric($d['started_at']??null)||microtime(true)*1000-$d['started_at']<1200||microtime(true)*1000-$d['started_at']>86400000)return [400,['error'=>'Please wait a moment, then submit again.']];
      $captcha=wb_captcha_verify(is_string($d['recaptcha_token']??null)?$d['recaptcha_token']:'');if($captcha)return $captcha;
      $campaign=[];foreach(['utm_source','utm_medium','utm_campaign','utm_content','utm_term']as $k)if(is_string($d['campaign'][$k]??null))$campaign[$k]=substr(preg_replace('/[\x00-\x1f\x7f]/','',$d['campaign'][$k]),0,200);
      $lead+=['submitted_at'=>gmdate('c'),'source_page'=>'/alignable-conversion-kit','campaign'=>$campaign,'marketing_consent'=>false,'consent_version'=>'transactional-purchase-v1'];
      $db=wb_db();$db->exec('BEGIN IMMEDIATE');
      try{
        $existing=ak_q('SELECT * FROM ak_orders WHERE id=?',[$id])->fetch();
        if(!$existing){
          if(!wb_rate('ak-ip:'.hash('sha256',($_SERVER['REMOTE_ADDR']??'unknown')),12,3600)||!wb_rate('ak-email:'.hash('sha256',$lead['email']),5,3600)){ $db->exec('COMMIT');return [429,['error'=>'Too many requests. Please try again later.']]; }
          $token=bin2hex(random_bytes(32));ak_q("INSERT INTO ak_orders(id,request_hash,data,status,token_hash,token,created_at) VALUES(?,?,?,'pending',?,?,?)",[$id,$digest,json_encode($lead),hash('sha256',$token),$token,time()]);
        }
        $db->exec('COMMIT');
      }catch(Throwable $e){$db->exec('ROLLBACK');throw $e;}
    }
    $row=ak_q('SELECT * FROM ak_orders WHERE id=?',[$id])->fetch();ak_cookie($row['token']);
    // Verify the server configured Price before creating Checkout. No client price data is used.
    $price=ak_stripe('GET','prices/'.rawurlencode(ak_config()['STRIPE_PRICE_ID']));
    if(($price['unit_amount']??null)!==499||($price['currency']??'')!=='usd'||($price['type']??'')!=='one_time'||($price['active']??false)!==true||($price['livemode']??false)!==((ak_config()['STRIPE_MODE']??'')==='live'))throw new RuntimeException('invalid_server_price');
    $session=ak_stripe('POST','checkout/sessions',[
      'mode'=>'payment','line_items'=>[['price'=>ak_config()['STRIPE_PRICE_ID'],'quantity'=>1]],
      'customer_email'=>$lead['email'],'client_reference_id'=>$id,'metadata'=>['ak_order'=>$id],
      'payment_intent_data'=>['metadata'=>['ak_order'=>$id]],'payment_method_types'=>['card'],
      'success_url'=>AK_ORIGIN.'/alignable-conversion-kit/thank-you?session_id={CHECKOUT_SESSION_ID}',
      'cancel_url'=>AK_ORIGIN.'/alignable-conversion-kit?canceled=1',
      'automatic_tax'=>['enabled'=>'false'],'allow_promotion_codes'=>'true',
      'custom_text'=>['submit'=>['message'=>'30 day money back guarantee. Email vlad@setupshoponline.com within 30 days if not delighted, not finding value, or not seeing results. No proof required.']]
    ],'alignable-checkout-'.$id);
    if(empty($session['id'])||!str_starts_with($session['url']??'','https://checkout.stripe.com/'))throw new RuntimeException('invalid_checkout_response');
    ak_q('UPDATE ak_orders SET session_id=?,checkout_url=? WHERE id=? AND (session_id IS NULL OR session_id=?)',[$session['id'],$session['url'],$id,$session['id']]);
    return [200,['url'=>$session['url']]];
}
function ak_validate_session(array $s,array $order): bool {
    $items=$s['line_items']['data']??[];$item=$items[0]??[];
    $total=$s['amount_total']??null;$discount=$s['total_details']['amount_discount']??null;
    return ($s['status']??'')==='complete' && ($s['mode']??'')==='payment'
      && is_int($total)&&$total>=0&&$total<=499&&is_int($discount)&&$discount>=0&&$discount<=499
      && ($s['amount_subtotal']??null)===499&&$total===499-$discount
      && (($s['payment_status']??'')==='paid'||($total===0&&($s['payment_status']??'')==='no_payment_required'))
      && ($s['currency']??'')==='usd'
      && ($s['livemode']??false)===((ak_config()['STRIPE_MODE']??'')==='live')
      && ($s['client_reference_id']??'')===$order['id']&&($s['metadata']['ak_order']??'')===$order['id']
      && count($items)===1&&($s['line_items']['has_more']??true)===false&&($item['quantity']??0)===1
      && ($item['price']['id']??'')===(ak_config()['STRIPE_PRICE_ID']??'')
      && ($item['amount_subtotal']??null)===499&&($item['amount_total']??null)===$total
      && ($item['amount_discount']??null)===$discount&&($item['amount_tax']??null)===0
      && ($s['total_details']['amount_tax']??null)===0&&($s['total_details']['amount_shipping']??null)===0;
}
function ak_validate_payment(array $s): bool {
    // Stripe does not create a PaymentIntent for a completed no-cost order.
    if($s['amount_total']===0)return empty($s['payment_intent']);
    $intent=$s['payment_intent']??[];$charge=$intent['latest_charge']??[];
    return is_array($intent)&&($intent['status']??'')==='succeeded'
      && ($intent['amount_received']??null)===$s['amount_total']&&($intent['currency']??'')==='usd'
      && is_array($charge)&&($charge['paid']??false)===true
      && ($charge['amount']??null)===$s['amount_total']&&($charge['currency']??'')==='usd'
      && ($charge['amount_refunded']??0)===0&&!($charge['disputed']??false);
}
function ak_fulfill(string $sessionId): bool {
    if(!preg_match('/^cs_[A-Za-z0-9_]+$/D',$sessionId))return false;
    $s=ak_stripe('GET','checkout/sessions/'.rawurlencode($sessionId),['expand'=>['line_items','payment_intent.latest_charge']]);
    $row=ak_q('SELECT * FROM ak_orders WHERE id=?',[$s['client_reference_id']??''])->fetch();
    if(!$row||($row['session_id']!==null&&$row['session_id']!==$sessionId)||!ak_validate_session($s,$row))return false;
    if(!ak_validate_payment($s))return false;
    $intent=$s['payment_intent']??[];$charge=$intent['latest_charge']??[];
    $db=wb_db();$db->exec('BEGIN IMMEDIATE');
    try{
      $row=ak_q('SELECT * FROM ak_orders WHERE id=?',[$row['id']])->fetch();
      if(in_array($row['status'],['refunded','disputed'],true)){$db->exec('COMMIT');return false;}
      ak_q("UPDATE ak_orders SET status='paid',session_id=?,payment_intent=?,charge_id=?,receipt_url=?,amount=?,paid_at=COALESCE(paid_at,?) WHERE id=?",[$sessionId,$intent['id']??null,$charge['id']??null,$charge['receipt_url']??null,$s['amount_total'],time(),$row['id']]);
      foreach(['visitor','owner']as $kind)ak_q("INSERT OR IGNORE INTO ak_jobs(id,order_id,kind) VALUES(?,?,?)",[$row['id'].'-'.$kind,$row['id'],$kind]);
      ak_q("INSERT OR IGNORE INTO ak_metrics(id,order_id,kind,created_at) VALUES(?,?,'verified_purchase',?)",[$row['id'].'-paid',$row['id'],time()]);
      $db->exec('COMMIT');return true;
    }catch(Throwable $e){$db->exec('ROLLBACK');throw $e;}
}
function ak_reconcile_charge(string $chargeId): void {
    $charge=ak_stripe('GET','charges/'.rawurlencode($chargeId));$intent=$charge['payment_intent']??'';
    $row=ak_q('SELECT * FROM ak_orders WHERE payment_intent=?',[$intent])->fetch();if(!$row)return;
    $refunds=ak_stripe('GET','refunds',['charge'=>$chargeId,'limit'=>100]);$pending=false;$failed=false;$success=0;
    foreach($refunds['data']??[]as $r){ak_q('INSERT INTO ak_refunds VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,amount=excluded.amount',[$r['id'],$row['id'],$r['amount'],$r['status']]);$pending=$pending||in_array($r['status'],['pending','requires_action'],true);$failed=$failed||$r['status']==='failed';if($r['status']==='succeeded')$success+=(int)$r['amount'];}
    $amount=(int)($charge['amount_refunded']??$success);$disputeState=$row['dispute_state'];$disputed=(bool)($charge['disputed']??false)&&$disputeState!=='won';
    $state=((int)$row['amount']>0&&$amount>=(int)$row['amount'])?'full':($pending?'pending':($amount>0?'partial':($failed?'failed':'none')));
    $status=$disputed?'disputed':(((int)$row['amount']>0&&$amount>=(int)$row['amount'])?'refunded':'paid');
    $db=wb_db();$db->exec('BEGIN IMMEDIATE');try{
      ak_q('UPDATE ak_orders SET status=?,refunded_amount=?,refund_state=?,dispute_state=? WHERE id=?',[$status,$amount,$state,$disputed?($disputeState==='none'?'needs_response':$disputeState):($disputeState==='won'?'won':'none'),$row['id']]);
      if($status!=='paid')ak_q("UPDATE ak_jobs SET status='canceled',error_code='order_not_paid' WHERE order_id=? AND status IN ('pending','retry')",[$row['id']]);
      if($amount>(int)$row['refunded_amount'])ak_q('INSERT OR IGNORE INTO ak_jobs(id,order_id,kind) VALUES(?,?,?)',[$row['id'].'-refund-'.$amount,$row['id'],'refund']);
      $db->exec('COMMIT');
    }catch(Throwable $e){$db->exec('ROLLBACK');throw $e;}
}
function ak_event(array $event): void {
    if(!is_string($event['id']??null)||!str_starts_with($event['id'],'evt_'))throw new RuntimeException('invalid_event');
    if(($event['livemode']??false)!==((ak_config()['STRIPE_MODE']??'')==='live'))throw new RuntimeException('mode_mismatch');
    if(ak_q('SELECT id FROM ak_events WHERE id=?',[$event['id']])->fetchColumn())return;
    $type=$event['type']??'';$obj=$event['data']['object']??[];
    if(in_array($type,['checkout.session.completed','checkout.session.async_payment_succeeded'],true)){
      $fulfilled=ak_fulfill($obj['id']??'');if(!$fulfilled&&(in_array($obj['payment_status']??'',['paid','no_payment_required'],true)||$type==='checkout.session.async_payment_succeeded')){
        $prior=ak_q('SELECT status FROM ak_orders WHERE session_id=?',[$obj['id']??''])->fetchColumn();if(!in_array($prior,['refunded','disputed'],true))throw new RuntimeException('paid_session_verification_pending');
      }
    }
    elseif(in_array($type,['checkout.session.async_payment_failed','checkout.session.expired'],true)){
      $s=ak_stripe('GET','checkout/sessions/'.rawurlencode($obj['id']));
      if(($s['status']??'')==='complete'&&in_array($s['payment_status']??'',['paid','no_payment_required'],true))ak_fulfill($s['id']);
      else ak_q("UPDATE ak_orders SET status='payment_failed' WHERE session_id=? AND status='pending'",[$s['id']]);
    }elseif(in_array($type,['charge.refunded','refund.created','refund.updated','refund.failed','charge.dispute.created','charge.dispute.updated','charge.dispute.closed'],true)){
      $charge=str_starts_with($type,'charge.refunded')?$obj['id']:($obj['charge']??'');
      if(str_starts_with($type,'charge.dispute.')){$dispute=ak_stripe('GET','disputes/'.rawurlencode($obj['id']));$charge=$dispute['charge']??$charge;ak_q('UPDATE ak_orders SET dispute_state=? WHERE charge_id=?',[$dispute['status']??'unknown',$charge]);}
      if($charge)ak_reconcile_charge($charge);
    }
    ak_q('INSERT OR IGNORE INTO ak_events VALUES(?,?,?)',[$event['id'],$type,time()]);
}
function ak_email(array $job,array $order): array {
    $lead=json_decode($order['data'],true);
    $visitor=$job['kind']==='visitor';$refund=$job['kind']==='refund';$booking=(ak_config()['BOOKING_VERIFIED']??false)===true;
    $paidAmount=number_format(((int)$order['amount'])/100,2,'.','');
    $subject=$visitor?'Your Alignable ebook and workbook are here':($refund?'Your Alignable kit refund confirmation':'New Alignable Conversion Kit purchase');
    if($visitor){
      $text="Hi ".$lead['first_name'].",\n\nThank you for purchasing the Alignable Conversation to Client Kit.\n\nYour two PDFs are attached to this email:\n\n1. From Alignable Conversations to Booked Calls (ebook)\n2. Conversation to Client Conversion Kit (workbook)\n\nStart with the ebook, then use the workbook to practice your introduction, ask better questions, and guide promising conversations toward a clear next step.\n\nWant a second set of eyes on your approach?\n\nBook a complimentary 15 minute review with me. Bring your introduction or one recent networking conversation. We will focus on where it got stuck and identify a practical adjustment you can try. We can also discuss whether further support makes sense for your business.\n\n".($booking?'Book your free 15 minute review: '.AK_BOOKING:'To arrange your complimentary 15 minute review, reply to this email.')."\n\nWishing you great luck meeting new prospects and referral partners on Alignable. I hope the kit helps you turn more introductions into worthwhile conversations.\n\nVlad Gutenmakher\nSet Up Shop Online, Inc.\nvlad@setupshoponline.com\nhttps://www.setupshoponline.com\n\nP.S. Your purchase is covered by our 30 day money back guarantee. If you are not delighted, do not find value, or do not see results, reply within 30 days of purchase for a 100% refund. No proof of results or completed exercises is required. If either PDF attachment is missing or gives you trouble, reply and let me know. Refunds go to your original payment method; bank processing time may vary.\n\nOrder reference: ".$order['id']."\nTotal paid: $".$paidAmount." USD\n\nYour next step: get your free business strategy guide.\nVisit https://setupshoponline.com/free-business-strategy";
    }elseif($refund){$text="Hi ".$lead['first_name'].",\n\nA refund of $".number_format($order['refunded_amount']/100,2)." USD in total has been confirmed for your Alignable kit order ".$order['id'].". It is returned to your original payment method. Bank processing time may vary.\n\nQuestions? Reply to vlad@setupshoponline.com.\n\nVlad Gutenmakher\nSet Up Shop Online, Inc.";
    }else{
      $status=ak_q('SELECT status FROM ak_jobs WHERE id=?',[$order['id'].'-visitor'])->fetchColumn();
      $text="Paid purchase confirmed. This is not a verified download or a qualified lead.\n\nOrder reference: ".$order['id']."\nAmount: $".$paidAmount." USD\nPayment status: paid\nFirst name: ".$lead['first_name']."\nEmail: ".$lead['email']."\nBusiness or website: ".$lead['business']."\nSubmitted at: ".$lead['submitted_at']."\nSource: ".$lead['source_page']."\nUTM attribution: ".json_encode($lead['campaign'])."\nMarketing consent: no, transactional fulfillment only\nVisitor email status: ".$status."\n\nFind this order in the private order CLI using its order reference. No public lead record link is exposed.";
    }
    $escape=static fn($s)=>htmlspecialchars($s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
    $paragraph=static fn($content)=>'<tr><td style="padding:0 0 24px;font:16px/28px Arial,sans-serif;color:#243b53">'.$content.'</td></tr>';
    $button=static fn($url,$label)=>'<table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#ff9b00" style="border-radius:6px;padding:16px 22px"><a href="'.$url.'" style="color:#112e50;font:700 16px/24px Arial,sans-serif;text-decoration:none">'.$label.'</a></td></tr></table>';
    $html='<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f2f6fc"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f2f6fc"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-top:6px solid #0759bf"><tr><td align="left" style="padding:32px 24px;text-align:left"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">';
    $html.=$paragraph('<span style="font-size:12px;font-weight:bold;letter-spacing:2px;color:#0759bf">SET UP SHOP ONLINE</span>');
    $html.=$paragraph('<h1 style="margin:0;font:700 28px/36px Arial,sans-serif;color:#112e50">'.$escape($subject).'</h1>');
    if($visitor){
      $html.=$paragraph('Hi '.$escape($lead['first_name']).',');
      $html.=$paragraph('Thank you for purchasing the <strong>Alignable Conversation to Client Kit.</strong> Your next better conversation starts here.');
      $html.=$paragraph('<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#edf4ff"><tr><td style="padding:24px;font:16px/28px Arial,sans-serif;color:#112e50"><strong style="font-size:20px">Your two PDFs are attached</strong><p style="margin:16px 0 0"><strong>1. Your ebook</strong><br>From Alignable Conversations to Booked Calls</p><p style="margin:16px 0 0"><strong>2. Your workbook</strong><br>Conversation to Client Conversion Kit</p></td></tr></table>');
      $html.=$paragraph('<h2 style="margin:0 0 12px;font:700 20px/28px Arial,sans-serif;color:#0759bf">Start small. Put it into practice.</h2>Read the ebook first. Then use the workbook to practice your introduction, ask better questions, and guide promising conversations toward a clear next step.');
      $html.=$paragraph('<h2 style="margin:0 0 12px;font:700 20px/28px Arial,sans-serif;color:#0759bf">Want a second set of eyes?</h2>Your kit includes an optional <strong>complimentary 15 minute review with me.</strong> Bring your introduction or one recent networking conversation. We will identify a practical adjustment you can try.');
      $html.=$paragraph('We can also discuss whether further support makes sense for your business. There is no obligation to book.');
      $html.=$paragraph($booking?$button(AK_BOOKING,'Book your free 15 minute review'):'Reply to this email to arrange your complimentary review.');
      $html.=$paragraph('<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#fff5df"><tr><td style="padding:24px;border-left:5px solid #ff9b00;font:16px/28px Arial,sans-serif;color:#112e50"><h2 style="margin:0 0 16px;font:700 22px/30px Arial,sans-serif">Your 30 day money back guarantee</h2><p style="margin:0 0 16px">Not delighted, not finding value, or not seeing results? <strong>Reply within 30 days of purchase for a refund of 100% of what you paid.</strong></p><p style="margin:0 0 16px"><strong>No hoops. No proof of results or completed exercises required.</strong></p><p style="margin:0;font-size:14px;line-height:24px">Refunds go to your original payment method. Bank processing time may vary.</p></td></tr></table>');
      $html.=$paragraph('<strong>Need a hand with your PDFs?</strong><br>If either attachment is missing or gives you trouble, simply reply to this email.');
      $html.=$paragraph('Wishing you great luck meeting new prospects and referral partners on Alignable. I hope the kit helps you turn more introductions into worthwhile conversations.');
      $html.=$paragraph('<strong>Vlad Gutenmakher</strong><br>Set Up Shop Online, Inc.<br><a href="mailto:vlad@setupshoponline.com" style="color:#0759bf">vlad@setupshoponline.com</a>');
      $html.=$paragraph('<span style="font-size:14px;color:#526577">Order reference: '.$escape($order['id']).'<br><strong>Total paid: $'.$paidAmount.' USD</strong></span>');
      $html.=$paragraph('<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#112e50"><tr><td style="padding:24px;font:16px/28px Arial,sans-serif;color:#ffffff"><h2 style="margin:0 0 16px;font:700 22px/30px Arial,sans-serif;color:#ffffff">Ready to take the next step for your business?</h2><p style="margin:0 0 24px;color:#ffffff">Explore your next opportunities with our <strong>free business strategy guide.</strong></p>'.$button(AK_ORIGIN.'/free-business-strategy','Get your free strategy guide').'</td></tr></table>');
    }else{
      foreach(explode("\n\n",$text)as $part)$html.=$paragraph(nl2br($escape($part)));
    }
    $html.='</table></td></tr></table></td></tr></table></body></html>';
    $boundary='ak_'.hash('sha256',$job['id']);$alt=$boundary.'_alt';$enc=static fn($s)=>rtrim(chunk_split(base64_encode($s),76,"\r\n"));
    $lines=['From: Vlad Gutenmakher <vlad@setupshoponline.com>','To: '.($visitor||$refund?$lead['email']:'vlad@setupshoponline.com'),'Reply-To: vlad@setupshoponline.com','Subject: =?UTF-8?B?'.base64_encode($subject).'?=','Message-ID: <'.$job['id'].'@setupshoponline.com>','MIME-Version: 1.0','Content-Type: multipart/mixed; boundary="'.$boundary.'"','','--'.$boundary,'Content-Type: multipart/alternative; boundary="'.$alt.'"','','--'.$alt,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',$enc($text),'--'.$alt,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',$enc($html),'--'.$alt.'--'];
    if($visitor){foreach(ak_files()as $name=>$file){if(!is_file($file))throw new RuntimeException('missing_paid_resource');$filename=$name==='ebook'?'Alignable_Conversation_to_Client_Ebook.pdf':'Conversation_to_Client_Workbook.pdf';array_push($lines,'--'.$boundary,'Content-Type: application/pdf; name="'.$filename.'"','Content-Transfer-Encoding: base64','Content-Disposition: attachment; filename="'.$filename.'"','',$enc(file_get_contents($file)));}}
    array_push($lines,'--'.$boundary.'--','');return ['mime'=>base64_encode(implode("\r\n",$lines))];
}
function ak_process(int $limit=8): void {
    ak_init();if(!wb_enabled())return;
    ak_q("UPDATE ak_jobs SET status='manual_review',error_code='interrupted_or_unconfirmed_send' WHERE status='sending' AND lock_until<?",[time()]);
    $jobs=ak_q("SELECT * FROM ak_jobs WHERE status IN ('pending','retry') AND next_attempt<=? ORDER BY CASE kind WHEN 'visitor' THEN 0 ELSE 1 END,id LIMIT ".max(1,min(20,$limit)),[time()])->fetchAll();
    foreach($jobs as $job){
      $order=ak_q('SELECT * FROM ak_orders WHERE id=?',[$job['order_id']])->fetch();if(!$order)continue;
      if($job['kind']!=='refund'&&$order['status']!=='paid'){ak_q("UPDATE ak_jobs SET status='canceled' WHERE id=?",[$job['id']]);continue;}
      try{$token=wb_access_token();}catch(Throwable $e){ak_q("UPDATE ak_jobs SET status='retry',error_code='sender_authorization_required',next_attempt=? WHERE id=?",[time()+3600,$job['id']]);continue;}
      $claim=ak_q("UPDATE ak_jobs SET status='sending',attempts=attempts+1,lock_until=? WHERE id=? AND status IN ('pending','retry')",[time()+180,$job['id']]);if(!$claim->rowCount())continue;
      $status='manual_review';$error='provider_acceptance_unconfirmed';
      try{$message=ak_email($job,$order);[$code]=wb_http('https://graph.microsoft.com/v1.0/me/sendMail',$message['mime'],['Authorization: Bearer '.$token,'Content-Type: text/plain']);
        if($code===202){$status='accepted';$error=null;}
        elseif(in_array($code,[401,403,429],true)){$status=$job['attempts']>=7?'failed':'retry';$error='provider_rejected_'.$code;}
        elseif($code>=400&&$code<500&&$code!==408){$status='failed';$error='provider_rejected_'.$code;}
      }catch(Throwable $e){}
      ak_q('UPDATE ak_jobs SET status=?,error_code=?,next_attempt=?,lock_until=0,provider_id=? WHERE id=?',[$status,$error,time()+min(21600,300*2**min(6,(int)$job['attempts'])),$status==='accepted'?$job['id']:null,$job['id']]);
    }
}
function ak_reissue(string $id,string $verifiedEmail): string {
    if(PHP_SAPI!=='cli')throw new RuntimeException('cli_only');$row=ak_q('SELECT * FROM ak_orders WHERE id=?',[$id])->fetch();
    if(!$row||$row['status']!=='paid'||!hash_equals(strtolower(json_decode($row['data'],true)['email']),strtolower(trim($verifiedEmail))))throw new RuntimeException('verified_paid_order_required');
    $token=bin2hex(random_bytes(32));$db=wb_db();$db->exec('BEGIN IMMEDIATE');try{ak_q('UPDATE ak_orders SET token=?,token_hash=? WHERE id=?',[$token,hash('sha256',$token),$id]);ak_q('INSERT INTO ak_jobs(id,order_id,kind) VALUES(?,?,?)',[$id.'-visitor-reissue-'.bin2hex(random_bytes(6)),$id,'visitor']);$db->exec('COMMIT');}catch(Throwable $e){$db->exec('ROLLBACK');throw $e;}return $token;
}
function ak_dispatch(): void {
    header('Cache-Control: private, no-store');header('X-Content-Type-Options: nosniff');header('Referrer-Policy: no-referrer');header('X-Robots-Tag: noindex, nofollow');
    try{
      ak_init();$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);$method=$_SERVER['REQUEST_METHOD'];
      if($path==='/api/alignable-kit/config'&&$method==='GET'){$c=ak_config();$public=['checkoutEnabled'=>ak_ready(),'recaptchaSiteKey'=>!empty(wb_config()['RECAPTCHA_SECRET_KEY'])?(wb_config()['RECAPTCHA_SITE_KEY']??''):'','bookingVerified'=>($c['BOOKING_VERIFIED']??false)===true];foreach(['VIDEO_URL'=>'videoUrl','VIDEO_CAPTIONS_URL'=>'videoCaptionsUrl']as $k=>$out)if(preg_match('#^https://#',$c[$k]??''))$public[$out]=$c[$k];wb_json($public);}
      if($path==='/api/alignable-kit/webhook'&&$method==='POST'){
        $raw=file_get_contents('php://input',false,null,0,1048577);if(strlen($raw)>1048576)wb_json(['error'=>'Request too large'],413);
        if(!ak_signature($raw,$_SERVER['HTTP_STRIPE_SIGNATURE']??'',ak_config()['STRIPE_WEBHOOK_SECRET']??''))wb_json(['error'=>'Invalid signature'],400);
        $event=json_decode($raw,true);if(!is_array($event))wb_json(['error'=>'Invalid event'],400);ak_event($event);wb_json(['received'=>true]);
      }
      if(in_array($path,['/api/alignable-kit/access','/api/alignable-kit/authorize','/api/alignable-kit/download'],true))wb_json(['error'=>'PDFs are delivered by email only.'],404);
      if($method!=='POST')wb_json(['error'=>'Not found'],404);
      wb_origin();$d=wb_body();
      if($path==='/api/alignable-kit/metric'){
        $allowed=['alignable_visit','alignable_video_play','alignable_video_complete','alignable_verified_purchase_view','alignable_booking_click','alignable_booking_confirmed'];
        if(!is_string($d['event']??null)||!in_array($d['event'],$allowed,true))wb_json(['error'=>'Invalid metric'],400);
        if(!wb_rate('ak-metric:'.hash('sha256',gmdate('Y-m-d').':'.($_SERVER['REMOTE_ADDR']??'')),300,3600))wb_json(['recorded'=>false],429);
        ak_q('INSERT INTO ak_metrics(id,kind,created_at) VALUES(?,?,?)',[bin2hex(random_bytes(16)),$d['event'],time()]);wb_json(['recorded'=>true]);
      }
      if($path==='/api/alignable-kit/checkout'){$r=ak_checkout($d);wb_json($r[1],$r[0]);}
      $token=$_COOKIE['alignable_order']??'';$row=ak_order(is_string($token)?$token:'');
      if(!$row)wb_json(['error'=>'Return in the browser used for checkout or contact Vlad to verify this order.'],403);
      if($path==='/api/alignable-kit/status'){
        if($row['status']==='pending'&&$row['session_id']&&(!isset($d['session_id'])||$d['session_id']===$row['session_id'])){ak_fulfill($row['session_id']);$row=ak_q('SELECT * FROM ak_orders WHERE id=?',[$row['id']])->fetch();}
        ak_cookie($row['token']);$status=ak_q('SELECT status FROM ak_jobs WHERE id=?',[$row['id'].'-visitor'])->fetchColumn();
        wb_json(['state'=>$row['status'],'emailStatus'=>$status?:'pending','orderReference'=>$row['id'],'amount'=>(int)$row['amount'],'receiptUrl'=>$row['status']==='paid'?$row['receipt_url']:null]);
      }
      if($row['status']!=='paid')wb_json(['error'=>'Paid order access is required. Contact Vlad for help.'],403);
      if($path==='/api/alignable-kit/resend'){
        $db=wb_db();$db->exec('BEGIN IMMEDIATE');try{if(wb_rate('ak-resend:'.$row['id'],3,86400))ak_q('INSERT OR IGNORE INTO ak_jobs(id,order_id,kind) VALUES(?,?,?)',[$row['id'].'-visitor-resend-'.intdiv(time(),300),$row['id'],'visitor']);$db->exec('COMMIT');}catch(Throwable $e){$db->exec('ROLLBACK');throw $e;}wb_json(['requested'=>true]);
      }
      wb_json(['error'=>'Not found'],404);
    }catch(Throwable $e){wb_json(['error'=>'This request is temporarily unavailable. Please try again or contact vlad@setupshoponline.com.'],503);}
}

