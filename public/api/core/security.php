<?php
if (!defined('APANDI_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}

function logAudit(PDO $pdo, int $idUsuario, ?int $idEstudiante, string $modulo, string $accion, string $detalle): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? 'SGI-APANDI-JS-API', 0, 250);
    $stmt = $pdo->prepare("
        INSERT INTO apx_sec_trazabilidad_forense (id_usuario, id_estudiante, modulo, accion, detalle, ip_origen, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$idUsuario, $idEstudiante, $modulo, $accion, $detalle, $ip, $ua]);
}

// =============================================================================
// MOTOR DE SEGURIDAD ANTI-BRUTE FORCE Y CONTROL DE ACCESO (OWASP ASVS)
// Umbral: 5 intentos fallidos | Bloqueo: 15 minutos | Lock pesimista (FOR UPDATE)
// =============================================================================
const AUTH_MAX_FAILED_ATTEMPTS = 5;
const AUTH_LOCKOUT_MINUTES = 15;

/**
 * Verifica si la cuenta de usuario se encuentra temporalmente bloqueada.
 * Se debe ejecutar de forma preventiva ANTES de verificar Password o PIN.
 */
function checkUserLockout(array $user): ?array {
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

/**
 * Registra un intento fallido y activa bloqueo temporal a 15 minutos en el 5to intento.
 */
function recordFailedAttempt(PDO $pdo, array $user, string $tipoCredencial = 'password'): void {
    $segundosBloqueo = isset($user['segundos_bloqueo']) ? (int)$user['segundos_bloqueo'] : 0;
    $bloqueoPrevioExpirado = !empty($user['bloqueado_hasta']) && $segundosBloqueo <= 0;
    $intentosActuales = $bloqueoPrevioExpirado ? 0 : (int)($user['intentos_fallidos'] ?? 0);
    $nuevosIntentos = $intentosActuales + 1;

    if ($nuevosIntentos >= AUTH_MAX_FAILED_ATTEMPTS) {
        $stmtLock = $pdo->prepare("
            UPDATE apx_sec_cuentas_acceso
            SET intentos_fallidos = ?,
                bloqueado_hasta = DATE_ADD(NOW(), INTERVAL " . AUTH_LOCKOUT_MINUTES . " MINUTE)
            WHERE id_usuario = ?
        ");
        $stmtLock->execute([AUTH_MAX_FAILED_ATTEMPTS, $user['id_usuario']]);

        $modulo = ($tipoCredencial === 'pin') ? 'LIBRO_CLASES_PID' : 'SEGURIDAD_AUTH';
        logAudit($pdo, (int)$user['id_usuario'], null, $modulo, 'ACTUALIZACION', "Cuenta bloqueada temporalmente por 15 minutos tras 5 intentos fallidos ($tipoCredencial).");
        $pdo->commit();

        http_response_code(429);
        header('Retry-After: 900');
        echo json_encode([
            'ok' => false,
            'error' => 'Ha superado el límite de 5 intentos fallidos. Su cuenta ha sido bloqueada temporalmente por 15 minutos.',
            'codigo' => 'ACCOUNT_LOCKED_THRESHOLD_EXCEEDED',
            'intentos_fallidos' => AUTH_MAX_FAILED_ATTEMPTS,
            'segundos_restantes' => 900
        ]);
        exit;
    } else {
        $stmtInc = $pdo->prepare("
            UPDATE apx_sec_cuentas_acceso
            SET intentos_fallidos = ?,
                bloqueado_hasta = NULL
            WHERE id_usuario = ?
        ");
        $stmtInc->execute([$nuevosIntentos, $user['id_usuario']]);
        $pdo->commit();

        $intentosRestantes = AUTH_MAX_FAILED_ATTEMPTS - $nuevosIntentos;
        $httpCode = ($tipoCredencial === 'pin') ? 403 : 401;
        $mensaje = ($tipoCredencial === 'pin')
            ? "PIN de Firma Electrónica Simple inválido para su cuenta institucional. Intentos restantes antes del bloqueo: {$intentosRestantes}."
            : "Credenciales inválidas o usuario inactivo. Intentos restantes antes del bloqueo: {$intentosRestantes}.";

        http_response_code($httpCode);
        echo json_encode([
            'ok' => false,
            'error' => $mensaje,
            'intentos_restantes' => $intentosRestantes
        ]);
        exit;
    }
}

/**
 * Reinicia el contador de intentos fallidos a 0 y libera el estado de bloqueo tras autenticación exitosa.
 */
function resetFailedAttempts(PDO $pdo, int $idUsuario, bool $updateUltimoAcceso = false): void {
    $sql = "UPDATE apx_sec_cuentas_acceso SET intentos_fallidos = 0, bloqueado_hasta = NULL";
    if ($updateUltimoAcceso) {
        $sql .= ", ultimo_acceso = NOW()";
    }
    $sql .= " WHERE id_usuario = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$idUsuario]);
}
