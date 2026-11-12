-- =============================================================================
-- SISTEMA DE GESTIÓN INSTITUCIONAL (SGI) - APANDI (ESQUEMA BLINDADO v3.0)
-- Base de Datos Relacional MariaDB / MySQL (Compatible con Docker y cPanel Chile)
-- Normativa: MINEDUC Chile (Decreto 83, Decreto 170, Ley 19.628 Protección Datos)
-- NOTA DE SEGURIDAD: Nombres de tablas, restricciones y hashes rotados por seguridad.
-- Utiliza automáticamente la base de datos definida en .env (DB_NAME).
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
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_sec_cuentas_acceso (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    id_rol INT NOT NULL,
    rut VARCHAR(15) NOT NULL UNIQUE COMMENT 'RUT chileno formato 12.345.678-9',
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(30),
    debe_cambiar_clave TINYINT(1) DEFAULT 1,
    intentos_fallidos TINYINT DEFAULT 0,
    bloqueado_hasta TIMESTAMP NULL,
    password_hash VARCHAR(255) NOT NULL COMMENT 'Hash Bcrypt Cost 12',
    pin_firma_hash VARCHAR(255) NULL COMMENT 'Hash Bcrypt Cost 12 del PIN de 6 dígitos para Firma Electrónica Simple',
    especialidad VARCHAR(100) NULL COMMENT 'Ej: Ed. Diferencial, Psicólogo, Terapeuta Ocupacional, Fonoaudiólogo',
    horas_contrato INT DEFAULT 44,
    activo TINYINT(1) DEFAULT 1,
    debe_cambiar_clave TINYINT(1) DEFAULT 1 COMMENT '1 = cambio obligatorio de clave, 0 = clave actualizada',
    ultimo_acceso TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_apx_cuenta_perfil FOREIGN KEY (id_rol) REFERENCES apx_sec_rbac_perfiles (id_rol)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_sec_trazabilidad_forense (
    id_log BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_estudiante INT NULL,
    modulo VARCHAR(60) NOT NULL COMMENT 'FICHA_CLINICA, PAI, PACI, PAEC, LIBRO_CLASES, GENERADOR_PDF',
    accion ENUM(
        'LECTURA',
        'CREACION',
        'ACTUALIZACION',
        'ELIMINACION',
        'DESCARGA_PDF',
        'ALERTA_SOS',
        'FIRMA_DIGITAL'
    ) NOT NULL,
    detalle VARCHAR(255) NULL,
    ip_origen VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_apx_forense_usuario FOREIGN KEY (id_usuario) REFERENCES apx_sec_cuentas_acceso (id_usuario)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

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
    metodo_marcaje ENUM(
        'GEOLOCALIZADO',
        'BIOMETRICO',
        'MANUAL_UTP'
    ) DEFAULT 'GEOLOCALIZADO',
    estado ENUM(
        'PRESENTE',
        'ATRASO',
        'AUSENTE',
        'LICENCIA_MEDICA',
        'PERMISO_ADMINISTRATIVO'
    ) DEFAULT 'PRESENTE',
    observacion VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_apx_marcaje_usuario_dia (id_usuario, fecha),
    CONSTRAINT fk_apx_marcaje_usuario FOREIGN KEY (id_usuario) REFERENCES apx_sec_cuentas_acceso (id_usuario)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_acad_unidades_laborales (
    id_taller INT AUTO_INCREMENT PRIMARY KEY,
    codigo_mineduc VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL COMMENT 'Ej: Corte y Confección, Gastronomía, Horticultura, Mantenimiento',
    nivel_decreto VARCHAR(60) DEFAULT 'Nivel Laboral 1 a 3 (Decreto 83)',
    capacidad_maxima INT DEFAULT 15,
    sala_ubicacion VARCHAR(80),
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_acad_asignacion_equipos (
    id_asignacion INT AUTO_INCREMENT PRIMARY KEY,
    id_taller INT NOT NULL,
    id_usuario INT NOT NULL,
    rol_en_taller ENUM(
        'DOCENTE_TITULAR',
        'MONITOR_VOCACIONAL',
        'CO_DOCENTE_PIE'
    ) NOT NULL,
    anio_escolar YEAR NOT NULL,
    UNIQUE KEY uk_apx_equipo_taller (
        id_taller,
        id_usuario,
        anio_escolar
    ),
    CONSTRAINT fk_apx_eq_taller FOREIGN KEY (id_taller) REFERENCES apx_acad_unidades_laborales (id_taller) ON DELETE CASCADE,
    CONSTRAINT fk_apx_eq_usuario FOREIGN KEY (id_usuario) REFERENCES apx_sec_cuentas_acceso (id_usuario) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_rrhh_bloques_horarios (
    id_horario INT AUTO_INCREMENT PRIMARY KEY,
    id_taller INT NOT NULL,
    id_usuario INT NOT NULL,
    dia_semana TINYINT NOT NULL COMMENT '1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes',
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    duracion_minutos INT DEFAULT 90,
    bloque_nombre VARCHAR(100) DEFAULT 'Bloque Taller Práctico',
    CONSTRAINT fk_apx_bloque_taller FOREIGN KEY (id_taller) REFERENCES apx_acad_unidades_laborales (id_taller) ON DELETE CASCADE,
    CONSTRAINT fk_apx_bloque_usuario FOREIGN KEY (id_usuario) REFERENCES apx_sec_cuentas_acceso (id_usuario) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_sys_alertas_utp (
    id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
    id_emisor INT NOT NULL,
    id_destinatario INT NULL COMMENT 'NULL = Comunicado para todo el equipo docente',
    tipo ENUM(
        'COMUNICADO_UTP',
        'ALERTA_INASISTENCIA',
        'ALERTA_SOS',
        'RECORDATORIO_FIRMA'
    ) DEFAULT 'COMUNICADO_UTP',
    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    leido TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_apx_alerta_emisor FOREIGN KEY (id_emisor) REFERENCES apx_sec_cuentas_acceso (id_usuario)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

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
    CONSTRAINT fk_apx_tutor_usuario FOREIGN KEY (id_usuario) REFERENCES apx_sec_cuentas_acceso (id_usuario) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

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
    estado_matricula ENUM(
        'REGULAR',
        'RETIRADO',
        'EGRESADO_PRACTICA',
        'SUSPENDIDO'
    ) DEFAULT 'REGULAR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_apx_alumno_tutor FOREIGN KEY (id_apoderado_titular) REFERENCES apx_fam_tutores_legales (id_apoderado)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

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
    CONSTRAINT fk_apx_insc_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_apx_insc_taller FOREIGN KEY (id_taller) REFERENCES apx_acad_unidades_laborales (id_taller)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- =============================================================================
-- 4. MÓDULO CLÍNICO, PIE Y CONVIVENCIA ESCOLAR (PAEC) - ENCRIPTADO LEY 19.628
-- =============================================================================

CREATE TABLE IF NOT EXISTS apx_med_dossier_clinico_enc (
    id_ficha INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL UNIQUE,
    diagnostico_principal_enc TEXT NOT NULL COMMENT 'Cifrado AES-256-GCM (Decreto 170: DI Leve/Moderada, TEA, Multidéficit, etc.)',
    anamnesis_enc TEXT NULL COMMENT 'Cifrado AES-256-GCM (Historia evolutiva, gestacional y familiar)',
    datos_medicos_json JSON NOT NULL COMMENT 'Estructura JSON con medicamentos, dosis, horarios, alergias, crisis epilépticas',
    sistema_salud ENUM(
        'FONASA',
        'ISAPRE',
        'PRAIS',
        'OTRO'
    ) DEFAULT 'FONASA',
    centro_salud_derivacion VARCHAR(150) NULL,
    autoriza_administracion_medicamento TINYINT(1) DEFAULT 0,
    actualizado_por INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_apx_dossier_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_apx_dossier_autor FOREIGN KEY (actualizado_por) REFERENCES apx_sec_cuentas_acceso (id_usuario)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_conv_protocolos_paec_enc (
    id_paec INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL UNIQUE,
    id_profesional_sos INT NOT NULL COMMENT 'Profesional designado que recibe alerta inmediata del Botón SOS en Aula',
    id_profesional_suplente INT NULL,
    gatillantes_dec_enc TEXT NOT NULL COMMENT 'Cifrado AES-256: Factores o estímulos que desencadenan desregulación',
    senales_previas_enc TEXT NOT NULL COMMENT 'Cifrado AES-256: Indicadores conductuales iniciales antes de crisis severa',
    estrategias_contencion_enc TEXT NOT NULL COMMENT 'Cifrado AES-256: Protocolo de intervención etapa 1, 2 y 3 (Decreto 83 / Orientaciones DEC MINEDUC)',
    acuerdos_familia TEXT NOT NULL COMMENT 'Visible en Portal Apoderados: Acuerdos y compromisos de co-responsabilidad con el hogar',
    vigente TINYINT(1) DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_apx_paec_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_apx_paec_prof_sos FOREIGN KEY (id_profesional_sos) REFERENCES apx_sec_cuentas_acceso (id_usuario)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

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
    CONSTRAINT fk_apx_pai_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_apx_pai_coord FOREIGN KEY (id_coordinador_pie) REFERENCES apx_sec_cuentas_acceso (id_usuario)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_pie_adecuaciones_paci (
    id_paci INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL,
    anio_escolar YEAR NOT NULL,
    tipo_adecuacion ENUM(
        'ACCESO',
        'OBJETIVOS_APRENDIZAJE',
        'TIEMPO_EVALUACION',
        'INTEGRAL'
    ) DEFAULT 'INTEGRAL',
    criterios_adecuacion_json JSON NOT NULL COMMENT 'Adecuaciones de acceso (comunicación aumentativa, mobiliario) y adecuaciones a OA laborales',
    estrategias_evaluacion_diferenciada TEXT NOT NULL,
    aprobado_utp TINYINT(1) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_apx_paci_anual (id_estudiante, anio_escolar),
    CONSTRAINT fk_apx_paci_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos (id_estudiante) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- =============================================================================
-- 5. MÓDULO PEDAGÓGICO (LIBRO DE CLASES DIGITAL - DECRETO 83)
-- =============================================================================

CREATE TABLE IF NOT EXISTS apx_ped_semestres_config (
    id_semestre INT AUTO_INCREMENT PRIMARY KEY,
    anio_escolar YEAR NOT NULL,
    numero_semestre TINYINT NOT NULL COMMENT '1 o 2',
    nombre VARCHAR(100) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_termino DATE NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    actualizado_por INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_apx_semestre_anio (anio_escolar, numero_semestre),
    CONSTRAINT fk_apx_semestre_usuario FOREIGN KEY (actualizado_por) REFERENCES apx_sec_cuentas_acceso (id_usuario) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_ped_bloques_estudiantes (
    id_bloque_estudiante INT AUTO_INCREMENT PRIMARY KEY,
    id_horario INT NOT NULL,
    id_estudiante INT NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_apx_bloque_alumno (id_horario, id_estudiante),
    CONSTRAINT fk_apx_be_bloque FOREIGN KEY (id_horario) REFERENCES apx_rrhh_bloques_horarios (id_horario) ON DELETE CASCADE,
    CONSTRAINT fk_apx_be_estudiante FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos (id_estudiante) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_ped_leccionario_pid (
    id_clase INT AUTO_INCREMENT PRIMARY KEY,
    id_taller INT NOT NULL,
    id_docente INT NOT NULL,
    semestre TINYINT NOT NULL DEFAULT 1,
    numero_semana INT NOT NULL DEFAULT 1,
    fecha_clase DATE NOT NULL,
    unidad_tematica VARCHAR(150) NOT NULL,
    objetivo_aprendizaje VARCHAR(255) NOT NULL,
    actividad_grupo_a TEXT NOT NULL COMMENT 'Actividad diversificada Grupo A (Mayor funcionalidad / autonomía laboral)',
    actividad_grupo_b TEXT NOT NULL COMMENT 'Actividad diversificada Grupo B (Mayor apoyo / modelado paso a paso)',
    recursos_dua VARCHAR(255) NULL,
    firmado TINYINT(1) DEFAULT 0 COMMENT 'Validación con Firma Electrónica Simple (PIN/Token)',
    hash_firma_electronica VARCHAR(128) NULL COMMENT 'Sello SHA-256 de la clase firmada',
    fecha_firma TIMESTAMP NULL,
    estado_aprobacion ENUM('BORRADOR', 'ENVIADO_REVISION', 'APROBADO', 'OBSERVADO') NOT NULL DEFAULT 'BORRADOR',
    observaciones_utp TEXT NULL,
    aprobado_por INT NULL,
    fecha_aprobacion TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_apx_pid_taller FOREIGN KEY (id_taller) REFERENCES apx_acad_unidades_laborales (id_taller),
    CONSTRAINT fk_apx_pid_docente FOREIGN KEY (id_docente) REFERENCES apx_sec_cuentas_acceso (id_usuario),
    CONSTRAINT fk_apx_pid_aprobador FOREIGN KEY (aprobado_por) REFERENCES apx_sec_cuentas_acceso (id_usuario) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_ped_asistencia_alumnos (
    id_asistencia INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL,
    id_taller INT NOT NULL,
    id_clase INT NULL,
    id_horario INT NOT NULL DEFAULT 1,
    fecha DATE NOT NULL,
    estado ENUM(
        'PRESENTE',
        'AUSENTE',
        'ATRASO',
        'RETIRADO_ANTICIPADO',
        'JUSTIFICADO_MEDICO'
    ) NOT NULL,
    observacion VARCHAR(255) NULL,
    registrado_por INT NOT NULL,
    firmado_digitalmente TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_apx_asist_alumno (id_estudiante),
    UNIQUE KEY uk_apx_asist_alumno_bloque_dia (id_estudiante, fecha, id_horario),
    CONSTRAINT fk_apx_asist_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_apx_asist_taller FOREIGN KEY (id_taller) REFERENCES apx_acad_unidades_laborales (id_taller),
    CONSTRAINT fk_apx_asist_autor FOREIGN KEY (registrado_por) REFERENCES apx_sec_cuentas_acceso (id_usuario)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS apx_ped_evaluaciones_decreto83 (
    id_evaluacion INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL,
    id_taller INT NOT NULL,
    id_clase INT NULL,
    semestre TINYINT NOT NULL COMMENT '1 o 2',
    anio_escolar YEAR NOT NULL,
    indicador_competencia VARCHAR(255) NOT NULL COMMENT 'Ej: Utiliza herramientas de corte respetando normas de higiene y seguridad',
    dimension ENUM(
        'TECNICA_VOCACIONAL',
        'AUTONOMIA_PERSONAL',
        'HABILIDADES_SOCIOLABORALES'
    ) DEFAULT 'TECNICA_VOCACIONAL',
    nivel_logro ENUM(
        'LOGRADO',
        'EN_DESARROLLO',
        'EN_INICIO',
        'NO_OBSERVADO'
    ) NOT NULL COMMENT 'Escala cualitativa Decreto 83',
    comentario_pedagogico TEXT NULL,
    id_evaluador INT NOT NULL,
    fecha_evaluacion DATE NOT NULL,
    es_borrador TINYINT(1) DEFAULT 0,
    hash_firma VARCHAR(128) NULL,
    fecha_firma TIMESTAMP NULL,
    CONSTRAINT fk_apx_eval_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_apx_eval_taller FOREIGN KEY (id_taller) REFERENCES apx_acad_unidades_laborales (id_taller),
    CONSTRAINT fk_apx_eval_autor FOREIGN KEY (id_evaluador) REFERENCES apx_sec_cuentas_acceso (id_usuario)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- =============================================================================
-- 6. CONVIVENCIA ESCOLAR: BITÁCORA DE INCIDENCIAS Y BOTÓN SOS EN AULA
-- =============================================================================

CREATE TABLE IF NOT EXISTS apx_conv_bitacora_sos_enc (
    id_incidencia INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL,
    id_taller INT NULL,
    id_reportante INT NOT NULL,
    id_profesional_interviniente INT NULL,
    tipo_incidencia ENUM(
        'DESREGULACION_LEVE',
        'DESREGULACION_MODERADA',
        'DESREGULACION_SEVERA_SOS',
        'CONVIVENCIA_POSITIVA',
        'ACCIDENTE_ESCOLAR'
    ) NOT NULL,
    etapa_dec ENUM(
        'ETAPA_1_PREVENCION',
        'ETAPA_2_MODERADA',
        'ETAPA_3_SEVERA'
    ) DEFAULT 'ETAPA_2_MODERADA',
    descripcion_suceso_enc TEXT NOT NULL COMMENT 'Cifrado AES-256 (Ley 19.628)',
    acciones_aplicadas_paec TEXT NOT NULL,
    notificado_apoderado TINYINT(1) DEFAULT 0,
    estado_alerta ENUM(
        'ACTIVA_EN_AULA',
        'EN_CONTENCION',
        'RESUELTA'
    ) DEFAULT 'RESUELTA',
    fecha_hora_suceso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_hora_cierre TIMESTAMP NULL,
    CONSTRAINT fk_apx_sos_alumno FOREIGN KEY (id_estudiante) REFERENCES apx_acad_expedientes_alumnos (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_apx_sos_reportante FOREIGN KEY (id_reportante) REFERENCES apx_sec_cuentas_acceso (id_usuario),
    CONSTRAINT fk_apx_sos_interviniente FOREIGN KEY (id_profesional_interviniente) REFERENCES apx_sec_cuentas_acceso (id_usuario)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- =============================================================================
-- DATOS SEMILLA INICIALES (CON HASHES BCRYPT COST 12 Y ESQUEMA DE TABLAS NUEVO)
-- =============================================================================

INSERT INTO apx_sec_rbac_perfiles (id_rol, codigo, nombre, descripcion, permisos_json)
VALUES
    (
        1,
        'ADMIN',
        'Administrador Institucional',
        'Gestión integral de usuarios, seguridad RBAC, copias de respaldo y auditoría Ley 19.628',
        '{"seguridad": "rw", "rrhh": "rw", "estudiantes": "rw", "pedagogico": "rw", "clinico": "r", "paec": "r", "auditoria": "rw"}'
    ),
    (
        2,
        'DIRECTOR_UTP',
        'Directora / Jefa UTP',
        'Supervisión técnico-pedagógica Decreto 83, visación PACI/PAI, alertas de inasistencia y acceso clínico total',
        '{"seguridad": "r", "rrhh": "rw", "estudiantes": "rw", "pedagogico": "rw", "clinico": "rw", "paec": "rw", "auditoria": "r"}'
    ),
    (
        3,
        'DOCENTE',
        'Docente Titular Educación Diferencial',
        'Gestión de Libro de Clases Digital, PID Grupo A/B, evaluaciones cualitativas y lectura de ficha clínica/PAEC',
        '{"rrhh": "rw", "estudiantes": "r", "pedagogico": "rw", "clinico": "r", "paec": "rw"}'
    ),
    (
        4,
        'MONITOR',
        'Monitor Vocacional de Taller Laboral',
        'Co-enseñanza práctica de oficio, toma de asistencia, registro de actividades y activación de Botón SOS',
        '{"rrhh": "rw", "estudiantes": "r", "pedagogico": "rw", "clinico": "none", "paec": "r"}'
    ),
    (
        5,
        'ESPECIALISTA_PIE',
        'Especialista PIE (Equipo Multidisciplinario)',
        'Edición de Ficha Clínica cifrada AES-256, Anamnesis, PAI (DUA), PACI, PAEC y atención de alertas SOS',
        '{"rrhh": "rw", "estudiantes": "r", "pedagogico": "r", "clinico": "rw", "paec": "rw", "auditoria": "r"}'
    ),
    (
        6,
        'APODERADO',
        'Apoderado / Familia',
        'Portal familiar de solo lectura: asistencia, logros conceptuales PID, acuerdos PAEC y descarga de Informe PDF',
        '{"portal_apoderado": "r"}'
    );

-- Hashes Bcrypt Cost 12 generados criptográficamente (sin contraseñas ni PINs en texto plano)
INSERT INTO apx_sec_cuentas_acceso (
    id_usuario,
    id_rol,
    rut,
    nombres,
    apellidos,
    email,
    telefono,
    password_hash,
    pin_firma_hash,
    especialidad,
    horas_contrato
)
VALUES
    (
        1,
        1,
        '15.432.198-K',
        'Roberto Andrés',
        'Soto Valdés',
        'admin@apandi.cl',
        '+56 9 8111 2233',
        '$2y$12$cLrJlhPwVUG1PYmVQmma1egZiaAPKT5uGuIjcmQ4Za057tmUBAiz2',
        '$2y$12$/gdl1gniqeHdgU8b5ERoNOB7ukLHOqbem0TfqLAmCgG7WZ4yWrLUO',
        'Ingeniero en Informática / Encargado SIGE',
        44
    ),
    (
        2,
        2,
        '13.876.543-2',
        'Marcela Paz',
        'Rojas Contreras',
        'utp@apandi.cl',
        '+56 9 8222 3344',
        '$2y$12$cLrJlhPwVUG1PYmVQmma1egZiaAPKT5uGuIjcmQ4Za057tmUBAiz2',
        '$2y$12$/gdl1gniqeHdgU8b5ERoNOB7ukLHOqbem0TfqLAmCgG7WZ4yWrLUO',
        'Directora / Jefa Unidad Técnico-Pedagógica',
        44
    ),
    (
        3,
        3,
        '17.654.321-8',
        'Carolina Andrea',
        'Muñoz Tapia',
        'cmunoz@apandi.cl',
        '+56 9 8333 4455',
        '$2y$12$cLrJlhPwVUG1PYmVQmma1egZiaAPKT5uGuIjcmQ4Za057tmUBAiz2',
        '$2y$12$/gdl1gniqeHdgU8b5ERoNOB7ukLHOqbem0TfqLAmCgG7WZ4yWrLUO',
        'Educadora Diferencial Mención DI y Retos Múltiples',
        40
    ),
    (
        4,
        4,
        '16.543.210-9',
        'Jorge Eduardo',
        'Fuentes Bravo',
        'jfuentes@apandi.cl',
        '+56 9 8444 5566',
        '$2y$12$cLrJlhPwVUG1PYmVQmma1egZiaAPKT5uGuIjcmQ4Za057tmUBAiz2',
        '$2y$12$/gdl1gniqeHdgU8b5ERoNOB7ukLHOqbem0TfqLAmCgG7WZ4yWrLUO',
        'Maestro Sastre Industrial / Monitor Vocacional',
        38
    ),
    (
        5,
        5,
        '18.234.567-1',
        'Camila Ignacia',
        'Vargas Herrera',
        'cvargas.pie@apandi.cl',
        '+56 9 8555 6677',
        '$2y$12$cLrJlhPwVUG1PYmVQmma1egZiaAPKT5uGuIjcmQ4Za057tmUBAiz2',
        '$2y$12$/gdl1gniqeHdgU8b5ERoNOB7ukLHOqbem0TfqLAmCgG7WZ4yWrLUO',
        'Psicóloga Educacional / Coordinadora PIE y PAEC',
        44
    ),
    (
        6,
        6,
        '12.345.678-5',
        'Patricia Elena',
        'Gómez Díaz',
        'pgomez.familia@gmail.com',
        '+56 9 8666 7788',
        '$2y$12$cLrJlhPwVUG1PYmVQmma1egZiaAPKT5uGuIjcmQ4Za057tmUBAiz2',
        NULL,
        'Apoderada Titular',
        0
    ),
    (
        7,
        5,
        '19.112.233-4',
        'Sebastián Tomás',
        'Morales Pino',
        'smorales.to@apandi.cl',
        '+56 9 8777 8899',
        '$2y$12$cLrJlhPwVUG1PYmVQmma1egZiaAPKT5uGuIjcmQ4Za057tmUBAiz2',
        '$2y$12$/gdl1gniqeHdgU8b5ERoNOB7ukLHOqbem0TfqLAmCgG7WZ4yWrLUO',
        'Terapeuta Ocupacional Especialista en Integración Sensorial',
        36
    );

INSERT INTO apx_acad_unidades_laborales (
    id_taller,
    codigo_mineduc,
    nombre,
    nivel_decreto,
    capacidad_maxima,
    sala_ubicacion
)
VALUES
    (
        1,
        'TL-CORTE-01',
        'Taller Laboral de Corte y Confección Textil',
        'Nivel Laboral 2 (Decreto Exento N° 83)',
        12,
        'Pabellón Técnico - Sala T1'
    ),
    (
        2,
        'TL-GASTRO-02',
        'Taller Laboral de Gastronomía, Panadería y Repostería',
        'Nivel Laboral 1 y 2 (Decreto Exento N° 83)',
        14,
        'Cocina Pedagógica Industrial - Sala G1'
    ),
    (
        3,
        'TL-HORTI-03',
        'Taller Laboral de Horticultura, Vivero y Paisajismo',
        'Nivel Laboral 3 Dual (Decreto Exento N° 83)',
        15,
        'Invernadero Institucional - Sector Norte'
    );

INSERT INTO apx_acad_asignacion_equipos (id_taller, id_usuario, rol_en_taller, anio_escolar)
VALUES
    (1, 3, 'DOCENTE_TITULAR', 2026),
    (1, 4, 'MONITOR_VOCACIONAL', 2026),
    (1, 5, 'CO_DOCENTE_PIE', 2026),
    (2, 3, 'DOCENTE_TITULAR', 2026),
    (3, 7, 'CO_DOCENTE_PIE', 2026);

INSERT INTO apx_rrhh_bloques_horarios (
    id_taller,
    id_usuario,
    dia_semana,
    hora_inicio,
    hora_fin,
    bloque_nombre
)
VALUES
    (1, 3, 1, '08:30:00', '11:30:00', 'Módulo Práctico: Patronaje, Trazado y Costura Recta (Grupo A/B)'),
    (1, 3, 1, '12:00:00', '13:30:00', 'Habilidades Sociolaborales y Prevención de Riesgos (EPP)'),
    (1, 3, 2, '08:30:00', '11:30:00', 'Confección Asistida con Apoyos DUA y Control de Calidad'),
    (1, 3, 3, '08:30:00', '13:00:00', 'Producción Textil Colaborativa y Co-Docencia Terapia Ocupacional'),
    (1, 3, 4, '08:30:00', '11:30:00', 'Autonomía Funcional, Manejo de Dinero y Cálculo Aplicado a Taller'),
    (1, 3, 5, '08:30:00', '12:30:00', 'Evaluación Formativa de Logros PID y Articulación Equipo PIE');

INSERT INTO apx_rrhh_marcajes_biometricos (
    id_usuario,
    fecha,
    hora_entrada,
    hora_salida,
    latitud_entrada,
    longitud_entrada,
    metodo_marcaje,
    estado,
    observacion
)
VALUES
    (3, CURDATE(), '08:04:12', NULL, -33.5112400, -70.7581300, 'GEOLOCALIZADO', 'PRESENTE', 'Ingreso puntual verificado por GPS en recinto APANDI'),
    (4, CURDATE(), '08:10:45', NULL, -33.5112900, -70.7581800, 'GEOLOCALIZADO', 'PRESENTE', 'Preparación de máquinas e insumos textiles Sala T1'),
    (5, CURDATE(), '08:00:05', NULL, -33.5111900, -70.7581100, 'BIOMETRICO', 'PRESENTE', 'Guardia activa como Profesional SOS PAEC');

INSERT INTO apx_fam_tutores_legales (
    id_apoderado,
    id_usuario,
    rut,
    nombres,
    apellidos,
    parentesco,
    telefono_principal,
    telefono_emergencia,
    email,
    direccion,
    comuna
)
VALUES
    (1, 6, '12.345.678-5', 'Patricia Elena', 'Gómez Díaz', 'Madre', '+56 9 8666 7788', '+56 9 9112 2334', 'pgomez.familia@gmail.com', 'Av. Los Pajaritos 3450, Depto 402', 'Maipú'),
    (2, NULL, '11.987.654-3', 'Héctor Manuel', 'Silva Morales', 'Padre', '+56 9 7766 5544', '+56 9 6655 4433', 'hsilva@correo.cl', 'Pasaje El Roble 128', 'Cerrillos'),
    (3, NULL, '14.223.344-K', 'Carmen Gloria', 'Riquelme Soto', 'Madre', '+56 9 5544 3322', '+56 9 4433 2211', 'criquelme@familia.cl', 'Av. Central 890', 'Maipú'),
    (4, NULL, '10.887.766-1', 'Rosa Ester', 'Paredes Lagos', 'Abuela / Tutora Legal', '+56 9 3322 1100', '+56 9 2211 0099', 'rparedes@familia.cl', 'Villa Los Héroes Pje. 4 #512', 'Maipú');

INSERT INTO apx_acad_expedientes_alumnos (
    id_estudiante,
    rut,
    nombres,
    apellidos,
    fecha_nacimiento,
    genero,
    direccion,
    comuna,
    registro_nacional_discapacidad,
    porcentaje_discapacidad,
    beneficio_junaeb,
    id_apoderado_titular,
    estado_matricula
)
VALUES
    (1, '22.345.678-9', 'Matías Ignacio', 'Vera Gómez', '2007-05-14', 'Masculino', 'Av. Los Pajaritos 3450, Depto 402', 'Maipú', 1, 65, 1, 1, 'REGULAR'),
    (2, '23.456.789-0', 'Valentina Paz', 'Silva Espinoza', '2008-09-22', 'Femenino', 'Pasaje El Roble 128', 'Cerrillos', 1, 45, 1, 2, 'REGULAR'),
    (3, '21.987.321-4', 'Benjamín Alonso', 'Castro Riquelme', '2006-11-03', 'Masculino', 'Av. Central 890', 'Maipú', 1, 55, 1, 3, 'REGULAR'),
    (4, '22.765.432-1', 'Florencia Belén', 'Herrera Paredes', '2007-02-19', 'Femenino', 'Villa Los Héroes Pje. 4 #512', 'Maipú', 1, 70, 1, 4, 'REGULAR'),
    (5, '20.543.987-K', 'Diego Alejandro', 'Mendoza Gómez', '2005-08-11', 'Masculino', 'Av. Los Pajaritos 3450, Depto 402', 'Maipú', 1, 40, 1, 1, 'EGRESADO_PRACTICA');

INSERT INTO apx_acad_inscripciones_anuales (
    numero_matricula,
    id_estudiante,
    id_taller,
    anio_escolar,
    grupo_funcionalidad,
    jornada,
    fecha_incorporacion,
    observaciones_ingreso
)
VALUES
    ('MAT-2026-001', 1, 1, 2026, 'GRUPO_B', 'COMPLETA', '2026-03-02', 'Estudiante con TEA Nivel 2 y DI Moderada. Requiere apoyos visuales anticipatorios ARASAAC y regulación auditiva (Grupo B: Mayor apoyo).'),
    ('MAT-2026-002', 2, 1, 2026, 'GRUPO_A', 'COMPLETA', '2026-03-02', 'Estudiante con DI Leve. Excelente destreza motriz fina en máquina recta y overlock (Grupo A: Mayor funcionalidad).'),
    ('MAT-2026-003', 3, 1, 2026, 'GRUPO_A', 'COMPLETA', '2026-03-02', 'Estudiante con DI Leve. Proyección a práctica laboral dual en confección industrial el segundo semestre (Grupo A: Mayor funcionalidad).'),
    ('MAT-2026-004', 4, 2, 2026, 'GRUPO_B', 'COMPLETA', '2026-03-04', 'Estudiante con Síndrome de Down y DI Moderada. Alta motivación en repostería asistida con moldes dosificadores (Grupo B: Mayor apoyo).'),
    ('MAT-2026-005', 5, 3, 2026, 'GRUPO_A', 'COMPLETA', '2026-03-02', 'Estudiante en fase de colocación laboral supervisada en vivero municipal (Grupo A: Mayor funcionalidad).');

INSERT INTO apx_sys_alertas_utp (
    id_emisor,
    id_destinatario,
    tipo,
    titulo,
    mensaje
)
VALUES
    (2, NULL, 'ALERTA_INASISTENCIA', '⚠️ Alerta Automática de Inasistencia Reiterada: Benjamín Castro Riquelme', 'El estudiante Benjamín Castro Riquelme (Taller de Corte y Confección - Grupo A) acumula 3 inasistencias consecutivas sin justificación médica. Se activó protocolo de retención escolar con Convivencia y Trabajo Social.'),
    (2, NULL, 'COMUNICADO_UTP', 'Visación de Planificaciones PID y Revisión PACI 2° Semestre', 'Estimado equipo docente y PIE: Se recuerda validar y firmar con PIN electrónico las clases registradas en el Libro Digital según Circular de la Superintendencia de Educación.'),
    (5, 3, 'RECORDATORIO_FIRMA', 'Actualización de Protocolo PAEC para Matías Vera Gómez', 'El equipo PIE actualizó las estrategias de contención sensorial etapa 1 y 2 en la ficha PAEC de Matías. Disponible en modo lectura para Docente Titular.');

INSERT INTO apx_ped_semestres_config (id_semestre, anio_escolar, numero_semestre, nombre, fecha_inicio, fecha_termino, activo, actualizado_por)
VALUES
    (1, 2026, 1, 'Primer Semestre 2026', '2026-03-02', '2026-07-10', 0, 2),
    (2, 2026, 2, 'Segundo Semestre 2026', '2026-07-27', '2026-12-18', 1, 2);

INSERT INTO apx_ped_bloques_estudiantes (id_horario, id_estudiante, activo)
VALUES
    (1, 1, 1), (1, 2, 1), (1, 3, 1),
    (2, 1, 1), (2, 2, 1), (2, 3, 1),
    (3, 1, 1), (3, 2, 1), (3, 3, 1),
    (4, 1, 1), (4, 2, 1),
    (5, 1, 1), (5, 3, 1),
    (6, 2, 1), (6, 3, 1);

INSERT INTO apx_ped_leccionario_pid (
    id_clase,
    id_taller,
    id_docente,
    semestre,
    numero_semana,
    fecha_clase,
    unidad_tematica,
    objetivo_aprendizaje,
    actividad_grupo_a,
    actividad_grupo_b,
    recursos_dua,
    firmado,
    hash_firma_electronica,
    fecha_firma,
    estado_aprobacion,
    observaciones_utp,
    aprobado_por,
    fecha_aprobacion
)
VALUES
    (
        1,
        1,
        3,
        2,
        14,
        CURDATE(),
        'Unidad 3: Confección de Pecheras de Trabajo y Seguridad en Taller',
        'OA Laboral 04: Ejecutar procesos de trazado, corte y unión textil aplicando normas de prevención de riesgos e higiene.',
        'GRUPO A (Mayor Funcionalidad): Trazan molde de pechera sobre tela gabardina, cortan con tijera sastre y realizan costura recta de bastilla en máquina industrial.',
        'GRUPO B (Mayor Apoyo): Seleccionan piezas pre-marcadas con plantillas rígidas de alto contraste, fijan con clips de seguridad (sin alfileres punzantes) y clasifican insumos.',
        'Moldes acrílicos con textura táctil, pictogramas de secuencia de 4 pasos ARASAAC, tijeras ergonómicas asistidas con retorno y protectores auditivos.',
        1,
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        NOW(),
        'APROBADO',
        'Excelente diversificación DUA con apoyos táctiles y modelado paso a paso para Grupo B. Cobertura curricular aprobada.',
        2,
        NOW()
    ),
    (
        2,
        1,
        3,
        2,
        14,
        DATE_SUB(CURDATE(), INTERVAL 2 DAY),
        'Unidad 3: Preparación de Estaciones de Costura y Reconocimiento de EPP',
        'OA Laboral 02: Identificar y utilizar elementos de protección personal y herramientas manuales según estándares del oficio.',
        'GRUPO A (Mayor Funcionalidad): Enhebran máquina recta de forma autónoma, regulan tensión básica y confeccionan muestra de costura en retazo.',
        'GRUPO B (Mayor Apoyo): Emparejan tarjetas pictográficas con cada herramienta del taller, colocan su delantal de seguridad y realizan hilván en bastidor adaptado.',
        'Tablero visual de seguridad, guía de enhebrado por colores y temporizador visual Time Timer.',
        1,
        '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
        DATE_SUB(NOW(), INTERVAL 2 DAY),
        'APROBADO',
        'Visado conforme por UTP.',
        2,
        DATE_SUB(NOW(), INTERVAL 2 DAY)
    );

INSERT INTO apx_ped_asistencia_alumnos (
    id_estudiante,
    id_taller,
    id_clase,
    id_horario,
    fecha,
    estado,
    observacion,
    registrado_por,
    firmado_digitalmente
)
VALUES
    (1, 1, 1, 1, CURDATE(), 'PRESENTE', 'Ingresa tranquilo con sus audífonos reductores de ruido.', 3, 1),
    (2, 1, 1, 1, CURDATE(), 'PRESENTE', 'Excelente disposición al trabajo en máquina recta industrial.', 3, 1),
    (3, 1, 1, 1, CURDATE(), 'AUSENTE', '3ra inasistencia consecutiva. Se notificó automáticamente a UTP.', 3, 1),
    (4, 2, 1, 1, CURDATE(), 'PRESENTE', 'Participa activamente en taller de panadería.', 3, 1),
    (5, 3, 1, 1, CURDATE(), 'PRESENTE', 'Asistencia en práctica laboral dual.', 3, 1);

INSERT INTO apx_ped_evaluaciones_decreto83 (
    id_estudiante,
    id_taller,
    id_clase,
    semestre,
    anio_escolar,
    indicador_competencia,
    dimension,
    nivel_logro,
    comentario_pedagogico,
    id_evaluador,
    fecha_evaluacion
)
VALUES
    (1, 1, 1, 2, 2026, 'Utiliza elementos de protección personal (EPP) y respeta normas de seguridad en el taller', 'AUTONOMIA_PERSONAL', 'LOGRADO', 'Utiliza su delantal de mezclilla y protectores auditivos de forma autónoma al iniciar la jornada.', 3, CURDATE()),
    (1, 1, 1, 2, 2026, 'Ejecuta secuencia de fijación de moldes textiles con apoyos visuales (Grupo B)', 'TECNICA_VOCACIONAL', 'EN_DESARROLLO', 'Logra fijar 3 de los 4 bordes utilizando clips ergonómicos con mediación verbal mínima.', 3, CURDATE()),
    (1, 1, 1, 2, 2026, 'Solicita ayuda o pausa activa utilizando apoyos comunicativos cuando siente sobrecarga', 'HABILIDADES_SOCIOLABORALES', 'LOGRADO', 'Entrega tarjeta pictográfica de pausa activa antes de presentar frustración.', 5, CURDATE()),
    (2, 1, 1, 2, 2026, 'Opera máquina de coser recta manteniendo línea de costura y control de pedal (Grupo A)', 'TECNICA_VOCACIONAL', 'LOGRADO', 'Costura prolija y cumplimiento de estándares de control de calidad.', 3, CURDATE()),
    (2, 1, 1, 2, 2026, 'Colabora con compañeros del Grupo B en la organización de materiales textiles', 'HABILIDADES_SOCIOLABORALES', 'LOGRADO', 'Excelente liderazgo positivo y compañerismo en el taller.', 3, CURDATE()),
    (3, 1, 1, 2, 2026, 'Realiza trazado y corte de patrones textiles con tijera sastre (Grupo A)', 'TECNICA_VOCACIONAL', 'EN_DESARROLLO', 'Buen manejo técnico, requiere reforzar continuidad de asistencia.', 4, CURDATE()),
    (4, 2, 1, 2, 2026, 'Dosifica ingredientes de repostería utilizando tazas medidoras adaptadas por color (Grupo B)', 'TECNICA_VOCACIONAL', 'LOGRADO', 'Sigue la receta pictográfica de principio a fin con entusiasmo.', 3, CURDATE());

INSERT INTO apx_pie_planes_apoyo_ind (
    id_estudiante,
    anio_escolar,
    fortalezas_intereses,
    barreras_aprendizaje,
    estrategias_dua_json,
    apoyos_especialistas_json,
    objetivos_transicion_vida_adulta,
    id_coordinador_pie
)
VALUES
    (
        1,
        2026,
        'Excelente percepción visual para clasificar telas por textura y color. Alto interés por el orden de herramientas y secuencias estructuradas paso a paso.',
        'Barreras sensoriales auditivas en entornos ruidosos (motores industriales) y necesidad de mediación en tareas motrices bimanuales complejas.',
        '{"implicacion": "Tablero de economía de fichas vocacional, anticipación de cambios de rutina con reloj visual Time Timer y elección de rol dentro de la línea textil.", "representacion": "Secuencias pictográficas ARASAAC plastificadas de alto contraste en cada estación del taller y modelado práctico en vivo.", "accion_expresion": "Uso de plantillas de corte con topes físicos de seguridad, tijeras ergonómicas con resorte de retorno y evaluación mediante demostración práctica."}',
        '{"psicologia": "Autorregulación emocional, identificación de termómetro de emociones y prevención de DEC (1 sesión semanal individual + co-docencia).", "terapia_ocupacional": "Dieta sensorial propioceptiva, adaptación de herramientas de taller y praxis fina bimanual.", "fonoaudiologia": "Comunicación funcional en contextos laborales: solicitar insumos, pedir pausa activa y reportar término de tarea."}',
        'Desarrollar hábitos laborales de puntualidad, uso autónomo de EPP, autorregulación sensorial y desempeño en taller protegido.',
        5
    ),
    (
        2,
        2026,
        'Gran destreza motriz fina en costura industrial, alta responsabilidad, empatía con sus pares y motivación por aprender patronaje digital.',
        'Necesidad de apoyo en cálculo matemático complejo (fracciones de metro y presupuestos de insumos).',
        '{"implicacion": "Asignación de rol de monitora par ayudante de calidad y proyectos reales de confección institucional.", "representacion": "Cintas métricas codificadas por color y tablas de conversión visual de medidas.", "accion_expresion": "Bitácora de producción con autoevaluación visual y portafolio de prendas confeccionadas."}',
        '{"psicologia": "Fortalecimiento de autoestima laboral y preparación para entrevistas de práctica dual.", "terapia_ocupacional": "Ergonomía postural en jornadas de costura industrial.", "fonoaudiologia": "Habilidades pragmáticas y atención a clientes/proveedores."}',
        'Preparación para inserción laboral dual en empresa textil externa durante el próximo ciclo anual.',
        5
    );

INSERT INTO apx_pie_adecuaciones_paci (
    id_estudiante,
    anio_escolar,
    tipo_adecuacion,
    criterios_adecuacion_json,
    estrategias_evaluacion_diferenciada,
    aprobado_utp
)
VALUES
    (
        1,
        2026,
        'INTEGRAL',
        '{"acceso": "Ubicación del puesto de trabajo alejada del compresor industrial, uso permanente de protectores auditivos (SNR 28dB), iluminación natural y agenda visual diaria.", "objetivos_aprendizaje": "Graduación de complejidad curricular a Nivel Grupo B: ejecuta marcado con molde rígido, fijación con clips de seguridad y unión textil asistida."}',
        'Rúbrica cualitativa de observación directa en desempeño real de taller, parcelación de instrucciones en máximo 3 pasos y tiempos flexibles sin presión.',
        1
    ),
    (
        2,
        2026,
        'ACCESO',
        '{"acceso": "Apoyo de calculadora visual y plantillas de medidas pre-graduadas para el cálculo de metraje de telas.", "objetivos_aprendizaje": "Mantiene la totalidad de los Objetivos de Aprendizaje del Grupo A con enriquecimiento en control de calidad."}',
        'Evaluación auténtica basada en producto terminado y lista de cotejo de seguridad industrial.',
        1
    );

SET FOREIGN_KEY_CHECKS = 1;
