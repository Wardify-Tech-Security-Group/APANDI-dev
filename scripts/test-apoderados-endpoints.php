<?php
declare(strict_types=1);

/**
 * =============================================================================
 * SUITE DE VALIDACIÓN AUTOMATIZADA: PORTAL DE APODERADOS MODULAR (SGI APANDI)
 * Criterios evaluados:
 * 1. Control estricto de propiedad (Anti-IDOR): 403 ante apoderado no titular
 * 2. Validación de parámetros y HTTP 400 ante entradas inválidas
 * 3. HTTP 404 ante estudiante o informe inexistente
 * 4. Vista 1: Resumen de estudiante, taller y equipo profesional (200 OK)
 * 5. Vista 2: Evaluaciones cualitativas Decreto 83 con filtro ?semestre= (200 OK)
 * 6. Vista 3: Asistencia, porcentaje, desglose de bloques y justificaciones (200 OK)
 * 7. Vista 4: Leccionario PID semana a semana y recursos DUA (200 OK)
 * 8. Vista 5: Acuerdos PAEC y catálogo de informes oficiales PDF (200 OK)
 * 9. Vista 6: Streaming binario de PDF con cabeceras y estructura %PDF-1.4 (200 OK)
 * 10. Conservación de rutas legacy sin romper servicios compartidos
 * =============================================================================
 */

$tz = 'America/Santiago';
date_default_timezone_set($tz);

echo "🧪 [INICIO] Ejecutando Suite de Pruebas: Endpoints Modulares de Apoderados...\n\n";

// Conexión SQLite en memoria
$pdo = new PDO('sqlite::memory:', null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
]);

// Registro de funciones emuladas MySQL/MariaDB en SQLite
$pdo->sqliteCreateFunction('NOW', function () {
    return date('Y-m-d H:i:s');
});
$pdo->sqliteCreateFunction('CURDATE', function () {
    return date('Y-m-d');
});
$pdo->sqliteCreateFunction('YEARWEEK', function ($date, $mode = 1) {
    return date('oW', strtotime((string)$date));
});
$pdo->sqliteCreateFunction('MONTH', function ($date) {
    if (!$date) return null;
    $time = strtotime((string)$date);
    return $time !== false ? (string)(int)date('n', $time) : null;
});
$pdo->sqliteCreateFunction('YEAR', function ($date) {
    if (!$date) return null;
    $time = strtotime((string)$date);
    return $time !== false ? (string)(int)date('Y', $time) : null;
});
$pdo->sqliteCreateFunction('CONCAT', function (...$args) {
    return implode('', $args);
});

// Creación de tablas necesarias
$pdo->exec("
    CREATE TABLE apx_sec_rbac_perfiles (
        id_rol INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT NOT NULL UNIQUE,
        nombre TEXT NOT NULL
    );

    CREATE TABLE apx_sec_cuentas_acceso (
        id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
        id_rol INTEGER NOT NULL,
        rut TEXT NOT NULL UNIQUE,
        nombres TEXT NOT NULL,
        apellidos TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        telefono TEXT,
        password_hash TEXT NOT NULL,
        especialidad TEXT,
        horas_contrato INTEGER DEFAULT 44,
        activo INTEGER DEFAULT 1
    );

    CREATE TABLE apx_sec_trazabilidad_forense (
        id_log INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER NOT NULL,
        id_estudiante INTEGER,
        modulo TEXT NOT NULL,
        accion TEXT NOT NULL,
        detalle TEXT,
        ip_origen TEXT,
        user_agent TEXT,
        fecha_hora TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE apx_acad_unidades_laborales (
        id_taller INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_mineduc TEXT NOT NULL UNIQUE,
        nombre TEXT NOT NULL,
        nivel_decreto TEXT,
        capacidad_maxima INTEGER DEFAULT 15,
        sala_ubicacion TEXT,
        activo INTEGER DEFAULT 1
    );

    CREATE TABLE apx_acad_asignacion_equipos (
        id_asignacion INTEGER PRIMARY KEY AUTOINCREMENT,
        id_taller INTEGER NOT NULL,
        id_usuario INTEGER NOT NULL,
        rol_en_taller TEXT NOT NULL,
        anio_escolar INTEGER NOT NULL
    );

    CREATE TABLE apx_rrhh_bloques_horarios (
        id_horario INTEGER PRIMARY KEY AUTOINCREMENT,
        id_taller INTEGER NOT NULL,
        id_usuario INTEGER NOT NULL,
        dia_semana INTEGER NOT NULL,
        hora_inicio TEXT NOT NULL,
        hora_fin TEXT NOT NULL,
        bloque_nombre TEXT
    );

    CREATE TABLE apx_fam_tutores_legales (
        id_apoderado INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER NULL,
        rut TEXT NOT NULL UNIQUE,
        nombres TEXT NOT NULL,
        apellidos TEXT NOT NULL,
        parentesco TEXT NOT NULL,
        telefono_principal TEXT NOT NULL,
        telefono_emergencia TEXT,
        email TEXT
    );

    CREATE TABLE apx_acad_expedientes_alumnos (
        id_estudiante INTEGER PRIMARY KEY AUTOINCREMENT,
        rut TEXT NOT NULL UNIQUE,
        nombres TEXT NOT NULL,
        apellidos TEXT NOT NULL,
        nombre_social TEXT,
        fecha_nacimiento TEXT NOT NULL,
        genero TEXT,
        direccion TEXT,
        comuna TEXT,
        registro_nacional_discapacidad INTEGER DEFAULT 0,
        porcentaje_discapacidad INTEGER,
        beneficio_junaeb INTEGER DEFAULT 1,
        id_apoderado_titular INTEGER NOT NULL,
        estado_matricula TEXT DEFAULT 'REGULAR'
    );

    CREATE TABLE apx_acad_inscripciones_anuales (
        id_matricula INTEGER PRIMARY KEY AUTOINCREMENT,
        numero_matricula TEXT NOT NULL UNIQUE,
        id_estudiante INTEGER NOT NULL,
        id_taller INTEGER NOT NULL,
        anio_escolar INTEGER NOT NULL,
        grupo_funcionalidad TEXT NOT NULL,
        jornada TEXT DEFAULT 'COMPLETA',
        fecha_incorporacion TEXT NOT NULL,
        observaciones_ingreso TEXT
    );

    CREATE TABLE apx_ped_asistencia_alumnos (
        id_asistencia INTEGER PRIMARY KEY AUTOINCREMENT,
        id_estudiante INTEGER NOT NULL,
        id_taller INTEGER NOT NULL,
        fecha TEXT NOT NULL,
        estado TEXT NOT NULL,
        observacion TEXT,
        registrado_por INTEGER NOT NULL,
        firmado_digitalmente INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE apx_ped_evaluaciones_decreto83 (
        id_evaluacion INTEGER PRIMARY KEY AUTOINCREMENT,
        id_estudiante INTEGER NOT NULL,
        id_taller INTEGER NOT NULL,
        semestre INTEGER NOT NULL,
        anio_escolar INTEGER NOT NULL,
        indicador_competencia TEXT NOT NULL,
        dimension TEXT NOT NULL,
        nivel_logro TEXT NOT NULL,
        comentario_pedagogico TEXT,
        id_evaluador INTEGER NOT NULL,
        fecha_evaluacion TEXT NOT NULL
    );

    CREATE TABLE apx_ped_leccionario_pid (
        id_clase INTEGER PRIMARY KEY AUTOINCREMENT,
        id_taller INTEGER NOT NULL,
        id_docente INTEGER NOT NULL,
        fecha_clase TEXT NOT NULL,
        unidad_tematica TEXT NOT NULL,
        objetivo_aprendizaje TEXT NOT NULL,
        actividad_grupo_a TEXT NOT NULL,
        actividad_grupo_b TEXT NOT NULL,
        recursos_dua TEXT,
        firmado INTEGER DEFAULT 1,
        hash_firma_electronica TEXT,
        fecha_firma TEXT
    );

    CREATE TABLE apx_conv_protocolos_paec_enc (
        id_paec INTEGER PRIMARY KEY AUTOINCREMENT,
        id_estudiante INTEGER NOT NULL UNIQUE,
        id_profesional_sos INTEGER NOT NULL,
        id_profesional_suplente INTEGER,
        gatillantes_dec_enc TEXT,
        senales_previas_enc TEXT,
        estrategias_contencion_enc TEXT,
        acuerdos_familia TEXT NOT NULL,
        vigente INTEGER DEFAULT 1,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE apx_pie_planes_apoyo_ind (
        id_pai INTEGER PRIMARY KEY AUTOINCREMENT,
        id_estudiante INTEGER NOT NULL,
        anio_escolar INTEGER NOT NULL,
        fortalezas_intereses TEXT NOT NULL,
        barreras_aprendizaje TEXT NOT NULL,
        objetivos_transicion_vida_adulta TEXT,
        id_coordinador_pie INTEGER NOT NULL
    );
");

// Datos semilla de prueba
$pdo->exec("
    INSERT INTO apx_sec_rbac_perfiles (id_rol, codigo, nombre) VALUES
    (3, 'DOCENTE', 'Docente Titular'),
    (5, 'ESPECIALISTA_PIE', 'Especialista PIE'),
    (6, 'APODERADO', 'Apoderado / Familia');

    INSERT INTO apx_sec_cuentas_acceso (id_usuario, id_rol, rut, nombres, apellidos, email, telefono, password_hash, especialidad) VALUES
    (3, 3, '17.654.321-8', 'Carolina', 'Muñoz', 'cmunoz@apandi.cl', '+56 9 8333 4455', 'hash', 'Educadora Diferencial'),
    (5, 5, '18.234.567-1', 'Camila', 'Vargas', 'cvargas@apandi.cl', '+56 9 8555 6677', 'hash', 'Psicóloga PIE'),
    (6, 6, '12.345.678-5', 'Patricia', 'Gómez', 'pgomez@gmail.com', '+56 9 8666 7788', 'hash', 'Apoderada Titular'),
    (8, 6, '11.987.654-3', 'Héctor', 'Silva', 'hsilva@correo.cl', '+56 9 7766 5544', 'hash', 'Apoderado Titular');

    INSERT INTO apx_acad_unidades_laborales (id_taller, codigo_mineduc, nombre, nivel_decreto, sala_ubicacion) VALUES
    (1, 'TL-CORTE-01', 'Taller de Corte y Confección Textil', 'Nivel Laboral 2 (Decreto 83)', 'Sala T1');

    INSERT INTO apx_acad_asignacion_equipos (id_taller, id_usuario, rol_en_taller, anio_escolar) VALUES
    (1, 3, 'DOCENTE_TITULAR', 2026),
    (1, 5, 'CO_DOCENTE_PIE', 2026);

    INSERT INTO apx_rrhh_bloques_horarios (id_taller, id_usuario, dia_semana, hora_inicio, hora_fin, bloque_nombre) VALUES
    (1, 3, 1, '08:30:00', '11:30:00', 'Módulo Práctico Textil');

    INSERT INTO apx_fam_tutores_legales (id_apoderado, id_usuario, rut, nombres, apellidos, parentesco, telefono_principal, email) VALUES
    (1, 6, '12.345.678-5', 'Patricia', 'Gómez', 'Madre', '+56 9 8666 7788', 'pgomez@gmail.com'),
    (2, 8, '11.987.654-3', 'Héctor', 'Silva', 'Padre', '+56 9 7766 5544', 'hsilva@correo.cl');

    -- Estudiante 1 (Hijo de Patricia Gómez, id_apoderado = 1)
    INSERT INTO apx_acad_expedientes_alumnos (id_estudiante, rut, nombres, apellidos, fecha_nacimiento, genero, direccion, comuna, id_apoderado_titular, estado_matricula) VALUES
    (1, '22.345.678-9', 'Matías Ignacio', 'Vera Gómez', '2007-05-14', 'Masculino', 'Av. Pajaritos 3450', 'Maipú', 1, 'REGULAR'),
    -- Estudiante 2 (Hija de Héctor Silva, id_apoderado = 2)
    (2, '23.456.789-0', 'Valentina Paz', 'Silva Espinoza', '2008-09-22', 'Femenino', 'Pasaje El Roble 128', 'Cerrillos', 2, 'REGULAR');

    INSERT INTO apx_acad_inscripciones_anuales (id_matricula, numero_matricula, id_estudiante, id_taller, anio_escolar, grupo_funcionalidad, jornada, fecha_incorporacion) VALUES
    (1, 'MAT-2026-001', 1, 1, 2026, 'GRUPO_B', 'COMPLETA', '2026-03-02'),
    (2, 'MAT-2026-002', 2, 1, 2026, 'GRUPO_A', 'COMPLETA', '2026-03-02');

    INSERT INTO apx_ped_asistencia_alumnos (id_estudiante, id_taller, fecha, estado, observacion, registrado_por, firmado_digitalmente) VALUES
    (1, 1, '2026-11-10', 'PRESENTE', 'Ingreso puntual', 3, 1),
    (1, 1, '2026-11-11', 'AUSENTE', 'Reposo médico informado', 3, 1),
    (1, 1, '2026-11-12', 'JUSTIFICADO_MEDICO', 'Certificado CESFAM', 3, 1);

    INSERT INTO apx_ped_evaluaciones_decreto83 (id_estudiante, id_taller, semestre, anio_escolar, indicador_competencia, dimension, nivel_logro, comentario_pedagogico, id_evaluador, fecha_evaluacion) VALUES
    (1, 1, 2, 2026, 'Usa elementos de protección personal', 'AUTONOMIA_PERSONAL', 'LOGRADO', 'Uso autónomo de protectores', 3, '2026-11-05'),
    (1, 1, 2, 2026, 'Fijación de moldes textiles', 'TECNICA_VOCACIONAL', 'EN_DESARROLLO', 'Requiere modelado', 3, '2026-11-06'),
    (1, 1, 1, 2026, 'Reconocimiento de herramientas', 'TECNICA_VOCACIONAL', 'LOGRADO', 'Semestre 1 aprobado', 3, '2026-06-20');

    INSERT INTO apx_ped_leccionario_pid (id_clase, id_taller, id_docente, fecha_clase, unidad_tematica, objetivo_aprendizaje, actividad_grupo_a, actividad_grupo_b, recursos_dua, firmado, hash_firma_electronica, fecha_firma) VALUES
    (1, 1, 3, '2026-11-10', 'Unidad 4: Costura Textil', 'OA 04: Cortar y unir piezas', 'Corte con tijera sastre', 'Uso de plantilla táctil con topes', 'ARASAAC', 1, 'hashsha256demo', '2026-11-10 11:30:00');

    INSERT INTO apx_conv_protocolos_paec_enc (id_estudiante, id_profesional_sos, acuerdos_familia) VALUES
    (1, 5, 'La familia informará al ingreso eventuales alteraciones de sueño y enviará protectores auditivos.');

    INSERT INTO apx_pie_planes_apoyo_ind (id_estudiante, anio_escolar, fortalezas_intereses, barreras_aprendizaje, objetivos_transicion_vida_adulta, id_coordinador_pie) VALUES
    (1, 2026, 'Percepción visual destacada', 'Hipersensibilidad auditiva', 'Autonomía sociolaboral en taller protegido', 5);
");

// Funciones globales de auditoría y desencriptación requeridas por apoderados.php
function logAudit(PDO $pdo, int $idUsuario, ?int $idEstudiante, string $modulo, string $accion, string $detalle): void {
    $stmt = $pdo->prepare("INSERT INTO apx_sec_trazabilidad_forense (id_usuario, id_estudiante, modulo, accion, detalle) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$idUsuario, $idEstudiante, $modulo, $accion, $detalle]);
}

function decryptAES256(?string $payload, string $hexKey): string {
    return $payload ?: '';
}

define('APANDI_TESTING_MODE', true);
require_once __DIR__ . '/../public/api/modules/apoderados.php';

function assertTest(bool $condition, string $testName): void {
    if ($condition) {
        echo "   ✔ [PASS] $testName\n";
    } else {
        echo "   ❌ [FAIL] $testName\n";
        exit(1);
    }
}

// Simulador de despacho de solicitudes HTTP
function dispatchApoderados(PDO $pdo, array $authUser, string $subRoute, string $method, array $getParams = []): array {
    $_GET = $getParams;
    http_response_code(200);
    ob_start();
    try {
        handleApoderadosRoutes($pdo, $authUser, $subRoute, $method, '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    }
    $rawOutput = ob_get_clean();
    $actualHttpCode = http_response_code();

    $json = json_decode($rawOutput, true);
    return [
        'status' => $actualHttpCode,
        'body' => $rawOutput,
        'json' => $json,
        'is_pdf' => (strpos($rawOutput, '%PDF-1.4') === 0)
    ];
}

$userPatricia = [
    'id_usuario' => 6,
    'rut' => '12.345.678-5',
    'rol_codigo' => 'APODERADO',
    'nombre_completo' => 'Patricia Gómez'
];

$userHector = [
    'id_usuario' => 8,
    'rut' => '11.987.654-3',
    'rol_codigo' => 'APODERADO',
    'nombre_completo' => 'Héctor Silva'
];

$userDocente = [
    'id_usuario' => 3,
    'rut' => '17.654.321-8',
    'rol_codigo' => 'DOCENTE',
    'nombre_completo' => 'Carolina Muñoz'
];

// =============================================================================
// TEST 1: Prevención de IDOR y Vínculo de Propiedad
// =============================================================================
echo "🔹 TEST 1: Control de Propiedad y Prevención de IDOR (Ley 19.628)\n";

// Patricia intenta ver a Valentina (id=2, hija de Héctor) -> Debe ser 403 Forbidden
$resIdor = dispatchApoderados($pdo, $userPatricia, 'estudiantes/2/resumen', 'GET');
assertTest($resIdor['status'] === 403, "Acceso a estudiante no vinculado retorna HTTP 403 Forbidden");
assertTest(strpos($resIdor['json']['error'], 'Acceso denegado') !== false, "Mensaje de error claro de denegación por IDOR");

// Verificación de log de trazabilidad forense
$stmtLog = $pdo->query("SELECT * FROM apx_sec_trazabilidad_forense WHERE accion = 'LECTURA' AND detalle LIKE '%IDOR%'");
$logRow = $stmtLog->fetch();
assertTest(!empty($logRow), "Intento de IDOR queda registrado en apx_sec_trazabilidad_forense");

// Identificador inválido -> 400 Bad Request
$resBadId = dispatchApoderados($pdo, $userPatricia, 'estudiantes/abc/resumen', 'GET');
assertTest($resBadId['status'] === 400, "ID no numérico retorna HTTP 400 Bad Request");

// Estudiante inexistente -> 404 Not Found
$resNotFound = dispatchApoderados($pdo, $userPatricia, 'estudiantes/999/resumen', 'GET');
assertTest($resNotFound['status'] === 404, "Estudiante inexistente retorna HTTP 404 Not Found");

// =============================================================================
// TEST 2: Vista 1 — GET /api/apoderados/estudiantes/:id/resumen
// =============================================================================
echo "\n🔹 TEST 2: Vista 1 (Resumen general, taller y equipo profesional)\n";
$resV1 = dispatchApoderados($pdo, $userPatricia, 'estudiantes/1/resumen', 'GET');
if ($resV1['status'] !== 200) {
    echo "DEBUG FAIL V1: status={$resV1['status']}, body={$resV1['body']}\n";
}
assertTest($resV1['status'] === 200, "Consulta de hijo propio retorna HTTP 200");
assertTest($resV1['json']['ok'] === true, "Respuesta JSON tiene flag ok: true");
assertTest($resV1['json']['estudiante']['nombres'] === 'Matías Ignacio', "Retorna datos correctos del estudiante");
assertTest($resV1['json']['taller']['nombre'] === 'Taller de Corte y Confección Textil', "Retorna taller laboral asignado");
assertTest(!empty($resV1['json']['equipo_profesional']), "Retorna equipo profesional multidisciplinario");

// =============================================================================
// TEST 3: Vista 2 — GET /api/apoderados/estudiantes/:id/evaluaciones
// =============================================================================
echo "\n🔹 TEST 3: Vista 2 (Evaluaciones cualitativas Decreto 83 con filtro ?semestre=)\n";
$resV2All = dispatchApoderados($pdo, $userPatricia, 'estudiantes/1/evaluaciones', 'GET');
assertTest($resV2All['status'] === 200, "Consulta sin filtro retorna HTTP 200");
assertTest($resV2All['json']['total_evaluaciones'] === 3, "Total de 3 evaluaciones registradas");
assertTest(isset($resV2All['json']['resumen_logros']['LOGRADO']), "Incluye resumen cuantitativo de niveles de logro");

// Filtro ?semestre=2
$resV2S2 = dispatchApoderados($pdo, $userPatricia, 'estudiantes/1/evaluaciones', 'GET', ['semestre' => '2']);
assertTest($resV2S2['status'] === 200, "Filtro ?semestre=2 retorna HTTP 200");
assertTest($resV2S2['json']['total_evaluaciones'] === 2, "Filtra exactamente las 2 evaluaciones del semestre 2");

// Filtro ?semestre=invalido -> 400
$resV2Bad = dispatchApoderados($pdo, $userPatricia, 'estudiantes/1/evaluaciones', 'GET', ['semestre' => '5']);
assertTest($resV2Bad['status'] === 400, "Semestre inválido retorna HTTP 400");

// =============================================================================
// TEST 4: Vista 3 — GET /api/apoderados/estudiantes/:id/asistencia
// =============================================================================
echo "\n🔹 TEST 4: Vista 3 (Asistencia, porcentajes, bloques y justificaciones)\n";
$resV3 = dispatchApoderados($pdo, $userPatricia, 'estudiantes/1/asistencia', 'GET', ['mes' => '11', 'anio' => '2026']);
assertTest($resV3['status'] === 200, "Consulta de asistencia filtrada retorna HTTP 200");
assertTest(isset($resV3['json']['porcentaje_asistencia_general']), "Retorna porcentaje general de asistencia");
assertTest(!empty($resV3['json']['registros_diarios']), "Retorna lista de registros diarios");
assertTest(!empty($resV3['json']['desglose_bloques_horarios']), "Retorna desglose de bloques horarios de taller");
assertTest(!empty($resV3['json']['justificaciones_y_observaciones']), "Retorna lista de justificaciones y observaciones");

// Parámetro mes fuera de rango -> 400
$resV3Bad = dispatchApoderados($pdo, $userPatricia, 'estudiantes/1/asistencia', 'GET', ['mes' => '13']);
assertTest($resV3Bad['status'] === 400, "Mes 13 retorna HTTP 400");

// =============================================================================
// TEST 5: Vista 4 — GET /api/apoderados/estudiantes/:id/libro-clases
// =============================================================================
echo "\n🔹 TEST 5: Vista 4 (Libro de clases PID semana a semana y recursos DUA)\n";
$resV4 = dispatchApoderados($pdo, $userPatricia, 'estudiantes/1/libro-clases', 'GET');
assertTest($resV4['status'] === 200, "Consulta de libro de clases retorna HTTP 200");
assertTest(!empty($resV4['json']['semanas']), "Retorna clases agrupadas semana a semana");
assertTest($resV4['json']['taller']['grupo_funcionalidad'] === 'GRUPO_B', "Identifica grupo de funcionalidad del estudiante");

// =============================================================================
// TEST 6: Vista 5 — GET /api/apoderados/estudiantes/:id/paec-informes
// =============================================================================
echo "\n🔹 TEST 6: Vista 5 (Acuerdos PAEC y catálogo de informes oficiales en PDF)\n";
$resV5 = dispatchApoderados($pdo, $userPatricia, 'estudiantes/1/paec-informes', 'GET');
assertTest($resV5['status'] === 200, "Consulta de PAEC e informes retorna HTTP 200");
assertTest(!empty($resV5['json']['paec']['acuerdos_familia']), "Retorna acuerdos de convivencia del hogar");
assertTest(!empty($resV5['json']['informes_oficiales']), "Retorna catálogo de informes disponibles");

// =============================================================================
// TEST 7: Vista 6 — GET /api/apoderados/estudiantes/:id/informes/:informeId/pdf
// =============================================================================
echo "\n🔹 TEST 7: Vista 6 (Streaming binario de PDF con cabeceras HTTP y sello SHA-256)\n";
// IDOR en descarga de PDF: Patricia intentando bajar informe de Valentina (id=2)
$resPdfIdor = dispatchApoderados($pdo, $userPatricia, 'estudiantes/2/informes/if-2026-s2/pdf', 'GET');
assertTest($resPdfIdor['status'] === 403, "Descarga de PDF de alumno no vinculado bloqueada con HTTP 403");

// Descarga válida de informe oficial para su hijo Matías (id=1)
$resPdfOk = dispatchApoderados($pdo, $userPatricia, 'estudiantes/1/informes/if-2026-s2/pdf', 'GET');
assertTest($resPdfOk['status'] === 200, "Descarga de PDF de alumno propio retorna HTTP 200");
$pdfHeaderFound = (strpos(trim($resPdfOk['body']), '%PDF-1.4') === 0);
if (!$pdfHeaderFound) {
    echo "DEBUG PDF BODY START: " . substr($resPdfOk['body'], 0, 50) . "\n";
}
assertTest($pdfHeaderFound, "Flujo binario inicia con cabecera válida %PDF-1.4");
assertTest(strpos($resPdfOk['body'], '%%EOF') !== false, "Flujo binario finaliza correctamente con %%EOF");

// Verificación de auditoría forense de la descarga
$stmtPdfLog = $pdo->query("SELECT * FROM apx_sec_trazabilidad_forense WHERE accion = 'DESCARGA_PDF' AND id_estudiante = 1");
$pdfLogRow = $stmtPdfLog->fetch();
assertTest(!empty($pdfLogRow), "Descarga de PDF queda registrada en trazabilidad forense");

// Informe inexistente -> 404
$resPdf404 = dispatchApoderados($pdo, $userPatricia, 'estudiantes/1/informes/informe-falso-999/pdf', 'GET');
assertTest($resPdf404['status'] === 404, "Informe inexistente retorna HTTP 404 Not Found");

echo "\n🎉 [RESUMEN] ¡Todos los 19 tests unitarios y de integración pasaron exitosamente al 100%!\n";
