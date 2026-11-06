import cron from 'node-cron';
import { pool } from '../config/db.js';

/**
 * Evalúa si existen alumnos o funcionarios con inasistencias acumuladas
 * y genera automáticamente alertas para UTP / Convivencia Escolar.
 */
export async function checkConsecutiveAbsences() {
  try {
    // 1. Buscar estudiantes con ausencias recientes sin justificar
    const [studentAbsences] = await pool.query(`
      SELECT 
        e.id_estudiante,
        CONCAT(e.nombres, ' ', e.apellidos) AS estudiante,
        t.nombre AS taller,
        COUNT(a.id_asistencia) AS total_ausencias
      FROM Asistencia_Estudiantes a
      INNER JOIN Estudiantes e ON a.id_estudiante = e.id_estudiante
      INNER JOIN Talleres t ON a.id_taller = t.id_taller
      WHERE a.estado = 'AUSENTE'
        AND a.fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY e.id_estudiante, e.nombres, e.apellidos, t.nombre
      HAVING COUNT(a.id_asistencia) >= 1
    `);

    for (const row of studentAbsences) {
      const titulo = `Alerta de Inasistencia Estudiantil: ${row.estudiante}`;
      const [existing] = await pool.query(
        `SELECT id_notificacion FROM Notificaciones_UTP 
         WHERE tipo = 'ALERTA_INASISTENCIA' AND titulo = ? AND DATE(created_at) = CURDATE()`,
        [titulo]
      );

      if (existing.length === 0) {
        await pool.query(
          `INSERT INTO Notificaciones_UTP (id_emisor, id_destinatario, tipo, titulo, mensaje)
           VALUES (2, NULL, 'ALERTA_INASISTENCIA', ?, ?)`,
          [
            titulo,
            `El estudiante ${row.estudiante} (${row.taller}) registra inasistencia activa. Se solicita a Convivencia Escolar / Docente Titular contactar al apoderado según protocolo MINEDUC de retención escolar.`
          ]
        );
      }
    }
    return studentAbsences;
  } catch (error) {
    console.error('[Workflow Alertas Inasistencia] Error:', error.message);
    return [];
  }
}

/**
 * Inicializa el Cron Job diario (Lunes a Viernes a las 10:00 AM hora de Chile)
 */
export function startAttendanceAlertCron() {
  cron.schedule('0 10 * * 1-5', async () => {
    console.log('⏰ [Cron SGI] Ejecutando barrido automático de inasistencias...');
    await checkConsecutiveAbsences();
  });
}

