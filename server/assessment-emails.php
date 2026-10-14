<?php
declare(strict_types=1);
function as_client_email(array $row): string {
 $c=json_decode($row['contact_json'],true);$title=$row['kind']==='agentic'?'Agentic Readiness Report':'Business Strategy Report';
 return "Hi {$c['full_name']},\n\nYour free {$title} for {$c['business_name']} is attached.\n\nInside you’ll find your key findings, practical priorities, and a roadmap for days 1 through 30, 31 through 60, and 61 through 90 based on the answers you provided. Created with AI using your answers. The report uses the SUSO Framework and Custom Assessment methodology and passed an automated quality check.\n\nYour next step: book a free Strategy Review with me. Bring your report so we can discuss your priorities and decide whether deeper, paid strategy work would help.\n".as_definition()['reviewUrl']."\n\nYour report is yours to keep. No booking or purchase is required. Reply to this email if you have a question.";
}
function as_email_html(string $text): string {
 $html=htmlspecialchars($text,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
 $html=preg_replace_callback('~https?://[^\s<)]+~',static fn($m)=>'<a href="'.$m[0].'">'.$m[0].'</a>',$html);
 return '<div style="font:16px/1.6 Arial,sans-serif;color:#193249;max-width:680px">'.nl2br($html,false).'</div>';
}
function as_owner_summary(array $row): string {
 $c=json_decode($row['contact_json'],true);$r=json_decode($row['report_json'],true);$answers=json_decode($row['answers_json'],true);$missing='Needs confirmation';
 $val=static fn($v)=>is_array($v)?implode(', ',$v):($v?:'Needs confirmation');
 $title=$row['kind']==='agentic'?'Agentic Readiness Report':'Business Strategy Report';
 $category=$row['category'];foreach(as_definition()['categories'] as $cat)if($cat['id']===$category)$category=$cat['title'];
 $name=trim($c['full_name']);$parts=preg_split('/\s+/u',$name);
 $s=strtoupper('NEW '.$title)."\n\nName: $name\nCompany: {$c['business_name']}\nEmail: {$c['email']}\nPhone: {$c['phone']}\nAssessment priority: $category\nAssessment ID: {$row['id']}\n\nPERSON AND BUSINESS\n";
 foreach(as_questions($row['category']) as $q)$s.=$q['text'].': '.$val($answers[$q['id']]??null)."\n";
 $s.="\nREPORT SUMMARY\n{$r['headline']}\n\n{$r['summary']}\n\nKEY FINDINGS\n";
 foreach($r['findings'] as $i=>$f)$s.=($i+1).". {$f['title']}\n{$f['observation']}\nRecommended first step: {$f['next_step']}\nConfidence: {$f['confidence']}\n\n";
 $s.="FIRST SEVEN DAYS\n{$r['quick_win']['title']}\n";foreach($r['quick_win']['steps'] as $i=>$v)$s.=($i+1).". $v\n";
 $s.="\n90 DAY PLAN\n";foreach($r['roadmap'] as $v)$s.="{$v['phase']}: {$v['focus']}\n";
 $s.="\nDETAILS TO CONFIRM\n".implode("\n",$r['assumptions']);
 $s.="\n\nBIGIN CONTACT\nFull name: $name\nFirst name: ".(count($parts)===2?$parts[0]:$missing)."\nLast name: ".(count($parts)===2?$parts[1]:$missing)."\nName split: Suggested only; confirm before entry\nEmail: {$c['email']}\nPhone: {$c['phone']}\nTitle or role: $missing\nCompany: {$c['business_name']}\nMailing address or location: $missing\nContact source: Set Up Shop Online website, Free $title\nContact owner: Vlad Gutenmakher\nContact notes: Completed $category. No review booking or purchase confirmed.\n\nBIGIN COMPANY\nCompany name: {$c['business_name']}\nWebsite: $missing\nIndustry or business type: $missing\nPhone: $missing; submitted contact phone: {$c['phone']}\nAddress or location: $missing\nCompany owner: Vlad Gutenmakher\nCompany description: ".$val($answers['Q1']??null);
 $s.="\n\nBIGIN DEAL\nDeal name: $name | Strategy Review | $category\nContact: $name\nCompany: {$c['business_name']}\nAmount: $missing; paid work has not been agreed\nService: Free Strategy Review; possible paid strategy work only if separately agreed\nTerm or scope: Review the findings and discuss a suitable next step\nFrequency or deliverables: Optional review call; booking not confirmed\nStart date: $missing\nExpected closing or end date: $missing\nDeal stage: $missing; assessment completed, not a confirmed paid opportunity\nDeal source: Set Up Shop Online website, Free $title\nDeal owner: Vlad Gutenmakher\nNext action: Review the findings, check for an existing Bigin contact, company and deal, then follow up about the optional free Strategy Review\nNext action date: $missing\nDeal description: {$r['opportunities'][0]['title']}. Assessment ID: {$row['id']}.\nExclusions: No booking, budget, paid scope, start date, purchase, or contract is confirmed.\n\nBook Free Strategy Review: ".as_definition()['reviewUrl']."\n\nThese are prepared details for Bigin; no CRM records have been created. The report was created with AI using the submitted answers and passed an automated quality check. Confirm recommendations and missing details before acting.";
 return $s;
}
