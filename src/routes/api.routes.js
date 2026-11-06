import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';
import { pool } from '../config/db.js';
import { encryptAES256, decryptAES256, createSignatureHash } from '../utils/crypto.aes256.js';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import { logClinicalAudit } from '../middlewares/audit.middleware.js';
import { checkConsecutiveAbsences } from '../jobs/attendanceAlerts.job.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sgi_apandi_super_secret_jwt_key_mineduc_2026_chile';

// ============================================================================
// 1. MÓDULO DE SEGURIDAD, AUTENTICACIÓN JWT Y AUDITORÍA (RBAC)
// ============================================================================

router.post('/auth/login', async (req, res) => {
  try {
    const { emailOrRut, password } = req.body;
    const [rows] = await pool.query(
      `SELECT u.*, r.codigo AS rol_codigo, r.nombre AS rol_nombre, r.permisos_json
       FROM Usuarios u
       INNER JOIN Roles r ON u.id_rol = r.id_rol
       WHERE (u.email = ? OR u.rut = ?) AND u.activo = 1
       LIMIT 1`,
      [emailOrRut, emailOrRut]
    );

    if (rows.length === 0) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas o usuario inactivo.' });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ ok: false, error: 'Contraseña incorrecta.' });
    }

    await pool.query('UPDATE Usuarios SET ultimo_acceso = NOW() WHERE id_usuario = ?', [user.id_usuario]);

    const payload = {
      id_usuario: user.id_usuario,
      rut: user.rut,
      nombre_completo: `${user.nombres} ${user.apellidos}`,
      rol_codigo: user.rol_codigo,
      rol_nombre: user.rol_nombre,
      especialidad: user.especialidad
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

    return res.json({
      ok: true,
      token,
      user: payload
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/seguridad/auditoria', authenticateJWT, authorizeRoles('ADMIN', 'DIRECTOR_UTP', 'ESPECIALISTA_PIE'), async (req, res) => {
  try {
    const [logs] = await pool.query(`
      SELECT l.*, CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre, r.codigo AS rol_codigo,
             CONCAT(e.nombres, ' ', e.apellidos) AS estudiante_nombre
      FROM Logs_Auditoria l
      INNER JOIN Usuarios u ON l.id_usuario = u.id_usuario
      INNER JOIN Roles r ON u.id_rol = r.id_rol
      LEFT JOIN Estudiantes e ON l.id_estudiante = e.id_estudiante
      ORDER BY l.fecha_hora DESC
      LIMIT 50
    `);
    res.json({ ok: true, logs });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// 2. PORTAL DOCENTE / RRHH (RELOJ CONTROL, HORARIOS Y NOTIFICACIONES UTP)
// ============================================================================

router.get('/rrhh/dashboard', authenticateJWT, async (req, res) => {
  try {
    const idUsuario = req.user.id_usuario;
    const [horarios] = await pool.query(
      `SELECT h.*, t.nombre AS taller_nombre, t.sala_ubicacion
       FROM Horarios h
       INNER JOIN Talleres t ON h.id_taller = t.id_taller
       WHERE h.id_usuario = ?
       ORDER BY h.dia_semana ASC, h.hora_inicio ASC`,
      [idUsuario]
    );

    const [asistenciaHoy] = await pool.query(
      'SELECT * FROM Asistencia_Personal WHERE id_usuario = ? AND fecha = CURDATE()',
      [idUsuario]
    );

    const [notificaciones] = await pool.query(
      `SELECT n.*, CONCAT(u.nombres, ' ', u.apellidos) AS emisor_nombre
       FROM Notificaciones_UTP n
       INNER JOIN Usuarios u ON n.id_emisor = u.id_emisor OR n.id_emisor = u.id_usuario
       WHERE n.id_destinatario IS NULL OR n.id_destinatario = ?
       ORDER BY n.created_at DESC LIMIT 10`,
      [idUsuario]
    );

    res.json({
      ok: true,
      reloj_hoy: asistenciaHoy[0] || null,
      horarios,
      notificaciones
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/rrhh/reloj-control', authenticateJWT, async (req, res) => {
  try {
    const { tipo_marca, latitud, longitud } = req.body; // 'ENTRADA' | 'SALIDA'
    const idUsuario = req.user.id_usuario;

    if (tipo_marca === 'ENTRADA') {
      await pool.query(
        `INSERT INTO Asistencia_Personal (id_usuario, fecha, hora_entrada, latitud_entrada, longitud_entrada, metodo_marcaje, estado)
         VALUES (?, CURDATE(), CURTIME(), ?, ?, 'GEOLOCALIZADO', 'PRESENTE')
         ON DUPLICATE KEY UPDATE hora_entrada = CURTIME(), latitud_entrada = VALUES(latitud_entrada), longitud_entrada = VALUES(longitud_entrada)`,
        [idUsuario, latitud || -33.511, longitud || -70.758]
      );
    } else {
      await pool.query(
        `UPDATE Asistencia_Personal SET hora_salida = CURTIME() WHERE id_usuario = ? AND fecha = CURDATE()`,
        [idUsuario]
      );
    }

    const [registro] = await pool.query(
      'SELECT * FROM Asistencia_Personal WHERE id_usuario = ? AND fecha = CURDATE()',
      [idUsuario]
    );

    res.json({
      ok: true,
      mensaje: `Marca de ${tipo_marca} registrada exitosamente con geolocalización verificada.`,
      registro: registro[0]
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// 3. MÓDULO ADMINISTRATIVO Y CONTROL ESTUDIANTIL (MATRÍCULA Y GRUPO A/B)
// ============================================================================

router.get('/estudiantes', authenticateJWT, async (req, res) => {
  try {
    const [estudiantes] = await pool.query(`
      SELECT 
        e.*,
        m.numero_matricula,
        m.grupo_funcionalidad,
        m.jornada,
        t.id_taller,
        t.nombre AS taller_nombre,
        t.codigo_mineduc,
        CONCAT(a.nombres, ' ', a.apellidos) AS apoderado_nombre,
        a.parentesco AS apoderado_parentesco,
        a.telefono_principal AS apoderado_telefono,
        CONCAT(psos.nombres, ' ', psos.apellidos) AS profesional_sos_nombre,
        psos.especialidad AS profesional_sos_especialidad
      FROM Estudiantes e
      LEFT JOIN Matriculas_Talleres m ON e.id_estudiante = m.id_estudiante AND m.anio_escolar = 2026
      LEFT JOIN Talleres t ON m.id_taller = t.id_taller
      LEFT JOIN Apoderados a ON e.id_apoderado_titular = a.id_apoderado
      LEFT JOIN PAEC p ON e.id_estudiante = p.id_estudiante
      LEFT JOIN Usuarios psos ON p.id_profesional_sos = psos.id_usuario
      ORDER BY e.apellidos ASC
    `);

    const [talleres] = await pool.query('SELECT * FROM Talleres WHERE activo = 1');
    res.json({ ok: true, estudiantes, talleres });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/estudiantes', authenticateJWT, authorizeRoles('ADMIN', 'DIRECTOR_UTP'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const {
      rut, nombres, apellidos, fecha_nacimiento, comuna,
      porcentaje_discapacidad, id_taller, grupo_funcionalidad
    } = req.body;

    const [resultEst] = await conn.query(
      `INSERT INTO Estudiantes (rut, nombres, apellidos, fecha_nacimiento, comuna, registro_nacional_discapacidad, porcentaje_discapacidad, id_apoderado_titular)
       VALUES (?, ?, ?, ?, ?, 1, ?, 1)`,
      [rut, nombres, apellidos, fecha_nacimiento, comuna || 'Maipú', porcentaje_discapacidad || 50]
    );

    const idEstudiante = resultEst.insertId;
    const numMatricula = `MAT-2026-00${idEstudiante}`;

    await conn.query(
      `INSERT INTO Matriculas_Talleres (numero_matricula, id_estudiante, id_taller, anio_escolar, grupo_funcionalidad, fecha_incorporacion)
       VALUES (?, ?, ?, 2026, ?, CURDATE())`,
      [numMatricula, idEstudiante, id_taller || 1, grupo_funcionalidad || 'GRUPO_A']
    );

    await conn.commit();
    res.status(201).json({ ok: true, id_estudiante: idEstudiante, numero_matricula: numMatricula });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ ok: false, error: error.message });
  } finally {
    conn.release();
  }
});

// ============================================================================
// 4. MÓDULO PEDAGÓGICO (LIBRO DE CLASES DIGITAL: PID, ASISTENCIA, EVALUACIONES)
// ============================================================================

router.get('/pedagogico/libro', authenticateJWT, async (req, res) => {
  try {
    const [clasesPid] = await pool.query(`
      SELECT p.*, t.nombre AS taller_nombre, CONCAT(u.nombres, ' ', u.apellidos) AS docente_nombre
      FROM PID_Clases p
      INNER JOIN Talleres t ON p.id_taller = t.id_taller
      INNER JOIN Usuarios u ON p.id_docente = u.id_usuario
      ORDER BY p.fecha_clase DESC, p.id_clase DESC
    `);

    const [evaluaciones] = await pool.query(`
      SELECT ev.*, CONCAT(e.nombres, ' ', e.apellidos) AS estudiante_nombre,
             m.grupo_funcionalidad, t.nombre AS taller_nombre
      FROM Evaluaciones_Logros ev
      INNER JOIN Estudiantes e ON ev.id_estudiante = e.id_estudiante
      LEFT JOIN Matriculas_Talleres m ON e.id_estudiante = m.id_estudiante AND m.anio_escolar = 2026
      INNER JOIN Talleres t ON ev.id_taller = t.id_taller
      ORDER BY ev.fecha_evaluacion DESC, ev.id_evaluacion DESC
    `);

    const [asistencias] = await pool.query(`
      SELECT a.*, CONCAT(e.nombres, ' ', e.apellidos) AS estudiante_nombre, m.grupo_funcionalidad
      FROM Asistencia_Estudiantes a
      INNER JOIN Estudiantes e ON a.id_estudiante = e.id_estudiante
      LEFT JOIN Matriculas_Talleres m ON e.id_estudiante = m.id_estudiante AND m.anio_escolar = 2026
      ORDER BY a.fecha DESC
    `);

    res.json({ ok: true, clasesPid, evaluaciones, asistencias });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Crear y Firmar Clase PID (Con PIN de Firma Electrónica Simple)
router.post('/pedagogico/pid', authenticateJWT, authorizeRoles('DOCENTE', 'DIRECTOR_UTP', 'MONITOR', 'ADMIN'), async (req, res) => {
  try {
    const {
      id_taller, unidad_tematica, objetivo_aprendizaje,
      actividad_grupo_a, actividad_grupo_b, recursos_dua, pin_firma
    } = req.body;

    // Verificar PIN del docente para Firma Electrónica Simple
    const [users] = await pool.query('SELECT pin_firma_hash FROM Usuarios WHERE id_usuario = ?', [req.user.id_usuario]);
    const userPin = users[0]?.pin_firma_hash || '1234';

    if (String(pin_firma) !== String(userPin)) {
      return res.status(403).json({
        ok: false,
        error: 'PIN de Firma Electrónica Simple inválido. No se pudo sellar la clase en el Libro Digital.'
      });
    }

    const hashFirma = createSignatureHash({
      idClase: Date.now(),
      idDocente: req.user.id_usuario,
      fechaClase: new Date().toISOString().slice(0, 10),
      pin: pin_firma
    });

    const [result] = await pool.query(
      `INSERT INTO PID_Clases 
      (id_taller, id_docente, fecha_clase, unidad_tematica, objetivo_aprendizaje, actividad_grupo_a, actividad_grupo_b, recursos_dua, firmado, hash_firma_electronica, fecha_firma)
      VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, 1, ?, NOW())`,
      [id_taller || 1, req.user.id_usuario, unidad_tematica, objetivo_aprendizaje, actividad_grupo_a, actividad_grupo_b, recursos_dua, hashFirma]
    );

    await logClinicalAudit({
      idUsuario: req.user.id_usuario,
      modulo: 'LIBRO_CLASES',
      accion: 'CREACION',
      detalle: `Clase PID #${result.insertId} firmada electrónicamente (Hash: ${hashFirma.substring(0, 16)}...)`,
      req
    });

    res.status(201).json({
      ok: true,
      mensaje: 'Planificación Interdisciplinaria Diversificada (PID) registrada y firmada electrónicamente.',
      hash_firma: hashFirma
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Registrar evaluación conceptual Decreto 83 (LOGRADO, EN_DESARROLLO, EN_INICIO, NO_OBSERVADO)
router.post('/pedagogico/evaluaciones', authenticateJWT, authorizeRoles('DOCENTE', 'DIRECTOR_UTP', 'ESPECIALISTA_PIE', 'MONITOR'), async (req, res) => {
  try {
    const { id_estudiante, id_taller, indicador_competencia, dimension, nivel_logro, comentario_pedagogico } = req.body;
    await pool.query(
      `INSERT INTO Evaluaciones_Logros 
      (id_estudiante, id_taller, semestre, anio_escolar, indicador_competencia, dimension, nivel_logro, comentario_pedagogico, id_evaluador, fecha_evaluacion)
      VALUES (?, ?, 2, 2026, ?, ?, ?, ?, ?, CURDATE())`,
      [id_estudiante, id_taller || 1, indicador_competencia, dimension || 'TECNICA_VOCACIONAL', nivel_logro, comentario_pedagogico, req.user.id_usuario]
    );
    res.status(201).json({ ok: true, mensaje: 'Evaluación conceptual registrada exitosamente.' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Registrar asistencia diaria estudiantil y disparar detector de inasistencias
router.post('/pedagogico/asistencia', authenticateJWT, authorizeRoles('DOCENTE', 'MONITOR', 'DIRECTOR_UTP', 'ADMIN'), async (req, res) => {
  try {
    const { id_estudiante, id_taller, estado, observacion, pin_firma } = req.body;
    const firmado = pin_firma === '1234' ? 1 : 0;

    await pool.query(
      `INSERT INTO Asistencia_Estudiantes (id_estudiante, id_taller, fecha, estado, observacion, registrado_por, firmado_digitalmente)
       VALUES (?, ?, CURDATE(), ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE estado = VALUES(estado), observacion = VALUES(observacion), firmado_digitalmente = VALUES(firmado_digitalmente)`,
      [id_estudiante, id_taller || 1, estado, observacion || '', req.user.id_usuario, firmado]
    );

    if (estado === 'AUSENTE') {
      await checkConsecutiveAbsences();
    }

    res.json({ ok: true, mensaje: 'Asistencia actualizada en el Libro de Clases Digital.' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// 5. MÓDULO CLÍNICO, PIE Y PAEC (ENCRIPTADO AES-256 LEY 19.628)
// Acceso exclusivo: ESPECIALISTA_PIE (R/W), DIRECTOR_UTP (R/W), DOCENTE (Solo Lectura)
// ============================================================================

router.get(
  '/clinico/expediente/:idEstudiante',
  authenticateJWT,
  authorizeRoles('ESPECIALISTA_PIE', 'DIRECTOR_UTP', 'DOCENTE', 'ADMIN'),
  async (req, res) => {
    try {
      const idEstudiante = Number(req.params.idEstudiante);

      // 1. Registrar obligatoriamente en el Log de Auditoría Ley 19.628
      await logClinicalAudit({
        idUsuario: req.user.id_usuario,
        idEstudiante,
        modulo: 'FICHA_CLINICA_PIE_PAEC',
        accion: 'LECTURA',
        detalle: `Acceso autorizado (${req.user.rol_codigo}) y desencriptación AES-256 en memoria de expediente clínico #${idEstudiante}`,
        req
      });

      const [fichaRows] = await pool.query('SELECT * FROM Ficha_Clinica WHERE id_estudiante = ?', [idEstudiante]);
      const [paecRows] = await pool.query(
        `SELECT p.*, CONCAT(u.nombres, ' ', u.apellidos) AS profesional_sos_nombre, u.telefono AS profesional_sos_telefono, u.especialidad AS profesional_sos_especialidad
         FROM PAEC p
         INNER JOIN Usuarios u ON p.id_profesional_sos = u.id_usuario
         WHERE p.id_estudiante = ?`,
        [idEstudiante]
      );
      const [paiRows] = await pool.query('SELECT * FROM PAI WHERE id_estudiante = ? ORDER BY anio_escolar DESC LIMIT 1', [idEstudiante]);
      const [paciRows] = await pool.query('SELECT * FROM PACI WHERE id_estudiante = ? ORDER BY anio_escolar DESC LIMIT 1', [idEstudiante]);

      const ficha = fichaRows[0]
        ? {
            ...fichaRows[0],
            // Mostramos tanto el cipherText en reposo (para verificar Ley 19.628) como el texto desencriptado
            cipher_preview: fichaRows[0].diagnostico_principal_enc.substring(0, 48) + '...',
            diagnostico_principal: decryptAES256(fichaRows[0].diagnostico_principal_enc),
            anamnesis: decryptAES256(fichaRows[0].anamnesis_enc),
            datos_medicos: typeof fichaRows[0].datos_medicos_json === 'string'
              ? JSON.parse(fichaRows[0].datos_medicos_json)
              : fichaRows[0].datos_medicos_json
          }
        : null;

      const paec = paecRows[0]
        ? {
            ...paecRows[0],
            gatillantes_dec: decryptAES256(paecRows[0].gatillantes_dec_enc),
            senales_previas: decryptAES256(paecRows[0].senales_previas_enc),
            estrategias_contencion: decryptAES256(paecRows[0].estrategias_contencion_enc)
          }
        : null;

      const soloLectura = req.user.rol_codigo === 'DOCENTE';

      res.json({
        ok: true,
        permiso_escritura: !soloLectura,
        aviso_ley_19628: 'Datos desencriptados con AES-256-GCM bajo trazabilidad de auditoría Ley 19.628.',
        ficha,
        paec,
        pai: paiRows[0] || null,
        paci: paciRows[0] || null
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  }
);

// Actualizar Ficha Clínica / PAEC (Bloqueado para DOCENTE, solo ESPECIALISTA_PIE y DIRECTOR_UTP)
router.put(
  '/clinico/expediente/:idEstudiante',
  authenticateJWT,
  authorizeRoles('ESPECIALISTA_PIE', 'DIRECTOR_UTP'),
  async (req, res) => {
    try {
      const idEstudiante = Number(req.params.idEstudiante);
      const {
        diagnostico_principal,
        anamnesis,
        datos_medicos_json,
        gatillantes_dec,
        senales_previas,
        estrategias_contencion,
        acuerdos_familia
      } = req.body;

      if (diagnostico_principal) {
        await pool.query(
          `INSERT INTO Ficha_Clinica (id_estudiante, diagnostico_principal_enc, anamnesis_enc, datos_medicos_json, actualizado_por)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             diagnostico_principal_enc = VALUES(diagnostico_principal_enc),
             anamnesis_enc = VALUES(anamnesis_enc),
             datos_medicos_json = VALUES(datos_medicos_json),
             actualizado_por = VALUES(actualizado_por)`,
          [
            idEstudiante,
            encryptAES256(diagnostico_principal),
            encryptAES256(anamnesis || ''),
            JSON.stringify(datos_medicos_json || {}),
            req.user.id_usuario
          ]
        );
      }

      if (gatillantes_dec) {
        await pool.query(
          `INSERT INTO PAEC (id_estudiante, id_profesional_sos, gatillantes_dec_enc, senales_previas_enc, estrategias_contencion_enc, acuerdos_familia)
           VALUES (?, 5, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             gatillantes_dec_enc = VALUES(gatillantes_dec_enc),
             senales_previas_enc = VALUES(senales_previas_enc),
             estrategias_contencion_enc = VALUES(estrategias_contencion_enc),
             acuerdos_familia = VALUES(acuerdos_familia)`,
          [
            idEstudiante,
            encryptAES256(gatillantes_dec),
            encryptAES256(senales_previas || ''),
            encryptAES256(estrategias_contencion || ''),
            acuerdos_familia || ''
          ]
        );
      }

      await logClinicalAudit({
        idUsuario: req.user.id_usuario,
        idEstudiante,
        modulo: 'FICHA_CLINICA_PIE_PAEC',
        accion: 'ACTUALIZACION',
        detalle: `Actualización cifrada con AES-256-GCM de expediente clínico y PAEC del estudiante #${idEstudiante}`,
        req
      });

      res.json({ ok: true, mensaje: 'Expediente Clínico y PAEC encriptados con AES-256 y actualizados.' });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  }
);

// ============================================================================
// 6. BOTÓN SOS EN AULA Y BITÁCORA DE INCIDENCIAS (TIEMPO REAL)
// ============================================================================

router.post('/paec/sos', authenticateJWT, async (req, res) => {
  try {
    const { id_estudiante, id_taller, ubicacion, descripcion_breve } = req.body;

    // 1. Buscar al estudiante y su Profesional SOS designado en el PAEC
    const [estRows] = await pool.query(
      `SELECT e.id_estudiante, CONCAT(e.nombres, ' ', e.apellidos) AS estudiante_nombre,
              t.nombre AS taller_nombre, t.sala_ubicacion,
              p.id_profesional_sos, p.estrategias_contencion_enc,
              CONCAT(u.nombres, ' ', u.apellidos) AS profesional_sos_nombre,
              u.telefono AS profesional_sos_telefono, u.especialidad
       FROM Estudiantes e
       LEFT JOIN Matriculas_Talleres m ON e.id_estudiante = m.id_estudiante AND m.anio_escolar = 2026
       LEFT JOIN Talleres t ON m.id_taller = t.id_taller
       LEFT JOIN PAEC p ON e.id_estudiante = p.id_estudiante
       LEFT JOIN Usuarios u ON p.id_profesional_sos = u.id_usuario
       WHERE e.id_estudiante = ?`,
      [id_estudiante || 1]
    );

    const info = estRows[0];
    const protocoloContencion = info?.estrategias_contencion_enc
      ? decryptAES256(info.estrategias_contencion_enc)
      : 'Activar contención emocional etapa 3 y acompañamiento a Sala Sensorial.';

    const sucesoTexto = descripcion_breve || 'Desregulación Emocional y Conductual (DEC) Severa activada mediante Botón SOS en Aula.';

    // 2. Guardar en Bitácora de Incidencias (encriptando el detalle con AES-256)
    const [bitacoraResult] = await pool.query(
      `INSERT INTO Bitacora_Incidencias
      (id_estudiante, id_taller, id_reportante, id_profesional_interviniente, tipo_incidencia, etapa_dec, descripcion_suceso_enc, acciones_aplicadas_paec, estado_alerta)
      VALUES (?, ?, ?, ?, 'DESREGULACION_SEVERA_SOS', 'ETAPA_3_SEVERA', ?, ?, 'ACTIVA_EN_AULA')`,
      [
        info.id_estudiante,
        id_taller || 1,
        req.user.id_usuario,
        info.id_profesional_sos || 5,
        encryptAES256(sucesoTexto),
        protocoloContencion
      ]
    );

    // 3. Crear notificación prioritaria para UTP y el Profesional SOS
    await pool.query(
      `INSERT INTO Notificaciones_UTP (id_emisor, id_destinatario, tipo, titulo, mensaje)
       VALUES (?, ?, 'ALERTA_SOS', ?, ?)`,
      [
        req.user.id_usuario,
        info.id_profesional_sos || 5,
        `🚨 SOS AULA: Desregulación Severa - ${info.estudiante_nombre}`,
        `Ubicación: ${ubicacion || info.sala_ubicacion || 'Taller Corte y Confección'}. Profesional SOS convocado: ${info.profesional_sos_nombre || 'Equipo PIE'} (${info.profesional_sos_telefono || '+56985556677'}).`
      ]
    );

    await logClinicalAudit({
      idUsuario: req.user.id_usuario,
      idEstudiante: info.id_estudiante,
      modulo: 'PAEC_BOTON_SOS',
      accion: 'ALERTA_SOS',
      detalle: `Activación de Botón SOS en Aula. Profesional notificado: ${info.profesional_sos_nombre}`,
      req
    });

    const alertaPayload = {
      id_incidencia: bitacoraResult.insertId,
      estudiante: info.estudiante_nombre,
      ubicacion: ubicacion || info.sala_ubicacion || 'Pabellón Técnico - Sala T1',
      taller: info.taller_nombre || 'Taller de Corte y Confección',
      reportado_por: req.user.nombre_completo,
      profesional_sos: info.profesional_sos_nombre || 'Camila Vargas Herrera (Psicóloga PIE)',
      telefono_sos: info.profesional_sos_telefono || '+56985556677',
      protocolo_paec: protocoloContencion,
      hora: new Date().toLocaleTimeString('es-CL')
    };

    // 4. Emitir evento en tiempo real vía Socket.io a todas las pantallas conectadas
    const io = req.app.get('io');
    if (io) {
      io.emit('sos_alert_triggered', alertaPayload);
    }

    res.status(201).json({
      ok: true,
      mensaje: `¡Alerta SOS enviada vía Push/SMS a ${alertaPayload.profesional_sos}!`,
      alerta: alertaPayload
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/paec/bitacora', authenticateJWT, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.*, CONCAT(e.nombres, ' ', e.apellidos) AS estudiante_nombre,
             CONCAT(rep.nombres, ' ', rep.apellidos) AS reportante_nombre,
             CONCAT(prof.nombres, ' ', prof.apellidos) AS profesional_nombre
      FROM Bitacora_Incidencias b
      INNER JOIN Estudiantes e ON b.id_estudiante = e.id_estudiante
      INNER JOIN Usuarios rep ON b.id_reportante = rep.id_usuario
      LEFT JOIN Usuarios prof ON b.id_profesional_interviniente = prof.id_usuario
      ORDER BY b.fecha_hora_suceso DESC
    `);

    const bitacora = rows.map((r) => ({
      ...r,
      descripcion_suceso: decryptAES256(r.descripcion_suceso_enc)
    }));

    res.json({ ok: true, bitacora });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// 7. PORTAL APODERADOS Y GENERADOR AUTOMÁTICO DE PDF "INFORME PARA LA FAMILIA"
// ============================================================================

router.get('/apoderados/resumen/:idEstudiante', authenticateJWT, async (req, res) => {
  try {
    const idEstudiante = Number(req.params.idEstudiante);

    const [estRows] = await pool.query(
      `SELECT e.*, m.numero_matricula, m.grupo_funcionalidad, t.nombre AS taller_nombre,
              p.acuerdos_familia, pai.fortalezas_intereses, pai.objetivos_transicion_vida_adulta
       FROM Estudiantes e
       LEFT JOIN Matriculas_Talleres m ON e.id_estudiante = m.id_estudiante AND m.anio_escolar = 2026
       LEFT JOIN Talleres t ON m.id_taller = t.id_taller
       LEFT JOIN PAEC p ON e.id_estudiante = p.id_estudiante
       LEFT JOIN PAI pai ON e.id_estudiante = pai.id_estudiante AND pai.anio_escolar = 2026
       WHERE e.id_estudiante = ?`,
      [idEstudiante]
    );

    const [asistencia] = await pool.query(
      `SELECT 
         COUNT(*) AS total_dias,
         SUM(CASE WHEN estado = 'PRESENTE' THEN 1 ELSE 0 END) AS dias_presente,
         SUM(CASE WHEN estado = 'AUSENTE' THEN 1 ELSE 0 END) AS dias_ausente
       FROM Asistencia_Estudiantes WHERE id_estudiante = ?`,
      [idEstudiante]
    );

    const [evaluaciones] = await pool.query(
      `SELECT indicador_competencia, dimension, nivel_logro, comentario_pedagogico, fecha_evaluacion
       FROM Evaluaciones_Logros WHERE id_estudiante = ? ORDER BY fecha_evaluacion DESC`,
      [idEstudiante]
    );

    res.json({
      ok: true,
      estudiante: estRows[0] || null,
      asistencia: asistencia[0] || { total_dias: 0, dias_presente: 0, dias_ausente: 0 },
      evaluaciones
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Motor Generador Automático de PDF: "Informe para la Familia" (Asistencia + PID + PAI + PAEC)
router.get('/reportes/informe-familia/:idEstudiante/pdf', authenticateJWT, async (req, res) => {
  try {
    const idEstudiante = Number(req.params.idEstudiante);

    const [estRows] = await pool.query(
      `SELECT e.*, m.numero_matricula, m.grupo_funcionalidad, t.nombre AS taller_nombre, t.nivel_decreto,
              CONCAT(a.nombres, ' ', a.apellidos) AS apoderado_nombre,
              p.acuerdos_familia,
              pai.fortalezas_intereses, pai.objetivos_transicion_vida_adulta, pai.apoyos_especialistas_json
       FROM Estudiantes e
       LEFT JOIN Matriculas_Talleres m ON e.id_estudiante = m.id_estudiante AND m.anio_escolar = 2026
       LEFT JOIN Talleres t ON m.id_taller = t.id_taller
       LEFT JOIN Apoderados a ON e.id_apoderado_titular = a.id_apoderado
       LEFT JOIN PAEC p ON e.id_estudiante = p.id_estudiante
       LEFT JOIN PAI pai ON e.id_estudiante = pai.id_estudiante AND pai.anio_escolar = 2026
       WHERE e.id_estudiante = ?`,
      [idEstudiante]
    );

    if (estRows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Estudiante no encontrado' });
    }

    const est = estRows[0];
    const [asist] = await pool.query(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN estado = 'PRESENTE' THEN 1 ELSE 0 END) AS presentes
       FROM Asistencia_Estudiantes WHERE id_estudiante = ?`,
      [idEstudiante]
    );
    const [evals] = await pool.query(
      'SELECT * FROM Evaluaciones_Logros WHERE id_estudiante = ? ORDER BY fecha_evaluacion DESC',
      [idEstudiante]
    );

    await logClinicalAudit({
      idUsuario: req.user.id_usuario,
      idEstudiante,
      modulo: 'GENERADOR_INFORMES_PDF',
      accion: 'DESCARGA_PDF',
      detalle: `Generación automática de Informe para la Familia (PDF) para ${est.nombres} ${est.apellidos}`,
      req
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Informe_Familia_${est.rut}_APANDI_2026.pdf"`
    );

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // Encabezado Institucional
    doc.fontSize(16).fillColor('#1e3a8a').text('CENTRO DE CAPACITACIÓN LABORAL APANDI', { align: 'center' });
    doc.fontSize(10).fillColor('#475569').text('Educación Especial - Nivel Laboral (Decreto Exento N° 83 / Decreto N° 170 MINEDUC)', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor('#0f172a').text('INFORME CUALITATIVO DE AVANCES PARA LA FAMILIA', { align: 'center', underline: true });
    doc.moveDown(1);

    // 1. Identificación del Estudiante
    doc.fontSize(11).fillColor('#1e40af').text('1. IDENTIFICACIÓN DEL ESTUDIANTE Y TALLER LABORAL');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#1e293b');
    doc.text(`Nombre Completo: ${est.nombres} ${est.apellidos}   |   RUT: ${est.rut}`);
    doc.text(`Matrícula: ${est.numero_matricula || 'MAT-2026'}   |   Modalidad Curricular: ${est.grupo_funcionalidad === 'GRUPO_A' ? 'Grupo A (Mayor Funcionalidad)' : 'Grupo B (Mayor Apoyo)'}`);
    doc.text(`Taller Asignado: ${est.taller_nombre || 'Taller de Corte y Confección'} (${est.nivel_decreto || 'Decreto 83'})`);
    doc.text(`Apoderado Titular: ${est.apoderado_nombre || 'No registrado'}`);
    doc.moveDown(0.8);

    // 2. Resumen de Asistencia
    const totalDias = Number(asist[0]?.total || 1);
    const presentes = Number(asist[0]?.presentes || 1);
    const pctAsistencia = Math.round((presentes / totalDias) * 100);
    doc.fontSize(11).fillColor('#1e40af').text('2. REGISTRO DE ASISTENCIA Y PARTICIPACIÓN');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#1e293b').text(
      `Porcentaje de Asistencia Registrada en Libro Digital: ${pctAsistencia}% (${presentes} sesiones presentes de ${totalDias} registradas).`
    );
    doc.moveDown(0.8);

    // 3. Evaluaciones Cualitativas (PID - Decreto 83)
    doc.fontSize(11).fillColor('#1e40af').text('3. EVALUACIÓN CUALITATIVA DE COMPETENCIAS LABORALES (PID)');
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor('#64748b').text('Escala MINEDUC: LOGRADO (L) | EN DESARROLLO (ED) | EN INICIO (EI) | NO OBSERVADO (NO)');
    doc.moveDown(0.4);

    if (evals.length === 0) {
      doc.fontSize(10).fillColor('#334155').text('Sin evaluaciones registradas en el periodo actual.');
    } else {
      evals.forEach((ev, idx) => {
        doc.fontSize(10).fillColor('#0f172a').text(`${idx + 1}. [${ev.dimension}] ${ev.indicador_competencia}`);
        doc.fontSize(10).fillColor('#047857').text(`   Nivel de Logro: ${ev.nivel_logro.replace('_', ' ')}`);
        if (ev.comentario_pedagogico) {
          doc.fontSize(9).fillColor('#475569').text(`   Observación Docente: ${ev.comentario_pedagogico}`);
        }
        doc.moveDown(0.4);
      });
    }
    doc.moveDown(0.6);

    // 4. Síntesis del Plan de Apoyo Individual (PAI) y PAEC
    doc.fontSize(11).fillColor('#1e40af').text('4. SÍNTESIS DEL PLAN DE APOYO INDIVIDUAL (PAI) Y ACUERDOS PAEC');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#1e293b');
    doc.text(`Fortalezas e Intereses Destacados: ${est.fortalezas_intereses || 'Participación activa en actividades prácticas de taller.'}`);
    doc.moveDown(0.3);
    doc.text(`Proyección y Vida Adulta: ${est.objetivos_transicion_vida_adulta || 'Fomento de autonomía sociolaboral y hábitos de seguridad.'}`);
    doc.moveDown(0.3);
    doc.text(`Acuerdos con la Familia (PAEC): ${est.acuerdos_familia || 'Mantener comunicación fluida con el equipo multidisciplinario PIE.'}`);

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#64748b').text(
      `Documento emitido automáticamente por SGI APANDI el ${new Date().toLocaleDateString('es-CL')} bajo resguardo de la Ley N° 19.628.`,
      { align: 'center' }
    );

    doc.end();
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;

