<?php
declare(strict_types=1);
ini_set('display_errors','0');
$app = dirname(__DIR__,3).'/.setupshoponline-workbook/app/app.php';
if (!is_file($app)) {
    http_response_code(503); header('Content-Type: application/json'); header('Cache-Control: no-store');
    echo '{"error":"The workbook is temporarily unavailable. Please try again shortly."}'; exit;
}
require $app;
wb_dispatch();
