<?php
declare(strict_types=1);
function as_report_sections(array $row): array {
 $r=json_decode($row['report_json'],true);$c=json_decode($row['contact_json'],true);$answers=json_decode($row['answers_json'],true);$a=$r['assessment'];
 $answer=static fn($id)=>is_array($answers[$id]??null)?implode(', ',$answers[$id]):($answers[$id]??'Not provided');
 $pages=[['title'=>$row['kind']==='agentic'?'Your Agentic Readiness Report':'Your Business Strategy Report','blocks'=>[['Prepared for '.$c['business_name'],$c['full_name'].' | '.gmdate('F j, Y',(int)$row['created_at'])],[$r['headline'],$r['summary']],['About this report','Created with AI using your answers, the SUSO Framework and Custom Assessment methodology. Passed an automated quality check; this is not personal review by Vlad.']]]];
 $blocks=[];foreach(as_questions($row['category']) as $q)$blocks[]=[$q['text'],$answer($q['id'])];$pages[]=['title'=>'Your Starting Point','blocks'=>$blocks];
 $blocks=[];foreach($r['findings'] as $f)$blocks[]=[$f['title'],$f['observation']."\nWhy it matters: ".$f['why_it_matters']."\nFirst step: ".$f['next_step']."\nEvidence: ".implode(', ',$f['evidence_ids'])."\n".$f['confidence']];$blocks[]=['What may be causing the problem',$a['root_cause']];$pages[]=['title'=>'Your Key Findings','blocks'=>$blocks];
 $blocks=[];foreach($r['opportunities'] as $o)$blocks[]=[$o['title'],$o['action']."\nWho: ".$o['owner']."\nEffort: ".$o['effort']."\nMeasure: ".$o['measure']];$blocks[]=['Why this order',$a['priority_reasoning']];$blocks[]=['Stop or simplify',$r['stop_or_simplify']];$blocks[]=['Where AI may help',$r['ai_opportunity']];$pages[]=['title'=>'Your Best Opportunities','blocks'=>$blocks];
 $blocks=[[$r['quick_win']['title'],'Start with a small action you can complete and review.']];foreach($r['quick_win']['steps'] as $i=>$s)$blocks[]=['Step '.($i+1),$s];$blocks[]=['How work happens today',$a['current_workflow']];$blocks[]=['A better way to work',$a['proposed_workflow']."\n".$a['human_role']];$pages[]=['title'=>'Your First Seven Days','blocks'=>$blocks];
 foreach($r['roadmap'] as $i=>$phase){$blocks=[['Focus',$phase['focus']]];foreach($phase['actions'] as $v)$blocks[]=[$v['action'],'Deliverable: '.$v['deliverable']."\nWho: ".$v['owner']."\nMeasure: ".$v['measure']];$blocks[]=$i===0?['What needs to be ready',$a['readiness']."\n".$a['dependencies']]:($i===1?['Risks and human controls',$a['risks_controls']]:['What to measure and decide',$a['impact_basis']."\n".$a['decision']]);$pages[]=['title'=>$phase['phase'],'blocks'=>$blocks];}
 $blocks=[];foreach($r['metrics'] as $m)$blocks[]=[$m['name'],'Starting point: '.$m['baseline']."\nHow to track: ".$m['method']];$blocks[]=['Strengths, gaps, opportunities and risks',$a['swot']];$blocks[]=['What still needs confirming',implode("\n",$r['assumptions'])];$pages[]=['title'=>'Track Progress and Confirm Details','blocks'=>$blocks];
 $pages[]=['title'=>'Turn Your Findings Into Action','blocks'=>[['Book Your Free Strategy Review',as_definition()['reviewUrl']],['What to expect','Bring your report to a free review with Set Up Shop Online. We will discuss what is accurate, what needs confirming, and a sensible first step.'],['Your report is yours to keep','No booking or purchase is required. Detailed strategy, solution design, and implementation are paid services, agreed with you first.'],['Set Up Shop Online, Inc.','Vlad@SetupShopOnline.com | 201-757-0134 | SetUpShopOnline.com']]];
 return $pages;
}
function as_pdf_text(string $s): string {
 $s=str_replace(["\r","\t"],['',' '],$s);$v=iconv('UTF-8','Windows-1252//TRANSLIT',$s);if($v===false)$v='Text unavailable';return str_replace(['\\','(',')'],['\\\\','\\(','\\)'],$v);
}
function as_pdf_lines(string $text,int $limit=73): array {
 static $metrics;$metrics??=json_decode(file_get_contents(__DIR__.'/fonts/metrics.json'),true);
 $size=$limit===42?19:($limit===65?12:10);$font=$metrics[$limit===73?'regular':'bold']['widths'];
 $width=static function(string $v)use($size,$font): float {$b=iconv('UTF-8','Windows-1252//TRANSLIT',$v);$w=0;foreach(str_split($b===false?'':$b) as $c)$w+=$font[ord($c)-32]??600;return $w*$size/1000;};
 $out=[];foreach(explode("\n",str_replace("\r",'',$text)) as $paragraph){$line='';foreach(preg_split('/\s+/u',trim($paragraph)) as $word){
  if($width($word)>487){if($line!==''){$out[]=$line;$line='';}$part='';foreach(preg_split('//u',$word,-1,PREG_SPLIT_NO_EMPTY) as $ch){if($width($part.$ch)>487){$out[]=$part;$part='';}$part.=$ch;}$word=$part;}
  $next=$line.($line===''?'':' ').$word;if($width($next)>487){$out[]=$line;$line=$word;}else $line=$next;
 }$out[]=$line;}return $out;
}
function as_report_pdf(array $row): string {
 $streams=[];$stream='';$y=0;$pageNo=0;
 $line=static function(string $text,float $size,bool $bold=false,string $color='0.12 0.17 0.25')use(&$stream,&$y){$stream.=$color." rg BT /".($bold?'F2':'F1')." $size Tf 1 0 0 1 54 $y Tm (".as_pdf_text($text).") Tj ET\n";$y-=$size+5;};
 $start=static function(string $title)use(&$streams,&$stream,&$y,&$pageNo,$line){if($stream!=='')$streams[]=$stream;$stream='';if(++$pageNo>15)throw new LengthException('PDF page limit');$y=790;$line('SET UP SHOP ONLINE',11,true,'0.08 0.28 0.60');$y-=15;foreach(as_pdf_lines($title,42) as $t)$line($t,19,true);$y-=12;$stream.="0.75 0.82 0.9 RG 54 736 m 541 736 l S\n";$stream.="0.35 0.4 0.5 rg BT /F1 9 Tf 1 0 0 1 54 29 Tm (SetUpShopOnline.com | Private assessment report | $pageNo) Tj ET\n";};
 foreach(as_report_sections($row) as $section){$start($section['title']);foreach($section['blocks'] as [$title,$body]){if($y<125)$start($section['title'].' - continued');foreach(as_pdf_lines($title,65) as $t){if($y<65)$start($section['title'].' - continued');$line($t,12,true,'0.08 0.28 0.60');}foreach(as_pdf_lines($body) as $t){if($y<65)$start($section['title'].' - continued');$line($t,10);} $y-=12;}}
 if($stream!=='')$streams[]=$stream;
 $objects=[1=>'<< /Type /Catalog /Pages 2 0 R >>'];
 $fonts=json_decode(file_get_contents(__DIR__.'/fonts/metrics.json'),true);
 foreach(['regular','bold'] as $j=>$kind){$font=$fonts[$kind];$id=3+$j;$descriptor=5+$j*2;$file=$descriptor+1;$bytes=file_get_contents(__DIR__.'/fonts/'.$kind.'.ttf');$name=$font['name'];
 $objects[$id]="<< /Type /Font /Subtype /TrueType /BaseFont /$name /FirstChar 32 /LastChar 255 /Widths [".implode(' ',$font['widths'])."] /FontDescriptor $descriptor 0 R /Encoding /WinAnsiEncoding >>";
 $objects[$descriptor]="<< /Type /FontDescriptor /FontName /$name /Flags 32 /FontBBox [".implode(' ',$font['bbox'])."] /ItalicAngle 0 /Ascent ".$font['ascent']." /Descent ".$font['descent']." /CapHeight ".$font['ascent']." /StemV 80 /FontFile2 $file 0 R >>";
 $objects[$file]='<< /Length '.strlen($bytes).' /Length1 '.strlen($bytes)." >>\nstream\n".$bytes."\nendstream";
 }
 $kids=[];
 foreach($streams as $i=>$s){$p=9+$i*2;$content=$p+1;$kids[]="$p 0 R";$objects[$p]="<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents $content 0 R >>";$objects[$content]='<< /Length '.strlen($s)." >>\nstream\n".$s."endstream";}
 $objects[2]='<< /Type /Pages /Count '.count($kids).' /Kids ['.implode(' ',$kids).'] >>';ksort($objects);$pdf="%PDF-1.4\n";$offsets=[0];foreach($objects as $id=>$obj){$offsets[$id]=strlen($pdf);$pdf.="$id 0 obj\n$obj\nendobj\n";}$pos=strlen($pdf);$n=count($objects)+1;$pdf.="xref\n0 $n\n0000000000 65535 f \n";for($i=1;$i<$n;$i++)$pdf.=sprintf("%010d 00000 n \n",$offsets[$i]);$pdf.="trailer\n<< /Size $n /Root 1 0 R >>\nstartxref\n$pos\n%%EOF\n";return $pdf;
}
