<?php
if (!defined('APANDI_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}

// 10. Administración de Cuentas de Usuario del Equipo (UsersView Figma)
if ($route === 'usuarios' && $method === 'GET') {
    $usuarios = $pdo->query("
        SELECT u.id_usuario, u.rut, u.nombres, u.apellidos, CONCAT(u.nombres, ' ', u.apellidos) AS name,
               SUBSTRING_INDEX(u.email, '@', 1) AS username, u.email, u.telefono, u.especialidad,
               u.horas_contrato, u.activo, u.ultimo_acceso, r.codigo AS rol_codigo, r.nombre AS rol_nombre
        FROM apx_sec_cuentas_acceso u
        INNER JOIN apx_sec_rbac_perfiles r ON u.id_rol = r.id_rol
        ORDER BY u.id_rol ASC, u.id_usuario ASC
    ")->fetchAll();
    echo json_encode(['ok' => true, 'usuarios' => $usuarios]);
    exit;
}

if ($route === 'usuarios' && $method === 'POST') {
    if (!in_array($authUser['rol_codigo'], ['ADMIN', 'DIRECTOR_UTP', 'DOCENTE'])) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Sin permisos para crear cuentas del equipo.']);
        exit;
    }
    $name = trim((string)($body['name'] ?? ''));
    $email = strtolower(trim((string)($body['email'] ?? '')));
    $password = (string)($body['password'] ?? '');
    $roleInput = strtolower(trim((string)($body['role'] ?? 'docente')));
    $rut = trim((string)($body['rut'] ?? ('19.' . random_int(100, 999) . '.' . random_int(100, 999) . '-' . random_int(0, 9))));
    $especialidad = trim((string)($body['especialidad'] ?? 'Profesional de Educación Especial'));

    if (strlen($password) < 10) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'La contraseña temporal debe tener al menos 10 caracteres.']);
        exit;
    }

    $roleMap = [
        'administrador' => 'ADMIN',
        'admin' => 'ADMIN',
        'director_utp' => 'DIRECTOR_UTP',
        'profesor' => 'DOCENTE',
        'docente' => 'DOCENTE',
        'especialista_pie' => 'ESPECIALISTA_PIE',
        'monitor' => 'MONITOR',
        'apoderado' => 'APODERADO'
    ];
    $rolCodigo = $roleMap[$roleInput] ?? 'DOCENTE';

    try {
        $stmtRole = $pdo->prepare("SELECT id_rol FROM apx_sec_rbac_perfiles WHERE codigo = ? LIMIT 1");
        $stmtRole->execute([$rolCodigo]);
        $idRol = (int)($stmtRole->fetchColumn() ?: 3);

        $parts = preg_split('/\s+/', $name, 2);
        $nombres = $parts[0] ?? $name;
        $apellidos = $parts[1] ?? 'APANDI';
        $passHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $pinHash = password_hash('849206', PASSWORD_BCRYPT, ['cost' => 12]);

        $stmtIns = $pdo->prepare("
            INSERT INTO apx_sec_cuentas_acceso (id_rol, rut, nombres, apellidos, email, password_hash, pin_firma_hash, especialidad, horas_contrato, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 40, 1)
        ");
        $stmtIns->execute([$idRol, $rut, $nombres, $apellidos, $email, $passHash, $pinHash, $especialidad]);
        $newUid = (int)$pdo->lastInsertId();

        logAudit($pdo, $authUser['id_usuario'], null, 'CUENTAS_EQUIPO', 'CREACION', "Creación de cuenta institucional #$newUid ($email - $rolCodigo)");
        echo json_encode(['ok' => true, 'id_usuario' => $newUid]);
    } catch (Throwable $e) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'No fue posible crear la cuenta. El usuario, RUT o correo puede estar en uso.']);
    }
    exit;
}
