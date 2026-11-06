import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { encryptAES256, createSignatureHash } from '../utils/crypto.aes256.js';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'apandi_user',
  password: process.env.DB_PASSWORD || 'apandi_pass_2026',
  database: process.env.DB_NAME || 'sgi_apandi',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  charset: 'utf8mb4'
});

/**
 * Inicializa datos clínicos y pedagógicos encriptados con AES-256-GCM real
 * y asegura contraseñas bcrypt válidas para los usuarios semilla
 */
export async function ensureEncryptedSeedData() {
  const conn = await pool.getConnection();
  try {
    // 1. Asegurar hash bcrypt real para "Apandi2026!" en usuarios de prueba
    const defaultPasswordHash = await bcrypt.hash('Apandi2026!', 10);
    await conn.query('UPDATE Usuarios SET password_hash = ? WHERE id_usuario <= 6', [defaultPasswordHash]);

    // 2. Sembrar Fichas Clínicas encriptadas (AES-256) si aún no existen
    const [fichas] = await conn.query('SELECT COUNT(*) AS total FROM Ficha_Clinica');
    if (fichas[0].total === 0) {
      await conn.query(
        `INSERT INTO Ficha_Clinica 
        (id_estudiante, diagnostico_principal_enc, anamnesis_enc, datos_medicos_json, sistema_salud, centro_salud_derivacion, autoriza_administracion_medicamento, actualizado_por)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          1,
          encryptAES256('Trastorno del Espectro Autista (TEA Nivel 2) concomitante con Discapacidad Intelectual Moderada (Decreto 170).'),
          encryptAES256('Parto a término sin complicaciones. Diagnóstico temprano a los 3 años. Hipersensibilidad auditiva a ruidos de motores industriales. Excelente memoria visual y adherencia a rutinas pictográficas.'),
          JSON.stringify({
            medicamentos: [
              { nombre: 'Risperidona', dosis: '1 mg', horario: '08:00 y 20:00 hrs', en_colegio: false },
              { nombre: 'Melatonina', dosis: '3 mg', horario: '21:30 hrs', en_colegio: false }
            ],
            alergias: ['Penicilina', 'Polvo textil sintético en alta concentración'],
            antecedentes_convulsivos: 'Sin crisis epilépticas activas desde 2022',
            contacto_medico: 'Dr. Andrés Molina - Neurólogo CESFAM / CRS Maipú'
          }),
          'FONASA',
          'CRS Maipú / COSAM',
          1,
          5,
          2,
          encryptAES256('Discapacidad Intelectual Leve (CI 64 - WISC-V). Alta competencia adaptativa en taller práctico.'),
          encryptAES256('Desarrollo motor acorde a su edad cronológica. Escolaridad previa en escuela especial con tránsito a nivel laboral en 2025.'),
          JSON.stringify({
            medicamentos: [],
            alergias: ['Ninguna conocida'],
            antecedentes_convulsivos: 'No presenta',
            contacto_medico: 'Control sano anual CESFAM Cerrillos'
          }),
          'FONASA',
          'CESFAM Norman Voullieme',
          0,
          5
        ]
      );
    }

    // 3. Sembrar Planes PAEC encriptados con Profesional SOS asignado
    const [paecs] = await conn.query('SELECT COUNT(*) AS total FROM PAEC');
    if (paecs[0].total === 0) {
      await conn.query(
        `INSERT INTO PAEC 
        (id_estudiante, id_profesional_sos, id_profesional_suplente, gatillantes_dec_enc, senales_previas_enc, estrategias_contencion_enc, acuerdos_familia)
        VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)`,
        [
          1,
          5, // Camila Vargas (Psicóloga PIE)
          2, // Marcela Rojas (UTP)
          encryptAES256('1. Ruido súbito de máquinas overlock o timbres prolongados. 2. Cambios abruptos de actividad sin anticipación pictográfica. 3. Frustración cuando se rompe el hilo de costura.'),
          encryptAES256('Se cubre los oídos con ambas manos, balanceo corporal (rocking), verbalización repetitiva y aumento del tono de voz.'),
          encryptAES256('ETAPA 1: Entregar audífonos con cancelación de ruido y ofrecer pausa activa en rincón de calma. ETAPA 2: Retirar estímulo sonoro, hablar con frases cortas y tono bajo. ETAPA 3 (SOS): Activar Botón SOS para acompañamiento de Psicóloga Camila Vargas hacia Sala Sensorial.'),
          'La familia se compromete a informar al ingreso si Matías tuvo alteraciones del sueño la noche anterior y enviar sus audífonos reductores de ruido diariamente.',
          2,
          5,
          3,
          encryptAES256('Presión por tiempos de entrega o críticas directas frente a sus compañeros de taller.'),
          encryptAES256('Silencio prolongado, aislamiento en su puesto de trabajo y negativa a continuar la tarea.'),
          encryptAES256('Validar su emoción en privado, dividir la tarea de confección en 2 pasos cortos y reforzar positivamente sus avances.'),
          'Apoderado reforzará en casa la tolerancia a la frustración y asistirá a reuniones bimensuales con el equipo PIE.'
        ]
      );
    }

    // 4. Sembrar PAI (Estrategias DUA en JSON) y PACI
    const [pais] = await conn.query('SELECT COUNT(*) AS total FROM PAI');
    if (pais[0].total === 0) {
      await conn.query(
        `INSERT INTO PAI 
        (id_estudiante, anio_escolar, fortalezas_intereses, barreras_aprendizaje, estrategias_dua_json, apoyos_especialistas_json, objetivos_transicion_vida_adulta, id_coordinador_pie)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          1,
          2026,
          'Excelente percepción visual para clasificar telas por textura y color. Alto interés por el orden de herramientas y secuencias estructuradas.',
          'Barreras sensoriales auditivas en entornos ruidosos y necesidad de mediación paso a paso en tareas motrices bimanuales complejas.',
          JSON.stringify({
            implicacion: 'Tablero de economía de fichas vocacional y elección de rol dentro de la línea de producción textil.',
            representacion: 'Secuencias pictográficas ARASAAC plastificadas en cada estación de trabajo del taller.',
            accion_expresion: 'Uso de plantillas de corte con topes físicos de seguridad y evaluación mediante demostración práctica.'
          }),
          JSON.stringify({
            psicologia: 'Autorregulación emocional y reconocimiento de señales corporales previas a DEC (1 sesión semanal).',
            terapia_ocupacional: 'Integración sensorial, adaptación de tijeras ergonómicas con retorno automático y praxis fina.',
            fonoaudiologia: 'Comunicación funcional en contextos laborales: pedir ayuda y reportar término de tarea.'
          }),
          'Desarrollar hábitos laborales de puntualidad, uso autónomo de EPP (delantal y antiparras) y trabajo colaborativo en taller protegido.',
          5
        ]
      );

      await conn.query(
        `INSERT INTO PACI (id_estudiante, anio_escolar, tipo_adecuacion, criterios_adecuacion_json, estrategias_evaluacion_diferenciada, aprobado_utp)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          1,
          2026,
          'INTEGRAL',
          JSON.stringify({
            acceso: 'Puesto de trabajo ubicado lejos del motor compresor, uso permanente de protectores auditivos y guía visual paso a paso.',
            objetivos_aprendizaje: 'Graduación de complejidad: realiza el marcado con molde rígido y unión por termofusión/hilván asistido (Grupo B).'
          }),
          'Rúbrica de observación directa en situaciones reales de taller, sin límite de tiempo estricto y con modelado previo.',
          1
        ]
      );
    }

    // 5. Sembrar Clases PID (Grupo A / Grupo B), Asistencia y Evaluaciones Cualitativas
    const [clases] = await conn.query('SELECT COUNT(*) AS total FROM PID_Clases');
    if (clases[0].total === 0) {
      const hashFirma = createSignatureHash({ idClase: 1, idDocente: 3, fechaClase: '2026-11-05', pin: '1234' });
      await conn.query(
        `INSERT INTO PID_Clases 
        (id_taller, id_docente, fecha_clase, unidad_tematica, objetivo_aprendizaje, actividad_grupo_a, actividad_grupo_b, recursos_dua, firmado, hash_firma_electronica, fecha_firma)
        VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, 1, ?, NOW())`,
        [
          1,
          3,
          'Unidad 3: Confección de Pecheras de Trabajo y Seguridad en Taller',
          'OA Laboral 04: Ejecutar procesos de trazado, corte y unión textil aplicando normas de prevención de riesgos.',
          'GRUPO A (Mayor Funcionalidad): Trazan molde de pechera sobre tela gabardina, cortan con tijera sastre y realizan costura recta de bastilla en máquina industrial bajo supervisión.',
          'GRUPO B (Mayor Apoyo): Seleccionan piezas pre-marcadas con plantillas rígidas de alto contraste, fijan con clips de seguridad (sin alfileres punzantes) y clasifican insumos por color.',
          'Moldes acrílicos con textura táctil, pictogramas de secuencia de 4 pasos, tijeras ergonómicas asistidas y video demostrativo.',
          hashFirma
        ]
      );

      // Asistencia y Evaluaciones de muestra
      await conn.query(
        `INSERT INTO Asistencia_Estudiantes (id_estudiante, id_taller, id_clase, fecha, estado, observacion, registrado_por, firmado_digitalmente)
         VALUES 
         (1, 1, 1, CURDATE(), 'PRESENTE', 'Ingresa tranquilo con sus audífonos reductores de ruido.', 3, 1),
         (2, 1, 1, CURDATE(), 'PRESENTE', 'Excelente disposición al trabajo en máquina recta.', 3, 1),
         (3, 1, 1, CURDATE(), 'AUSENTE', 'Acumula 3ra inasistencia consecutiva sin certificado médico.', 3, 1)`
      );

      await conn.query(
        `INSERT INTO Evaluaciones_Logros (id_estudiante, id_taller, id_clase, semestre, anio_escolar, indicador_competencia, dimension, nivel_logro, comentario_pedagogico, id_evaluador, fecha_evaluacion)
         VALUES 
         (1, 1, 1, 2, 2026, 'Utiliza elementos de protección personal (EPP) y respeta normas de seguridad en el taller', 'AUTONOMIA_PERSONAL', 'LOGRADO', 'Utiliza su delantal de mezclilla de forma autónoma al iniciar la jornada.', 3, CURDATE()),
         (1, 1, 1, 2, 2026, 'Ejecuta secuencia de fijación de moldes textiles con apoyos visuales (Grupo B)', 'TECNICA_VOCACIONAL', 'EN_DESARROLLO', 'Logra fijar 3 de los 4 bordes utilizando clips ergonómicos con mediación verbal mínima.', 3, CURDATE()),
         (1, 1, 1, 2, 2026, 'Solicita ayuda o pausa activa utilizando apoyos comunicativos cuando siente sobrecarga', 'HABILIDADES_SOCIOLABORALES', 'LOGRADO', 'Entrega tarjeta de pausa activa antes de presentar frustración.', 5, CURDATE()),
         (2, 1, 1, 2, 2026, 'Opera máquina de coser recta manteniendo línea de costura y control de pedal (Grupo A)', 'TECNICA_VOCACIONAL', 'LOGRADO', 'Costura prolija y cumplimiento de estándares de taller laboral.', 3, CURDATE())`
      );
    }

    console.log('✅ [MariaDB / Ley 19.628] Base de datos verificada y datos clínicos encriptados en AES-256-GCM listos.');
  } catch (err) {
    console.error('⚠️ Error inicializando datos semilla encriptados:', err.message);
  } finally {
    conn.release();
  }
}

