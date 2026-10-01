<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__.'/app.php';
require __DIR__.'/growth-runner.php';
growth_run_background();
wb_process(10);
echo "Workbook email queue checked.\n";
