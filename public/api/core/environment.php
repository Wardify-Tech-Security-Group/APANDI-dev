<?php
if (!defined('APANDI_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}

/**
 * =============================================================================
 * PUENTE UNIVERSAL DE BASE DE DATOS MYSQL/MARIADB PARA HOSTING EN CHILE (v3.0)
 * Compatible con 100% de Hostings cPanel / Apache / LiteSpeed y Docker
 * Consume configuración estrictamente desde variables de entorno (.env)
 * Cumplimiento Ley 19.628 (AES-256-GCM) + RBAC + Bcrypt Cost 12 + JWT
 * =============================================================================
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/**
 * Cargador nativo de archivo .env (para cPanel / Apache donde no exista inyección Docker)
 */
function loadEnvConfig(): void {
    $candidates = [
        dirname(__DIR__, 2) . '/.env',
        '/var/www/.env',
        dirname(__DIR__) . '/.env'
    ];
    foreach ($candidates as $path) {
        if (is_readable($path) && is_file($path)) {
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($lines === false) continue;
            foreach ($lines as $line) {
                $trimmed = trim($line);
                if ($trimmed === '' || strpos($trimmed, '#') === 0 || strpos($trimmed, '=') === false) {
                    continue;
                }
                [$key, $val] = explode('=', $trimmed, 2);
                $key = trim($key);
                $val = trim($val, " \t\n\r\0\x0B\"'");
                if ($key !== '' && getenv($key) === false) {
                    putenv("$key=$val");
                    $_ENV[$key] = $val;
                }
            }
            break;
        }
    }
}

loadEnvConfig();

$tz = getenv('TZ') ?: ($_ENV['TZ'] ?? 'America/Santiago');
date_default_timezone_set($tz);

# Constantes para control de intentos y tiempo de espera para login | considerar agregarlos a .env para más seguridad
const LOGIN_MAX_FAILED_ATTEMPTS = 10;
const LOGIN_LOCKOUT_MINUTES = 15;

// Lectura estricta desde .env sin credenciales ni llaves hardcodeadas en el código fuente
$dbHost = getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? 'localhost');
$dbPort = getenv('DB_PORT') ?: ($_ENV['DB_PORT'] ?? '3306');
$dbName = getenv('DB_NAME') ?: ($_ENV['DB_NAME'] ?? '');
$dbUser = getenv('DB_USER') ?: ($_ENV['DB_USER'] ?? '');
$dbPass = getenv('DB_PASSWORD') ?: ($_ENV['DB_PASSWORD'] ?? '');
$aesHexKey = getenv('AES_MASTER_KEY') ?: ($_ENV['AES_MASTER_KEY'] ?? '');
$jwtSecret = getenv('JWT_SECRET') ?: ($_ENV['JWT_SECRET'] ?? '');

if ($dbName === '' || $dbUser === '' || $dbPass === '' || strlen($aesHexKey) !== 64 || strlen($jwtSecret) < 32) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Configuración de seguridad incompleta: Verifique que el archivo .env contenga DB_NAME, DB_USER, DB_PASSWORD, AES_MASTER_KEY (64 hex) y JWT_SECRET.'
    ]);
    exit;
}
