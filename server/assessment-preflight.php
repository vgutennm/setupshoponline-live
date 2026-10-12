<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$private=$argv[1]??dirname(__DIR__);
define('AS_CONFIG_PATH',$private.'/assessment-config.php');
require $private.'/app/app.php';
require __DIR__.'/assessment.php';
$errors=[];
foreach(['curl_init','iconv'] as $fn)if(!function_exists($fn))$errors[]=$fn.' extension is missing';
if(!in_array('sqlite',PDO::getAvailableDrivers(),true))$errors[]='PDO SQLite is missing';
if(empty(as_config()['OPENAI_API_KEY']))$errors[]='Add OPENAI_API_KEY to private assessment-config.php';
$c=wb_config();if(empty($c['RECAPTCHA_SITE_KEY'])||empty($c['RECAPTCHA_SECRET_KEY']))$errors[]='Existing Google reCAPTCHA configuration is incomplete';
if(!wb_enabled())$errors[]='Existing Outlook authorization is not ready';
if($errors){fwrite(STDERR,"Assessment deployment is not ready:\n- ".implode("\n- ",$errors)."\n");exit(1);}
as_init();echo "Local assessment prerequisites passed. No keys or contact data displayed.\n";
