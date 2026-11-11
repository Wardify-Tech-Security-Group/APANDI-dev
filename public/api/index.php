<?php
define('APANDI_API_BOOTSTRAPPED', true);
require_once __DIR__ . '/bootstrap.php';

$route = $_GET['route'] ?? '';
if (!$route) {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $route = preg_replace('#^/api/?#', '', $uri);
}
$route = trim($route, '/');
$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents('php://input'), true) ?: [];

// Rutas públicas: estado del servicio e inicio de sesión.
require __DIR__ . '/routes/public.php';

// El resto de las rutas requiere un JWT válido.
$authUser = verifyJWT($jwtSecret);
if (!$authUser) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Sesión no válida o expirada. Inicie sesión nuevamente.']);
    exit;
}

// Módulos protegidos, cargados en orden funcional.
require __DIR__ . '/routes/auth.php';
require __DIR__ . '/routes/rrhh.php';
require __DIR__ . '/routes/students.php';
require __DIR__ . '/routes/pedagogical.php';
require __DIR__ . '/routes/clinical.php';
require __DIR__ . '/routes/paec.php';
require __DIR__ . '/routes/family.php';
require __DIR__ . '/routes/security.php';
require __DIR__ . '/routes/documents.php';
require __DIR__ . '/routes/users.php';
http_response_code(404);
echo json_encode(['ok' => false, 'error' => "Endpoint API no encontrado: $route"]);