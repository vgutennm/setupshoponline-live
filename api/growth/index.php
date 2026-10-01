<?php
declare(strict_types=1);
ini_set('display_errors','0');
$root=dirname(__DIR__,3).'/.setupshoponline-workbook/app/';
if(!is_file($root.'growth-public.php')){http_response_code(503);exit('The assessment is temporarily unavailable.');}
require $root.'app.php';
require $root.'growth-public.php';
growth_public_dispatch();
