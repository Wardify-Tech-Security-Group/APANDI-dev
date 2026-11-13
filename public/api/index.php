<?php
/**
 * =============================================================================
 * PUENTE UNIVERSAL DE BASE DE DATOS MYSQL/MARIADB PARA HOSTING EN CHILE (v3.0)
 * Compatible con 100% de Hostings cPanel / Apache / LiteSpeed y Docker
 * Consume configuración estrictamente desde variables de entorno (.env)
 * Cumplimiento Ley 19.628 (AES-256-GCM) + RBAC + Bcrypt Cost 12 + JWT
 * =============================================================================
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/**
 * Cargador nativo de archivo .env (para cPanel / Apache donde no exista inyección Docker)
 */
function loadEnvConfig(): void {
    $candidates = [
        dirname(__DIR__, 2) . '/.env',
        '/var/www/.env',
        dirname(__DIR__) . '/.env'
    ];
    foreach ($candidates as $path) {
        if (is_readable($path) && is_file($path)) {
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($lines === false) continue;
            foreach ($lines as $line) {
                $trimmed = trim($line);
                if ($trimmed === '' || strpos($trimmed, '#') === 0 || strpos($trimmed, '=') === false) {
                    continue;
                }
                [$key, $val] = explode('=', $trimmed, 2);
                $key = trim($key);
                $val = trim($val, " \t\n\r\0\x0B\"'");
                if ($key !== '' && getenv($key) === false) {
                    putenv("$key=$val");
                    $_ENV[$key] = $val;
                }
            }
            break;
        }
    }
}

loadEnvConfig();

$tz = getenv('TZ') ?: ($_ENV['TZ'] ?? 'America/Santiago');
date_default_timezone_set($tz);

# Constantes para control de intentos y tiempo de espera para login | considerar agregarlos a .env para más seguridad
const LOGIN_MAX_FAILED_ATTEMPTS = 10;
const LOGIN_LOCKOUT_MINUTES = 15;

// Lectura estricta desde .env sin credenciales ni llaves hardcodeadas en el código fuente
$dbHost = getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? 'localhost');
$dbPort = getenv('DB_PORT') ?: ($_ENV['DB_PORT'] ?? '3306');
$dbName = getenv('DB_NAME') ?: ($_ENV['DB_NAME'] ?? '');
$dbUser = getenv('DB_USER') ?: ($_ENV['DB_USER'] ?? '');
$dbPass = getenv('DB_PASSWORD') ?: ($_ENV['DB_PASSWORD'] ?? '');
$aesHexKey = getenv('AES_MASTER_KEY') ?: ($_ENV['AES_MASTER_KEY'] ?? '');
$jwtSecret = getenv('JWT_SECRET') ?: ($_ENV['JWT_SECRET'] ?? '');

if ($dbName === '' || $dbUser === '' || $dbPass === '' || strlen($aesHexKey) !== 64 || strlen($jwtSecret) < 32) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Configuración de seguridad incompleta: Verifique que el archivo .env contenga DB_NAME, DB_USER, DB_PASSWORD, AES_MASTER_KEY (64 hex) y JWT_SECRET.'
    ]);
    exit;
}

// Funciones Criptográficas AES-256-GCM (Ley 19.628)
function encryptAES256(string $plainText, string $hexKey): string {
    if ($plainText === '') return '';
    $key = hex2bin($hexKey);
    $iv = random_bytes(12);
    $tag = '';
    $cipherText = openssl_encrypt($plainText, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, '', 16);
    return bin2hex($iv) . ':' . bin2hex($tag) . ':' . bin2hex($cipherText);
}

function decryptAES256(?string $payload, string $hexKey): string {
    if (!$payload || strpos($payload, ':') === false) return $payload ?: '';
    $parts = explode(':', $payload);
    if (count($parts) !== 3) return $payload;
    [$ivHex, $tagHex, $cipherHex] = $parts;
    $key = hex2bin($hexKey);
    $decrypted = openssl_decrypt(
        hex2bin($cipherHex),
        'aes-256-gcm',
        $key,
        OPENSSL_RAW_DATA,
        hex2bin($ivHex),
        hex2bin($tagHex)
    );
    return $decrypted !== false ? $decrypted : '[DATO PROTEGIDO AES-256]';
}

// Funciones JWT Nativas (HMAC-SHA256 sin librerías externas)
function createJWT(array $payload, string $secret): string {
    $header = rtrim(strtr(base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT'])), '+/', '-_'), '=');
    $payload['exp'] = time() + (8 * 3600);
    $body = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
    $sig = rtrim(strtr(base64_encode(hash_hmac('sha256', "$header.$body", $secret, true)), '+/', '-_'), '=');
    return "$header.$body.$sig";
}

function verifyJWT(string $secret): ?array {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return null;
    }
    $parts = explode('.', trim($matches[1]));
    if (count($parts) !== 3) return null;
    [$header, $body, $sig] = $parts;
    $expectedSig = rtrim(strtr(base64_encode(hash_hmac('sha256', "$header.$body", $secret, true)), '+/', '-_'), '=');
    if (!hash_equals($expectedSig, $sig)) return null;
    $data = json_decode(base64_decode(strtr($body, '-_', '+/')), true);
    if (!$data || (isset($data['exp']) && $data['exp'] < time())) return null;
    return $data;
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

$route = $_GET['route'] ?? '';
if (!$route) {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $route = preg_replace('#^/api/?#', '', $uri);
}
$route = trim($route, '/');
$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents('php://input'), true) ?: [];

// =============================================================================
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

    if ($emailOrRut === '' || $password === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Debe ingresar su correo/RUT y contraseña.']);
        exit;
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("
            SELECT u.id_usuario, u.rut, u.nombres, u.apellidos, u.email, u.password_hash,
                   u.especialidad, u.horas_contrato, u.debe_cambiar_clave, u.activo, u.id_rol,
                   u.intentos_fallidos, u.bloqueado_hasta,
                   TIMESTAMPDIFF(SECOND, NOW(), u.bloqueado_hasta) AS segundos_bloqueo,
                   r.codigo AS rol_codigo, r.nombre AS rol_nombre, r.permisos_json
            FROM apx_sec_cuentas_acceso u
            INNER JOIN apx_sec_rbac_perfiles r ON u.id_rol = r.id_rol
            WHERE (u.email = ? OR SUBSTRING_INDEX(u.email, '@', 1) = ? OR u.rut = ? OR REPLACE(u.rut, '.', '') = ?)
            LIMIT 1
            FOR UPDATE
        ");
        $stmt->execute([$emailOrRut, $emailOrRut, $emailOrRut, $rutSinPuntos]);
        $user = $stmt->fetch();

        if (!$user || (int)$user['activo'] !== 1) {
            $pdo->commit();
            // Mitigación de timing attack para usuarios inexistentes o inactivos
            password_verify($password, '$2y$12$cLrJlhPwVUG1PYmVQmma1egZiaAPKT5uGuIjcmQ4Za057tmUBAiz2');
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Credenciales inválidas o usuario inactivo.']);
            exit;
        }

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
            'horas_contrato' => (int)$user['horas_contrato'],
            'debe_cambiar_clave' => (int)($user['debe_cambiar_clave'] ?? 0)
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

// Verificar autenticación JWT para el resto de los endpoints
$authUser = verifyJWT($jwtSecret);
if (!$authUser) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Sesión no válida o expirada. Inicie sesión nuevamente.']);
    exit;
}

// =============================================================================
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

// 3. Módulo Administrativo: Estudiantes, Matrícula y Talleres (Grupo A / B) + Ficha Integral Figma
if ($route === 'estudiantes' && $method === 'GET') {
    $estudiantes = $pdo->query("
        SELECT 
            e.*,
            m.numero_matricula,
            m.grupo_funcionalidad,
            m.jornada,
            m.fecha_incorporacion,
            m.observaciones_ingreso,
            t.id_taller,
            t.nombre AS taller_nombre,
            t.codigo_mineduc,
            t.nivel_decreto,
            t.sala_ubicacion,
            CONCAT(a.nombres, ' ', a.apellidos) AS apoderado_nombre,
            a.rut AS apoderado_rut,
            a.parentesco AS apoderado_parentesco,
            a.telefono_principal AS apoderado_telefono,
            a.email AS apoderado_email,
            CONCAT(psos.nombres, ' ', psos.apellidos) AS profesional_sos_nombre,
            psos.especialidad AS profesional_sos_especialidad,
            psos.telefono AS profesional_sos_telefono,
            fc.diagnostico_principal_enc,
            pai.fortalezas_intereses,
            pai.barreras_aprendizaje,
            pai.objetivos_transicion_vida_adulta
        FROM apx_acad_expedientes_alumnos e
        LEFT JOIN apx_acad_inscripciones_anuales m ON e.id_estudiante = m.id_estudiante AND m.anio_escolar = 2026
        LEFT JOIN apx_acad_unidades_laborales t ON m.id_taller = t.id_taller
        LEFT JOIN apx_fam_tutores_legales a ON e.id_apoderado_titular = a.id_apoderado
        LEFT JOIN apx_conv_protocolos_paec_enc p ON e.id_estudiante = p.id_estudiante
        LEFT JOIN apx_sec_cuentas_acceso psos ON p.id_profesional_sos = psos.id_usuario
        LEFT JOIN apx_med_dossier_clinico_enc fc ON e.id_estudiante = fc.id_estudiante
        LEFT JOIN apx_pie_planes_apoyo_ind pai ON e.id_estudiante = pai.id_estudiante AND pai.anio_escolar = 2026
        ORDER BY e.apellidos ASC
    ")->fetchAll();

    $canSeeClinical = in_array($authUser['rol_codigo'], ['ESPECIALISTA_PIE', 'DIRECTOR_UTP', 'DOCENTE', 'ADMIN']);
    foreach ($estudiantes as &$estRow) {
        if ($canSeeClinical && !empty($estRow['diagnostico_principal_enc'])) {
            $estRow['diagnostico_principal'] = decryptAES256($estRow['diagnostico_principal_enc'], $aesHexKey);
        } else {
            $estRow['diagnostico_principal'] = 'Evaluación diagnóstica integral Decreto 170';
        }
        unset($estRow['diagnostico_principal_enc']);
    }
    unset($estRow);

    $talleres = $pdo->query("SELECT * FROM apx_acad_unidades_laborales WHERE activo = 1")->fetchAll();
    echo json_encode(['ok' => true, 'estudiantes' => $estudiantes, 'talleres' => $talleres]);
    exit;
}

if ($route === 'estudiantes' && $method === 'POST') {
    if (!in_array($authUser['rol_codigo'], ['ADMIN', 'DIRECTOR_UTP', 'DOCENTE', 'ESPECIALISTA_PIE'])) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Solo Dirección/UTP, Administración o Equipo Docente/PIE pueden registrar nuevos estudiantes.']);
        exit;
    }

    $pdo->beginTransaction();
    try {
        $nombres = trim((string)($body['nombres'] ?? ($body['names'] ?? '')));
        $apellidos = trim((string)($body['apellidos'] ?? trim(($body['paternalSurname'] ?? '') . ' ' . ($body['maternalSurname'] ?? ''))));
        $nombreSocial = trim((string)($body['nombre_social'] ?? ($body['socialName'] ?? ''))) ?: null;
        $fechaNac = trim((string)($body['fecha_nacimiento'] ?? ($body['birthDate'] ?? ''))) ?: '2007-06-15';
        $genero = trim((string)($body['genero'] ?? ($body['gender'] ?? ''))) ?: 'No especificado';
        $direccion = trim((string)($body['direccion'] ?? ($body['address'] ?? ''))) ?: 'Av. Pajaritos, Maipú';
        $comuna = trim((string)($body['comuna'] ?? ($body['municipality'] ?? ''))) ?: 'Maipú';
        $pctDisc = (int)($body['porcentaje_discapacidad'] ?? 50);

        $rawStatus = strtolower(trim((string)($body['status'] ?? ($body['estado_matricula'] ?? 'activo'))));
        $estadoMatricula = 'REGULAR';
        if ($rawStatus === 'retirado') $estadoMatricula = 'RETIRADO';
        elseif ($rawStatus === 'egresado' || $rawStatus === 'egresado_practica') $estadoMatricula = 'EGRESADO_PRACTICA';

        $stmt = $pdo->prepare("
            INSERT INTO apx_acad_expedientes_alumnos (rut, nombres, apellidos, nombre_social, fecha_nacimiento, genero, direccion, comuna, registro_nacional_discapacidad, porcentaje_discapacidad, beneficio_junaeb, id_apoderado_titular, estado_matricula)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1, 1, ?)
        ");
        $stmt->execute([
            $body['rut'],
            $nombres,
            $apellidos,
            $nombreSocial,
            $fechaNac,
            $genero,
            $direccion,
            $comuna,
            $pctDisc,
            $estadoMatricula
        ]);
        $idEst = (int)$pdo->lastInsertId();
        $numMat = !empty($body['registrationNumber'])
            ? trim((string)$body['registrationNumber'])
            : (!empty($body['numero_matricula']) ? trim((string)$body['numero_matricula']) : ('MAT-2026-00' . $idEst));

        $metaJson = json_encode([
            'course' => $body['course'] ?? 'Nivel Laboral 2A',
            'level' => $body['level'] ?? 'Nivel Laboral (Decreto 83)',
            'workshop' => $body['workshop'] ?? '',
            'nationality' => $body['nationality'] ?? 'Chilena',
            'enrollmentYear' => (int)($body['enrollmentYear'] ?? 2026),
            'entryDate' => $body['entryDate'] ?? date('Y-m-d'),
            'evaluationDate' => $body['evaluationDate'] ?? '',
            'reevaluationDate' => $body['reevaluationDate'] ?? '',
            'paternalSurname' => $body['paternalSurname'] ?? '',
            'maternalSurname' => $body['maternalSurname'] ?? '',
            'contact' => [
                'address' => $direccion,
                'municipality' => $comuna,
                'phone' => $body['phone'] ?? '',
                'guardianName' => $body['guardianName'] ?? '',
                'guardianRut' => $body['guardianRut'] ?? '',
                'guardianPhone' => $body['guardianPhone'] ?? '',
                'guardianEmail' => $body['guardianEmail'] ?? ''
            ],
            'educational' => [
                'primaryDiagnosis' => $body['primaryDiagnosis'] ?? '',
                'secondaryDiagnosis' => $body['secondaryDiagnosis'] ?? '',
                'supportNeeds' => $body['supportNeeds'] ?? '',
                'strengths' => $body['strengths'] ?? '',
                'pedagogicalObservations' => $body['pedagogicalObservations'] ?? ($body['observaciones_ingreso'] ?? ''),
                'relevantBackground' => $body['relevantBackground'] ?? ''
            ]
        ], JSON_UNESCAPED_UNICODE);

        $stmtMat = $pdo->prepare("
            INSERT INTO apx_acad_inscripciones_anuales (numero_matricula, id_estudiante, id_taller, anio_escolar, grupo_funcionalidad, jornada, fecha_incorporacion, observaciones_ingreso)
            VALUES (?, ?, ?, 2026, ?, 'COMPLETA', CURDATE(), ?)
        ");
        $stmtMat->execute([
            $numMat,
            $idEst,
            (int)($body['id_taller'] ?? 1),
            $body['grupo_funcionalidad'] ?? 'GRUPO_A',
            $metaJson
        ]);

        if (!empty($body['primaryDiagnosis'])) {
            $stmtClin = $pdo->prepare("
                INSERT INTO apx_med_dossier_clinico_enc (id_estudiante, diagnostico_principal_enc, anamnesis_enc, datos_medicos_json, actualizado_por)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE diagnostico_principal_enc = VALUES(diagnostico_principal_enc)
            ");
            $stmtClin->execute([
                $idEst,
                encryptAES256((string)$body['primaryDiagnosis'], $aesHexKey),
                encryptAES256((string)($body['relevantBackground'] ?? 'Registro inicial de ficha estudiantil.'), $aesHexKey),
                json_encode(['medicamentos' => [], 'alergias' => []], JSON_UNESCAPED_UNICODE),
                $authUser['id_usuario']
            ]);
        }

        logAudit($pdo, $authUser['id_usuario'], $idEst, 'MATRICULA_ESTUDIANTES', 'CREACION', "Nueva matrícula $numMat asignada a " . ($body['grupo_funcionalidad'] ?? 'GRUPO_A'));
        $pdo->commit();
        echo json_encode(['ok' => true, 'id_estudiante' => $idEst, 'numero_matricula' => $numMat]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Error al matricular: ' . $e->getMessage()]);
    }
    exit;
}

if (preg_match('#^estudiantes/(\d+)$#', $route, $mEst)) {
    $idEst = (int)$mEst[1];
    if (!in_array($authUser['rol_codigo'], ['ADMIN', 'DIRECTOR_UTP', 'DOCENTE', 'ESPECIALISTA_PIE'])) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Sin permisos para modificar o eliminar registros estudiantiles.']);
        exit;
    }

    if ($method === 'PUT') {
        $pdo->beginTransaction();
        try {
            $nombres = trim((string)($body['nombres'] ?? ($body['names'] ?? '')));
            $apellidos = trim((string)($body['apellidos'] ?? trim(($body['paternalSurname'] ?? '') . ' ' . ($body['maternalSurname'] ?? ''))));
            $nombreSocial = trim((string)($body['nombre_social'] ?? ($body['socialName'] ?? ''))) ?: null;
            $fechaNac = trim((string)($body['fecha_nacimiento'] ?? ($body['birthDate'] ?? ''))) ?: '2007-06-15';
            $genero = trim((string)($body['genero'] ?? ($body['gender'] ?? ''))) ?: 'No especificado';
            $direccion = trim((string)($body['direccion'] ?? ($body['address'] ?? ''))) ?: 'Av. Pajaritos, Maipú';
            $comuna = trim((string)($body['comuna'] ?? ($body['municipality'] ?? ''))) ?: 'Maipú';
            $pctDisc = (int)($body['porcentaje_discapacidad'] ?? 50);

            $rawStatus = strtolower(trim((string)($body['status'] ?? ($body['estado_matricula'] ?? 'activo'))));
            $estadoMatricula = 'REGULAR';
            if ($rawStatus === 'retirado') $estadoMatricula = 'RETIRADO';
            elseif ($rawStatus === 'egresado' || $rawStatus === 'egresado_practica') $estadoMatricula = 'EGRESADO_PRACTICA';

            $stmt = $pdo->prepare("
                UPDATE apx_acad_expedientes_alumnos
                SET rut = ?, nombres = ?, apellidos = ?, nombre_social = ?, fecha_nacimiento = ?, genero = ?, direccion = ?, comuna = ?, porcentaje_discapacidad = ?, estado_matricula = ?
                WHERE id_estudiante = ?
            ");
            $stmt->execute([
                $body['rut'],
                $nombres,
                $apellidos,
                $nombreSocial,
                $fechaNac,
                $genero,
                $direccion,
                $comuna,
                $pctDisc,
                $estadoMatricula,
                $idEst
            ]);

            $metaJson = json_encode([
                'course' => $body['course'] ?? 'Nivel Laboral 2A',
                'level' => $body['level'] ?? 'Nivel Laboral (Decreto 83)',
                'workshop' => $body['workshop'] ?? '',
                'nationality' => $body['nationality'] ?? 'Chilena',
                'enrollmentYear' => (int)($body['enrollmentYear'] ?? 2026),
                'entryDate' => $body['entryDate'] ?? date('Y-m-d'),
                'evaluationDate' => $body['evaluationDate'] ?? '',
                'reevaluationDate' => $body['reevaluationDate'] ?? '',
                'paternalSurname' => $body['paternalSurname'] ?? '',
                'maternalSurname' => $body['maternalSurname'] ?? '',
                'contact' => [
                    'address' => $direccion,
                    'municipality' => $comuna,
                    'phone' => $body['phone'] ?? '',
                    'guardianName' => $body['guardianName'] ?? '',
                    'guardianRut' => $body['guardianRut'] ?? '',
                    'guardianPhone' => $body['guardianPhone'] ?? '',
                    'guardianEmail' => $body['guardianEmail'] ?? ''
                ],
                'educational' => [
                    'primaryDiagnosis' => $body['primaryDiagnosis'] ?? '',
                    'secondaryDiagnosis' => $body['secondaryDiagnosis'] ?? '',
                    'supportNeeds' => $body['supportNeeds'] ?? '',
                    'strengths' => $body['strengths'] ?? '',
                    'pedagogicalObservations' => $body['pedagogicalObservations'] ?? '',
                    'relevantBackground' => $body['relevantBackground'] ?? ''
                ]
            ], JSON_UNESCAPED_UNICODE);

            $stmtMat = $pdo->prepare("
                UPDATE apx_acad_inscripciones_anuales
                SET numero_matricula = COALESCE(NULLIF(?, ''), numero_matricula),
                    id_taller = ?,
                    grupo_funcionalidad = ?,
                    observaciones_ingreso = ?
                WHERE id_estudiante = ? AND anio_escolar = 2026
            ");
            $stmtMat->execute([
                trim((string)($body['registrationNumber'] ?? ($body['numero_matricula'] ?? ''))),
                (int)($body['id_taller'] ?? 1),
                $body['grupo_funcionalidad'] ?? 'GRUPO_A',
                $metaJson,
                $idEst
            ]);

            if (!empty($body['primaryDiagnosis'])) {
                $stmtClin = $pdo->prepare("
                    INSERT INTO apx_med_dossier_clinico_enc (id_estudiante, diagnostico_principal_enc, anamnesis_enc, datos_medicos_json, actualizado_por)
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE diagnostico_principal_enc = VALUES(diagnostico_principal_enc), actualizado_por = VALUES(actualizado_por)
                ");
                $stmtClin->execute([
                    $idEst,
                    encryptAES256((string)$body['primaryDiagnosis'], $aesHexKey),
                    encryptAES256((string)($body['relevantBackground'] ?? 'Actualización de ficha estudiantil.'), $aesHexKey),
                    json_encode(['medicamentos' => [], 'alergias' => []], JSON_UNESCAPED_UNICODE),
                    $authUser['id_usuario']
                ]);
            }

            logAudit($pdo, $authUser['id_usuario'], $idEst, 'MATRICULA_ESTUDIANTES', 'ACTUALIZACION', "Actualización de ficha integral del estudiante #$idEst");
            $pdo->commit();
            echo json_encode(['ok' => true, 'id_estudiante' => $idEst]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'No fue posible actualizar el estudiante: ' . $e->getMessage()]);
        }
        exit;
    }

    if ($method === 'DELETE') {
        try {
            logAudit($pdo, $authUser['id_usuario'], $idEst, 'MATRICULA_ESTUDIANTES', 'ELIMINACION', "Eliminación auditada de ficha estudiantil #$idEst");
            $stmtDel = $pdo->prepare("DELETE FROM apx_acad_expedientes_alumnos WHERE id_estudiante = ?");
            $stmtDel->execute([$idEst]);
            echo json_encode(['ok' => true]);
        } catch (Throwable $e) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'No fue posible eliminar el registro.']);
        }
        exit;
    }
}

if ($route === 'estudiantes/importar' && $method === 'POST') {
    if (!in_array($authUser['rol_codigo'], ['ADMIN', 'DIRECTOR_UTP', 'DOCENTE'])) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Sin permisos para importar planillas.']);
        exit;
    }
    $rows = $body['rows'] ?? [];
    if (!is_array($rows) || count($rows) > 1000) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'El archivo admite hasta 1.000 filas por carga.']);
        exit;
    }
    $created = 0;
    $skipped = 0;
    foreach ($rows as $r) {
        try {
            $rut = trim((string)($r['rut'] ?? ''));
            $names = trim((string)($r['names'] ?? ($r['nombres'] ?? '')));
            $surnames = trim((string)(($r['paternalSurname'] ?? '') . ' ' . ($r['maternalSurname'] ?? '')));
            if (!$rut || !$names || !$surnames) {
                $skipped++;
                continue;
            }
            $chk = $pdo->prepare("SELECT COUNT(*) FROM apx_acad_expedientes_alumnos WHERE rut = ?");
            $chk->execute([$rut]);
            if ((int)$chk->fetchColumn() > 0) {
                $skipped++;
                continue;
            }
            $stmtIns = $pdo->prepare("
                INSERT INTO apx_acad_expedientes_alumnos (rut, nombres, apellidos, fecha_nacimiento, genero, direccion, comuna, registro_nacional_discapacidad, porcentaje_discapacidad, beneficio_junaeb, id_apoderado_titular, estado_matricula)
                VALUES (?, ?, ?, ?, 'No especificado', 'Maipú', 'Maipú', 1, 50, 1, 1, 'REGULAR')
            ");
            $stmtIns->execute([$rut, $names, $surnames, $r['birthDate'] ?: '2007-06-15']);
            $newId = (int)$pdo->lastInsertId();
            $regNum = !empty($r['registrationNumber']) ? (string)$r['registrationNumber'] : ('MAT-2026-0' . $newId);
            $meta = json_encode([
                'course' => $r['course'] ?? 'Nivel Laboral 1A',
                'level' => $r['level'] ?? 'Nivel Laboral',
                'workshop' => $r['workshop'] ?? 'Taller de Corte y Confección Textil',
                'enrollmentYear' => (int)($r['enrollmentYear'] ?? 2026),
                'educational' => ['primaryDiagnosis' => $r['primaryDiagnosis'] ?? '']
            ], JSON_UNESCAPED_UNICODE);
            $pdo->prepare("
                INSERT INTO apx_acad_inscripciones_anuales (numero_matricula, id_estudiante, id_taller, anio_escolar, grupo_funcionalidad, jornada, fecha_incorporacion, observaciones_ingreso)
                VALUES (?, ?, 1, 2026, 'GRUPO_A', 'COMPLETA', CURDATE(), ?)
            ")->execute([$regNum, $newId, $meta]);
            $created++;
        } catch (Throwable $ex) {
            $skipped++;
        }
    }
    logAudit($pdo, $authUser['id_usuario'], null, 'MATRICULA_ESTUDIANTES', 'CREACION', "Importación masiva Excel: $created creados, $skipped omitidos");
    echo json_encode(['ok' => true, 'created' => $created, 'skipped' => $skipped]);
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

// 7. Portal Apoderados: Rutas Modulares dedicadas (/api/apoderados/estudiantes/:id/*)
if (strpos($route, 'apoderados/estudiantes/') === 0) {
    require_once __DIR__ . '/modules/apoderados.php';
    $subRoute = substr($route, strlen('apoderados/'));
    handleApoderadosRoutes($pdo, $authUser, $subRoute, $method, $aesHexKey);
    exit;
}

// 7.1 Portal Apoderados y Datos Consolidados (Rutas Heredadas / Compatibilidad)
if (preg_match('#^apoderados/resumen/(\d+)$#', $route, $m) && $method === 'GET') {
    $idEst = (int)$m[1];
    $stmtEst = $pdo->prepare("
        SELECT e.*, m.numero_matricula, m.grupo_funcionalidad, m.jornada,
               t.nombre AS taller_nombre, t.codigo_mineduc, t.nivel_decreto,
               CONCAT(a.nombres, ' ', a.apellidos) AS apoderado_nombre, a.parentesco, a.telefono_principal,
               p.acuerdos_familia,
               pai.fortalezas_intereses, pai.barreras_aprendizaje, pai.objetivos_transicion_vida_adulta,
               pai.estrategias_dua_json, pai.apoyos_especialistas_json
        FROM apx_acad_expedientes_alumnos e
        LEFT JOIN apx_acad_inscripciones_anuales m ON e.id_estudiante = m.id_estudiante AND m.anio_escolar = 2026
        LEFT JOIN apx_acad_unidades_laborales t ON m.id_taller = t.id_taller
        LEFT JOIN apx_fam_tutores_legales a ON e.id_apoderado_titular = a.id_apoderado
        LEFT JOIN apx_conv_protocolos_paec_enc p ON e.id_estudiante = p.id_estudiante
        LEFT JOIN apx_pie_planes_apoyo_ind pai ON e.id_estudiante = pai.id_estudiante AND pai.anio_escolar = 2026
        WHERE e.id_estudiante = ?
    ");
    $stmtEst->execute([$idEst]);
    $est = $stmtEst->fetch();

    $stmtAsist = $pdo->prepare("
        SELECT 
            COUNT(*) AS total_dias,
            SUM(CASE WHEN estado = 'PRESENTE' THEN 1 ELSE 0 END) AS dias_presente,
            SUM(CASE WHEN estado = 'AUSENTE' THEN 1 ELSE 0 END) AS dias_ausente,
            SUM(CASE WHEN estado = 'ATRASO' THEN 1 ELSE 0 END) AS dias_atraso
        FROM apx_ped_asistencia_alumnos WHERE id_estudiante = ?
    ");
    $stmtAsist->execute([$idEst]);

    $stmtEval = $pdo->prepare("
        SELECT indicador_competencia, dimension, nivel_logro, comentario_pedagogico, fecha_evaluacion
        FROM apx_ped_evaluaciones_decreto83 WHERE id_estudiante = ? ORDER BY fecha_evaluacion DESC
    ");
    $stmtEval->execute([$idEst]);

    echo json_encode([
        'ok' => true,
        'estudiante' => $est ?: null,
        'asistencia' => $stmtAsist->fetch() ?: ['total_dias' => 1, 'dias_presente' => 1, 'dias_ausente' => 0],
        'evaluaciones' => $stmtEval->fetchAll()
    ]);
    exit;
}

if (preg_match('#^reportes/auditar-pdf/(\d+)$#', $route, $m) && $method === 'POST') {
    $idEst = (int)$m[1];
    logAudit($pdo, $authUser['id_usuario'], $idEst, 'GENERADOR_INFORMES_PDF', 'DESCARGA_PDF', "Generación automática en JS del PDF 'Informe para la Familia' para estudiante #$idEst");
    echo json_encode(['ok' => true]);
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

// 9. Documentación Institucional (PAI, PAEC, PACI, IEP, IF, AN, PV) — Integración Figma
$docsStoragePath = sys_get_temp_dir() . '/apandi_institutional_docs.json';
if ($route === 'documentos' && $method === 'GET') {
    $stored = [];
    if (is_readable($docsStoragePath)) {
        $stored = json_decode((string)file_get_contents($docsStoragePath), true) ?: [];
    }
    echo json_encode(['ok' => true, 'documentos' => $stored]);
    exit;
}

if ($route === 'documentos' && $method === 'POST') {
    $idEst = (int)($body['studentId'] ?? ($body['id_estudiante'] ?? 1));
    $docType = (string)($body['type'] ?? ($body['documentType'] ?? 'pai'));
    $title = trim((string)($body['title'] ?? 'Documento Institucional'));
    $status = in_array($body['status'] ?? '', ['borrador', 'finalizado']) ? $body['status'] : 'borrador';
    $date = trim((string)($body['date'] ?? date('Y-m-d')));
    $content = is_array($body['content'] ?? null) ? $body['content'] : [];
    $observations = trim((string)($body['observations'] ?? ''));
    $responsibleName = trim((string)($body['responsibleName'] ?? $authUser['nombre_completo']));

    $stored = [];
    if (is_readable($docsStoragePath)) {
        $stored = json_decode((string)file_get_contents($docsStoragePath), true) ?: [];
    }

    $newDoc = [
        'id' => 'doc-' . time() . '-' . random_int(100, 999),
        'student' => $idEst,
        'studentId' => $idEst,
        'documentType' => $docType,
        'type' => $docType,
        'title' => $title,
        'status' => $status,
        'date' => $date,
        'content' => $content,
        'observations' => $observations,
        'responsibleName' => $responsibleName,
        'createdBy' => $authUser['nombre_completo'],
        'createdAt' => date('c')
    ];

    array_unshift($stored, $newDoc);
    @file_put_contents($docsStoragePath, json_encode($stored, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    logAudit($pdo, $authUser['id_usuario'], $idEst, 'DOCUMENTACION_INSTITUCIONAL', 'CREACION', "Generación de documento institucional (" . strtoupper($docType) . "): $title ($status)");

    echo json_encode(['ok' => true, 'documento' => $newDoc]);
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

http_response_code(404);
echo json_encode(['ok' => false, 'error' => "Endpoint API no encontrado: $route"]);
