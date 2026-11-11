<?php
if (!defined('APANDI_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}

// 4. Módulo Pedagógico (Libro de Clases Digital: PID, Asistencia, Evaluaciones y Firma PIN Cifrada)
if ($route === 'pedagogico/libro' && $method === 'GET') {
    $clasesPid = $pdo->query("
        SELECT p.*, t.nombre AS taller_nombre, t.codigo_mineduc, CONCAT(u.nombres, ' ', u.apellidos) AS docente_nombre
        FROM apx_ped_leccionario_pid p
        INNER JOIN apx_acad_unidades_laborales t ON p.id_taller = t.id_taller
        INNER JOIN apx_sec_cuentas_acceso u ON p.id_docente = u.id_usuario
        ORDER BY p.fecha_clase DESC, p.id_clase DESC
    ")->fetchAll();

    $evaluaciones = $pdo->query("
        SELECT ev.*, CONCAT(e.nombres, ' ', e.apellidos) AS estudiante_nombre,
               m.grupo_funcionalidad, t.nombre AS taller_nombre, CONCAT(u.nombres, ' ', u.apellidos) AS evaluador_nombre
        FROM apx_ped_evaluaciones_decreto83 ev
        INNER JOIN apx_acad_expedientes_alumnos e ON ev.id_estudiante = e.id_estudiante
        LEFT JOIN apx_acad_inscripciones_anuales m ON e.id_estudiante = m.id_estudiante AND m.anio_escolar = 2026
        INNER JOIN apx_acad_unidades_laborales t ON ev.id_taller = t.id_taller
        INNER JOIN apx_sec_cuentas_acceso u ON ev.id_evaluador = u.id_usuario
        ORDER BY ev.fecha_evaluacion DESC, ev.id_evaluacion DESC
    ")->fetchAll();

    $asistencias = $pdo->query("
        SELECT a.*, CONCAT(e.nombres, ' ', e.apellidos) AS estudiante_nombre, m.grupo_funcionalidad, t.nombre AS taller_nombre
        FROM apx_ped_asistencia_alumnos a
        INNER JOIN apx_acad_expedientes_alumnos e ON a.id_estudiante = e.id_estudiante
        LEFT JOIN apx_acad_inscripciones_anuales m ON e.id_estudiante = m.id_estudiante AND m.anio_escolar = 2026
        INNER JOIN apx_acad_unidades_laborales t ON a.id_taller = t.id_taller
        ORDER BY a.fecha DESC
    ")->fetchAll();

    echo json_encode(['ok' => true, 'clasesPid' => $clasesPid, 'evaluaciones' => $evaluaciones, 'asistencias' => $asistencias]);
    exit;
}

if ($route === 'pedagogico/pid' && $method === 'POST') {
    $pin = trim((string)($body['pin_firma'] ?? ''));

    if ($pin === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Debe ingresar el PIN de 6 dígitos para la Firma Electrónica Simple.']);
        exit;
    }

    $pdo->beginTransaction();
    try {
        $stmtUser = $pdo->prepare("
            SELECT id_usuario, rut, pin_firma_hash, activo, intentos_fallidos, bloqueado_hasta,
                   TIMESTAMPDIFF(SECOND, NOW(), bloqueado_hasta) AS segundos_bloqueo
            FROM apx_sec_cuentas_acceso
            WHERE id_usuario = ?
            FOR UPDATE
        ");
        $stmtUser->execute([$authUser['id_usuario']]);
        $user = $stmtUser->fetch();

        if (!$user || (int)$user['activo'] !== 1) {
            $pdo->commit();
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Usuario no encontrado o sesión no válida.']);
            exit;
        }

        // CRITERIO OBLIGATORIO: Interceptar ANTES de verificar PIN si la cuenta está bloqueada
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

        // Verificar PIN de 6 dígitos con Bcrypt Cost 12
        $pinValido = !empty($user['pin_firma_hash']) && password_verify($pin, (string)$user['pin_firma_hash']);
        if (!$pinValido) {
            recordFailedAttempt($pdo, $user, 'pin');
        }

        // CRITERIO OBLIGATORIO: Reiniciar contador y limpiar bloqueo tras firma exitosa
        resetFailedAttempts($pdo, (int)$user['id_usuario'], false);

        $hashFirma = hash('sha256', $authUser['id_usuario'] . '|' . ($body['unidad_tematica'] ?? '') . '|' . microtime(true));
        $stmt = $pdo->prepare("
            INSERT INTO apx_ped_leccionario_pid
            (id_taller, id_docente, fecha_clase, unidad_tematica, objetivo_aprendizaje, actividad_grupo_a, actividad_grupo_b, recursos_dua, firmado, hash_firma_electronica, fecha_firma)
            VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, 1, ?, NOW())
        ");
        $stmt->execute([
            (int)($body['id_taller'] ?? 1),
            $authUser['id_usuario'],
            $body['unidad_tematica'] ?? '',
            $body['objetivo_aprendizaje'] ?? '',
            $body['actividad_grupo_a'] ?? '',
            $body['actividad_grupo_b'] ?? '',
            $body['recursos_dua'] ?? '',
            $hashFirma
        ]);

        logAudit($pdo, $authUser['id_usuario'], null, 'LIBRO_CLASES_PID', 'FIRMA_DIGITAL', "Clase PID firmada con PIN electrónico Bcrypt. Sello SHA-256: " . substr($hashFirma, 0, 16));

        $pdo->commit();

        echo json_encode([
            'ok' => true,
            'mensaje' => 'Planificación Interdisciplinaria Diversificada (PID) registrada y sellada con Firma Electrónica Simple.',
            'hash_firma' => $hashFirma
        ]);
        exit;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Error al procesar la firma electrónica del PID: ' . $e->getMessage()]);
        exit;
    }
}

if ($route === 'pedagogico/asistencia' && $method === 'POST') {
    $idEst = (int)$body['id_estudiante'];
    $idTaller = (int)($body['id_taller'] ?? 1);
    $estado = $body['estado'] ?? 'PRESENTE';
    $obs = $body['observacion'] ?? '';

    $stmt = $pdo->prepare("
        INSERT INTO apx_ped_asistencia_alumnos (id_estudiante, id_taller, fecha, estado, observacion, registrado_por, firmado_digitalmente)
        VALUES (?, ?, CURDATE(), ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE estado = VALUES(estado), observacion = VALUES(observacion), firmado_digitalmente = 1
    ");
    $stmt->execute([$idEst, $idTaller, $estado, $obs, $authUser['id_usuario']]);

    if ($estado === 'AUSENTE') {
        $stmtEst = $pdo->prepare("SELECT CONCAT(nombres, ' ', apellidos) AS nombre FROM apx_acad_expedientes_alumnos WHERE id_estudiante = ?");
        $stmtEst->execute([$idEst]);
        $nomEst = $stmtEst->fetchColumn() ?: "Estudiante #$idEst";

        $stmtNotif = $pdo->prepare("
            INSERT INTO apx_sys_alertas_utp (id_emisor, id_destinatario, tipo, titulo, mensaje)
            VALUES (?, NULL, 'ALERTA_INASISTENCIA', ?, ?)
        ");
        $stmtNotif->execute([
            $authUser['id_usuario'],
            "⚠️ Alerta Automática de Inasistencia: $nomEst",
            "Se registró ausencia en el Libro de Clases Digital para $nomEst. Se activa protocolo preventivo de contacto familiar UTP / Convivencia Escolar."
        ]);
    }

    echo json_encode(['ok' => true, 'mensaje' => "Asistencia ($estado) actualizada y firmada en Libro Digital."]);
    exit;
}

if ($route === 'pedagogico/evaluaciones' && $method === 'POST') {
    $stmt = $pdo->prepare("
        INSERT INTO apx_ped_evaluaciones_decreto83
        (id_estudiante, id_taller, semestre, anio_escolar, indicador_competencia, dimension, nivel_logro, comentario_pedagogico, id_evaluador, fecha_evaluacion)
        VALUES (?, ?, 2, 2026, ?, ?, ?, ?, ?, CURDATE())
    ");
    $stmt->execute([
        (int)$body['id_estudiante'],
        (int)($body['id_taller'] ?? 1),
        $body['indicador_competencia'],
        $body['dimension'] ?? 'TECNICA_VOCACIONAL',
        $body['nivel_logro'] ?? 'LOGRADO',
        $body['comentario_pedagogico'] ?? '',
        $authUser['id_usuario']
    ]);
    echo json_encode(['ok' => true, 'mensaje' => 'Evaluación conceptual Decreto 83 registrada correctamente.']);
    exit;
}
