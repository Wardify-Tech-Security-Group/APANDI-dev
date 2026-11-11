<?php
if (!defined('APANDI_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}

// 5. Módulo Clínico y PIE (Encriptación AES-256-GCM - Ley 19.628)
if (preg_match('#^clinico/expediente/(\d+)$#', $route, $m)) {
    $idEst = (int)$m[1];
    $rol = $authUser['rol_codigo'];

    if (!in_array($rol, ['ESPECIALISTA_PIE', 'DIRECTOR_UTP', 'DOCENTE', 'ADMIN'])) {
        logAudit($pdo, $authUser['id_usuario'], $idEst, 'FICHA_CLINICA_PIE', 'LECTURA', "INTENTO DENEGADO por rol no autorizado ($rol) - Ley 19.628");
        http_response_code(403);
        echo json_encode([
            'ok' => false,
            'error' => "Restricción Legal Ley 19.628: Su perfil ($rol) no tiene autorización para acceder a diagnósticos clínicos ni expedientes PIE encriptados. Solo Equipo PIE, Dirección/UTP y Docente Titular (en modo lectura) están habilitados."
        ]);
        exit;
    }

    if ($method === 'GET') {
        logAudit($pdo, $authUser['id_usuario'], $idEst, 'FICHA_CLINICA_PIE_PAEC', 'LECTURA', "Acceso autorizado ($rol) y desencriptación AES-256-GCM de expediente #$idEst");

        $stmtF = $pdo->prepare("SELECT * FROM apx_med_dossier_clinico_enc WHERE id_estudiante = ?");
        $stmtF->execute([$idEst]);
        $fichaRaw = $stmtF->fetch();

        $stmtPaec = $pdo->prepare("
            SELECT p.*, CONCAT(u.nombres, ' ', u.apellidos) AS profesional_sos_nombre, u.telefono AS profesional_sos_telefono, u.especialidad AS profesional_sos_especialidad
            FROM apx_conv_protocolos_paec_enc p
            INNER JOIN apx_sec_cuentas_acceso u ON p.id_profesional_sos = u.id_usuario
            WHERE p.id_estudiante = ?
        ");
        $stmtPaec->execute([$idEst]);
        $paecRaw = $stmtPaec->fetch();

        $stmtPai = $pdo->prepare("SELECT * FROM apx_pie_planes_apoyo_ind WHERE id_estudiante = ? ORDER BY anio_escolar DESC LIMIT 1");
        $stmtPai->execute([$idEst]);

        $stmtPaci = $pdo->prepare("SELECT * FROM apx_pie_adecuaciones_paci WHERE id_estudiante = ? ORDER BY anio_escolar DESC LIMIT 1");
        $stmtPaci->execute([$idEst]);

        $ficha = $fichaRaw ? [
            'id_ficha' => $fichaRaw['id_ficha'],
            'cipher_preview' => substr($fichaRaw['diagnostico_principal_enc'], 0, 56) . '...',
            'diagnostico_principal' => decryptAES256($fichaRaw['diagnostico_principal_enc'], $aesHexKey),
            'anamnesis' => decryptAES256($fichaRaw['anamnesis_enc'], $aesHexKey),
            'datos_medicos' => json_decode($fichaRaw['datos_medicos_json'], true) ?: [],
            'sistema_salud' => $fichaRaw['sistema_salud'],
            'centro_salud_derivacion' => $fichaRaw['centro_salud_derivacion'],
            'autoriza_administracion_medicamento' => (int)$fichaRaw['autoriza_administracion_medicamento'],
            'updated_at' => $fichaRaw['updated_at']
        ] : null;

        $paec = $paecRaw ? [
            'id_paec' => $paecRaw['id_paec'],
            'profesional_sos_nombre' => $paecRaw['profesional_sos_nombre'],
            'profesional_sos_telefono' => $paecRaw['profesional_sos_telefono'],
            'profesional_sos_especialidad' => $paecRaw['profesional_sos_especialidad'],
            'cipher_paec_preview' => substr($paecRaw['gatillantes_dec_enc'], 0, 56) . '...',
            'gatillantes_dec' => decryptAES256($paecRaw['gatillantes_dec_enc'], $aesHexKey),
            'senales_previas' => decryptAES256($paecRaw['senales_previas_enc'], $aesHexKey),
            'estrategias_contencion' => decryptAES256($paecRaw['estrategias_contencion_enc'], $aesHexKey),
            'acuerdos_familia' => $paecRaw['acuerdos_familia']
        ] : null;

        $soloLectura = in_array($rol, ['DOCENTE', 'ADMIN']);

        echo json_encode([
            'ok' => true,
            'permiso_escritura' => !$soloLectura,
            'rol_acceso' => $rol,
            'ficha' => $ficha,
            'paec' => $paec,
            'pai' => $stmtPai->fetch() ?: null,
            'paci' => $stmtPaci->fetch() ?: null
        ]);
        exit;
    }

    if ($method === 'PUT') {
        if (!in_array($rol, ['ESPECIALISTA_PIE', 'DIRECTOR_UTP'])) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => 'Modo Solo Lectura (Ley 19.628): Solo el Equipo PIE y Dirección/UTP pueden modificar datos clínicos o del PAEC.']);
            exit;
        }

        if (isset($body['diagnostico_principal'])) {
            $stmtUp = $pdo->prepare("
                INSERT INTO apx_med_dossier_clinico_enc (id_estudiante, diagnostico_principal_enc, anamnesis_enc, datos_medicos_json, centro_salud_derivacion, actualizado_por)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    diagnostico_principal_enc = VALUES(diagnostico_principal_enc),
                    anamnesis_enc = VALUES(anamnesis_enc),
                    datos_medicos_json = VALUES(datos_medicos_json),
                    centro_salud_derivacion = VALUES(centro_salud_derivacion),
                    actualizado_por = VALUES(actualizado_por)
            ");
            $stmtUp->execute([
                $idEst,
                encryptAES256($body['diagnostico_principal'], $aesHexKey),
                encryptAES256($body['anamnesis'] ?? '', $aesHexKey),
                json_encode($body['datos_medicos_json'] ?? [], JSON_UNESCAPED_UNICODE),
                $body['centro_salud_derivacion'] ?? 'CRS Maipú / COSAM',
                $authUser['id_usuario']
            ]);
        }

        if (isset($body['gatillantes_dec'])) {
            $stmtUpPaec = $pdo->prepare("
                INSERT INTO apx_conv_protocolos_paec_enc (id_estudiante, id_profesional_sos, gatillantes_dec_enc, senales_previas_enc, estrategias_contencion_enc, acuerdos_familia)
                VALUES (?, 5, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    gatillantes_dec_enc = VALUES(gatillantes_dec_enc),
                    senales_previas_enc = VALUES(senales_previas_enc),
                    estrategias_contencion_enc = VALUES(estrategias_contencion_enc),
                    acuerdos_familia = VALUES(acuerdos_familia)
            ");
            $stmtUpPaec->execute([
                $idEst,
                encryptAES256($body['gatillantes_dec'], $aesHexKey),
                encryptAES256($body['senales_previas'] ?? '', $aesHexKey),
                encryptAES256($body['estrategias_contencion'] ?? '', $aesHexKey),
                $body['acuerdos_familia'] ?? ''
            ]);
        }

        logAudit($pdo, $authUser['id_usuario'], $idEst, 'FICHA_CLINICA_PIE_PAEC', 'ACTUALIZACION', "Actualización encriptada AES-256-GCM de expediente clínico/PAEC #$idEst");
        echo json_encode(['ok' => true, 'mensaje' => 'Expediente Clínico y PAEC cifrados con AES-256-GCM y guardados en MariaDB.']);
        exit;
    }
}
