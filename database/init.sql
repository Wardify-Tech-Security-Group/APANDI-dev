-- =============================================================================
-- SISTEMA DE GESTIÓN INSTITUCIONAL (SGI) - APANDI (ESQUEMA BLINDADO v3.0)
-- Base de Datos Relacional MariaDB / MySQL
-- Normativa: MINEDUC Chile (Decreto 83, Decreto 170, Ley 19.628 Protección Datos)
-- NOTA DE SEGURIDAD: Nombres de tablas (apx_*), claves foráneas y hashes rotados.
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '-03:00';
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- 1. MÓDULO DE SEGURIDAD, USUARIOS (RBAC) Y AUDITORÍA FORENSE (LEY 19.628)
-- =============================================================================

CREATE TABLE IF NOT EXISTS apx_sec_rbac_perfiles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(40) NOT NULL UNIQUE COMMENT 'ADMIN, DIRECTOR_UTP, DOCENTE, MONITOR, ESPECIALISTA_PIE, APODERADO',
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    permisos_json JSON NOT NULL COMMENT 'Permisos granulares por módulo (lectura/escritura)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_sec_cuentas_acceso (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    id_rol INT NOT NULL,
    rut VARCHAR(15) NOT NULL UNIQUE COMMENT 'RUT chileno formato 12345678-9',
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(30),
    password_hash VARCHAR(255) NOT NULL COMMENT 'Hash Bcrypt Cost 12',
    pin_firma_hash VARCHAR(255) NULL COMMENT 'Hash Bcrypt Cost 12 del PIN de 6 dígitos para Firma Electrónica Simple',
    especialidad VARCHAR(100) NULL COMMENT 'Ej: Ed. Diferencial, Psicólogo, Terapeuta Ocupacional, Fonoaudiólogo',
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
    modulo VARCHAR(60) NOT NULL COMMENT 'FICHA_CLINICA, PAI, PACI, PAEC, LIBRO_CLASES, GENERADOR_PDF',
    accion ENUM('LECTURA', 'CREACION', 'ACTUALIZACION', 'ELIMINACION', 'DESCARGA_PDF', 'ALERTA_SOS', 'FIRMA_DIGITAL') NOT NULL,
    detalle VARCHAR(255) NULL,
    ip_origen VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_apx_forense_usuario FOREIGN KEY (id_usuario) REFERENCES apx_sec_cuentas_acceso(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 2. MÓDULO PORTAL DOCENTE / RRHH Y UNIDADES DE TALLERES LABORALES
-- =============================================================================

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
    nombre VARCHAR(120) NOT NULL COMMENT 'Ej: Corte y Confección, Gastronomía, Horticultura, Mantenimiento',
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
    dia_semana TINYINT NOT NULL COMMENT '1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes',
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    bloque_nombre VARCHAR(100) DEFAULT 'Bloque Taller Práctico',
    CONSTRAINT fk_apx_bloque_taller FOREIGN KEY (id_taller) REFERENCES apx_acad_unidades_laborales(id_taller) ON DELETE CASCADE,
    CONSTRAINT fk_apx_bloque_usuario FOREIGN KEY (id_usuario) REFERENCES apx_sec_cuentas_acceso(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_sys_alertas_utp (
    id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
    id_emisor INT NOT NULL,
    id_destinatario INT NULL COMMENT 'NULL = Comunicado para todo el equipo docente',
    tipo ENUM('COMUNICADO_UTP', 'ALERTA_INASISTENCIA', 'ALERTA_SOS', 'RECORDATORIO_FIRMA') DEFAULT 'COMUNICADO_UTP',
    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    leido TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_apx_alerta_emisor FOREIGN KEY (id_emisor) REFERENCES apx_sec_cuentas_acceso(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. MÓDULO ADMINISTRATIVO Y CONTROL ESTUDIANTIL
-- =============================================================================

CREATE TABLE IF NOT EXISTS apx_fam_tutores_legales (
    id_apoderado INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NULL UNIQUE COMMENT 'Vínculo con cuenta de acceso al Portal Apoderados',
    rut VARCHAR(15) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    parentesco VARCHAR(50) NOT NULL COMMENT 'Madre, Padre, Tutor Legal, Cuidador',
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
    registro_nacional_discapacidad TINYINT(1) DEFAULT 0 COMMENT 'Posee credencial RND / COMPIN',
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
    grupo_funcionalidad ENUM('GRUPO_A', 'GRUPO_B') NOT NULL COMMENT 'GRUPO_A: Más funcional / GRUPO_B: Mayor apoyo',
    jornada ENUM('MANANA', 'TARDE', 'COMPLETA') DEFAULT 'COMPLETA',
    fecha_incorporacion DATE NOT NULL,
    observaciones_ingreso TEXT NULL,
    UNIQUE KEY uk_apx_inscripcion_anual (id_estudiante, anio_escolar),
    CONSTRAINT fk_apx_insc_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos(id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_apx_insc_taller FOREIGN KEY (id_taller) REFERENCES apx_acad_unidades_laborales(id_taller)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 4. MÓDULO CLÍNICO, PIE Y CONVIVENCIA ESCOLAR (PAEC) - ENCRIPTADO LEY 19.628
-- =============================================================================

CREATE TABLE IF NOT EXISTS apx_med_dossier_clinico_enc (
    id_ficha INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL UNIQUE,
    diagnostico_principal_enc TEXT NOT NULL COMMENT 'Cifrado AES-256-GCM (Decreto 170: DI Leve/Moderada, TEA, Multidéficit, etc.)',
    anamnesis_enc TEXT NULL COMMENT 'Cifrado AES-256-GCM (Historia evolutiva, gestacional y familiar)',
    datos_medicos_json JSON NOT NULL COMMENT 'Estructura JSON con medicamentos, dosis, horarios, alergias, crisis epilépticas (valores sensibles cifrados)',
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
    id_profesional_sos INT NOT NULL COMMENT 'Profesional designado que recibe alerta inmediata del Botón SOS en Aula',
    id_profesional_suplente INT NULL,
    gatillantes_dec_enc TEXT NOT NULL COMMENT 'Cifrado AES-256: Factores o estímulos que desencadenan desregulación (ruido, frustración, cambios)',
    senales_previas_enc TEXT NOT NULL COMMENT 'Cifrado AES-256: Indicadores conductuales iniciales antes de crisis severa',
    estrategias_contencion_enc TEXT NOT NULL COMMENT 'Cifrado AES-256: Protocolo de intervención etapa 1, 2 y 3 (Decreto 83 / Orientaciones DEC MINEDUC)',
    acuerdos_familia TEXT NOT NULL COMMENT 'Visible en Portal Apoderados: Acuerdos y compromisos de co-responsabilidad con el hogar',
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
    estrategias_dua_json JSON NOT NULL COMMENT 'JSON con estrategias DUA (Múltiples formas de Implicación, Representación, Acción y Expresión)',
    apoyos_especialistas_json JSON NOT NULL COMMENT 'JSON con objetivos e intervenciones de Psicología, Fonoaudiología, T.O. y Ed. Diferencial',
    objetivos_transicion_vida_adulta TEXT NULL COMMENT 'Habilidades sociolaborales y autonomía comunitaria',
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
    criterios_adecuacion_json JSON NOT NULL COMMENT 'Adecuaciones de acceso (comunicación aumentativa, mobiliario) y adecuaciones a OA laborales',
    estrategias_evaluacion_diferenciada TEXT NOT NULL,
    aprobado_utp TINYINT(1) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_apx_paci_anual (id_estudiante, anio_escolar),
    CONSTRAINT fk_apx_paci_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos(id_estudiante) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 5. MÓDULO PEDAGÓGICO (LIBRO DE CLASES DIGITAL - DECRETO 83)
-- =============================================================================

CREATE TABLE IF NOT EXISTS apx_ped_leccionario_pid (
    id_clase INT AUTO_INCREMENT PRIMARY KEY,
    id_taller INT NOT NULL,
    id_docente INT NOT NULL,
    fecha_clase DATE NOT NULL,
    unidad_tematica VARCHAR(150) NOT NULL,
    objetivo_aprendizaje VARCHAR(255) NOT NULL,
    actividad_grupo_a TEXT NOT NULL COMMENT 'Actividad diversificada Grupo A (Mayor funcionalidad / autonomía laboral)',
    actividad_grupo_b TEXT NOT NULL COMMENT 'Actividad diversificada Grupo B (Mayor apoyo / modelado paso a paso)',
    recursos_dua VARCHAR(255) NULL,
    firmado TINYINT(1) DEFAULT 0 COMMENT 'Validación con Firma Electrónica Simple (PIN/Token)',
    hash_firma_electronica VARCHAR(128) NULL COMMENT 'Sello SHA-256 de la clase firmada',
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
    semestre TINYINT NOT NULL COMMENT '1 o 2',
    anio_escolar YEAR NOT NULL,
    indicador_competencia VARCHAR(255) NOT NULL COMMENT 'Ej: Utiliza herramientas de corte respetando normas de higiene y seguridad',
    dimension ENUM('TECNICA_VOCACIONAL', 'AUTONOMIA_PERSONAL', 'HABILIDADES_SOCIOLABORALES') DEFAULT 'TECNICA_VOCACIONAL',
    nivel_logro ENUM('LOGRADO', 'EN_DESARROLLO', 'EN_INICIO', 'NO_OBSERVADO') NOT NULL COMMENT 'Escala cualitativa Decreto 83',
    comentario_pedagogico TEXT NULL,
    id_evaluador INT NOT NULL,
    fecha_evaluacion DATE NOT NULL,
    CONSTRAINT fk_apx_eval_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos(id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_apx_eval_taller FOREIGN KEY (id_taller) REFERENCES apx_acad_unidades_laborales(id_taller),
    CONSTRAINT fk_apx_eval_autor FOREIGN KEY (id_evaluador) REFERENCES apx_sec_cuentas_acceso(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 6. CONVIVENCIA ESCOLAR: BITÁCORA DE INCIDENCIAS Y BOTÓN SOS EN AULA
-- =============================================================================

CREATE TABLE IF NOT EXISTS apx_conv_bitacora_sos_enc (
    id_incidencia INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL,
    id_taller INT NULL,
    id_reportante INT NOT NULL,
    id_profesional_interviniente INT NULL,
    tipo_incidencia ENUM('DESREGULACION_LEVE', 'DESREGULACION_MODERADA', 'DESREGULACION_SEVERA_SOS', 'CONVIVENCIA_POSITIVA', 'ACCIDENTE_ESCOLAR') NOT NULL,
    etapa_dec ENUM('ETAPA_1_PREVENCION', 'ETAPA_2_MODERADA', 'ETAPA_3_SEVERA') DEFAULT 'ETAPA_2_MODERADA',
    descripcion_suceso_enc TEXT NOT NULL COMMENT 'Cifrado AES-256 (Ley 19.628)',
    acciones_aplicadas_paec TEXT NOT NULL,
    notificado_apoderado TINYINT(1) DEFAULT 0,
    estado_alerta ENUM('ACTIVA_EN_AULA', 'EN_CONTENCION', 'RESUELTA') DEFAULT 'RESUELTA',
    fecha_hora_suceso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_hora_cierre TIMESTAMP NULL,
    CONSTRAINT fk_apx_sos_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos(id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_apx_sos_reportante FOREIGN KEY (id_reportante) REFERENCES apx_sec_cuentas_acceso(id_usuario),
    CONSTRAINT fk_apx_sos_interviniente FOREIGN KEY (id_profesional_interviniente) REFERENCES apx_sec_cuentas_acceso(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- DATOS SEMILLA (CON HASHES BCRYPT COST 12 Y ESQUEMA DE TABLAS NUEVO)
-- =============================================================================

INSERT INTO apx_sec_rbac_perfiles (id_rol, codigo, nombre, descripcion, permisos_json) VALUES
(1, 'ADMIN', 'Administrador del Sistema', 'Control total de usuarios, seguridad y configuración SGI', '{"seguridad": "rw", "rrhh": "rw", "estudiantes": "rw", "pedagogico": "rw", "clinico": "r", "paec": "r", "auditoria": "r"}'),
(2, 'DIRECTOR_UTP', 'Director / Jefe UTP', 'Supervisión curricular, horarios, alertas de asistencia y acceso total a expedientes', '{"seguridad": "r", "rrhh": "rw", "estudiantes": "rw", "pedagogico": "rw", "clinico": "rw", "paec": "rw", "auditoria": "r"}'),
(3, 'DOCENTE', 'Docente / Profesor Titular Ed. Diferencial', 'Gestión de Libro Digital, PID, evaluaciones y lectura de ficha clínica/PAEC', '{"rrhh": "r", "estudiantes": "r", "pedagogico": "rw", "clinico": "r", "paec": "rw"}'),
(4, 'MONITOR', 'Monitor Vocacional de Taller', 'Co-enseñanza laboral, registro de actividades prácticas y botón SOS', '{"rrhh": "r", "estudiantes": "r", "pedagogico": "rw", "clinico": "none", "paec": "r"}'),
(5, 'ESPECIALISTA_PIE', 'Especialista PIE (Equipo Multidisciplinario)', 'Gestión clínica, Anamnesis, PAI, PACI, PAEC y recepción de alertas SOS', '{"rrhh": "r", "estudiantes": "r", "pedagogico": "r", "clinico": "rw", "paec": "rw"}'),
(6, 'APODERADO', 'Apoderado / Familia', 'Vista de solo lectura: asistencia, logros cualitativos, acuerdos PAEC e Informe Familia', '{"portal_apoderado": "r"}');

-- Hashes Bcrypt Cost 12 generados criptográficamente (sin contraseñas ni PINs en texto plano)
INSERT INTO apx_sec_cuentas_acceso (id_usuario, id_rol, rut, nombres, apellidos, email, telefono, password_hash, pin_firma_hash, especialidad) VALUES
(1, 1, '15432198-K', 'Roberto', 'Soto Valdés', 'admin@apandi.cl', '+56981112233', '$2y$12$cLrJlhPwVUG1PYmVQmma1egZiaAPKT5uGuIjcmQ4Za057tmUBAiz2', '$2y$12$/gdl1gniqeHdgU8b5ERoNOB7ukLHOqbem0TfqLAmCgG7WZ4yWrLUO', 'Ingeniero Informático'),
(2, 2, '13876543-2', 'Marcela', 'Rojas Contreras', 'utp@apandi.cl', '+56982223344', '$2y$12$cLrJlhPwVUG1PYmVQmma1egZiaAPKT5uGuIjcmQ4Za057tmUBAiz2', '$2y$12$/gdl1gniqeHdgU8b5ERoNOB7ukLHOqbem0TfqLAmCgG7WZ4yWrLUO', 'Directora / Jefe UTP'),
(3, 3, '17654321-8', 'Carolina', 'Muñoz Tapia', 'cmunoz@apandi.cl', '+56983334455', '$2y$12$cLrJlhPwVUG1PYmVQmma1egZiaAPKT5uGuIjcmQ4Za057tmUBAiz2', '$2y$12$/gdl1gniqeHdgU8b5ERoNOB7ukLHOqbem0TfqLAmCgG7WZ4yWrLUO', 'Educadora Diferencial Mención DI'),
(4, 4, '16543210-9', 'Jorge', 'Fuentes Bravo', 'jfuentes@apandi.cl', '+56984445566', '$2y$12$cLrJlhPwVUG1PYmVQmma1egZiaAPKT5uGuIjcmQ4Za057tmUBAiz2', '$2y$12$/gdl1gniqeHdgU8b5ERoNOB7ukLHOqbem0TfqLAmCgG7WZ4yWrLUO', 'Maestro Sastre / Monitor Vocacional'),
(5, 5, '18234567-1', 'Camila', 'Vargas Herrera', 'cvargas.pie@apandi.cl', '+56985556677', '$2y$12$cLrJlhPwVUG1PYmVQmma1egZiaAPKT5uGuIjcmQ4Za057tmUBAiz2', '$2y$12$/gdl1gniqeHdgU8b5ERoNOB7ukLHOqbem0TfqLAmCgG7WZ4yWrLUO', 'Psicóloga Educacional / Coordinadora PAEC'),
(6, 6, '12345678-5', 'Patricia', 'Gómez Díaz', 'pgomez.familia@gmail.com', '+56986667788', '$2y$12$cLrJlhPwVUG1PYmVQmma1egZiaAPKT5uGuIjcmQ4Za057tmUBAiz2', NULL, NULL);

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

SET FOREIGN_KEY_CHECKS = 1;
