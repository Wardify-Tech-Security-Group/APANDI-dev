<?php
if (!defined('APANDI_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/core/environment.php';
require_once __DIR__ . '/core/crypto.php';
require_once __DIR__ . '/core/database.php';
require_once __DIR__ . '/core/security.php';
