<?php
if (!defined('APANDI_API_BOOTSTRAPPED')) {
    http_response_code(404);
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
