<?php
// Apply the reviewed editorial revision without publishing the private workbook.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$file = __DIR__.'/alignable-files/workbook.pdf';
if (!is_file($file)) { fwrite(STDERR, "Paid workbook missing; editorial update cannot be applied.\n"); exit(1); }
$hashes = json_decode(file_get_contents(__DIR__.'/workbook-editorial-update.json'), true, 512, JSON_THROW_ON_ERROR);
$original = file_get_contents($file);
$hash = hash('sha256', $original);
if (hash_equals($hashes['after'], $hash)) { echo "Paid workbook already corrected.\n"; exit(0); }
if (!hash_equals($hashes['before'], $hash)) { fwrite(STDERR, "Paid workbook differs from reviewed original; left unchanged.\n"); exit(1); }
$updated = $original.file_get_contents(__DIR__.'/workbook-editorial-update.bin');
if (!hash_equals($hashes['after'], hash('sha256', $updated))) { fwrite(STDERR, "Workbook update integrity check failed.\n"); exit(1); }
$temp = tempnam(dirname($file), '.workbook-update-');
if ($temp === false || file_put_contents($temp, $updated, LOCK_EX) !== strlen($updated)) { if ($temp !== false) unlink($temp); exit(1); }
chmod($temp, fileperms($file) & 0777);
if (!rename($temp, $file)) { unlink($temp); exit(1); }
echo "Paid workbook editorial corrections applied.\n";
