<?php
if (!defined('APANDI_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}

// GESTIÓN DE SEGURIDAD Y CREDENCIALES: CAMBIO DE CONTRASEÑA Y PIN DE FIRMA
// =============================================================================

// 1.1 Cambio de Contraseña de Acceso (Requiere sesión JWT)
if ($route === 'auth/change-password' && $method === 'POST') {
    $currentPassword = (string)($body['current_password'] ?? ($body['password_actual'] ?? ($body['currentPassword'] ?? '')));
    $newPassword = (string)($body['new_password'] ?? ($body['password_nueva'] ?? ($body['newPassword'] ?? '')));

    if ($currentPassword === '' || $newPassword === '') {
        http_response_code(400);
        echo json_encode([
            'ok' => false,
            'error' => 'Debe ingresar la contraseña actual y la nueva contraseña.'
        ]);
        exit;
    }

    if (strlen($newPassword) < 8) {
        http_response_code(400);
        echo json_encode([
            'ok' => false,
            'error' => 'La nueva contraseña debe tener al menos 8 caracteres.'
        ]);
        exit;
    }

    if ($currentPassword === $newPassword) {
        http_response_code(400);
        echo json_encode([
            'ok' => false,
            'error' => 'La nueva contraseña no puede ser idéntica a la contraseña actual.'
        ]);
        exit;
    }

    // Consultar el hash actual del usuario en la base de datos
    $stmtUser = $pdo->prepare("SELECT id_usuario, password_hash FROM apx_sec_cuentas_acceso WHERE id_usuario = ? AND activo = 1 LIMIT 1");
    $stmtUser->execute([$authUser['id_usuario']]);
    $userRow = $stmtUser->fetch();

    if (!$userRow || !password_verify($currentPassword, (string)$userRow['password_hash'])) {
        http_response_code(401);
        echo json_encode([
            'ok' => false,
            'error' => 'La contraseña actual ingresada es incorrecta.'
        ]);
        exit;
    }

    // Hashear la nueva contraseña con Bcrypt Cost 12
    $newHash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);

    // Actualizar hash y resetear debe_cambiar_clave a 0
    $stmtUpdate = $pdo->prepare("
        UPDATE apx_sec_cuentas_acceso 
        SET password_hash = ?, debe_cambiar_clave = 0, updated_at = NOW() 
        WHERE id_usuario = ?
    ");
    $stmtUpdate->execute([$newHash, $authUser['id_usuario']]);

    // Registro de auditoría forense Ley 19.628
    logAudit(
        $pdo,
        (int)$authUser['id_usuario'],
        null,
        'SEGURIDAD_ACCESO',
        'ACTUALIZACION',
        'Cambio exitoso de contraseña con Bcrypt Cost 12. Flag debe_cambiar_clave actualizado a 0.'
    );

    echo json_encode([
        'ok' => true,
        'message' => 'Contraseña actualizada exitosamente.'
    ]);
    exit;
}

// 1.2 Cambio de PIN de Firma Electrónica Simple (POST /api/auth/change-pin - Requiere sesión JWT)
if ($route === 'auth/change-pin' && $method === 'POST') {
    $currentPassword = (string)($body['current_password'] ?? ($body['password_actual'] ?? ($body['currentPassword'] ?? '')));
    $newPin = trim((string)($body['new_pin'] ?? ($body['pin_nuevo'] ?? ($body['newPin'] ?? ($body['pin'] ?? '')))));

    if ($currentPassword === '' || $newPin === '') {
        http_response_code(400);
        echo json_encode([
            'ok' => false,
            'error' => 'Debe ingresar la contraseña actual y el nuevo PIN de firma.'
        ]);
        exit;
    }

    // Validar que el PIN tenga exactamente 6 dígitos numéricos
    if (!preg_match('/^\d{6}$/', $newPin)) {
        http_response_code(400);
        echo json_encode([
            'ok' => false,
            'error' => 'El PIN de firma electrónica debe ser estrictamente de 6 dígitos numéricos.'
        ]);
        exit;
    }

    // Consultar el usuario en la BD para verificar su contraseña actual
    $stmtUser = $pdo->prepare("SELECT id_usuario, password_hash FROM apx_sec_cuentas_acceso WHERE id_usuario = ? AND activo = 1 LIMIT 1");
    $stmtUser->execute([$authUser['id_usuario']]);
    $userRow = $stmtUser->fetch();

    if (!$userRow || !password_verify($currentPassword, (string)$userRow['password_hash'])) {
        http_response_code(401);
        echo json_encode([
            'ok' => false,
            'error' => 'La contraseña actual ingresada es incorrecta.'
        ]);
        exit;
    }

    // Hashear el nuevo PIN con Bcrypt Cost 12
    $newPinHash = password_hash($newPin, PASSWORD_BCRYPT, ['cost' => 12]);

    // Actualizar el PIN de firma electrónica en la BD
    $stmtUpdate = $pdo->prepare("
        UPDATE apx_sec_cuentas_acceso 
        SET pin_firma_hash = ?, updated_at = NOW() 
        WHERE id_usuario = ?
    ");
    $stmtUpdate->execute([$newPinHash, $authUser['id_usuario']]);

    // Registro de auditoría forense Ley 19.628
    logAudit(
        $pdo,
        (int)$authUser['id_usuario'],
        null,
        'SEGURIDAD_ACCESO',
        'ACTUALIZACION',
        'Actualización exitosa de PIN de Firma Electrónica Simple (Bcrypt Cost 12).'
    );

    echo json_encode([
        'ok' => true,
        'message' => 'PIN de firma electrónica actualizado exitosamente.'
    ]);
    exit;
}
