import { pool } from '../config/db.js';

/**
 * Registra en la tabla Logs_Auditoria cualquier acceso o modificación a datos sensibles
 * Cumplimiento de trazabilidad exigido por la Ley 19.628 de Protección de la Vida Privada
 */
export async function logClinicalAudit({
  idUsuario,
  idEstudiante = null,
  modulo,
  accion,
  detalle = '',
  req = null
}) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : 'SISTEMA';
    const userAgent = req ? (req.headers['user-agent'] || 'SGI-Client').substring(0, 250) : 'CRON/INTERNAL';

    await pool.query(
      `INSERT INTO Logs_Auditoria (id_usuario, id_estudiante, modulo, accion, detalle, ip_origen, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [idUsuario, idEstudiante, modulo, accion, detalle, ip, userAgent]
    );
  } catch (error) {
    console.error('[Auditoría Ley 19.628] Error al registrar log:', error.message);
  }
}

