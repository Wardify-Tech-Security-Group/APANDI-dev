<?php
if (!defined('APANDI_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}

// 6. Botón SOS en Aula y Bitácora de Incidencias (PAEC)
if ($route === 'paec/sos' && $method === 'POST') {
    $idEst = (int)($body['id_estudiante'] ?? 1);
    $stmtInfo = $pdo->prepare("
        SELECT e.id_estudiante, CONCAT(e.nombres, ' ', e.apellidos) AS estudiante_nombre,
               t.id_taller, t.nombre AS taller_nombre, t.sala_ubicacion,
               p.id_profesional_sos, p.estrategias_contencion_enc,
               CONCAT(u.nombres, ' ', u.apellidos) AS profesional_sos_nombre,
               u.telefono AS profesional_sos_telefono, u.especialidad
        FROM apx_acad_expedientes_alumnos e
        LEFT JOIN apx_acad_inscripciones_anuales m ON e.id_estudiante = m.id_estudiante AND m.anio_escolar = 2026
        LEFT JOIN apx_acad_unidades_laborales t ON m.id_taller = t.id_taller
        LEFT JOIN apx_conv_protocolos_paec_enc p ON e.id_estudiante = p.id_estudiante
        LEFT JOIN apx_sec_cuentas_acceso u ON p.id_profesional_sos = u.id_usuario
        WHERE e.id_estudiante = ?
    ");
    $stmtInfo->execute([$idEst]);
    $info = $stmtInfo->fetch();

    $protocolo = !empty($info['estrategias_contencion_enc'])
        ? decryptAES256($info['estrategias_contencion_enc'], $aesHexKey)
        : 'Activar protocolo de contención emocional Etapa 3 y traslado seguro a Sala Sensorial.';

    $suceso = $body['descripcion_breve'] ?? 'Desregulación Emocional y Conductual (DEC) Severa activada desde Botón SOS en Aula.';
    $ubicacion = $body['ubicacion'] ?: ($info['sala_ubicacion'] ?: 'Pabellón Técnico - Sala T1');

    $stmtBit = $pdo->prepare("
        INSERT INTO apx_conv_bitacora_sos_enc
        (id_estudiante, id_taller, id_reportante, id_profesional_interviniente, tipo_incidencia, etapa_dec, descripcion_suceso_enc, acciones_aplicadas_paec, estado_alerta)
        VALUES (?, ?, ?, ?, 'DESREGULACION_SEVERA_SOS', 'ETAPA_3_SEVERA', ?, ?, 'ACTIVA_EN_AULA')
    ");
    $stmtBit->execute([
        $idEst,
        $info['id_taller'] ?: 1,
        $authUser['id_usuario'],
        $info['id_profesional_sos'] ?: 5,
        encryptAES256($suceso, $aesHexKey),
        $protocolo
    ]);
    $idIncidencia = (int)$pdo->lastInsertId();

    $stmtNotif = $pdo->prepare("
        INSERT INTO apx_sys_alertas_utp (id_emisor, id_destinatario, tipo, titulo, mensaje)
        VALUES (?, NULL, 'ALERTA_SOS', ?, ?)
    ");
    $stmtNotif->execute([
        $authUser['id_usuario'],
        "🚨 SOS AULA ACTIVO: Desregulación Severa — " . $info['estudiante_nombre'],
        "Ubicación: $ubicacion. Profesional SOS convocado: " . ($info['profesional_sos_nombre'] ?: 'Camila Vargas') . " (" . ($info['profesional_sos_telefono'] ?: '+56 9 8555 6677') . ")."
    ]);

    logAudit($pdo, $authUser['id_usuario'], $idEst, 'PAEC_BOTON_SOS', 'ALERTA_SOS', "Disparo de Botón SOS en Aula ($ubicacion). Profesional SOS convocado: " . ($info['profesional_sos_nombre'] ?: 'PIE'));

    echo json_encode([
        'ok' => true,
        'mensaje' => '¡Alerta SOS despachada inmediatamente al Profesional SOS designado en el PAEC!',
        'alerta' => [
            'id_incidencia' => $idIncidencia,
            'estudiante' => $info['estudiante_nombre'],
            'ubicacion' => $ubicacion,
            'taller' => $info['taller_nombre'] ?: 'Taller de Corte y Confección',
            'reportado_por' => $authUser['nombre_completo'],
            'profesional_sos' => $info['profesional_sos_nombre'] ?: 'Camila Ignacia Vargas Herrera (Psicóloga PIE)',
            'telefono_sos' => $info['profesional_sos_telefono'] ?: '+56 9 8555 6677',
            'protocolo_paec' => $protocolo,
            'hora' => date('H:i:s')
        ]
    ]);
    exit;
}

if ($route === 'paec/bitacora' && $method === 'GET') {
    $rows = $pdo->query("
        SELECT b.*, CONCAT(e.nombres, ' ', e.apellidos) AS estudiante_nombre,
               CONCAT(rep.nombres, ' ', rep.apellidos) AS reportante_nombre,
               CONCAT(prof.nombres, ' ', prof.apellidos) AS profesional_nombre,
               t.nombre AS taller_nombre
        FROM apx_conv_bitacora_sos_enc b
        INNER JOIN apx_acad_expedientes_alumnos e ON b.id_estudiante = e.id_estudiante
        INNER JOIN apx_sec_cuentas_acceso rep ON b.id_reportante = rep.id_usuario
        LEFT JOIN apx_sec_cuentas_acceso prof ON b.id_profesional_interviniente = prof.id_usuario
        LEFT JOIN apx_acad_unidades_laborales t ON b.id_taller = t.id_taller
        ORDER BY b.fecha_hora_suceso DESC
    ")->fetchAll();

    foreach ($rows as &$r) {
        $r['descripcion_suceso'] = decryptAES256($r['descripcion_suceso_enc'], $aesHexKey);
    }

    echo json_encode(['ok' => true, 'bitacora' => $rows]);
    exit;
}
