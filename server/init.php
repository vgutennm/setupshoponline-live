<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
umask(0077);
$root=dirname(__DIR__);
if(!is_file($root.'/config.php'))copy(__DIR__.'/config.example.php',$root.'/config.php');
chmod($root.'/config.php',0600);
if(!is_file($root.'/setup-key.txt'))file_put_contents($root.'/setup-key.txt',bin2hex(random_bytes(32))."\n",LOCK_EX);
chmod($root.'/setup-key.txt',0600);
echo "Private workbook configuration initialized.\n";
