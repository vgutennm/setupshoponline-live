"""Offline payment/fulfillment regression tests. No live charges or emails."""
import os, pathlib, shutil, subprocess, tempfile, json, urllib.parse, email, email.policy

root = pathlib.Path(__file__).resolve().parents[1]
php = os.environ.get('PHP_BIN', 'php')
flags = os.environ.get('PHP_FLAGS', '').split()
with tempfile.TemporaryDirectory() as directory:
    base = pathlib.Path(directory)
    app = base / 'app'
    app.mkdir()
    text = (root / 'server/alignable-kit.php').read_text().replace('function ak_stripe(', 'function ak_real_stripe(')
    (app / 'alignable-kit.php').write_text(text)
    private_files = os.environ.get('AK_PRIVATE_FILES')
    if private_files:
        shutil.copytree(pathlib.Path(private_files), app / 'alignable-files')
    else:
        (app / 'alignable-files').mkdir()
        for name in ['ebook', 'workbook']:
            (app / 'alignable-files' / (name + '.pdf')).write_bytes(b'%PDF-1.4 test fixture ' + name.encode())
    (base / 'alignable-config.php').write_text("<?php return ['STRIPE_MODE'=>'test','STRIPE_SECRET_KEY'=>'sk_test_mock','STRIPE_PRICE_ID'=>'price_mock','STRIPE_WEBHOOK_SECRET'=>'whsec_mock','TAX_TOTAL_CONFIRMED'=>true,'SENDER_VERIFIED'=>true,'BOOKING_VERIFIED'=>false];")
    (app / 'test.php').write_text(r'''<?php
declare(strict_types=1);
ob_start();
function wb_db():PDO{static $db;if(!$db)$db=new PDO('sqlite:'.__DIR__.'/test.sqlite',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);return $db;}
function wb_query(string $s,array $p=[]):PDOStatement{$q=wb_db()->prepare($s);$q->execute($p);return $q;}
function wb_enabled():bool{return true;}
function wb_config():array{return ['RECAPTCHA_SECRET_KEY'=>'mock','RECAPTCHA_SITE_KEY'=>'mock'];}
function wb_access_token():string{return 'mock';}
function wb_captcha_verify(string $t):?array{return $t==='mock'?null:[400,['error'=>'captcha required']];}
function wb_rate(string $key,int $limit,int $seconds):bool{global $rates;$n=$rates[$key]??0;$rates[$key]=$n+1;return $n<$limit;}
function wb_http(string $u,string $body,array $headers):array{global $mail,$sendCode;$mail[]=base64_decode($body);if($sendCode===0)throw new RuntimeException('ambiguous');return [$sendCode,''];}
function ak_stripe(string $method,string $path,array $data=[],?string $idempotency=null):array{
 global $session,$charge,$refunds,$calls,$dispute;$calls[]=[$method,$path,$data,$idempotency];
 if(str_starts_with($path,'prices/'))return ['id'=>'price_mock','unit_amount'=>499,'currency'=>'usd','type'=>'one_time','active'=>true,'livemode'=>false];
 if($method==='POST'&&$path==='checkout/sessions')return ['id'=>'cs_test_mock','url'=>'https://checkout.stripe.com/c/pay/cs_test_mock'];
 if(str_starts_with($path,'checkout/sessions/'))return $session;
 if(str_starts_with($path,'charges/'))return $charge;
 if($path==='refunds')return ['data'=>$refunds];
 if(str_starts_with($path,'disputes/'))return $dispute;
 throw new RuntimeException('Unexpected Stripe operation');
}
function ok(bool $condition,string $message):void{if(!$condition)throw new RuntimeException($message);echo 'PASS '.$message."\n";}
require __DIR__.'/alignable-kit.php';ak_init();$sendCode=202;$rates=[];$mail=[];$calls=[];
$id='11111111-1111-4111-8111-111111111111';
$input=['first_name'=>'Test','email'=>'buyer@example.test','business'=>'Sample','submission_id'=>$id,'started_at'=>microtime(true)*1000-3000,'recaptcha_token'=>'mock','campaign'=>['utm_source'=>'test']];
ok(!ak_fields($input)[0],'first name and email only, no phone required');
ok(isset(ak_fields($input+['extra'=>'x'])[1]['business']),'optional business accepted');
ok(isset(ak_fields(array_merge($input,['email'=>'bad']))[0]['email']),'invalid email rejected');
$raw='{"id":"evt_mock"}';$t=time();$sig='t='.$t.',v1='.hash_hmac('sha256',$t.'.'.$raw,'whsec_mock');
ok(ak_signature($raw,$sig,'whsec_mock'),'unmodified webhook signature accepted');
ok(!ak_signature($raw.' ',$sig,'whsec_mock'),'modified webhook signature rejected');
ok(!ak_signature($raw,'t=1,v1=x','whsec_mock'),'stale webhook rejected');
$first=ak_checkout($input);$repeat=ak_checkout($input);
ok($first[0]===200&&$repeat[1]['url']===$first[1]['url'],'duplicate submissions reuse a single Checkout');
ok((int)ak_q('SELECT count(*) FROM ak_orders')->fetchColumn()===1,'one durable pending order');
$post=array_values(array_filter($calls,fn($c)=>$c[0]==='POST'));
ok(count($post)===1&&$post[0][2]['line_items'][0]===['price'=>'price_mock','quantity'=>1],'fixed configured price and quantity, not browser values');
ok($post[0][2]['mode']==='payment'&&$post[0][3]==='alignable-checkout-'.$id,'one time payment with stable provider idempotency key');
ok($post[0][2]['allow_promotion_codes']==='true','checkout exposes promotion code field');
$row=ak_q('SELECT * FROM ak_orders WHERE id=?',[$id])->fetch();$token=$row['token'];
ok((int)ak_q('SELECT count(*) FROM ak_jobs')->fetchColumn()===0,'pending or canceled payment cannot queue delivery');
$session=['id'=>'cs_test_mock','status'=>'complete','amount_subtotal'=>499,'total_details'=>['amount_discount'=>0,'amount_tax'=>0,'amount_shipping'=>0],'payment_status'=>'unpaid','mode'=>'payment','amount_total'=>499,'currency'=>'usd','livemode'=>false,'client_reference_id'=>$id,'metadata'=>['ak_order'=>$id],'line_items'=>['has_more'=>false,'data'=>[['quantity'=>1,'price'=>['id'=>'price_mock'],'amount_subtotal'=>499,'amount_discount'=>0,'amount_tax'=>0,'amount_total'=>499]]],'payment_intent'=>['id'=>'pi_mock','status'=>'succeeded','amount_received'=>499,'currency'=>'usd','latest_charge'=>['id'=>'ch_mock','amount'=>499,'currency'=>'usd','paid'=>true,'amount_refunded'=>0,'disputed'=>false,'receipt_url'=>'https://pay.stripe.com/receipts/mock']]];
ok(!ak_fulfill('cs_test_mock'),'success redirect or unpaid session cannot fulfill');
$session['payment_status']='paid';$session['amount_total']=500;ok(!ak_fulfill('cs_test_mock'),'incorrect amount rejected');$session['amount_total']=499;
$session['line_items']['data'][0]['price']['id']='price_wrong';ok(!ak_fulfill('cs_test_mock'),'incorrect product price rejected');$session['line_items']['data'][0]['price']['id']='price_mock';
$session['livemode']=true;ok(!ak_fulfill('cs_test_mock'),'test and live mode mismatch rejected');$session['livemode']=false;
ok(ak_fulfill('cs_test_mock'),'server verified paid session fulfills without a browser return');
ak_fulfill('cs_test_mock');
$event=['id'=>'evt_paid','type'=>'checkout.session.completed','livemode'=>false,'data'=>['object'=>['id'=>'cs_test_mock']]];ak_event($event);ak_event($event);
ok((int)ak_q('SELECT count(*) FROM ak_jobs')->fetchColumn()===2,'duplicate webhooks and refreshes create one visitor and one owner job');
$event['id']='evt_expired_old';$event['type']='checkout.session.expired';ak_event($event);
ok(ak_order($token)['status']==='paid','out of order expiration cannot downgrade a paid order');
$visitor=ak_q("SELECT * FROM ak_jobs WHERE kind='visitor'")->fetch();$row=ak_order($token);$m=base64_decode(ak_email($visitor,$row)['mime']);
ok(substr_count($m,'Content-Disposition: attachment;')===2,'two separately named PDF attachments');file_put_contents(__DIR__.'/visitor.eml',$m);
ok(str_contains($m,'To: buyer@example.test')&&!str_contains($m,"\r\nCc:"),'visitor message has no owner CC');
$owner=ak_q("SELECT * FROM ak_jobs WHERE kind='owner'")->fetch();$m2=base64_decode(ak_email($owner,$row)['mime']);
ok(str_contains($m2,'To: vlad@setupshoponline.com')&&!str_contains($m2,'Content-Disposition: attachment;'),'separate owner notification');
ak_process();ak_process();ok(count($mail)===2,'accepted mail is never resent by cron');
ak_q("UPDATE ak_jobs SET status='retry' WHERE kind='visitor'");$sendCode=429;ak_process();ok(ak_q("SELECT status FROM ak_jobs WHERE kind='visitor'")->fetchColumn()==='retry','provider rejection retries safely');
ak_q("UPDATE ak_jobs SET next_attempt=0 WHERE kind='visitor'");$sendCode=0;ak_process();ok(ak_q("SELECT status FROM ak_jobs WHERE kind='visitor'")->fetchColumn()==='manual_review','ambiguous mail outcome is held, not duplicated');
$before=count($mail);ak_process();ok(count($mail)===$before,'uncertain provider outcomes do not automatically resend');
$new=ak_reissue($id,'buyer@example.test');ok(!ak_order($token)&&ak_order($new)['status']==='paid','controlled verified buyer reissue revokes old access');
try{ak_reissue($id,'stranger@example.test');ok(false,'wrong email must fail');}catch(RuntimeException $e){ok(true,'arbitrary email cannot recover another order');}
$charge=['id'=>'ch_mock','payment_intent'=>'pi_mock','amount_refunded'=>0,'disputed'=>false];$refunds=[['id'=>'re_mock','amount'=>499,'status'=>'pending']];ak_reconcile_charge('ch_mock');
ok(ak_order($new)['refund_state']==='pending'&&ak_order($new)['status']==='paid','pending refund is not marked completed');
$refunds[0]['status']='failed';ak_reconcile_charge('ch_mock');ok(ak_order($new)['refund_state']==='failed','failed refund accurately recorded');
$refunds[0]['status']='succeeded';$charge['amount_refunded']=200;$refunds[0]['amount']=200;ak_reconcile_charge('ch_mock');ok(ak_order($new)['refund_state']==='partial','partial refund distinct from full');
$charge['amount_refunded']=499;$refunds[0]['amount']=499;ak_reconcile_charge('ch_mock');ak_reconcile_charge('ch_mock');
ok(ak_order($new)['status']==='refunded'&&(int)ak_q('SELECT count(*) FROM ak_refunds')->fetchColumn()===1,'full refund reconciled without duplicate reimbursement');
ok(!ak_fulfill('cs_test_mock'),'late completed event cannot reopen refunded access');
ok(count(array_filter($calls,fn($c)=>$c[0]==='POST'&&str_starts_with($c[1],'refunds')))===0,'no automatic refund creation or live reimbursement');

// Fresh orders prove actual discounted totals, zero-cost fulfillment, deduplication and refunds.
$baseSession=$session;
foreach([250,0,0] as $index=>$total){
 $discountId='discount-order-'.$index;
 $newSession='cs_test_discount'.$index;
 $tkn=hash('sha256',$discountId);
 ak_q("INSERT INTO ak_orders(id,request_hash,data,status,token_hash,token,session_id,created_at) VALUES(?,?,?,'pending',?,?,?,?)",[$discountId,'mock',json_encode(['first_name'=>'A <B>','email'=>'buyer@example.test','business'=>'','submitted_at'=>'test','source_page'=>'test','campaign'=>[]]),hash('sha256',$tkn),$tkn,$newSession,time()]);
 $session=$baseSession;$session['id']=$newSession;$session['client_reference_id']=$discountId;$session['metadata']['ak_order']=$discountId;
 $session['amount_total']=$total;$session['total_details']['amount_discount']=499-$total;
 $session['line_items']['data'][0]['amount_total']=$total;$session['line_items']['data'][0]['amount_discount']=499-$total;
 if($total===0){$session['payment_status']='no_payment_required';$session['payment_intent']=null;}
 else{$session['payment_intent']['id']='pi_discount';$session['payment_intent']['amount_received']=$total;$session['payment_intent']['latest_charge']['id']='ch_discount';$session['payment_intent']['latest_charge']['amount']=$total;}
 $valid=$session;
 $session['status']='open';ok(!ak_fulfill($newSession),'incomplete discounted checkout rejected');$session=$valid;
 $session['total_details']['amount_discount']=0;ok(!ak_fulfill($newSession),'inconsistent discount rejected');$session=$valid;
 $session['payment_status']='unpaid';ok(!ak_fulfill($newSession),'unpaid discounted checkout rejected');$session=$valid;
 if($total>0){$session['payment_intent']['amount_received']=499;ok(!ak_fulfill($newSession),'wrong discounted payment amount rejected');$session=$valid;}
 ok(ak_fulfill($newSession),'discounted order fulfills: '.$total);
 ak_fulfill($newSession);
 $discountOrder=ak_order($tkn);ok((int)$discountOrder['amount']===$total,'actual total persisted');
 ok((int)ak_q('SELECT count(*) FROM ak_jobs WHERE order_id=?',[$discountId])->fetchColumn()===2,'discount delivery jobs deduplicated');
 file_put_contents(__DIR__.'/discount-'.$index.'.eml',base64_decode(ak_email(['id'=>$discountId.'-visitor','kind'=>'visitor'],$discountOrder)['mime']));
 if($total>0){$charge=['id'=>'ch_discount','payment_intent'=>'pi_discount','amount_refunded'=>$total,'disputed'=>false];$refunds=[['id'=>'re_discount','amount'=>$total,'status'=>'succeeded']];ak_reconcile_charge('ch_discount');ok(ak_order($tkn)['status']==='refunded','discounted full refund uses actual amount paid');}
 else{ok($discountOrder['payment_intent']===null,'zero-cost order has no fabricated payment intent');}
}
echo "All offline payment and delivery tests passed. No provider calls made.\n";
''')
    subprocess.run([php, *flags, str(app/'test.php')], check=True)
    bootstrap = (app/'test.php').read_text().split('function ok(')[0]
    (app/'dispatch.php').write_text(bootstrap + r'''
function wb_body(int $limit=8192):array{return json_decode(getenv('AK_BODY')?:'{}',true);}
function wb_origin():void{if(($_SERVER['HTTP_ORIGIN']??'')!=='https://setupshoponline.com')wb_json(['error'=>'origin'],403);}
function wb_json(array $data,int $code=200):void{echo json_encode(['code'=>$code,'body'=>$data]);exit;}
require __DIR__.'/alignable-kit.php';ak_init();$rates=[];$sendCode=202;
$_SERVER['REQUEST_URI']=getenv('AK_ROUTE');$_SERVER['REQUEST_METHOD']=getenv('AK_METHOD')?:'POST';$_SERVER['HTTP_ORIGIN']=getenv('AK_ORIGIN')?:'https://setupshoponline.com';$_GET=json_decode(getenv('AK_QUERY')?:'{}',true);if(getenv('AK_COOKIE'))$_COOKIE['alignable_order']=getenv('AK_COOKIE');
if(getenv('AK_SEED'))ak_q("UPDATE ak_orders SET status='paid',token=?,token_hash=? WHERE id=?",[str_repeat('a',64),hash('sha256',str_repeat('a',64)),'11111111-1111-4111-8111-111111111111']);
ak_dispatch();
''')
    message=email.message_from_bytes((app/'visitor.eml').read_bytes(),policy=email.policy.default)
    attachments=list(message.iter_attachments())
    assert len(attachments)==2 and all(part.get_content_type()=='application/pdf' for part in attachments)
    assert attachments[0].get_payload(decode=True)!=(attachments[1].get_payload(decode=True))
    plain=message.get_body(preferencelist=('plain',)).get_content()
    html=message.get_body(preferencelist=('html',)).get_content()
    assert '/api/alignable-kit/' not in plain+html and 'Download your' not in plain+html
    assert 'attached' in plain and 'attached' in html
    assert attachments[0].get_payload(decode=True)==(app/'alignable-files/ebook.pdf').read_bytes()
    assert attachments[1].get_payload(decode=True)==(app/'alignable-files/workbook.pdf').read_bytes()
    if os.environ.get('AK_PREVIEW_DIR'):
        preview = pathlib.Path(os.environ['AK_PREVIEW_DIR'])
        preview.mkdir(parents=True, exist_ok=True)
        (preview / 'confirmation-email.html').write_text(html)
    assert 'white-space:pre-wrap' not in html
    assert 'padding:0 0 24px' in html and '30 day money back guarantee' in html
    assert 'https://setupshoponline.com/free-business-strategy' in html and 'https://setupshoponline.com/free-business-strategy' in plain
    for index, total in enumerate(['2.50', '0.00', '0.00']):
        discounted = email.message_from_bytes((app / ('discount-' + str(index) + '.eml')).read_bytes(), policy=email.policy.default)
        assert len(list(discounted.iter_attachments())) == 2
        for kind in ['plain', 'html']:
            body = discounted.get_body(preferencelist=(kind,)).get_content()
            assert 'Total paid: $' + total + ' USD' in body
        assert 'A &lt;B&gt;' in discounted.get_body(preferencelist=('html',)).get_content()
    print('PASS PDF bytes intact, spacious HTML, strategy CTA, safe customer names and correct discounted totals')
    def call(route, body=None, method='POST', query=None, seed=False, origin='https://setupshoponline.com', cookie=''):
        env = dict(os.environ, AK_ROUTE='/api/alignable-kit/'+route, AK_METHOD=method, AK_BODY=json.dumps(body or {}), AK_QUERY=json.dumps(query or {}), AK_SEED='1' if seed else '', AK_ORIGIN=origin, AK_COOKIE=cookie)
        return subprocess.check_output([php,*flags,str(app/'dispatch.php')],env=env)
    token='a'*64
    for route in ['authorize','access','download']:
        denied=json.loads(call(route,{'token':token,'resource':'ebook'},method='POST' if route=='authorize' else 'GET',seed=True,cookie=token))
        assert denied['code']==404
    print('PASS no website PDF access, download or authorization endpoints, even for paid buyers')
    assert json.loads(call('resend',{},cookie=token))['body']['requested']
    assert json.loads(call('resend',{'email':'buyer@example.test'}))['code']==403
    assert json.loads(call('resend',{'token':token}))['code']==403
    assert json.loads(call('resend',{},cookie=token,origin='https://other.example.test'))['code']==403
    print('PASS paid browser cookie required for resend; cross origin requests and arbitrary emails rejected')

