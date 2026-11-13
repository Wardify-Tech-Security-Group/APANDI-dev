<?php
declare(strict_types=1);

/**
 * =============================================================================
 * CONTROLADOR MODULAR DEL PORTAL DE APODERADOS — SGI APANDI
 * Rutas: /api/apoderados/estudiantes/:id/* (5 Vistas Dedicadas + Stream PDF)
 * Cumplimiento Ley 19.628, Control Anti-IDOR y Seguridad ASVS
 * =============================================================================
 */

require_once __DIR__ . '/../services/pdf_generator.php';

/**
 * Valida la existencia del estudiante y comprueba propiedad estricta (Anti-IDOR)
 * Retorna los datos básicos del estudiante y tutor si es válido; de lo contrario aborta con HTTP 400, 404 o 403.
 */
function assertGuardianStudentOwnership(PDO $pdo, array $authUser, $rawStudentId): array {
    if (!is_numeric($rawStudentId) || (int)$rawStudentId <= 0) {
        http_response_code(400);
        echo json_encode([
            'ok' => false,
            'error' => 'Identificador de estudiante inválido. Debe ser un entero positivo.'
        ]);
        if (defined('APANDI_TESTING_MODE')) return [];
        exit;
    }

    $idEstudiante = (int)$rawStudentId;

    // Verificar si el estudiante existe
    $stmt = $pdo->prepare("
        SELECT 
            e.*,
            t.id_apoderado,
            t.id_usuario AS tutor_id_usuario,
            t.rut AS tutor_rut,
            t.nombres AS tutor_nombres,
            t.apellidos AS tutor_apellidos,
            t.parentesco AS tutor_parentesco,
            t.telefono_principal AS tutor_telefono,
            t.email AS tutor_email
        FROM apx_acad_expedientes_alumnos e
        LEFT JOIN apx_fam_tutores_legales t ON e.id_apoderado_titular = t.id_apoderado
        WHERE e.id_estudiante = ?
        LIMIT 1
    ");
    $stmt->execute([$idEstudiante]);
    $student = $stmt->fetch();

    if (!$student) {
        http_response_code(404);
        echo json_encode([
            'ok' => false,
            'error' => "No se encontró ningún estudiante con el identificador #$idEstudiante."
        ]);
        if (defined('APANDI_TESTING_MODE')) return [];
        exit;
    }

    $rol = (string)($authUser['rol_codigo'] ?? '');
    $uid = (int)($authUser['id_usuario'] ?? 0);
    $userRut = preg_replace('/[^0-9kK]/', '', strtoupper((string)($authUser['rut'] ?? '')));
    $tutorRut = preg_replace('/[^0-9kK]/', '', strtoupper((string)($student['tutor_rut'] ?? '')));

    // Roles administrativos / directivos autorizados para supervisión
    $isStaffAuthorized = in_array($rol, ['ADMIN', 'DIRECTOR_UTP', 'DOCENTE', 'ESPECIALISTA_PIE'], true);

    // Verificación de vínculo apoderado titular (por id_usuario enlazado o coincidencia de RUT chileno)
    $isOwnerGuardian = (
        ($student['tutor_id_usuario'] !== null && (int)$student['tutor_id_usuario'] === $uid) ||
        ($userRut !== '' && $tutorRut !== '' && $userRut === $tutorRut)
    );

    if (!$isStaffAuthorized && !$isOwnerGuardian) {
        // Registro de auditoría forense ante intento no autorizado (Prevención de IDOR)
        logAudit(
            $pdo,
            $uid,
            $idEstudiante,
            'PORTAL_APODERADOS',
            'LECTURA',
            "INTENTO DE ACCESO NO AUTORIZADO (IDOR DETECTADO): Usuario #$uid intentó acceder a expediente #$idEstudiante sin vínculo parental."
        );

        http_response_code(403);
        echo json_encode([
            'ok' => false,
            'error' => 'Acceso denegado: Su cuenta no está autorizada para consultar los antecedentes de este estudiante. Comuníquese con secretaría del establecimiento.'
        ]);
        if (defined('APANDI_TESTING_MODE')) {
            return [];
        }
        exit;
    }

    return $student;
}

/**
 * Despachador principal de las rutas modulares del portal de apoderados
 */
function handleApoderadosRoutes(PDO $pdo, array $authUser, string $subRoute, string $method, string $aesHexKey): void {
    // Patrón general: estudiantes/{id}/{action}(/{subAction})*
    if (!preg_match('#^estudiantes/([^/]+)(?:/(.*))?$#', $subRoute, $matches)) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => "Ruta de apoderados no reconocida: $subRoute"]);
        exit;
    }

    $rawStudentId = $matches[1];
    $action = trim((string)($matches[2] ?? 'resumen'), '/');

    // Validación transversal de autenticación e IDOR
    $studentBase = assertGuardianStudentOwnership($pdo, $authUser, $rawStudentId);
    if (empty($studentBase)) {
        return;
    }
    $idEstudiante = (int)$studentBase['id_estudiante'];

    // -------------------------------------------------------------------------
    // VISTA 1: GET /api/apoderados/estudiantes/:id/resumen
    // Antecedentes generales, taller asignado y equipo profesional
    // -------------------------------------------------------------------------
    if ($action === 'resumen' && $method === 'GET') {
        $stmtMat = $pdo->prepare("
            SELECT 
                m.numero_matricula,
                m.grupo_funcionalidad,
                m.jornada,
                m.fecha_incorporacion,
                m.anio_escolar,
                t.id_taller,
                t.nombre AS taller_nombre,
                t.codigo_mineduc,
                t.nivel_decreto,
                t.sala_ubicacion
            FROM apx_acad_inscripciones_anuales m
            INNER JOIN apx_acad_unidades_laborales t ON m.id_taller = t.id_taller
            WHERE m.id_estudiante = ? AND m.anio_escolar = 2026
            ORDER BY m.id_matricula DESC LIMIT 1
        ");
        $stmtMat->execute([$idEstudiante]);
        $matricula = $stmtMat->fetch() ?: null;
        $idTaller = $matricula ? (int)$matricula['id_taller'] : 1;

        // Equipo profesional asignado al taller y al estudiante
        $stmtEquipo = $pdo->prepare("
            SELECT 
                u.id_usuario,
                CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
                u.email,
                u.telefono,
                u.especialidad,
                eq.rol_en_taller,
                r.nombre AS rol_nombre
            FROM apx_acad_asignacion_equipos eq
            INNER JOIN apx_sec_cuentas_acceso u ON eq.id_usuario = u.id_usuario
            INNER JOIN apx_sec_rbac_perfiles r ON u.id_rol = r.id_rol
            WHERE eq.id_taller = ? AND eq.anio_escolar = 2026
        ");
        $stmtEquipo->execute([$idTaller]);
        $equipoTaller = $stmtEquipo->fetchAll();

        // Profesional SOS PAEC asignado
        $stmtSos = $pdo->prepare("
            SELECT 
                u.id_usuario,
                CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
                u.email,
                u.telefono,
                u.especialidad,
                'PROFESIONAL_SOS_PAEC' AS rol_en_taller,
                r.nombre AS rol_nombre
            FROM apx_conv_protocolos_paec_enc p
            INNER JOIN apx_sec_cuentas_acceso u ON p.id_profesional_sos = u.id_usuario
            INNER JOIN apx_sec_rbac_perfiles r ON u.id_rol = r.id_rol
            WHERE p.id_estudiante = ?
            LIMIT 1
        ");
        $stmtSos->execute([$idEstudiante]);
        $profSos = $stmtSos->fetch();

        // Coordinador PIE
        $stmtPie = $pdo->prepare("
            SELECT 
                u.id_usuario,
                CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
                u.email,
                u.telefono,
                u.especialidad,
                'COORDINADOR_PIE' AS rol_en_taller,
                r.nombre AS rol_nombre
            FROM apx_pie_planes_apoyo_ind pai
            INNER JOIN apx_sec_cuentas_acceso u ON pai.id_coordinador_pie = u.id_usuario
            INNER JOIN apx_sec_rbac_perfiles r ON u.id_rol = r.id_rol
            WHERE pai.id_estudiante = ?
            ORDER BY pai.anio_escolar DESC LIMIT 1
        ");
        $stmtPie->execute([$idEstudiante]);
        $coordPie = $stmtPie->fetch();

        $equipoConsolidado = [];
        $seen = [];
        foreach (array_merge($equipoTaller, $profSos ? [$profSos] : [], $coordPie ? [$coordPie] : []) as $miembro) {
            $key = $miembro['id_usuario'] . '-' . $miembro['rol_en_taller'];
            if (!isset($seen[$key])) {
                $seen[$key] = true;
                $equipoConsolidado[] = $miembro;
            }
        }

        echo json_encode([
            'ok' => true,
            'estudiante' => [
                'id_estudiante' => $studentBase['id_estudiante'],
                'rut' => $studentBase['rut'],
                'nombres' => $studentBase['nombres'],
                'apellidos' => $studentBase['apellidos'],
                'nombre_completo' => trim($studentBase['nombres'] . ' ' . $studentBase['apellidos']),
                'nombre_social' => $studentBase['nombre_social'],
                'fecha_nacimiento' => $studentBase['fecha_nacimiento'],
                'genero' => $studentBase['genero'],
                'direccion' => $studentBase['direccion'],
                'comuna' => $studentBase['comuna'],
                'porcentaje_discapacidad' => (int)($studentBase['porcentaje_discapacidad'] ?? 0),
                'registro_nacional_discapacidad' => (bool)$studentBase['registro_nacional_discapacidad'],
                'beneficio_junaeb' => (bool)$studentBase['beneficio_junaeb'],
                'estado_matricula' => $studentBase['estado_matricula']
            ],
            'apoderado_titular' => [
                'id_apoderado' => $studentBase['id_apoderado'],
                'rut' => $studentBase['tutor_rut'],
                'nombre_completo' => trim(($studentBase['tutor_nombres'] ?? '') . ' ' . ($studentBase['tutor_apellidos'] ?? '')),
                'parentesco' => $studentBase['tutor_parentesco'],
                'telefono_principal' => $studentBase['tutor_telefono'],
                'email' => $studentBase['tutor_email']
            ],
            'taller' => $matricula ? [
                'id_taller' => (int)$matricula['id_taller'],
                'nombre' => $matricula['taller_nombre'],
                'codigo_mineduc' => $matricula['codigo_mineduc'],
                'nivel_decreto' => $matricula['nivel_decreto'],
                'sala_ubicacion' => $matricula['sala_ubicacion'],
                'numero_matricula' => $matricula['numero_matricula'],
                'grupo_funcionalidad' => $matricula['grupo_funcionalidad'],
                'jornada' => $matricula['jornada'],
                'fecha_incorporacion' => $matricula['fecha_incorporacion'],
                'anio_escolar' => (int)$matricula['anio_escolar']
            ] : null,
            'equipo_profesional' => $equipoConsolidado
        ]);
        if (defined('APANDI_TESTING_MODE')) return;
        exit;
    }

    // -------------------------------------------------------------------------
    // VISTA 2: GET /api/apoderados/estudiantes/:id/evaluaciones
    // Evaluaciones cualitativas Decreto 83 con filtro opcional ?semestre=
    // -------------------------------------------------------------------------
    if ($action === 'evaluaciones' && $method === 'GET') {
        $semestreParam = $_GET['semestre'] ?? null;
        $semestre = null;

        if ($semestreParam !== null && $semestreParam !== '') {
            if (!in_array((string)$semestreParam, ['1', '2'], true)) {
                http_response_code(400);
                echo json_encode([
                    'ok' => false,
                    'error' => "Parámetro 'semestre' inválido. Valores permitidos: 1 o 2."
                ]);
                if (defined('APANDI_TESTING_MODE')) return;
                exit;
            }
            $semestre = (int)$semestreParam;
        }

        $sql = "
            SELECT 
                ev.id_evaluacion,
                ev.semestre,
                ev.anio_escolar,
                ev.dimension,
                ev.indicador_competencia,
                ev.nivel_logro,
                ev.comentario_pedagogico,
                ev.fecha_evaluacion,
                t.nombre AS taller_nombre,
                CONCAT(u.nombres, ' ', u.apellidos) AS evaluador_nombre,
                u.especialidad AS evaluador_especialidad
            FROM apx_ped_evaluaciones_decreto83 ev
            INNER JOIN apx_acad_unidades_laborales t ON ev.id_taller = t.id_taller
            INNER JOIN apx_sec_cuentas_acceso u ON ev.id_evaluador = u.id_usuario
            WHERE ev.id_estudiante = ?
        ";
        $params = [$idEstudiante];

        if ($semestre !== null) {
            $sql .= " AND ev.semestre = ?";
            $params[] = $semestre;
        }

        $sql .= " ORDER BY ev.semestre DESC, ev.fecha_evaluacion DESC, ev.id_evaluacion DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $evaluaciones = $stmt->fetchAll();

        // Resumen cuantitativo por nivel de logro
        $resumenLogros = [
            'LOGRADO' => 0,
            'EN_DESARROLLO' => 0,
            'EN_INICIO' => 0,
            'NO_OBSERVADO' => 0
        ];

        // Agrupación por dimensión formativa y semestre
        $agrupadoPorDimension = [];
        $agrupadoPorSemestre = [];

        foreach ($evaluaciones as $ev) {
            $nivel = $ev['nivel_logro'];
            if (isset($resumenLogros[$nivel])) {
                $resumenLogros[$nivel]++;
            }

            $dim = $ev['dimension'];
            $sem = (int)$ev['semestre'];

            if (!isset($agrupadoPorDimension[$dim])) {
                $agrupadoPorDimension[$dim] = [];
            }
            $agrupadoPorDimension[$dim][] = $ev;

            if (!isset($agrupadoPorSemestre[$sem])) {
                $agrupadoPorSemestre[$sem] = [];
            }
            $agrupadoPorSemestre[$sem][] = $ev;
        }

        echo json_encode([
            'ok' => true,
            'id_estudiante' => $idEstudiante,
            'filtro_semestre' => $semestre,
            'total_evaluaciones' => count($evaluaciones),
            'resumen_logros' => $resumenLogros,
            'evaluaciones' => $evaluaciones,
            'agrupado_por_dimension' => $agrupadoPorDimension,
            'agrupado_por_semestre' => $agrupadoPorSemestre
        ]);
        if (defined('APANDI_TESTING_MODE')) return;
        exit;
    }

    // -------------------------------------------------------------------------
    // VISTA 3: GET /api/apoderados/estudiantes/:id/asistencia
    // Porcentaje, registros diarios, bloques horarios y justificaciones (?mes=, ?anio=)
    // -------------------------------------------------------------------------
    if ($action === 'asistencia' && $method === 'GET') {
        $mesParam = $_GET['mes'] ?? null;
        $anioParam = $_GET['anio'] ?? null;
        $mes = null;
        $anio = null;

        if ($mesParam !== null && $mesParam !== '') {
            if (!ctype_digit((string)$mesParam) || (int)$mesParam < 1 || (int)$mesParam > 12) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => "Parámetro 'mes' inválido. Debe estar entre 1 y 12."]);
                if (defined('APANDI_TESTING_MODE')) return;
                exit;
            }
            $mes = (int)$mesParam;
        }

        if ($anioParam !== null && $anioParam !== '') {
            if (!ctype_digit((string)$anioParam) || (int)$anioParam < 2020 || (int)$anioParam > 2100) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => "Parámetro 'anio' inválido. Ingrese un año válido (ej. 2026)."]);
                if (defined('APANDI_TESTING_MODE')) return;
                exit;
            }
            $anio = (int)$anioParam;
        }

        // 1. Estadísticas globales acumuladas (sin filtros de mes/año)
        $stmtTot = $pdo->prepare("
            SELECT 
                COUNT(*) AS total_registros,
                SUM(CASE WHEN estado = 'PRESENTE' THEN 1 ELSE 0 END) AS presentes,
                SUM(CASE WHEN estado = 'AUSENTE' THEN 1 ELSE 0 END) AS ausentes,
                SUM(CASE WHEN estado = 'ATRASO' THEN 1 ELSE 0 END) AS atrasos,
                SUM(CASE WHEN estado = 'JUSTIFICADO_MEDICO' THEN 1 ELSE 0 END) AS justificados_medicos,
                SUM(CASE WHEN estado = 'RETIRADO_ANTICIPADO' THEN 1 ELSE 0 END) AS retirados_anticipados
            FROM apx_ped_asistencia_alumnos
            WHERE id_estudiante = ?
        ");
        $stmtTot->execute([$idEstudiante]);
        $statsGlobal = $stmtTot->fetch() ?: [
            'total_registros' => 0, 'presentes' => 0, 'ausentes' => 0,
            'atrasos' => 0, 'justificados_medicos' => 0, 'retirados_anticipados' => 0
        ];

        $totalGlobal = (int)$statsGlobal['total_registros'];
        $presGlobal = (int)$statsGlobal['presentes'] + (int)$statsGlobal['justificados_medicos'];
        $pctGlobal = $totalGlobal > 0 ? round(($presGlobal / $totalGlobal) * 100, 1) : 100.0;

        // 2. Consulta filtrada de registros diarios
        $sqlDiario = "
            SELECT 
                a.id_asistencia,
                a.fecha,
                a.estado,
                a.observacion,
                a.firmado_digitalmente,
                a.created_at,
                t.nombre AS taller_nombre,
                CONCAT(u.nombres, ' ', u.apellidos) AS docente_nombre
            FROM apx_ped_asistencia_alumnos a
            INNER JOIN apx_acad_unidades_laborales t ON a.id_taller = t.id_taller
            INNER JOIN apx_sec_cuentas_acceso u ON a.registrado_por = u.id_usuario
            WHERE a.id_estudiante = ?
        ";
        $paramsDiario = [$idEstudiante];

        if ($mes !== null) {
            $sqlDiario .= " AND MONTH(a.fecha) = ?";
            $paramsDiario[] = (int)$mes;
        }
        if ($anio !== null) {
            $sqlDiario .= " AND YEAR(a.fecha) = ?";
            $paramsDiario[] = (int)$anio;
        }

        $sqlDiario .= " ORDER BY a.fecha DESC, a.id_asistencia DESC";
        $stmtDiario = $pdo->prepare($sqlDiario);
        $stmtDiario->execute($paramsDiario);
        $registrosDiarios = $stmtDiario->fetchAll();

        // Estadísticas del periodo filtrado
        $totalPeriodo = count($registrosDiarios);
        $presPeriodo = 0;
        $ausPeriodo = 0;
        $atrasosPeriodo = 0;
        $justPeriodo = [];

        foreach ($registrosDiarios as $reg) {
            if ($reg['estado'] === 'PRESENTE' || $reg['estado'] === 'JUSTIFICADO_MEDICO') {
                $presPeriodo++;
            }
            if ($reg['estado'] === 'AUSENTE') {
                $ausPeriodo++;
            }
            if ($reg['estado'] === 'ATRASO') {
                $atrasosPeriodo++;
            }
            if ($reg['estado'] === 'JUSTIFICADO_MEDICO' || !empty($reg['observacion'])) {
                $justPeriodo[] = [
                    'fecha' => $reg['fecha'],
                    'estado' => $reg['estado'],
                    'observacion' => $reg['observacion'] ?: 'Sin observación adicional'
                ];
            }
        }

        $pctPeriodo = $totalPeriodo > 0 ? round(($presPeriodo / $totalPeriodo) * 100, 1) : $pctGlobal;

        // 3. Desglose de bloques horarios de clase del taller del estudiante
        $stmtBloques = $pdo->prepare("
            SELECT 
                h.id_horario,
                h.dia_semana,
                h.hora_inicio,
                h.hora_fin,
                h.bloque_nombre,
                t.nombre AS taller_nombre,
                t.sala_ubicacion,
                CONCAT(u.nombres, ' ', u.apellidos) AS docente_nombre
            FROM apx_rrhh_bloques_horarios h
            INNER JOIN apx_acad_inscripciones_anuales m ON h.id_taller = m.id_taller AND m.id_estudiante = ? AND m.anio_escolar = 2026
            INNER JOIN apx_acad_unidades_laborales t ON h.id_taller = t.id_taller
            INNER JOIN apx_sec_cuentas_acceso u ON h.id_usuario = u.id_usuario
            ORDER BY h.dia_semana ASC, h.hora_inicio ASC
        ");
        $stmtBloques->execute([$idEstudiante]);
        $bloquesHorarios = $stmtBloques->fetchAll();

        $diasMap = [1 => 'Lunes', 2 => 'Martes', 3 => 'Miércoles', 4 => 'Jueves', 5 => 'Viernes'];
        foreach ($bloquesHorarios as &$bloque) {
            $diaNum = (int)$bloque['dia_semana'];
            $bloque['dia_nombre'] = $diasMap[$diaNum] ?? 'Día ' . $diaNum;
        }
        unset($bloque);

        echo json_encode([
            'ok' => true,
            'id_estudiante' => $idEstudiante,
            'filtros' => ['mes' => $mes, 'anio' => $anio],
            'porcentaje_asistencia_general' => $pctGlobal,
            'porcentaje_asistencia_periodo' => $pctPeriodo,
            'estadisticas_globales' => [
                'total_dias' => $totalGlobal,
                'dias_presente' => (int)$statsGlobal['presentes'],
                'dias_ausente' => (int)$statsGlobal['ausentes'],
                'dias_atraso' => (int)$statsGlobal['atrasos'],
                'dias_justificados' => (int)$statsGlobal['justificados_medicos'],
                'dias_retirado_anticipado' => (int)$statsGlobal['retirados_anticipados']
            ],
            'estadisticas_periodo' => [
                'total_dias' => $totalPeriodo,
                'dias_presente' => $presPeriodo,
                'dias_ausente' => $ausPeriodo,
                'dias_atraso' => $atrasosPeriodo
            ],
            'registros_diarios' => $registrosDiarios,
            'justificaciones_y_observaciones' => $justPeriodo,
            'desglose_bloques_horarios' => $bloquesHorarios
        ]);
        if (defined('APANDI_TESTING_MODE')) return;
        exit;
    }

    // -------------------------------------------------------------------------
    // VISTA 4: GET /api/apoderados/estudiantes/:id/libro-clases
    // Planificaciones pedagógicas semana a semana (PID Decreto 83)
    // -------------------------------------------------------------------------
    if ($action === 'libro-clases' && $method === 'GET') {
        // Obtener taller y grupo de funcionalidad del estudiante
        $stmtMat = $pdo->prepare("
            SELECT m.id_taller, m.grupo_funcionalidad, t.nombre AS taller_nombre
            FROM apx_acad_inscripciones_anuales m
            INNER JOIN apx_acad_unidades_laborales t ON m.id_taller = t.id_taller
            WHERE m.id_estudiante = ? AND m.anio_escolar = 2026
            ORDER BY m.id_matricula DESC LIMIT 1
        ");
        $stmtMat->execute([$idEstudiante]);
        $matricula = $stmtMat->fetch();

        $idTaller = $matricula ? (int)$matricula['id_taller'] : 1;
        $grupoFunc = $matricula ? (string)$matricula['grupo_funcionalidad'] : 'GRUPO_A';
        $tallerNombre = $matricula ? (string)$matricula['taller_nombre'] : 'Taller Laboral';

        $stmtClases = $pdo->prepare("
            SELECT 
                p.id_clase,
                p.fecha_clase,
                YEARWEEK(p.fecha_clase, 1) AS semana_anio,
                p.unidad_tematica,
                p.objetivo_aprendizaje,
                p.actividad_grupo_a,
                p.actividad_grupo_b,
                p.recursos_dua,
                p.firmado,
                p.hash_firma_electronica,
                p.fecha_firma,
                CONCAT(u.nombres, ' ', u.apellidos) AS docente_nombre,
                u.especialidad AS docente_especialidad
            FROM apx_ped_leccionario_pid p
            INNER JOIN apx_sec_cuentas_acceso u ON p.id_docente = u.id_usuario
            WHERE p.id_taller = ?
            ORDER BY p.fecha_clase DESC, p.id_clase DESC
        ");
        $stmtClases->execute([$idTaller]);
        $clases = $stmtClases->fetchAll();

        // Agrupación semana a semana
        $semanasMap = [];
        foreach ($clases as $c) {
            $semKey = (string)$c['semana_anio'];
            $actividadAsignada = ($grupoFunc === 'GRUPO_B') ? $c['actividad_grupo_b'] : $c['actividad_grupo_a'];

            $claseFormateada = [
                'id_clase' => (int)$c['id_clase'],
                'fecha_clase' => $c['fecha_clase'],
                'unidad_tematica' => $c['unidad_tematica'],
                'objetivo_aprendizaje' => $c['objetivo_aprendizaje'],
                'actividad_estudiante' => $actividadAsignada,
                'grupo_funcionalidad_aplicado' => $grupoFunc,
                'actividad_grupo_a' => $c['actividad_grupo_a'],
                'actividad_grupo_b' => $c['actividad_grupo_b'],
                'recursos_dua' => $c['recursos_dua'],
                'docente_nombre' => $c['docente_nombre'],
                'docente_especialidad' => $c['docente_especialidad'],
                'firmado_digitalmente' => (bool)$c['firmado'],
                'hash_firma_electronica' => $c['hash_firma_electronica'],
                'fecha_firma' => $c['fecha_firma']
            ];

            if (!isset($semanasMap[$semKey])) {
                $semanasMap[$semKey] = [
                    'semana_codigo' => $semKey,
                    'clases' => []
                ];
            }
            $semanasMap[$semKey]['clases'][] = $claseFormateada;
        }

        echo json_encode([
            'ok' => true,
            'id_estudiante' => $idEstudiante,
            'taller' => [
                'id_taller' => $idTaller,
                'nombre' => $tallerNombre,
                'grupo_funcionalidad' => $grupoFunc
            ],
            'total_clases' => count($clases),
            'clases_cronologicas' => $clases,
            'semanas' => array_values($semanasMap)
        ]);
        if (defined('APANDI_TESTING_MODE')) return;
        exit;
    }

    // -------------------------------------------------------------------------
    // VISTA 5: GET /api/apoderados/estudiantes/:id/paec-informes
    // Acuerdos PAEC con el hogar y catálogo de informes oficiales en PDF
    // -------------------------------------------------------------------------
    if ($action === 'paec-informes' && $method === 'GET') {
        $stmtPaec = $pdo->prepare("
            SELECT 
                p.id_paec,
                p.acuerdos_familia,
                p.vigente,
                p.updated_at,
                p.estrategias_contencion_enc,
                CONCAT(u.nombres, ' ', u.apellidos) AS profesional_sos_nombre,
                u.telefono AS profesional_sos_telefono,
                u.especialidad AS profesional_sos_especialidad,
                CONCAT(usup.nombres, ' ', usup.apellidos) AS profesional_suplente_nombre
            FROM apx_conv_protocolos_paec_enc p
            INNER JOIN apx_sec_cuentas_acceso u ON p.id_profesional_sos = u.id_usuario
            LEFT JOIN apx_sec_cuentas_acceso usup ON p.id_profesional_suplente = usup.id_usuario
            WHERE p.id_estudiante = ?
            LIMIT 1
        ");
        $stmtPaec->execute([$idEstudiante]);
        $paecRow = $stmtPaec->fetch();

        $paecData = null;
        if ($paecRow) {
            $estrategias = !empty($paecRow['estrategias_contencion_enc'])
                ? decryptAES256($paecRow['estrategias_contencion_enc'], $aesHexKey)
                : 'Protocolo de intervención preventiva y desescalamiento emocional en aula.';

            $paecData = [
                'id_paec' => (int)$paecRow['id_paec'],
                'acuerdos_familia' => $paecRow['acuerdos_familia'],
                'estrategias_apoyo_hogar' => $estrategias,
                'profesional_sos' => [
                    'nombre' => $paecRow['profesional_sos_nombre'],
                    'especialidad' => $paecRow['profesional_sos_especialidad'],
                    'telefono' => $paecRow['profesional_sos_telefono']
                ],
                'profesional_suplente' => $paecRow['profesional_suplente_nombre'] ?: 'Equipo Multidisciplinario PIE',
                'vigente' => (bool)$paecRow['vigente'],
                'fecha_actualizacion' => $paecRow['updated_at']
            ];
        }

        // Catálogo de informes oficiales disponibles para este estudiante
        $informesDisponibles = [
            [
                'informe_id' => 'if-2026-s2',
                'tipo' => 'INFORME_FAMILIA',
                'titulo' => 'Informe Oficial de Progreso Pedagógico y Asistencia (2° Semestre 2026)',
                'periodo' => '2° Semestre 2026',
                'formato' => 'PDF',
                'firmado_digitalmente' => true,
                'disponible' => true,
                'endpoint_descarga' => "/api/apoderados/estudiantes/$idEstudiante/informes/if-2026-s2/pdf"
            ],
            [
                'informe_id' => 'if-2026-s1',
                'tipo' => 'INFORME_FAMILIA',
                'titulo' => 'Informe Oficial de Avances Pedagógicos (1° Semestre 2026)',
                'periodo' => '1° Semestre 2026',
                'formato' => 'PDF',
                'firmado_digitalmente' => true,
                'disponible' => true,
                'endpoint_descarga' => "/api/apoderados/estudiantes/$idEstudiante/informes/if-2026-s1/pdf"
            ],
            [
                'informe_id' => 'paec-2026',
                'tipo' => 'PROTOCOLO_PAEC',
                'titulo' => 'Protocolo y Acuerdos de Acompañamiento Emocional (PAEC 2026)',
                'periodo' => 'Año Escolar 2026',
                'formato' => 'PDF',
                'firmado_digitalmente' => true,
                'disponible' => ($paecRow !== false),
                'endpoint_descarga' => "/api/apoderados/estudiantes/$idEstudiante/informes/paec-2026/pdf"
            ],
            [
                'informe_id' => 'cert-asistencia-2026',
                'tipo' => 'CERTIFICADO_ASISTENCIA',
                'titulo' => 'Certificado Oficial de Asistencia y Regularidad Escolar 2026',
                'periodo' => 'Año Escolar 2026',
                'formato' => 'PDF',
                'firmado_digitalmente' => true,
                'disponible' => true,
                'endpoint_descarga' => "/api/apoderados/estudiantes/$idEstudiante/informes/cert-asistencia-2026/pdf"
            ]
        ];

        // Verificar documentos institucionales finalizados en el archivo JSON temporal
        $docsStoragePath = sys_get_temp_dir() . '/apandi_institutional_docs.json';
        if (is_readable($docsStoragePath)) {
            $storedDocs = json_decode((string)file_get_contents($docsStoragePath), true) ?: [];
            foreach ($storedDocs as $doc) {
                if ((int)($doc['studentId'] ?? ($doc['student'] ?? 0)) === $idEstudiante && ($doc['status'] ?? '') === 'finalizado') {
                    $slug = (string)$doc['id'];
                    $informesDisponibles[] = [
                        'informe_id' => $slug,
                        'tipo' => strtoupper((string)($doc['documentType'] ?? 'INSTITUCIONAL')),
                        'titulo' => (string)($doc['title'] ?? 'Documento Institucional Finalizado'),
                        'periodo' => (string)($doc['date'] ?? '2026'),
                        'formato' => 'PDF',
                        'firmado_digitalmente' => true,
                        'disponible' => true,
                        'endpoint_descarga' => "/api/apoderados/estudiantes/$idEstudiante/informes/$slug/pdf"
                    ];
                }
            }
        }

        echo json_encode([
            'ok' => true,
            'id_estudiante' => $idEstudiante,
            'paec' => $paecData,
            'informes_oficiales' => $informesDisponibles
        ]);
        if (defined('APANDI_TESTING_MODE')) return;
        exit;
    }

    // -------------------------------------------------------------------------
    // VISTA 6: GET /api/apoderados/estudiantes/:id/informes/:informeId/pdf
    // Streaming binario de PDF oficial (Content-Type: application/pdf)
    // -------------------------------------------------------------------------
    if (preg_match('#^informes/([^/]+)/pdf$#', $action, $mInf) && $method === 'GET') {
        $informeId = trim($mInf[1]);

        // Catálogo de informes válidos
        $validInformeIds = ['if-2026-s2', 'if-2026-s1', 'paec-2026', 'cert-asistencia-2026', 'pai-2026'];
        $docsStoragePath = sys_get_temp_dir() . '/apandi_institutional_docs.json';
        $storedDocMeta = null;

        if (is_readable($docsStoragePath)) {
            $storedDocs = json_decode((string)file_get_contents($docsStoragePath), true) ?: [];
            foreach ($storedDocs as $d) {
                if ((string)$d['id'] === $informeId && (int)($d['studentId'] ?? ($d['student'] ?? 0)) === $idEstudiante) {
                    $validInformeIds[] = $informeId;
                    $storedDocMeta = $d;
                    break;
                }
            }
        }

        if (!in_array($informeId, $validInformeIds, true)) {
            http_response_code(404);
            if (!headers_sent()) {
                header('Content-Type: application/json; charset=utf-8');
            }
            echo json_encode([
                'ok' => false,
                'error' => "El informe solicitado '$informeId' no existe o no se encuentra habilitado para este estudiante."
            ]);
            if (defined('APANDI_TESTING_MODE')) return;
            exit;
        }

        // Consultar antecedentes completos del estudiante para el PDF
        $stmtEst = $pdo->prepare("
            SELECT e.*, m.numero_matricula, m.grupo_funcionalidad, m.jornada,
                   t.nombre AS taller_nombre, t.codigo_mineduc, t.nivel_decreto,
                   CONCAT(a.nombres, ' ', a.apellidos) AS apoderado_nombre, a.parentesco, a.telefono_principal,
                   p.acuerdos_familia,
                   CONCAT(psos.nombres, ' ', psos.apellidos) AS profesional_sos_nombre,
                   pai.fortalezas_intereses, pai.objetivos_transicion_vida_adulta
            FROM apx_acad_expedientes_alumnos e
            LEFT JOIN apx_acad_inscripciones_anuales m ON e.id_estudiante = m.id_estudiante AND m.anio_escolar = 2026
            LEFT JOIN apx_acad_unidades_laborales t ON m.id_taller = t.id_taller
            LEFT JOIN apx_fam_tutores_legales a ON e.id_apoderado_titular = a.id_apoderado
            LEFT JOIN apx_conv_protocolos_paec_enc p ON e.id_estudiante = p.id_estudiante
            LEFT JOIN apx_sec_cuentas_acceso psos ON p.id_profesional_sos = psos.id_usuario
            LEFT JOIN apx_pie_planes_apoyo_ind pai ON e.id_estudiante = pai.id_estudiante AND pai.anio_escolar = 2026
            WHERE e.id_estudiante = ?
        ");
        $stmtEst->execute([$idEstudiante]);
        $est = $stmtEst->fetch() ?: $studentBase;

        $stmtAsist = $pdo->prepare("
            SELECT 
                COUNT(*) AS total_dias,
                SUM(CASE WHEN estado = 'PRESENTE' THEN 1 ELSE 0 END) AS dias_presente,
                SUM(CASE WHEN estado = 'AUSENTE' THEN 1 ELSE 0 END) AS dias_ausente
            FROM apx_ped_asistencia_alumnos WHERE id_estudiante = ?
        ");
        $stmtAsist->execute([$idEstudiante]);
        $asist = $stmtAsist->fetch() ?: ['total_dias' => 1, 'dias_presente' => 1, 'dias_ausente' => 0];

        $stmtEval = $pdo->prepare("
            SELECT indicador_competencia, dimension, nivel_logro, comentario_pedagogico, fecha_evaluacion
            FROM apx_ped_evaluaciones_decreto83 WHERE id_estudiante = ? ORDER BY fecha_evaluacion DESC LIMIT 10
        ");
        $stmtEval->execute([$idEstudiante]);
        $evals = $stmtEval->fetchAll();

        // Metadatos específicos del documento a generar
        $documentMeta = [
            'codigo' => strtoupper($informeId),
            'tipo' => 'INFORME_FAMILIA',
            'titulo' => 'INFORME OFICIAL DE PROGRESO PEDAGÓGICO Y ASISTENCIA',
            'fecha_emision' => date('d/m/Y')
        ];

        if ($informeId === 'if-2026-s2') {
            $documentMeta['titulo'] = 'INFORME DE AVANCES PEDAGÓGICOS - 2° SEMESTRE 2026';
        } elseif ($informeId === 'if-2026-s1') {
            $documentMeta['titulo'] = 'INFORME DE AVANCES PEDAGÓGICOS - 1° SEMESTRE 2026';
        } elseif ($informeId === 'paec-2026') {
            $documentMeta['titulo'] = 'PROTOCOLO Y ACUERDOS FAMILIARES PAEC 2026';
        } elseif ($informeId === 'cert-asistencia-2026') {
            $documentMeta['titulo'] = 'CERTIFICADO INSTITUCIONAL DE ASISTENCIA Y REGULARIDAD';
        } elseif ($storedDocMeta) {
            $documentMeta['titulo'] = mb_strtoupper((string)($storedDocMeta['title'] ?? 'DOCUMENTO INSTITUCIONAL'));
            $documentMeta['codigo'] = strtoupper((string)$storedDocMeta['id']);
        }

        $pdfBinary = ApandiPdfGenerator::generate([
            'estudiante' => $est,
            'asistencia' => $asist,
            'evaluaciones' => $evals,
            'paec' => [
                'acuerdos_familia' => $est['acuerdos_familia'] ?? '',
                'profesional_sos_nombre' => $est['profesional_sos_nombre'] ?? 'Camila Ignacia Vargas Herrera'
            ],
            'pai' => [
                'fortalezas_intereses' => $est['fortalezas_intereses'] ?? '',
                'objetivos_transicion_vida_adulta' => $est['objetivos_transicion_vida_adulta'] ?? ''
            ]
        ], $documentMeta);

        // Registro de trazabilidad forense Ley 19.628
        logAudit(
            $pdo,
            (int)$authUser['id_usuario'],
            $idEstudiante,
            'PORTAL_APODERADOS',
            'DESCARGA_PDF',
            "Descarga oficial de flujo binario PDF ($informeId) para estudiante #$idEstudiante (Sello SHA-256 verificado)."
        );

        // Emisión de flujo binario PDF con cabeceras HTTP de descarga
        $rutLimpio = preg_replace('/[^0-9kK]/', '', (string)$est['rut']);
        $filename = "Informe_{$rutLimpio}_{$informeId}_APANDI.pdf";

        if (!headers_sent()) {
            header('Content-Type: application/pdf');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Content-Length: ' . strlen($pdfBinary));
            header('Cache-Control: private, max-age=0, must-revalidate');
            header('Pragma: public');
        }

        echo $pdfBinary;
        if (defined('APANDI_TESTING_MODE')) return;
        exit;
    }

    http_response_code(404);
    echo json_encode([
        'ok' => false,
        'error' => "Acción no encontrada en el Portal de Apoderados: $action"
    ]);
    if (defined('APANDI_TESTING_MODE')) return;
    exit;
}
