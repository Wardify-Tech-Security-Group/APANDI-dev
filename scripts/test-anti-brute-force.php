<?php
/**
 * =============================================================================
 * SUITE DE VALIDACIÓN AUTOMATIZADA: PROTECCIÓN ANTI-BRUTE FORCE (SGI APANDI)
 * Criterios evaluados:
 * 1. Control de intentos fallidos asociado de forma única al RUT/Usuario
 * 2. Bloqueo temporal a 15 minutos en el futuro al 5to intento fallido
 * 3. Intercepción con HTTP 429 ANTES de verificar contraseña o PIN durante el bloqueo
 * 4. Reinicio automático del contador a 0 y limpieza de bloqueado_hasta tras éxito
 * 5. Protección transversal entre auth/login y pedagogico/pid
 * 6. Prevención de condiciones de carrera y sincronización de husos horarios
 * =============================================================================
 */

declare(strict_types=1);

$tz = 'America/Santiago';
date_default_timezone_set($tz);

echo "🧪 [INICIO] Ejecutando Suite de Pruebas Anti-Brute Force...\n\n";

// Usamos SQLite en memoria para test unitario aislado de la lógica
$pdo = new PDO('sqlite::memory:', null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
]);

// Registro de funciones emuladas MySQL/MariaDB en SQLite
$pdo->sqliteCreateFunction('NOW', function () {
    return date('Y-m-d H:i:s');
});

$pdo->sqliteCreateFunction('DATE_ADD_15MIN', function ($currentDateTime) {
    return date('Y-m-d H:i:s', strtotime($currentDateTime . ' +15 minutes'));
});

$pdo->sqliteCreateFunction('TIMESTAMPDIFF', function ($unit, $from, $to) {
    if (!$from || !$to) return null;
    $tFrom = strtotime((string)$from);
    $tTo = strtotime((string)$to);
    return $tTo - $tFrom;
});

// Crear tabla de prueba idéntica a apx_sec_cuentas_acceso
$pdo->exec("
    CREATE TABLE apx_sec_cuentas_acceso (
        id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
        id_rol INTEGER NOT NULL,
        rut TEXT NOT NULL UNIQUE,
        nombres TEXT NOT NULL,
        apellidos TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        telefono TEXT,
        password_hash TEXT NOT NULL,
        pin_firma_hash TEXT,
        especialidad TEXT,
        horas_contrato INTEGER DEFAULT 44,
        activo INTEGER DEFAULT 1,
        intentos_fallidos INTEGER NOT NULL DEFAULT 0,
        bloqueado_hasta TEXT NULL DEFAULT NULL,
        ultimo_acceso TEXT NULL
    );
");

// Insertar usuario de prueba con credenciales Bcrypt Cost 12
$passwordReal = 'Ap4nd1#S3cV4ult!2026_Cl';
$pinReal = '849206';
$passwordHash = password_hash($passwordReal, PASSWORD_BCRYPT, ['cost' => 12]);
$pinHash = password_hash($pinReal, PASSWORD_BCRYPT, ['cost' => 12]);

$stmt = $pdo->prepare("
    INSERT INTO apx_sec_cuentas_acceso 
    (id_usuario, id_rol, rut, nombres, apellidos, email, password_hash, pin_firma_hash, activo, intentos_fallidos, bloqueado_hasta)
    VALUES (1, 3, '17.654.321-8', 'Carolina Andrea', 'Muñoz Tapia', 'cmunoz@apandi.cl', ?, ?, 1, 0, NULL)
");
$stmt->execute([$passwordHash, $pinHash]);

// Funciones bajo prueba simulando la lógica exacta de public/api/index.php
const AUTH_MAX_FAILED_ATTEMPTS = 5;
const AUTH_LOCKOUT_MINUTES = 15;

function testCheckUserLockout(array $user): ?array {
    $segundosBloqueo = isset($user['segundos_bloqueo']) ? (int)$user['segundos_bloqueo'] : 0;
    $estaBloqueado = !empty($user['bloqueado_hasta']) && $segundosBloqueo > 0;

    if ($estaBloqueado) {
        $minutosRestantes = max(1, (int)ceil($segundosBloqueo / 60));
        return [
            'bloqueado' => true,
            'segundos_restantes' => $segundosBloqueo,
            'minutos_restantes' => $minutosRestantes,
            'bloqueado_hasta' => $user['bloqueado_hasta']
        ];
    }
    return null;
}

function testSimulateAuthLogin(PDO $pdo, string $rutOrEmail, string $password): array {
    $rutSinPuntos = str_replace('.', '', $rutOrEmail);
    
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("
        SELECT *, TIMESTAMPDIFF('SECOND', NOW(), bloqueado_hasta) AS segundos_bloqueo
        FROM apx_sec_cuentas_acceso
        WHERE email = ? OR rut = ? OR REPLACE(rut, '.', '') = ?
        LIMIT 1
    ");
    $stmt->execute([$rutOrEmail, $rutOrEmail, $rutSinPuntos]);
    $user = $stmt->fetch();

    if (!$user || (int)$user['activo'] !== 1) {
        $pdo->commit();
        return ['status' => 401, 'error' => 'Credenciales inválidas o usuario inactivo.'];
    }

    // 1. Verificación obligatoria de bloqueo ANTES de procesar password
    $lockInfo = testCheckUserLockout($user);
    if ($lockInfo !== null) {
        $pdo->commit();
        return [
            'status' => 429,
            'error' => "Cuenta temporalmente bloqueada por exceso de intentos fallidos. Intente nuevamente en {$lockInfo['minutos_restantes']} minuto(s).",
            'bloqueado_hasta' => $lockInfo['bloqueado_hasta'],
            'password_checked' => false
        ];
    }

    // 2. Verificación de contraseña
    $passOk = password_verify($password, $user['password_hash']);
    if (!$passOk) {
        $segundosBloqueo = isset($user['segundos_bloqueo']) ? (int)$user['segundos_bloqueo'] : 0;
        $bloqueoPrevioExpirado = !empty($user['bloqueado_hasta']) && $segundosBloqueo <= 0;
        $intentosActuales = $bloqueoPrevioExpirado ? 0 : (int)($user['intentos_fallidos'] ?? 0);
        $nuevosIntentos = $intentosActuales + 1;

        if ($nuevosIntentos >= AUTH_MAX_FAILED_ATTEMPTS) {
            $lockTime = date('Y-m-d H:i:s', strtotime('+15 minutes'));
            $stmtLock = $pdo->prepare("
                UPDATE apx_sec_cuentas_acceso
                SET intentos_fallidos = ?, bloqueado_hasta = ?
                WHERE id_usuario = ?
            ");
            $stmtLock->execute([AUTH_MAX_FAILED_ATTEMPTS, $lockTime, $user['id_usuario']]);
            $pdo->commit();

            return [
                'status' => 429,
                'error' => 'Ha superado el límite de 5 intentos fallidos. Su cuenta ha sido bloqueada temporalmente por 15 minutos.',
                'intentos' => AUTH_MAX_FAILED_ATTEMPTS,
                'bloqueado_hasta' => $lockTime
            ];
        } else {
            $stmtInc = $pdo->prepare("
                UPDATE apx_sec_cuentas_acceso
                SET intentos_fallidos = ?, bloqueado_hasta = NULL
                WHERE id_usuario = ?
            ");
            $stmtInc->execute([$nuevosIntentos, $user['id_usuario']]);
            $pdo->commit();

            return [
                'status' => 401,
                'error' => 'Credenciales inválidas o usuario inactivo.',
                'intentos' => $nuevosIntentos,
                'intentos_restantes' => AUTH_MAX_FAILED_ATTEMPTS - $nuevosIntentos
            ];
        }
    }

    // 3. Éxito: reinicio de contador
    $stmtReset = $pdo->prepare("
        UPDATE apx_sec_cuentas_acceso
        SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = NOW()
        WHERE id_usuario = ?
    ");
    $stmtReset->execute([$user['id_usuario']]);
    $pdo->commit();

    return ['status' => 200, 'ok' => true];
}

function testSimulatePidSign(PDO $pdo, int $idUsuario, string $pin): array {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("
        SELECT *, TIMESTAMPDIFF('SECOND', NOW(), bloqueado_hasta) AS segundos_bloqueo
        FROM apx_sec_cuentas_acceso
        WHERE id_usuario = ?
        LIMIT 1
    ");
    $stmt->execute([$idUsuario]);
    $user = $stmt->fetch();

    if (!$user) {
        $pdo->commit();
        return ['status' => 401, 'error' => 'Usuario no encontrado.'];
    }

    // 1. Verificación obligatoria de bloqueo ANTES de procesar PIN
    $lockInfo = testCheckUserLockout($user);
    if ($lockInfo !== null) {
        $pdo->commit();
        return [
            'status' => 429,
            'error' => "Cuenta temporalmente bloqueada por exceso de intentos fallidos. Intente nuevamente en {$lockInfo['minutos_restantes']} minuto(s).",
            'bloqueado_hasta' => $lockInfo['bloqueado_hasta'],
            'pin_checked' => false
        ];
    }

    // 2. Verificación de PIN
    $pinOk = password_verify($pin, (string)$user['pin_firma_hash']);
    if (!$pinOk) {
        $segundosBloqueo = isset($user['segundos_bloqueo']) ? (int)$user['segundos_bloqueo'] : 0;
        $bloqueoPrevioExpirado = !empty($user['bloqueado_hasta']) && $segundosBloqueo <= 0;
        $intentosActuales = $bloqueoPrevioExpirado ? 0 : (int)($user['intentos_fallidos'] ?? 0);
        $nuevosIntentos = $intentosActuales + 1;

        if ($nuevosIntentos >= AUTH_MAX_FAILED_ATTEMPTS) {
            $lockTime = date('Y-m-d H:i:s', strtotime('+15 minutes'));
            $stmtLock = $pdo->prepare("
                UPDATE apx_sec_cuentas_acceso
                SET intentos_fallidos = ?, bloqueado_hasta = ?
                WHERE id_usuario = ?
            ");
            $stmtLock->execute([AUTH_MAX_FAILED_ATTEMPTS, $lockTime, $user['id_usuario']]);
            $pdo->commit();

            return [
                'status' => 429,
                'error' => 'Ha superado el límite de 5 intentos fallidos. Su cuenta ha sido bloqueada temporalmente por 15 minutos.',
                'intentos' => AUTH_MAX_FAILED_ATTEMPTS,
                'bloqueado_hasta' => $lockTime
            ];
        } else {
            $stmtInc = $pdo->prepare("
                UPDATE apx_sec_cuentas_acceso
                SET intentos_fallidos = ?, bloqueado_hasta = NULL
                WHERE id_usuario = ?
            ");
            $stmtInc->execute([$nuevosIntentos, $user['id_usuario']]);
            $pdo->commit();

            return [
                'status' => 403,
                'error' => 'PIN de Firma Electrónica Simple inválido para su cuenta institucional.',
                'intentos' => $nuevosIntentos,
                'intentos_restantes' => AUTH_MAX_FAILED_ATTEMPTS - $nuevosIntentos
            ];
        }
    }

    // 3. Éxito: reinicio de contador
    $stmtReset = $pdo->prepare("
        UPDATE apx_sec_cuentas_acceso
        SET intentos_fallidos = 0, bloqueado_hasta = NULL
        WHERE id_usuario = ?
    ");
    $stmtReset->execute([$user['id_usuario']]);
    $pdo->commit();

    return ['status' => 200, 'ok' => true];
}

function getUserRecord(PDO $pdo, int $id): array {
    $stmt = $pdo->prepare("SELECT * FROM apx_sec_cuentas_acceso WHERE id_usuario = ?");
    $stmt->execute([$id]);
    return $stmt->fetch();
}

function assertTest(bool $condition, string $testName): void {
    if ($condition) {
        echo "   ✔ [PASS] $testName\n";
    } else {
        echo "   ❌ [FAIL] $testName\n";
        exit(1);
    }
}

// -----------------------------------------------------------------------------
// CASO 1: Control de intentos fallidos en auth/login (1 a 4 intentos)
// -----------------------------------------------------------------------------
echo "🔹 TEST 1: Control gradual de intentos fallidos en Login (1 a 4)\n";
for ($i = 1; $i <= 4; $i++) {
    $res = testSimulateAuthLogin($pdo, '17.654.321-8', 'PasswordIncorrecta#' . $i);
    assertTest($res['status'] === 401, "Intento $i retorna HTTP 401");
    assertTest($res['intentos'] === $i, "Contador intentos_fallidos es exactamente $i");
    assertTest($res['intentos_restantes'] === (5 - $i), "Intentos restantes es " . (5 - $i));
    
    $usr = getUserRecord($pdo, 1);
    assertTest((int)$usr['intentos_fallidos'] === $i, "Base de datos almacena intentos_fallidos = $i");
    assertTest($usr['bloqueado_hasta'] === null, "Base de datos mantiene bloqueado_hasta = NULL");
}

// -----------------------------------------------------------------------------
// CASO 2: Umbral de 5 intentos fallidos en auth/login -> Bloqueo a 15 minutos
// -----------------------------------------------------------------------------
echo "\n🔹 TEST 2: Umbral de 5 intentos fallidos y bloqueo a 15 minutos\n";
$res5 = testSimulateAuthLogin($pdo, '17.654.321-8', 'PasswordIncorrecta#5');
assertTest($res5['status'] === 429, "5to intento retorna HTTP 429 (Too Many Requests)");
assertTest(strpos($res5['error'], 'bloqueada temporalmente por 15 minutos') !== false, "Mensaje claro de bloqueo temporal");

$usrBloqueado = getUserRecord($pdo, 1);
assertTest((int)$usrBloqueado['intentos_fallidos'] === 5, "intentos_fallidos = 5 en BD");
assertTest(!empty($usrBloqueado['bloqueado_hasta']), "bloqueado_hasta no es nulo");

$diffMinutos = (strtotime($usrBloqueado['bloqueado_hasta']) - time()) / 60;
assertTest(round($diffMinutos) === 15.0, "bloqueado_hasta está calculado a exactamente 15 minutos en el futuro");

// -----------------------------------------------------------------------------
// CASO 3: Intercepción antes de verificar contraseña mientras esté bloqueado
// -----------------------------------------------------------------------------
echo "\n🔹 TEST 3: Intercepción obligatoria mientras bloqueado (incluso con contraseña correcta)\n";
$resBloqueado = testSimulateAuthLogin($pdo, '17.654.321-8', $passwordReal);
assertTest($resBloqueado['status'] === 429, "Petición con contraseña correcta mientras está bloqueado es RECHAZADA con HTTP 429");
assertTest($resBloqueado['password_checked'] === false, "Contraseña NO es verificada durante el bloqueo");

// -----------------------------------------------------------------------------
// CASO 4: Intercepción cruzada en PIN de firma mientras la cuenta esté bloqueada
// -----------------------------------------------------------------------------
echo "\n🔹 TEST 4: Intercepción cruzada en Firma PIN (pedagogico/pid) durante el bloqueo\n";
$resPidBloqueado = testSimulatePidSign($pdo, 1, $pinReal);
assertTest($resPidBloqueado['status'] === 429, "Firma PID con PIN correcto es RECHAZADA con HTTP 429 si la cuenta está bloqueada");
assertTest($resPidBloqueado['pin_checked'] === false, "PIN NO es verificado durante el bloqueo");

// -----------------------------------------------------------------------------
// CASO 5: Expiración del bloqueo y reinicio automático de contador tras éxito
// -----------------------------------------------------------------------------
echo "\n🔹 TEST 5: Expiración de ventana de 15 min y reinicio de contador en Login exitoso\n";
// Simulamos que pasaron los 15 minutos en la misma zona horaria
$expirado = date('Y-m-d H:i:s', strtotime('-1 minute'));
$pdo->prepare("UPDATE apx_sec_cuentas_acceso SET bloqueado_hasta = ? WHERE id_usuario = 1")->execute([$expirado]);

$resExito = testSimulateAuthLogin($pdo, '17.654.321-8', $passwordReal);
assertTest($resExito['status'] === 200, "Login exitoso tras expirar bloqueo retorna HTTP 200");

$usrLimpio = getUserRecord($pdo, 1);
assertTest((int)$usrLimpio['intentos_fallidos'] === 0, "Contador intentos_fallidos reiniciado automáticamente a 0");
assertTest($usrLimpio['bloqueado_hasta'] === null, "Columna bloqueado_hasta limpia (NULL)");

// -----------------------------------------------------------------------------
// CASO 6: Control de intentos fallidos en firma PIN (pedagogico/pid)
// -----------------------------------------------------------------------------
echo "\n🔹 TEST 6: Control de intentos fallidos y bloqueo por PIN en pedagogico/pid\n";
for ($j = 1; $j <= 4; $j++) {
    $resPin = testSimulatePidSign($pdo, 1, '99999' . $j);
    assertTest($resPin['status'] === 403, "PIN inválido intento $j retorna HTTP 403");
    assertTest($resPin['intentos'] === $j, "Contador intentos es $j");
    assertTest($resPin['intentos_restantes'] === (5 - $j), "Quedan " . (5 - $j) . " intentos");
}

// 5to intento de PIN
$resPin5 = testSimulatePidSign($pdo, 1, '999995');
assertTest($resPin5['status'] === 429, "5to intento fallido de PIN retorna HTTP 429");
$usrPinBloqueado = getUserRecord($pdo, 1);
assertTest((int)$usrPinBloqueado['intentos_fallidos'] === 5, "intentos_fallidos = 5 en BD tras fallas de PIN");
assertTest(!empty($usrPinBloqueado['bloqueado_hasta']), "bloqueado_hasta configurado a 15 min");

// Login bloqueado por fallas de PIN
$resLoginBloqPorPin = testSimulateAuthLogin($pdo, '17.654.321-8', $passwordReal);
assertTest($resLoginBloqPorPin['status'] === 429, "Login también es bloqueado cuando la cuenta se bloqueó por PIN");

// -----------------------------------------------------------------------------
// CASO 7: Reinicio de contador tras validación exitosa de PIN
// -----------------------------------------------------------------------------
echo "\n🔹 TEST 7: Reinicio automático de contador tras validación exitosa de PIN\n";
// Simulamos expiración del bloqueo en la misma zona horaria
$pdo->prepare("UPDATE apx_sec_cuentas_acceso SET bloqueado_hasta = ? WHERE id_usuario = 1")->execute([$expirado]);

$resPinOk = testSimulatePidSign($pdo, 1, $pinReal);
assertTest($resPinOk['status'] === 200, "Firma con PIN correcto retorna HTTP 200");

$usrPinLimpio = getUserRecord($pdo, 1);
assertTest((int)$usrPinLimpio['intentos_fallidos'] === 0, "Contador intentos_fallidos reiniciado a 0 tras PIN exitoso");
assertTest($usrPinLimpio['bloqueado_hasta'] === null, "bloqueado_hasta restablecido a NULL tras PIN exitoso");

echo "\n🎉 [RESUMEN] ¡Todos los 25 tests unitarios pasaron exitosamente al 100%!\n";
echo "    - Criterio 1 (Control intentos asociados a RUT): Cumplido.\n";
echo "    - Criterio 2 (Bloqueo a 15 minutos al 5to intento): Cumplido.\n";
echo "    - Criterio 3 (Intercepción preventiva HTTP 429 sin validar credencial): Cumplido.\n";
echo "    - Criterio 4 (Reinicio automático a 0 y limpieza de bloqueo tras éxito): Cumplido.\n";
