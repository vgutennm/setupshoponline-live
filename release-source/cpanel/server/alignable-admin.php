<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/app.php';require __DIR__.'/alignable-kit.php';ak_init();
$action=$argv[1]??'';$id=$argv[2]??'';
if($action==='status'){
 $row=ak_q('SELECT id,status,paid_at,refunded_amount,refund_state,dispute_state FROM ak_orders WHERE id=?',[$id])->fetch();
 echo json_encode(['order'=>$row,'jobs'=>ak_q('SELECT id,kind,status,attempts,error_code FROM ak_jobs WHERE order_id=?',[$id])->fetchAll()],JSON_PRETTY_PRINT)."\n";
}elseif($action==='reissue'){
 // Buyer email is read from stdin. Verify ownership in existing purchase correspondence first.
 ak_reissue($id,trim(stream_get_contents(STDIN)));echo "Previous access revoked; replacement delivery queued.\n";
}elseif($action==='reconcile'){
 $row=ak_q('SELECT charge_id FROM ak_orders WHERE id=?',[$id])->fetch();if(!$row||!$row['charge_id'])throw new RuntimeException('Unknown paid order');ak_reconcile_charge($row['charge_id']);echo "Stripe status reconciled.\n";
}elseif($action==='resolve-email'){
 // Use only after inspecting provider Sent Items or confirming provider rejection.
 $state=$argv[3]??'';if(!in_array($state,['accepted','retry'],true))throw new RuntimeException('Use accepted or retry after provider review.');
 ak_q("UPDATE ak_jobs SET status=?,next_attempt=0,error_code='operator_provider_review' WHERE id=? AND status='manual_review'",[$state,$id]);echo "Reviewed job updated.\n";
}else{echo "Commands: status ORDER_ID; reissue ORDER_ID (verified buyer email on stdin); reconcile ORDER_ID; resolve-email JOB_ID accepted|retry. No automatic refund endpoint.\n";}
