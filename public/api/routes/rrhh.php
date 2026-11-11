<?php
if (!defined('APANDI_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}

// 2. Dashboard RRHH y Reloj Control
if ($route === 'rrhh/dashboard' && $method === 'GET') {
    $uid = $authUser['id_usuario'];
    $stmtH = $pdo->prepare("
        SELECT h.*, t.nombre AS taller_nombre, t.sala_ubicacion, t.codigo_mineduc
        FROM apx_rrhh_bloques_horarios h
        INNER JOIN apx_acad_unidades_laborales t ON h.id_taller = t.id_taller
        WHERE h.id_usuario = ?
        ORDER BY h.dia_semana ASC, h.hora_inicio ASC
    ");
    $stmtH->execute([$uid]);

    $stmtA = $pdo->prepare("SELECT * FROM apx_rrhh_marcajes_biometricos WHERE id_usuario = ? AND fecha = CURDATE()");
    $stmtA->execute([$uid]);

    $stmtHist = $pdo->query("
        SELECT ap.*, CONCAT(u.nombres, ' ', u.apellidos) AS funcionario_nombre, u.especialidad, r.codigo AS rol_codigo
        FROM apx_rrhh_marcajes_biometricos ap
        INNER JOIN apx_sec_cuentas_acceso u ON ap.id_usuario = u.id_usuario
        INNER JOIN apx_sec_rbac_perfiles r ON u.id_rol = r.id_rol
        ORDER BY ap.fecha DESC, ap.hora_entrada DESC LIMIT 15
    ");

    $stmtN = $pdo->prepare("
        SELECT n.*, CONCAT(u.nombres, ' ', u.apellidos) AS emisor_nombre
        FROM apx_sys_alertas_utp n
        INNER JOIN apx_sec_cuentas_acceso u ON n.id_emisor = u.id_usuario
        WHERE n.id_destinatario IS NULL OR n.id_destinatario = ?
        ORDER BY n.created_at DESC LIMIT 12
    ");
    $stmtN->execute([$uid]);

    echo json_encode([
        'ok' => true,
        'reloj_hoy' => $stmtA->fetch() ?: null,
        'historial_reloj' => $stmtHist->fetchAll(),
        'horarios' => $stmtH->fetchAll(),
        'notificaciones' => $stmtN->fetchAll()
    ]);
    exit;
}

if ($route === 'rrhh/reloj-control' && $method === 'POST') {
    $uid = $authUser['id_usuario'];
    $tipo = $body['tipo_marca'] ?? 'ENTRADA';
    $lat = $body['latitud'] ?? -33.51124;
    $lng = $body['longitud'] ?? -70.75813;
    $metodo = $body['metodo_marcaje'] ?? 'GEOLOCALIZADO';

    if ($tipo === 'ENTRADA') {
        $stmt = $pdo->prepare("
            INSERT INTO apx_rrhh_marcajes_biometricos (id_usuario, fecha, hora_entrada, latitud_entrada, longitud_entrada, metodo_marcaje, estado, observacion)
            VALUES (?, CURDATE(), CURTIME(), ?, ?, ?, 'PRESENTE', 'Marcaje verificado en recinto APANDI')
            ON DUPLICATE KEY UPDATE hora_entrada = CURTIME(), latitud_entrada = VALUES(latitud_entrada), longitud_entrada = VALUES(longitud_entrada), metodo_marcaje = VALUES(metodo_marcaje)
        ");
        $stmt->execute([$uid, $lat, $lng, $metodo]);
    } else {
        $stmt = $pdo->prepare("UPDATE apx_rrhh_marcajes_biometricos SET hora_salida = CURTIME() WHERE id_usuario = ? AND fecha = CURDATE()");
        $stmt->execute([$uid]);
    }

    $stmtA = $pdo->prepare("SELECT * FROM apx_rrhh_marcajes_biometricos WHERE id_usuario = ? AND fecha = CURDATE()");
    $stmtA->execute([$uid]);

    echo json_encode([
        'ok' => true,
        'mensaje' => "Marca de $tipo registrada exitosamente ($metodo).",
        'registro' => $stmtA->fetch()
    ]);
    exit;
}
