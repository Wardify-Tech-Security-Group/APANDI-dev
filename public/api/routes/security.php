<?php
if (!defined('APANDI_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}

// 8. Seguridad y Auditoría Forense Ley 19.628
if ($route === 'seguridad/auditoria' && $method === 'GET') {
    if (!in_array($authUser['rol_codigo'], ['ADMIN', 'DIRECTOR_UTP', 'ESPECIALISTA_PIE'])) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Acceso reservado a Administración, Dirección/UTP y Coordinación PIE.']);
        exit;
    }

    $logs = $pdo->query("
        SELECT l.*, CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre, r.codigo AS rol_codigo,
               CONCAT(e.nombres, ' ', e.apellidos) AS estudiante_nombre
        FROM apx_sec_trazabilidad_forense l
        INNER JOIN apx_sec_cuentas_acceso u ON l.id_usuario = u.id_usuario
        INNER JOIN apx_sec_rbac_perfiles r ON u.id_rol = r.id_rol
        LEFT JOIN apx_acad_expedientes_alumnos e ON l.id_estudiante = e.id_estudiante
        ORDER BY l.fecha_hora DESC
        LIMIT 80
    ")->fetchAll();

    $roles = $pdo->query("SELECT * FROM apx_sec_rbac_perfiles ORDER BY id_rol ASC")->fetchAll();
    $usuarios = $pdo->query("
        SELECT u.id_usuario, u.rut, u.nombres, u.apellidos, u.email, u.telefono, u.especialidad, u.horas_contrato, u.activo, u.ultimo_acceso, u.intentos_fallidos, u.bloqueado_hasta, r.codigo AS rol_codigo, r.nombre AS rol_nombre
        FROM apx_sec_cuentas_acceso u
        INNER JOIN apx_sec_rbac_perfiles r ON u.id_rol = r.id_rol
        ORDER BY u.id_rol ASC
    ")->fetchAll();

    echo json_encode(['ok' => true, 'logs' => $logs, 'roles' => $roles, 'usuarios' => $usuarios]);
    exit;
}
