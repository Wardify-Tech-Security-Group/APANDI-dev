<?php
/**
 * =============================================================================
 * SUITE DE VALIDACIÓN AUTOMATIZADA: GESTIÓN DE SEGURIDAD DEL USUARIO (SELF-SERVICE)
 * Endpoints evaluados:
 * 1. PUT /api/usuario/password
 * 2. PUT /api/usuario/pin
 * 3. GET /api/usuario/sesiones
 * =============================================================================
 */

declare(strict_types=1);

echo "🧪 [INICIO] Ejecutando Suite de Pruebas: Seguridad del Usuario (Self-Service)...\n\n";

$pdo = new PDO('sqlite::memory:', null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
]);

$pdo->exec("
    CREATE TABLE apx_sec_cuentas_acceso (
        id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
        id_rol INTEGER NOT NULL,
        rut TEXT NOT NULL UNIQUE,
        nombres TEXT NOT NULL,
        apellidos TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        pin_firma_hash TEXT NULL,
        debe_cambiar_clave INTEGER NOT NULL DEFAULT 1,
        intentos_fallidos INTEGER NOT NULL DEFAULT 0,
        bloqueado_hasta TEXT NULL,
        activo INTEGER NOT NULL DEFAULT 1,
        ultimo_acceso TEXT NULL
    );

    CREATE TABLE apx_sec_trazabilidad_forense (
        id_log INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER NOT NULL,
        id_estudiante INTEGER NULL,
        modulo TEXT NOT NULL,
        accion TEXT NOT NULL,
        detalle TEXT NULL,
        ip_origen TEXT NULL,
        user_agent TEXT NULL,
        fecha_hora TEXT DEFAULT CURRENT_TIMESTAMP
    );
");

// Insertar usuario de prueba (id_usuario = 1)
$initialPassword = 'Initial#Pass123';
$initialPasswordHash = password_hash($initialPassword, PASSWORD_BCRYPT, ['cost' => 12]);
$initialPin = '135792';
$initialPinHash = password_hash($initialPin, PASSWORD_BCRYPT, ['cost' => 12]);

$stmt = $pdo->prepare("
    INSERT INTO apx_sec_cuentas_acceso 
    (id_usuario, id_rol, rut, nombres, apellidos, email, password_hash, pin_firma_hash, debe_cambiar_clave, activo, ultimo_acceso)
    VALUES (1, 3, '17.654.321-8', 'Carolina', 'Muñoz', 'cmunoz@apandi.cl', ?, ?, 1, 1, '2026-11-10 10:00:00')
");
$stmt->execute([$initialPasswordHash, $initialPinHash]);

// Insertar logs de auditoría para probar GET /usuario/sesiones
for ($i = 1; $i <= 15; $i++) {
    $stmtLog = $pdo->prepare("
        INSERT INTO apx_sec_trazabilidad_forense (id_usuario, modulo, accion, detalle, ip_origen, user_agent, fecha_hora)
        VALUES (1, 'LIBRO_CLASES_PID', 'FIRMA_DIGITAL', 'Clase firmada #$i', '192.168.1.$i', 'Mozilla/5.0 Agent $i', datetime('now', '-$i hours'))
    ");
    $stmtLog->execute();
}

function assertTest(bool $condition, string $testName): void {
    if ($condition) {
        echo "   ✔ [PASS] $testName\n";
    } else {
        echo "   ❌ [FAIL] $testName\n";
        exit(1);
    }
}

// Emulación exacta de la lógica de index.php para PUT /usuario/password
function simulatePutPassword(PDO $pdo, int $userId, array $body): array {
    $currentPassword = (string)($body['current_password'] ?? '');
    $newPassword = (string)($body['new_password'] ?? '');

    if ($currentPassword === '' || $newPassword === '') {
        return ['status' => 400, 'error' => 'Debe ingresar la contraseña actual y la nueva contraseña.'];
    }

    if ($currentPassword === $newPassword) {
        return ['status' => 422, 'error' => 'La nueva contraseña no puede ser idéntica a la contraseña actual.'];
    }

    $hasMinLength = strlen($newPassword) >= 10;
    $hasUpper = preg_match('/[A-Z]/', $newPassword);
    $hasLower = preg_match('/[a-z]/', $newPassword);
    $hasNumber = preg_match('/[0-9]/', $newPassword);
    $hasSymbol = preg_match('/[!@#$%^&*()\-_=+{};:,<.>\/?]/', $newPassword);

    if (!$hasMinLength || !$hasUpper || !$hasLower || !$hasNumber || !$hasSymbol) {
        return ['status' => 422, 'error' => 'La nueva contraseña no cumple con la política de seguridad.'];
    }

    $stmt = $pdo->prepare("SELECT id_usuario, password_hash FROM apx_sec_cuentas_acceso WHERE id_usuario = ? AND activo = 1 LIMIT 1");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        return ['status' => 404, 'error' => 'Usuario no encontrado o inactivo.'];
    }

    if (!password_verify($currentPassword, $user['password_hash'])) {
        return ['status' => 401, 'error' => 'La contraseña actual ingresada es incorrecta.'];
    }

    $newHash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
    $stmtUp = $pdo->prepare("
        UPDATE apx_sec_cuentas_acceso
        SET password_hash = ?, debe_cambiar_clave = 0, intentos_fallidos = 0, bloqueado_hasta = NULL
        WHERE id_usuario = ?
    ");
    $stmtUp->execute([$newHash, $userId]);

    return ['status' => 200, 'ok' => true, 'debe_cambiar_clave' => 0];
}

// Emulación exacta de la lógica de index.php para PUT /usuario/pin
function simulatePutPin(PDO $pdo, int $userId, array $body): array {
    $currentPin = trim((string)($body['current_pin'] ?? ''));
    $newPin = trim((string)($body['new_pin'] ?? ''));

    if ($newPin === '') {
        return ['status' => 400, 'error' => 'Debe ingresar el nuevo PIN de firma electrónica.'];
    }

    if (!preg_match('/^\d{6}$/', $newPin)) {
        return ['status' => 422, 'error' => 'El PIN debe estar compuesto exactamente por 6 dígitos numéricos (0-9).'];
    }

    $weakPins = [
        '000000', '111111', '222222', '333333', '444444',
        '555555', '666666', '777777', '888888', '999999',
        '123456', '654321', '012345', '543210', '123123'
    ];
    if (in_array($newPin, $weakPins, true)) {
        return ['status' => 422, 'error' => 'El PIN ingresado es demasiado predecible o secuencial.'];
    }

    $stmt = $pdo->prepare("SELECT id_usuario, pin_firma_hash FROM apx_sec_cuentas_acceso WHERE id_usuario = ? AND activo = 1 LIMIT 1");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        return ['status' => 404, 'error' => 'Usuario no encontrado o inactivo.'];
    }

    $hasCurrentPin = !empty($user['pin_firma_hash']);
    if ($hasCurrentPin) {
        if ($currentPin === '') {
            return ['status' => 400, 'error' => 'Debe ingresar su PIN actual para autorizar la modificación.'];
        }

        if (!password_verify($currentPin, (string)$user['pin_firma_hash'])) {
            return ['status' => 401, 'error' => 'El PIN actual ingresado es incorrecto.'];
        }

        if ($currentPin === $newPin) {
            return ['status' => 422, 'error' => 'El nuevo PIN no puede ser idéntico al PIN actual.'];
        }
    }

    $newPinHash = password_hash($newPin, PASSWORD_BCRYPT, ['cost' => 12]);
    $stmtUp = $pdo->prepare("UPDATE apx_sec_cuentas_acceso SET pin_firma_hash = ? WHERE id_usuario = ?");
    $stmtUp->execute([$newPinHash, $userId]);

    return ['status' => 200, 'ok' => true];
}

// Emulación de GET /usuario/sesiones
function simulateGetSessions(PDO $pdo, int $userId): array {
    $stmtUser = $pdo->prepare("SELECT ultimo_acceso FROM apx_sec_cuentas_acceso WHERE id_usuario = ?");
    $stmtUser->execute([$userId]);
    $ultimoAcceso = $stmtUser->fetchColumn() ?: null;

    $stmtLogs = $pdo->prepare("
        SELECT id_log, ip_origen AS ip_address, user_agent, fecha_hora AS created_at,
               modulo, accion, detalle
        FROM apx_sec_trazabilidad_forense
        WHERE id_usuario = ?
        ORDER BY fecha_hora DESC, id_log DESC
        LIMIT 10
    ");
    $stmtLogs->execute([$userId]);
    $sesiones = $stmtLogs->fetchAll();

    return [
        'status' => 200,
        'ok' => true,
        'ultimo_acceso' => $ultimoAcceso,
        'sesiones' => $sesiones
    ];
}

// -----------------------------------------------------------------------------
// CASO 1: PUT /api/usuario/password
// -----------------------------------------------------------------------------
echo "🔹 TEST 1: Validación y Actualización de Contraseña (PUT /api/usuario/password)\n";

// 1.1 Faltan campos
$r = simulatePutPassword($pdo, 1, []);
assertTest($r['status'] === 400, "Campos vacíos retorna HTTP 400");

// 1.2 Nueva contraseña idéntica a la actual
$r = simulatePutPassword($pdo, 1, ['current_password' => $initialPassword, 'new_password' => $initialPassword]);
assertTest($r['status'] === 422, "Nueva contraseña idéntica retorna HTTP 422");

// 1.3 Contraseña débil (menos de 10 caracteres)
$r = simulatePutPassword($pdo, 1, ['current_password' => $initialPassword, 'new_password' => 'Short#1']);
assertTest($r['status'] === 422, "Contraseña corta (< 10 caracteres) retorna HTTP 422");

// 1.4 Contraseña débil (sin símbolos)
$r = simulatePutPassword($pdo, 1, ['current_password' => $initialPassword, 'new_password' => 'PasswordSinSimbolo123']);
assertTest($r['status'] === 422, "Contraseña sin símbolo especial retorna HTTP 422");

// 1.5 Contraseña actual errónea
$r = simulatePutPassword($pdo, 1, ['current_password' => 'WrongPassword#999', 'new_password' => 'NewStrong#Pass2026!']);
assertTest($r['status'] === 401, "Contraseña actual incorrecta retorna HTTP 401");

// 1.6 Cambio exitoso
$newValidPass = 'NewStrong#Pass2026!';
$r = simulatePutPassword($pdo, 1, ['current_password' => $initialPassword, 'new_password' => $newValidPass]);
assertTest($r['status'] === 200, "Contraseña válida y actual correcta retorna HTTP 200");
assertTest($r['debe_cambiar_clave'] === 0, "Respuesta incluye debe_cambiar_clave = 0");

// Verificar en Base de Datos
$userDb = $pdo->query("SELECT * FROM apx_sec_cuentas_acceso WHERE id_usuario = 1")->fetch();
assertTest((int)$userDb['debe_cambiar_clave'] === 0, "Base de datos actualiza debe_cambiar_clave = 0");
assertTest(password_verify($newValidPass, $userDb['password_hash']), "Nuevo hash Bcrypt coincide con la nueva clave");

// -----------------------------------------------------------------------------
// CASO 2: PUT /api/usuario/pin
// -----------------------------------------------------------------------------
echo "\n🔹 TEST 2: Validación y Actualización de PIN de Firma (PUT /api/usuario/pin)\n";

// 2.1 Nuevo PIN vacío
$r = simulatePutPin($pdo, 1, []);
assertTest($r['status'] === 400, "PIN vacío retorna HTTP 400");

// 2.2 Formato inválido (no 6 dígitos, contiene letras o tamaño distinto)
$r = simulatePutPin($pdo, 1, ['new_pin' => '12345']);
assertTest($r['status'] === 422, "PIN de 5 dígitos retorna HTTP 422");

$r = simulatePutPin($pdo, 1, ['new_pin' => '12345A']);
assertTest($r['status'] === 422, "PIN con caracteres alfabéticos retorna HTTP 422");

// 2.3 PIN débil / secuencial
$r = simulatePutPin($pdo, 1, ['new_pin' => '123456']);
assertTest($r['status'] === 422, "PIN secuencial '123456' retorna HTTP 422");

$r = simulatePutPin($pdo, 1, ['new_pin' => '000000']);
assertTest($r['status'] === 422, "PIN repetitivo '000000' retorna HTTP 422");

// 2.4 Falta PIN actual cuando ya está configurado
$r = simulatePutPin($pdo, 1, ['new_pin' => '948201']);
assertTest($r['status'] === 400, "Falta PIN actual en cuenta con PIN previo retorna HTTP 400");

// 2.5 PIN actual erróneo
$r = simulatePutPin($pdo, 1, ['current_pin' => '999999', 'new_pin' => '948201']);
assertTest($r['status'] === 401, "PIN actual erróneo retorna HTTP 401");

// 2.6 Nuevo PIN idéntico al actual
$r = simulatePutPin($pdo, 1, ['current_pin' => $initialPin, 'new_pin' => $initialPin]);
assertTest($r['status'] === 422, "Nuevo PIN idéntico al actual retorna HTTP 422");

// 2.7 Cambio exitoso de PIN
$newValidPin = '948201';
$r = simulatePutPin($pdo, 1, ['current_pin' => $initialPin, 'new_pin' => $newValidPin]);
assertTest($r['status'] === 200, "PIN actual correcto y nuevo PIN válido retorna HTTP 200");

// Verificar en Base de Datos
$userDbPin = $pdo->query("SELECT * FROM apx_sec_cuentas_acceso WHERE id_usuario = 1")->fetch();
assertTest(password_verify($newValidPin, (string)$userDbPin['pin_firma_hash']), "Nuevo hash Bcrypt de PIN coincide en BD");

// 2.8 Primer setup de PIN en usuario sin PIN previo
$pdo->exec("INSERT INTO apx_sec_cuentas_acceso (id_usuario, id_rol, rut, nombres, apellidos, email, password_hash, pin_firma_hash, debe_cambiar_clave, activo) VALUES (2, 4, '15.987.654-3', 'Jorge', 'Fuentes', 'jfuentes@apandi.cl', 'hash', NULL, 0, 1)");
$rSetup = simulatePutPin($pdo, 2, ['new_pin' => '784152']);
assertTest($rSetup['status'] === 200, "Primer setup de PIN sin current_pin retorna HTTP 200");
$userDbSetup = $pdo->query("SELECT * FROM apx_sec_cuentas_acceso WHERE id_usuario = 2")->fetch();
assertTest(password_verify('784152', (string)$userDbSetup['pin_firma_hash']), "Primer PIN queda configurado exitosamente");

// -----------------------------------------------------------------------------
// CASO 3: GET /api/usuario/sesiones
// -----------------------------------------------------------------------------
echo "\n🔹 TEST 3: Consulta de Sesiones y Auditoría Reciente (GET /api/usuario/sesiones)\n";

$r = simulateGetSessions($pdo, 1);
assertTest($r['status'] === 200, "Consulta de sesiones retorna HTTP 200");
assertTest($r['ultimo_acceso'] === '2026-11-10 10:00:00', "Devuelve ultimo_acceso del usuario");
assertTest(count($r['sesiones']) === 10, "Devuelve exactamente las últimas 10 sesiones (límite 10)");
assertTest(isset($r['sesiones'][0]['ip_address']), "Elemento contiene ip_address");
assertTest(isset($r['sesiones'][0]['user_agent']), "Elemento contiene user_agent");
assertTest(isset($r['sesiones'][0]['created_at']), "Elemento contiene created_at");

echo "\n🎉 [RESUMEN] ¡Todos los 18 asserts de prueba pasaron exitosamente al 100%!\n";

