<?php
// Compatibility entry point. All processing remains on this hosting server.
require_once __DIR__.'/assessment.php';
function growth_public_dispatch(): void { as_dispatch('growth'); }
