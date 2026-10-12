<?php
declare(strict_types=1);
ini_set('display_errors','0');
$app=dirname(__DIR__,3).'/.setupshoponline-workbook/app';
if(!is_file($app.'/app.php')||!is_file($app.'/conversionkit.php')){
    http_response_code(503);header('Content-Type: application/json');header('Cache-Control: no-store');
    echo '{"error":"The conversion kit is temporarily unavailable. Please try again shortly."}';exit;
}
require $app.'/app.php';
require $app.'/conversionkit.php';
ck_dispatch();
