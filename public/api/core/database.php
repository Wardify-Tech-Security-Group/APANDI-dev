<?php
if (!defined('APANDI_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}

// Conexión PDO a MariaDB / MySQL
try {
    $dsn = "mysql:host=$dbHost;port=$dbPort;dbname=$dbName;charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (Throwable $e) {
    try {
        $pdo = new PDO("mysql:host=localhost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
    } catch (Throwable $ex) {
        http_response_code(503);
        echo json_encode(['ok' => false, 'error' => 'Error de conexión segura a la base de datos.']);
        exit;
    }
}

// Sincronización estricta de Huso Horario entre PHP y MariaDB (Prevención de desfases en bloqueado_hasta)
try {
    $tzOffset = date('P');
    $pdo->exec("SET time_zone = '$tzOffset'");
} catch (Throwable $e) {
    // Continuar si la instancia MariaDB no permite modificación de time_zone
}

// Asegurar existencia de columnas de seguridad Anti-Brute Force en MariaDB
function ensureSecurityColumns(PDO $pdo): void {
    try {
        $cols = $pdo->query("SHOW COLUMNS FROM apx_sec_cuentas_acceso LIKE 'bloqueado_hasta'")->fetch();
        if (!$cols) {
            $pdo->exec("
                ALTER TABLE apx_sec_cuentas_acceso 
                ADD COLUMN intentos_fallidos INT NOT NULL DEFAULT 0 COMMENT 'Contador de intentos fallidos Anti-Brute Force',
                ADD COLUMN bloqueado_hasta TIMESTAMP NULL DEFAULT NULL COMMENT 'Timestamp de bloqueo temporal tras 5 intentos fallidos (15 min)'
            ");
        }
    } catch (Throwable $e) {
        // Ignorar si ya existen las columnas o el entorno es de solo lectura
    }
}

ensureSecurityColumns($pdo);

// Sembrar registros clínicos encriptados con AES-256-GCM real si están vacíos
function ensureEncryptedClinicalSeed(PDO $pdo, string $aesHexKey): void {
    $count = (int)$pdo->query("SELECT COUNT(*) FROM apx_med_dossier_clinico_enc")->fetchColumn();
    if ($count === 0) {
        $stmt = $pdo->prepare("
            INSERT INTO apx_med_dossier_clinico_enc 
            (id_estudiante, diagnostico_principal_enc, anamnesis_enc, datos_medicos_json, sistema_salud, centro_salud_derivacion, autoriza_administracion_medicamento, actualizado_por)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            1,
            encryptAES256('Trastorno del Espectro Autista (TEA Nivel 2) concomitante con Discapacidad Intelectual Moderada (Decreto 170 MINEDUC).', $aesHexKey),
            encryptAES256('Parto a término sin complicaciones. Diagnóstico temprano a los 3 años. Hipersensibilidad auditiva a motores industriales de alta frecuencia. Excelente memoria visual y adherencia a secuencias pictográficas ARASAAC.', $aesHexKey),
            json_encode([
                'medicamentos' => [
                    ['nombre' => 'Risperidona', 'dosis' => '1 mg', 'horario' => '08:00 y 20:00 hrs', 'en_colegio' => false],
                    ['nombre' => 'Melatonina', 'dosis' => '3 mg', 'horario' => '21:30 hrs', 'en_colegio' => false]
                ],
                'alergias' => ['Penicilina', 'Polvo textil sintético en alta concentración'],
                'perfil_sensorial' => 'Hipersensibilidad auditiva (requiere protectores SNR 28dB en taller); buscador propioceptivo.',
                'contacto_medico' => 'Dr. Andrés Molina - Neurólogo CRS Maipú / COSAM'
            ], JSON_UNESCAPED_UNICODE),
            'FONASA',
            'CRS Maipú / COSAM',
            1,
            5
        ]);
        $stmt->execute([
            2,
            encryptAES256('Discapacidad Intelectual Leve (CI 64 WISC-V). Alta competencia adaptativa y motriz fina en taller laboral.', $aesHexKey),
            encryptAES256('Desarrollo motor acorde a su edad cronológica. Escolaridad previa en escuela especial con tránsito exitoso a nivel laboral Decreto 83.', $aesHexKey),
            json_encode([
                'medicamentos' => [],
                'alergias' => ['Ninguna conocida'],
                'perfil_sensorial' => 'Normotípico, buena tolerancia a estímulos de taller.',
                'contacto_medico' => 'Control sano anual CESFAM Norman Voullieme Cerrillos'
            ], JSON_UNESCAPED_UNICODE),
            'FONASA',
            'CESFAM Cerrillos',
            0,
            5
        ]);
    }

    $countPaec = (int)$pdo->query("SELECT COUNT(*) FROM apx_conv_protocolos_paec_enc")->fetchColumn();
    if ($countPaec === 0) {
        $stmtPaec = $pdo->prepare("
            INSERT INTO apx_conv_protocolos_paec_enc
            (id_estudiante, id_profesional_sos, id_profesional_suplente, gatillantes_dec_enc, senales_previas_enc, estrategias_contencion_enc, acuerdos_familia)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmtPaec->execute([
            1, 5, 7,
            encryptAES256('1. Ruido súbito de máquinas overlock o timbres prolongados. 2. Cambios abruptos de actividad sin anticipación pictográfica. 3. Frustración cuando se corta el hilo de costura.', $aesHexKey),
            encryptAES256('Se cubre los oídos con ambas manos, balanceo corporal (rocking), verbalización repetitiva y aumento del tono de voz.', $aesHexKey),
            encryptAES256('ETAPA 1 (Prevención): Entregar protectores auditivos y ofrecer tarjeta de pausa activa. ETAPA 2 (Moderada): Disminuir exigencia, guiar con voz suave a rincón de calma. ETAPA 3 (Severa / SOS): Activar Botón SOS en Aula para acompañamiento de Psicóloga Camila Vargas a Sala Sensorial.', $aesHexKey),
            'La familia se compromete a informar al ingreso si Matías tuvo alteraciones del sueño la noche anterior y enviar sus protectores auditivos diariamente.'
        ]);
        $stmtPaec->execute([
            2, 5, 3,
            encryptAES256('Presión por tiempos de entrega o correcciones frente al grupo completo.', $aesHexKey),
            encryptAES256('Silencio prolongado, aislamiento en su estación de costura y bloqueo motor leve.', $aesHexKey),
            encryptAES256('Validar su emoción en privado, fraccionar la tarea de confección en 2 pasos cortos y reforzar positivamente sus avances.', $aesHexKey),
            'Apoderado reforzará en casa la tolerancia a la frustración y asistirá a reuniones bimensuales con el equipo PIE.'
        ]);
    }
}

ensureEncryptedClinicalSeed($pdo, $aesHexKey);
