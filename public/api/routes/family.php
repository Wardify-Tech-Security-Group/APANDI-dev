<?php
if (!defined('APANDI_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}

// 7. Portal Apoderados y Datos Consolidados para el Generador PDF en JS
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
