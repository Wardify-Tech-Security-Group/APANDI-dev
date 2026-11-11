<?php
if (!defined('APANDI_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}

// ENRUTADOR REST JSON PARA EL MOTOR JAVASCRIPT API
// =============================================================================

// 0. Healthcheck institucional para monitoreo y CI/CD DevSecOps
if ($route === 'health' && $method === 'GET') {
    echo json_encode([
        'ok' => true,
        'status' => 'OK',
        'sistema' => 'SGI APANDI - Educación Especial Nivel Laboral (PHP 8.3 + MariaDB 11.4)',
        'normativa' => ['Decreto 83', 'Decreto 170', 'Ley 19.628 AES-256-GCM'],
        'timestamp' => date('c')
    ]);
    exit;
}

// 1. Login con verificación estricta Bcrypt Cost 12, Anti-Brute Force y emisión de JWT
if ($route === 'auth/login' && $method === 'POST') {
    $emailOrRut = trim($body['emailOrRut'] ?? ($body['identifier'] ?? ($body['rut'] ?? '')));
    $rutSinPuntos = str_replace('.', '', $emailOrRut);
    $password = (string)($body['password'] ?? '');

    // Recupera solo los datos necesarios y calcula si el bloqueo sigue vigente.
    $stmt = $pdo->prepare("
        SELECT u.id_usuario, u.rut, u.nombres, u.apellidos, u.email, u.password_hash,
               u.especialidad, u.horas_contrato, u.debe_cambiar_clave,
               u.intentos_fallidos, u.bloqueado_hasta,
               (u.bloqueado_hasta IS NOT NULL AND u.bloqueado_hasta > NOW()) AS cuenta_bloqueada,
               r.codigo AS rol_codigo, r.nombre AS rol_nombre
        FROM apx_sec_cuentas_acceso u
        INNER JOIN apx_sec_rbac_perfiles r ON u.id_rol = r.id_rol
        WHERE (u.email = ? OR SUBSTRING_INDEX(u.email, '@', 1) = ? OR u.rut = ? OR REPLACE(u.rut, '.', '') = ?) AND u.activo = 1
        LIMIT 1
    ");
    $stmt->execute([$emailOrRut, $emailOrRut, $emailOrRut, $rutSinPuntos]);
    $user = $stmt->fetch();

    // Rechaza credenciales inválidas o cuentas bloqueadas y contabiliza el fallo si corresponde.
    if (!$user || (int)$user['cuenta_bloqueada'] === 1 || !password_verify($password, $user['password_hash'])) {
        if ($user && (int)$user['cuenta_bloqueada'] !== 1) {
            recordFailedLogin($pdo, (int)$user['id_usuario']);
        }
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Credenciales inválidas o usuario inactivo.']);
        exit;
    }

    $pdo->prepare("UPDATE apx_sec_cuentas_acceso SET ultimo_acceso = NOW() WHERE id_usuario = ?")->execute([$user['id_usuario']]);

    $userPayload = [
        'id_usuario' => (int)$user['id_usuario'],
        'rut' => $user['rut'],
        'nombre_completo' => $user['nombres'] . ' ' . $user['apellidos'],
        'email' => $user['email'],
        'rol_codigo' => $user['rol_codigo'],
        'rol_nombre' => $user['rol_nombre'],
        'especialidad' => $user['especialidad'],
        'horas_contrato' => (int)$user['horas_contrato'],
        'debe_cambiar_clave' => (int)($user['debe_cambiar_clave'] ?? 0)
    ];

        // CRITERIO OBLIGATORIO: Interceptar ANTES de verificar contraseña si la cuenta está bloqueada
        $lockInfo = checkUserLockout($user);
        if ($lockInfo !== null) {
            $pdo->commit();
            http_response_code(429);
            header('Retry-After: ' . $lockInfo['segundos_restantes']);
            echo json_encode([
                'ok' => false,
                'error' => "Cuenta temporalmente bloqueada por exceso de intentos fallidos. Intente nuevamente en {$lockInfo['minutos_restantes']} minuto(s).",
                'codigo' => 'ACCOUNT_TEMPORARILY_LOCKED',
                'bloqueado_hasta' => $lockInfo['bloqueado_hasta'],
                'segundos_restantes' => $lockInfo['segundos_restantes']
            ]);
            exit;
        }

        // Verificar contraseña con Bcrypt Cost 12
        if (!password_verify($password, (string)$user['password_hash'])) {
            recordFailedAttempt($pdo, $user, 'password');
        }

        // CRITERIO OBLIGATORIO: Reiniciar contador y limpiar bloqueo tras login exitoso
        resetFailedAttempts($pdo, (int)$user['id_usuario'], true);
        $pdo->commit();

        $userPayload = [
            'id_usuario' => (int)$user['id_usuario'],
            'rut' => $user['rut'],
            'nombre_completo' => $user['nombres'] . ' ' . $user['apellidos'],
            'email' => $user['email'],
            'rol_codigo' => $user['rol_codigo'],
            'rol_nombre' => $user['rol_nombre'],
            'especialidad' => $user['especialidad'],
            'horas_contrato' => (int)$user['horas_contrato']
        ];

        echo json_encode([
            'ok' => true,
            'token' => createJWT($userPayload, $jwtSecret),
            'user' => $userPayload
        ]);
        exit;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Error en el proceso de autenticación.']);
        exit;
    }
}
