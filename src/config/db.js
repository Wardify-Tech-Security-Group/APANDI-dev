import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { encryptAES256, createSignatureHash } from '../utils/crypto.aes256.js';

dotenv.config();

if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
  throw new Error('Configuración de base de datos incompleta: defina DB_NAME, DB_USER y DB_PASSWORD en .env');
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  charset: 'utf8mb4',
  multipleStatements: true
});

/**
 * Esquema DDL blindado (17 tablas apx_*) para auto-migración en CI/CD sin depender de volcados .sql en Git
 */
const HARDENED_SCHEMA_DDL = `
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS apx_sec_rbac_perfiles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(40) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    permisos_json JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_sec_cuentas_acceso (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    id_rol INT NOT NULL,
    rut VARCHAR(15) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(30),
    password_hash VARCHAR(255) NOT NULL,
    pin_firma_hash VARCHAR(255) NULL,
    especialidad VARCHAR(100) NULL,
    horas_contrato INT DEFAULT 44,
    activo TINYINT(1) DEFAULT 1,
    ultimo_acceso TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_apx_cuenta_perfil FOREIGN KEY (id_rol) REFERENCES apx_sec_rbac_perfiles(id_rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_sec_trazabilidad_forense (
    id_log BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_estudiante INT NULL,
    modulo VARCHAR(60) NOT NULL,
    accion ENUM('LECTURA', 'CREACION', 'ACTUALIZACION', 'ELIMINACION', 'DESCARGA_PDF', 'ALERTA_SOS', 'FIRMA_DIGITAL') NOT NULL,
    detalle VARCHAR(255) NULL,
    ip_origen VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_apx_forense_usuario FOREIGN KEY (id_usuario) REFERENCES apx_sec_cuentas_acceso(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_rrhh_marcajes_biometricos (
    id_asistencia_personal INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    fecha DATE NOT NULL,
    hora_entrada TIME NULL,
    hora_salida TIME NULL,
    latitud_entrada DECIMAL(10, 7) NULL,
    longitud_entrada DECIMAL(10, 7) NULL,
    metodo_marcaje ENUM('GEOLOCALIZADO', 'BIOMETRICO', 'MANUAL_UTP') DEFAULT 'GEOLOCALIZADO',
    estado ENUM('PRESENTE', 'ATRASO', 'AUSENTE', 'LICENCIA_MEDICA', 'PERMISO_ADMINISTRATIVO') DEFAULT 'PRESENTE',
    observacion VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_apx_marcaje_usuario_dia (id_usuario, fecha),
    CONSTRAINT fk_apx_marcaje_usuario FOREIGN KEY (id_usuario) REFERENCES apx_sec_cuentas_acceso(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_acad_unidades_laborales (
    id_taller INT AUTO_INCREMENT PRIMARY KEY,
    codigo_mineduc VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    nivel_decreto VARCHAR(60) DEFAULT 'Nivel Laboral 1 a 3 (Decreto 83)',
    capacidad_maxima INT DEFAULT 15,
    sala_ubicacion VARCHAR(80),
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_acad_asignacion_equipos (
    id_asignacion INT AUTO_INCREMENT PRIMARY KEY,
    id_taller INT NOT NULL,
    id_usuario INT NOT NULL,
    rol_en_taller ENUM('DOCENTE_TITULAR', 'MONITOR_VOCACIONAL', 'CO_DOCENTE_PIE') NOT NULL,
    anio_escolar YEAR NOT NULL,
    UNIQUE KEY uk_apx_equipo_taller (id_taller, id_usuario, anio_escolar),
    CONSTRAINT fk_apx_eq_taller FOREIGN KEY (id_taller) REFERENCES apx_acad_unidades_laborales(id_taller) ON DELETE CASCADE,
    CONSTRAINT fk_apx_eq_usuario FOREIGN KEY (id_usuario) REFERENCES apx_sec_cuentas_acceso(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_rrhh_bloques_horarios (
    id_horario INT AUTO_INCREMENT PRIMARY KEY,
    id_taller INT NOT NULL,
    id_usuario INT NOT NULL,
    dia_semana TINYINT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    bloque_nombre VARCHAR(100) DEFAULT 'Bloque Taller Práctico',
    CONSTRAINT fk_apx_bloque_taller FOREIGN KEY (id_taller) REFERENCES apx_acad_unidades_laborales(id_taller) ON DELETE CASCADE,
    CONSTRAINT fk_apx_bloque_usuario FOREIGN KEY (id_usuario) REFERENCES apx_sec_cuentas_acceso(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_sys_alertas_utp (
    id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
    id_emisor INT NOT NULL,
    id_destinatario INT NULL,
    tipo ENUM('COMUNICADO_UTP', 'ALERTA_INASISTENCIA', 'ALERTA_SOS', 'RECORDATORIO_FIRMA') DEFAULT 'COMUNICADO_UTP',
    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    leido TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_apx_alerta_emisor FOREIGN KEY (id_emisor) REFERENCES apx_sec_cuentas_acceso(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_fam_tutores_legales (
    id_apoderado INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NULL UNIQUE,
    rut VARCHAR(15) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    parentesco VARCHAR(50) NOT NULL,
    telefono_principal VARCHAR(30) NOT NULL,
    telefono_emergencia VARCHAR(30) NULL,
    email VARCHAR(150) NULL,
    direccion VARCHAR(255) NULL,
    comuna VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_apx_tutor_usuario FOREIGN KEY (id_usuario) REFERENCES apx_sec_cuentas_acceso(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_acad_expedientes_alumnos (
    id_estudiante INT AUTO_INCREMENT PRIMARY KEY,
    rut VARCHAR(15) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    nombre_social VARCHAR(100) NULL,
    fecha_nacimiento DATE NOT NULL,
    genero VARCHAR(30) NULL,
    direccion VARCHAR(255) NULL,
    comuna VARCHAR(100) NULL,
    registro_nacional_discapacidad TINYINT(1) DEFAULT 0,
    porcentaje_discapacidad INT NULL,
    beneficio_junaeb TINYINT(1) DEFAULT 1,
    id_apoderado_titular INT NOT NULL,
    estado_matricula ENUM('REGULAR', 'RETIRADO', 'EGRESADO_PRACTICA', 'SUSPENDIDO') DEFAULT 'REGULAR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_apx_alumno_tutor FOREIGN KEY (id_apoderado_titular) REFERENCES apx_fam_tutores_legales(id_apoderado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_acad_inscripciones_anuales (
    id_matricula INT AUTO_INCREMENT PRIMARY KEY,
    numero_matricula VARCHAR(30) NOT NULL UNIQUE,
    id_estudiante INT NOT NULL,
    id_taller INT NOT NULL,
    anio_escolar YEAR NOT NULL,
    grupo_funcionalidad ENUM('GRUPO_A', 'GRUPO_B') NOT NULL,
    jornada ENUM('MANANA', 'TARDE', 'COMPLETA') DEFAULT 'COMPLETA',
    fecha_incorporacion DATE NOT NULL,
    observaciones_ingreso TEXT NULL,
    UNIQUE KEY uk_apx_inscripcion_anual (id_estudiante, anio_escolar),
    CONSTRAINT fk_apx_insc_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos(id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_apx_insc_taller FOREIGN KEY (id_taller) REFERENCES apx_acad_unidades_laborales(id_taller)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_med_dossier_clinico_enc (
    id_ficha INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL UNIQUE,
    diagnostico_principal_enc TEXT NOT NULL,
    anamnesis_enc TEXT NULL,
    datos_medicos_json JSON NOT NULL,
    sistema_salud ENUM('FONASA', 'ISAPRE', 'PRAIS', 'OTRO') DEFAULT 'FONASA',
    centro_salud_derivacion VARCHAR(150) NULL,
    autoriza_administracion_medicamento TINYINT(1) DEFAULT 0,
    actualizado_por INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_apx_dossier_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos(id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_apx_dossier_autor FOREIGN KEY (actualizado_por) REFERENCES apx_sec_cuentas_acceso(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_conv_protocolos_paec_enc (
    id_paec INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL UNIQUE,
    id_profesional_sos INT NOT NULL,
    id_profesional_suplente INT NULL,
    gatillantes_dec_enc TEXT NOT NULL,
    senales_previas_enc TEXT NOT NULL,
    estrategias_contencion_enc TEXT NOT NULL,
    acuerdos_familia TEXT NOT NULL,
    vigente TINYINT(1) DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_apx_paec_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos(id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_apx_paec_prof_sos FOREIGN KEY (id_profesional_sos) REFERENCES apx_sec_cuentas_acceso(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_pie_planes_apoyo_ind (
    id_pai INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL,
    anio_escolar YEAR NOT NULL,
    fortalezas_intereses TEXT NOT NULL,
    barreras_aprendizaje TEXT NOT NULL,
    estrategias_dua_json JSON NOT NULL,
    apoyos_especialistas_json JSON NOT NULL,
    objetivos_transicion_vida_adulta TEXT NULL,
    id_coordinador_pie INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_apx_pai_anual (id_estudiante, anio_escolar),
    CONSTRAINT fk_apx_pai_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos(id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_apx_pai_coord FOREIGN KEY (id_coordinador_pie) REFERENCES apx_sec_cuentas_acceso(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_pie_adecuaciones_paci (
    id_paci INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL,
    anio_escolar YEAR NOT NULL,
    tipo_adecuacion ENUM('ACCESO', 'OBJETIVOS_APRENDIZAJE', 'TIEMPO_EVALUACION', 'INTEGRAL') DEFAULT 'INTEGRAL',
    criterios_adecuacion_json JSON NOT NULL,
    estrategias_evaluacion_diferenciada TEXT NOT NULL,
    aprobado_utp TINYINT(1) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_apx_paci_anual (id_estudiante, anio_escolar),
    CONSTRAINT fk_apx_paci_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos(id_estudiante) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_ped_leccionario_pid (
    id_clase INT AUTO_INCREMENT PRIMARY KEY,
    id_taller INT NOT NULL,
    id_docente INT NOT NULL,
    fecha_clase DATE NOT NULL,
    unidad_tematica VARCHAR(150) NOT NULL,
    objetivo_aprendizaje VARCHAR(255) NOT NULL,
    actividad_grupo_a TEXT NOT NULL,
    actividad_grupo_b TEXT NOT NULL,
    recursos_dua VARCHAR(255) NULL,
    firmado TINYINT(1) DEFAULT 0,
    hash_firma_electronica VARCHAR(128) NULL,
    fecha_firma TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_apx_pid_taller FOREIGN KEY (id_taller) REFERENCES apx_acad_unidades_laborales(id_taller),
    CONSTRAINT fk_apx_pid_docente FOREIGN KEY (id_docente) REFERENCES apx_sec_cuentas_acceso(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_ped_asistencia_alumnos (
    id_asistencia INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL,
    id_taller INT NOT NULL,
    id_clase INT NULL,
    fecha DATE NOT NULL,
    estado ENUM('PRESENTE', 'AUSENTE', 'ATRASO', 'RETIRADO_ANTICIPADO', 'JUSTIFICADO_MEDICO') NOT NULL,
    observacion VARCHAR(255) NULL,
    registrado_por INT NOT NULL,
    firmado_digitalmente TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_apx_asist_alumno_dia (id_estudiante, fecha),
    CONSTRAINT fk_apx_asist_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos(id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_apx_asist_taller FOREIGN KEY (id_taller) REFERENCES apx_acad_unidades_laborales(id_taller),
    CONSTRAINT fk_apx_asist_autor FOREIGN KEY (registrado_por) REFERENCES apx_sec_cuentas_acceso(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_ped_evaluaciones_decreto83 (
    id_evaluacion INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL,
    id_taller INT NOT NULL,
    id_clase INT NULL,
    semestre TINYINT NOT NULL,
    anio_escolar YEAR NOT NULL,
    indicador_competencia VARCHAR(255) NOT NULL,
    dimension ENUM('TECNICA_VOCACIONAL', 'AUTONOMIA_PERSONAL', 'HABILIDADES_SOCIOLABORALES') DEFAULT 'TECNICA_VOCACIONAL',
    nivel_logro ENUM('LOGRADO', 'EN_DESARROLLO', 'EN_INICIO', 'NO_OBSERVADO') NOT NULL,
    comentario_pedagogico TEXT NULL,
    id_evaluador INT NOT NULL,
    fecha_evaluacion DATE NOT NULL,
    CONSTRAINT fk_apx_eval_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos(id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_apx_eval_taller FOREIGN KEY (id_taller) REFERENCES apx_acad_unidades_laborales(id_taller),
    CONSTRAINT fk_apx_eval_autor FOREIGN KEY (id_evaluador) REFERENCES apx_sec_cuentas_acceso(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_conv_bitacora_sos_enc (
    id_incidencia INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL,
    id_taller INT NULL,
    id_reportante INT NOT NULL,
    id_profesional_interviniente INT NULL,
    tipo_incidencia ENUM('DESREGULACION_LEVE', 'DESREGULACION_MODERADA', 'DESREGULACION_SEVERA_SOS', 'CONVIVENCIA_POSITIVA', 'ACCIDENTE_ESCOLAR') NOT NULL,
    etapa_dec ENUM('ETAPA_1_PREVENCION', 'ETAPA_2_MODERADA', 'ETAPA_3_SEVERA') DEFAULT 'ETAPA_2_MODERADA',
    descripcion_suceso_enc TEXT NOT NULL,
    acciones_aplicadas_paec TEXT NOT NULL,
    notificado_apoderado TINYINT(1) DEFAULT 0,
    estado_alerta ENUM('ACTIVA_EN_AULA', 'EN_CONTENCION', 'RESUELTA') DEFAULT 'RESUELTA',
    fecha_hora_suceso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_hora_cierre TIMESTAMP NULL,
    CONSTRAINT fk_apx_sos_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos(id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_apx_sos_reportante FOREIGN KEY (id_reportante) REFERENCES apx_sec_cuentas_acceso(id_usuario),
    CONSTRAINT fk_apx_sos_interviniente FOREIGN KEY (id_profesional_interviniente) REFERENCES apx_sec_cuentas_acceso(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
`;

/**
 * Inicializa el esquema apx_*, hashes Bcrypt Cost 12 y datos clínicos encriptados con AES-256-GCM real
 */
export async function ensureEncryptedSeedData() {
  const conn = await pool.getConnection();
  try {
    await conn.query(HARDENED_SCHEMA_DDL);

    const initialUserPass = process.env.APP_DEFAULT_USER_PASSWORD || 'Ap4nd1#S3cV4ult!2026_Cl';
    const initialPin = process.env.APP_DEFAULT_SIGNATURE_PIN || '849206';
    const defaultPasswordHash = await bcrypt.hash(initialUserPass, 12);
    const defaultPinHash = await bcrypt.hash(initialPin, 12);

    // 1. Sembrar roles y usuarios si están vacíos (para entornos CI/CD donde no se usa .sql)
    const [rolesCount] = await conn.query('SELECT COUNT(*) AS total FROM apx_sec_rbac_perfiles');
    if (rolesCount[0].total === 0) {
      await conn.query(`
        INSERT INTO apx_sec_rbac_perfiles (id_rol, codigo, nombre, descripcion, permisos_json) VALUES
        (1, 'ADMIN', 'Administrador del Sistema', 'Control total de usuarios, seguridad y configuración SGI', '{"seguridad": "rw", "rrhh": "rw", "estudiantes": "rw", "pedagogico": "rw", "clinico": "r", "paec": "r", "auditoria": "r"}'),
        (2, 'DIRECTOR_UTP', 'Director / Jefe UTP', 'Supervisión curricular, horarios, alertas de asistencia y acceso total a expedientes', '{"seguridad": "r", "rrhh": "rw", "estudiantes": "rw", "pedagogico": "rw", "clinico": "rw", "paec": "rw", "auditoria": "r"}'),
        (3, 'DOCENTE', 'Docente / Profesor Titular Ed. Diferencial', 'Gestión de Libro Digital, PID, evaluaciones y lectura de ficha clínica/PAEC', '{"rrhh": "r", "estudiantes": "r", "pedagogico": "rw", "clinico": "r", "paec": "rw"}'),
        (4, 'MONITOR', 'Monitor Vocacional de Taller', 'Co-enseñanza laboral, registro de actividades prácticas y botón SOS', '{"rrhh": "r", "estudiantes": "r", "pedagogico": "rw", "clinico": "none", "paec": "r"}'),
        (5, 'ESPECIALISTA_PIE', 'Especialista PIE (Equipo Multidisciplinario)', 'Gestión clínica, Anamnesis, PAI, PACI, PAEC y recepción de alertas SOS', '{"rrhh": "r", "estudiantes": "r", "pedagogico": "r", "clinico": "rw", "paec": "rw"}'),
        (6, 'APODERADO', 'Apoderado / Familia', 'Vista de solo lectura: asistencia, logros cualitativos, acuerdos PAEC e Informe Familia', '{"portal_apoderado": "r"}');
      `);
    }

    const [usersCount] = await conn.query('SELECT COUNT(*) AS total FROM apx_sec_cuentas_acceso');
    if (usersCount[0].total === 0) {
      await conn.query(
        `INSERT INTO apx_sec_cuentas_acceso (id_usuario, id_rol, rut, nombres, apellidos, email, telefono, password_hash, pin_firma_hash, especialidad) VALUES
         (1, 1, '15432198-K', 'Roberto', 'Soto Valdés', 'admin@apandi.cl', '+56981112233', ?, ?, 'Ingeniero Informático'),
         (2, 2, '13876543-2', 'Marcela', 'Rojas Contreras', 'utp@apandi.cl', '+56982223344', ?, ?, 'Directora / Jefe UTP'),
         (3, 3, '17654321-8', 'Carolina', 'Muñoz Tapia', 'cmunoz@apandi.cl', '+56983334455', ?, ?, 'Educadora Diferencial Mención DI'),
         (4, 4, '16543210-9', 'Jorge', 'Fuentes Bravo', 'jfuentes@apandi.cl', '+56984445566', ?, ?, 'Maestro Sastre / Monitor Vocacional'),
         (5, 5, '18234567-1', 'Camila', 'Vargas Herrera', 'cvargas.pie@apandi.cl', '+56985556677', ?, ?, 'Psicóloga Educacional / Coordinadora PAEC'),
         (6, 6, '12345678-5', 'Patricia', 'Gómez Díaz', 'pgomez.familia@gmail.com', '+56986667788', ?, NULL, NULL)`,
        [
          defaultPasswordHash, defaultPinHash,
          defaultPasswordHash, defaultPinHash,
          defaultPasswordHash, defaultPinHash,
          defaultPasswordHash, defaultPinHash,
          defaultPasswordHash, defaultPinHash,
          defaultPasswordHash
        ]
      );

      await conn.query(`
        INSERT INTO apx_acad_unidades_laborales (id_taller, codigo_mineduc, nombre, nivel_decreto, capacidad_maxima, sala_ubicacion) VALUES
        (1, 'TL-CORTE-01', 'Taller Laboral de Corte y Confección Textil', 'Nivel Laboral 2 (Decreto 83)', 12, 'Pabellón Técnico - Sala T1'),
        (2, 'TL-GASTRO-02', 'Taller Laboral de Gastronomía y Panadería', 'Nivel Laboral 1 y 2 (Decreto 83)', 14, 'Cocina Pedagógica Equipada'),
        (3, 'TL-HORTI-03', 'Taller Laboral de Horticultura y Vivero', 'Nivel Laboral 3 (Decreto 83)', 15, 'Invernadero Institucional');

        INSERT INTO apx_acad_asignacion_equipos (id_taller, id_usuario, rol_en_taller, anio_escolar) VALUES
        (1, 3, 'DOCENTE_TITULAR', 2026),
        (1, 4, 'MONITOR_VOCACIONAL', 2026),
        (1, 5, 'CO_DOCENTE_PIE', 2026);

        INSERT INTO apx_rrhh_bloques_horarios (id_taller, id_usuario, dia_semana, hora_inicio, hora_fin, bloque_nombre) VALUES
        (1, 3, 1, '08:30:00', '11:30:00', 'Módulo Práctico Patronaje y Costura (Grupo A/B)'),
        (1, 3, 2, '08:30:00', '11:30:00', 'Módulo Habilidades Sociolaborales y Seguridad'),
        (1, 3, 3, '08:30:00', '13:00:00', 'Producción Textil Colaborativa y Control de Calidad'),
        (1, 3, 4, '08:30:00', '11:30:00', 'Autonomía Funcional y Cálculo Aplicado a Taller'),
        (1, 3, 5, '08:30:00', '12:30:00', 'Evaluación Semanal de Logros y Co-enseñanza PIE');

        INSERT INTO apx_fam_tutores_legales (id_apoderado, id_usuario, rut, nombres, apellidos, parentesco, telefono_principal, telefono_emergencia, email, direccion, comuna) VALUES
        (1, 6, '12345678-5', 'Patricia', 'Gómez Díaz', 'Madre', '+56986667788', '+56991122334', 'pgomez.familia@gmail.com', 'Av. Los Pajaritos 3450, Depto 402', 'Maipú'),
        (2, NULL, '11987654-3', 'Héctor', 'Silva Morales', 'Padre', '+56977665544', '+56966554433', 'hsilva@correo.cl', 'Pasaje El Roble 128', 'Cerrillos');

        INSERT INTO apx_acad_expedientes_alumnos (id_estudiante, rut, nombres, apellidos, fecha_nacimiento, genero, direccion, comuna, registro_nacional_discapacidad, porcentaje_discapacidad, id_apoderado_titular, estado_matricula) VALUES
        (1, '22345678-9', 'Matías Ignacio', 'Vera Gómez', '2007-05-14', 'Masculino', 'Av. Los Pajaritos 3450, Depto 402', 'Maipú', 1, 65, 1, 'REGULAR'),
        (2, '23456789-0', 'Valentina Paz', 'Silva Espinoza', '2008-09-22', 'Femenino', 'Pasaje El Roble 128', 'Cerrillos', 1, 50, 2, 'REGULAR'),
        (3, '21987321-4', 'Benjamín Alonso', 'Castro Riquelme', '2006-11-03', 'Masculino', 'Av. Central 890', 'Maipú', 1, 70, 1, 'REGULAR');

        INSERT INTO apx_acad_inscripciones_anuales (numero_matricula, id_estudiante, id_taller, anio_escolar, grupo_funcionalidad, jornada, fecha_incorporacion, observaciones_ingreso) VALUES
        ('MAT-2026-001', 1, 1, 2026, 'GRUPO_B', 'COMPLETA', '2026-03-02', 'Estudiante con TEA y DI Moderada. Requiere apoyos visuales anticipatorios (Grupo B: Mayor apoyo).'),
        ('MAT-2026-002', 2, 1, 2026, 'GRUPO_A', 'COMPLETA', '2026-03-02', 'Estudiante con DI Leve. Alta destreza motriz fina en máquina recta (Grupo A: Más funcional).'),
        ('MAT-2026-003', 3, 1, 2026, 'GRUPO_A', 'COMPLETA', '2026-03-02', 'Estudiante con proyección a práctica laboral dual en taller externo (Grupo A: Más funcional).');

        INSERT INTO apx_sys_alertas_utp (id_emisor, id_destinatario, tipo, titulo, mensaje) VALUES
        (2, NULL, 'COMUNICADO_UTP', 'Cierre de Planificaciones PID y Revisión PACI Semestral', 'Estimado equipo docente y PIE: Se recuerda validar y firmar con PIN electrónico las clases registradas en el Libro Digital antes del viernes a las 14:00 hrs.');
      `);
    } else {
      await conn.query(
        'UPDATE apx_sec_cuentas_acceso SET password_hash = ?, pin_firma_hash = CASE WHEN id_rol = 6 THEN NULL ELSE ? END WHERE id_usuario <= 6',
        [defaultPasswordHash, defaultPinHash]
      );
    }

    // 2. Sembrar Fichas Clínicas encriptadas (AES-256) si aún no existen
    const [fichas] = await conn.query('SELECT COUNT(*) AS total FROM apx_med_dossier_clinico_enc');
    if (fichas[0].total === 0) {
      await conn.query(
        `INSERT INTO apx_med_dossier_clinico_enc 
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
    const [paecs] = await conn.query('SELECT COUNT(*) AS total FROM apx_conv_protocolos_paec_enc');
    if (paecs[0].total === 0) {
      await conn.query(
        `INSERT INTO apx_conv_protocolos_paec_enc 
        (id_estudiante, id_profesional_sos, id_profesional_suplente, gatillantes_dec_enc, senales_previas_enc, estrategias_contencion_enc, acuerdos_familia)
        VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)`,
        [
          1,
          5,
          2,
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
    const [pais] = await conn.query('SELECT COUNT(*) AS total FROM apx_pie_planes_apoyo_ind');
    if (pais[0].total === 0) {
      await conn.query(
        `INSERT INTO apx_pie_planes_apoyo_ind 
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
        `INSERT INTO apx_pie_adecuaciones_paci (id_estudiante, anio_escolar, tipo_adecuacion, criterios_adecuacion_json, estrategias_evaluacion_diferenciada, aprobado_utp)
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
    const [clases] = await conn.query('SELECT COUNT(*) AS total FROM apx_ped_leccionario_pid');
    if (clases[0].total === 0) {
      const hashFirma = createSignatureHash({ idClase: 1, idDocente: 3, fechaClase: '2026-11-05', pin: initialPin });
      await conn.query(
        `INSERT INTO apx_ped_leccionario_pid 
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

      await conn.query(
        `INSERT INTO apx_ped_asistencia_alumnos (id_estudiante, id_taller, id_clase, fecha, estado, observacion, registrado_por, firmado_digitalmente)
         VALUES 
         (1, 1, 1, CURDATE(), 'PRESENTE', 'Ingresa tranquilo con sus audífonos reductores de ruido.', 3, 1),
         (2, 1, 1, CURDATE(), 'PRESENTE', 'Excelente disposición al trabajo en máquina recta.', 3, 1),
         (3, 1, 1, CURDATE(), 'AUSENTE', 'Acumula 3ra inasistencia consecutiva sin certificado médico.', 3, 1)`
      );

      await conn.query(
        `INSERT INTO apx_ped_evaluaciones_decreto83 (id_estudiante, id_taller, id_clase, semestre, anio_escolar, indicador_competencia, dimension, nivel_logro, comentario_pedagogico, id_evaluador, fecha_evaluacion)
         VALUES 
         (1, 1, 1, 2, 2026, 'Utiliza elementos de protección personal (EPP) y respeta normas de seguridad en el taller', 'AUTONOMIA_PERSONAL', 'LOGRADO', 'Utiliza su delantal de mezclilla de forma autónoma al iniciar la jornada.', 3, CURDATE()),
         (1, 1, 1, 2, 2026, 'Ejecuta secuencia de fijación de moldes textiles con apoyos visuales (Grupo B)', 'TECNICA_VOCACIONAL', 'EN_DESARROLLO', 'Logra fijar 3 de los 4 bordes utilizando clips ergonómicos con mediación verbal mínima.', 3, CURDATE()),
         (1, 1, 1, 2, 2026, 'Solicita ayuda o pausa activa utilizando apoyos comunicativos cuando siente sobrecarga', 'HABILIDADES_SOCIOLABORALES', 'LOGRADO', 'Entrega tarjeta de pausa activa antes de presentar frustración.', 5, CURDATE()),
         (2, 1, 1, 2, 2026, 'Opera máquina de coser recta manteniendo línea de costura y control de pedal (Grupo A)', 'TECNICA_VOCACIONAL', 'LOGRADO', 'Costura prolija y cumplimiento de estándares de taller laboral.', 3, CURDATE())`
      );
    }

    console.log('✅ [MariaDB / Ley 19.628] Esquema blindado apx_* verificado y datos clínicos encriptados en AES-256-GCM listos.');
  } catch (err) {
    console.error('⚠️ Error inicializando esquema blindado apx_*:', err.message);
    throw err;
  } finally {
    conn.release();
  }
}
