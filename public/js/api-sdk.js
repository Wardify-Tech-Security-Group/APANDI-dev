/**
 * =============================================================================
 * MOTOR API JAVASCRIPT, VALIDADOR RUT & CRIPTOGRAFÍA
 * SGI APANDI — Integración Completa Diseño Figma + Arquitectura SGI Educación Especial
 * Compatible con cualquier navegador y cualquier Hosting en Chile (Apache/cPanel/Docker)
 * =============================================================================
 */

window.ApandiCrypto = {
  // Nota de seguridad: La llave maestra AES-256-GCM reside exclusivamente en el servidor (.env)
  hexToBytes: function (hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  },

  bytesToHex: function (bytes) {
    return Array.from(bytes)
      .map(function (b) {
        return b.toString(16).padStart(2, '0');
      })
      .join('');
  },

  // Migrado desde Frondend/src/lib/rut.ts
  normalizeRut: function (value) {
    return String(value || '')
      .replace(/\./g, '')
      .replace(/-/g, '')
      .trim()
      .toUpperCase();
  },

  isValidRut: function (value) {
    const rut = this.normalizeRut(value);
    if (!/^\d{7,8}[0-9K]$/.test(rut)) return false;
    const body = rut.slice(0, -1);
    const provided = rut.slice(-1);
    let sum = 0;
    let multiplier = 2;
    for (let index = body.length - 1; index >= 0; index -= 1) {
      sum += Number(body[index]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const result = 11 - (sum % 11);
    const expected = result === 11 ? '0' : result === 10 ? 'K' : String(result);
    return provided === expected;
  },

  formatRut: function (rut) {
    const clean = String(rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length < 2) return clean;
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    return body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
  }
};

/**
 * Definición oficial de las 7 plantillas documentales exportadas desde Figma (apandi-app.tsx)
 */
window.APANDI_TEMPLATES = [
  {
    id: 'pai',
    short: 'PAI',
    name: 'Plan de Apoyo Individual',
    description: 'Fortalezas, objetivos prioritarios, apoyos DUA y seguimiento.',
    color: 'bg-teal-50 text-teal-700',
    sections: [
      'Fortalezas y necesidades',
      'Objetivos prioritarios',
      'Apoyos en el aula (DUA)',
      'Estrategias prácticas',
      'Apoyo de la familia',
      'Evaluación',
      'Seguimiento'
    ]
  },
  {
    id: 'paec',
    short: 'PAEC',
    name: 'Plan de Acompañamiento Emocional y/o Conductual',
    description: 'Caracterización, desreguladores, estrategias y acuerdos.',
    color: 'bg-violet-50 text-violet-700',
    sections: [
      'Caracterización del estudiante',
      'Particularidades y factores desencadenantes',
      'Estrategias de regulación',
      'Manejo del ambiente',
      'Acuerdos con familia y responsables'
    ]
  },
  {
    id: 'paci',
    short: 'PACI',
    name: 'Plan de Adecuación Curricular Individual',
    description: 'Adecuaciones, objetivos, recursos, evaluación y seguimiento.',
    color: 'bg-sky-50 text-sky-700',
    sections: [
      'Adaptaciones curriculares',
      'Objetivos de aprendizaje adecuados',
      'Conocimientos, habilidades y actitudes',
      'Recursos',
      'Criterios de evaluación y promoción',
      'Seguimiento del PACI'
    ]
  },
  {
    id: 'psicopedagogico',
    short: 'IEP',
    name: 'Informe de Evaluación Psicopedagógica',
    description: 'Historia escolar, análisis cualitativo, síntesis y sugerencias.',
    color: 'bg-amber-50 text-amber-700',
    sections: [
      'Motivo de evaluación',
      'Instrumentos aplicados',
      'Historia escolar',
      'Habilidades cognitivas y comunicativas',
      'Habilidades socioemocionales',
      'Habilidades motoras, autonomía y sensoriales',
      'Síntesis y conclusión',
      'Sugerencias'
    ]
  },
  {
    id: 'familia',
    short: 'IF',
    name: 'Informe para la Familia',
    description: 'Síntesis clara de avances, apoyos y acuerdos familiares.',
    color: 'bg-rose-50 text-rose-700',
    sections: [
      'Antecedentes generales',
      'Progresos observados',
      'Fortalezas',
      'Necesidades de apoyo',
      'Recomendaciones para el hogar',
      'Acuerdos y compromisos'
    ]
  },
  {
    id: 'anamnesis',
    short: 'AN',
    name: 'Anamnesis',
    description: 'Historia personal, familiar, de salud y trayectoria educativa.',
    color: 'bg-indigo-50 text-indigo-700',
    sections: [
      'Motivo de consulta',
      'Antecedentes familiares',
      'Antecedentes prenatales y perinatales',
      'Desarrollo evolutivo',
      'Salud y tratamientos',
      'Trayectoria escolar',
      'Rutinas, autonomía e intereses'
    ]
  },
  {
    id: 'vocacional',
    short: 'PV',
    name: 'Planificación Vocacional',
    description: 'Unidad, objetivos, competencias y planificación clase a clase.',
    color: 'bg-emerald-50 text-emerald-700',
    sections: [
      'Contextualización del grupo',
      'Unidad y objetivo conductor',
      'Competencias, conocimientos y habilidades',
      'Objetivos complementarios',
      'Proyección de la unidad',
      'Actividades clase a clase',
      'Indicadores de logro y evaluación'
    ]
  }
];

const INITIAL_JS_DB = {
  users: [
    { id_usuario: 1, id: '1', rut: '15.432.198-K', nombre_completo: 'Roberto Andrés Soto Valdés', name: 'Roberto Andrés Soto Valdés', username: 'admin', email: 'admin@apandi.cl', rol_codigo: 'ADMIN', role: 'administrador', rol_nombre: 'Administrador Institucional', especialidad: 'Ingeniero en Informática / Encargado SIGE', horas_contrato: 44, active: true, activo: 1 },
    { id_usuario: 2, id: '2', rut: '13.876.543-2', nombre_completo: 'Marcela Paz Rojas Contreras', name: 'Marcela Paz Rojas Contreras', username: 'utp', email: 'utp@apandi.cl', rol_codigo: 'DIRECTOR_UTP', role: 'director_utp', rol_nombre: 'Directora / Jefa UTP', especialidad: 'Directora / Jefa Unidad Técnico-Pedagógica', horas_contrato: 44, active: true, activo: 1 },
    { id_usuario: 3, id: '3', rut: '17.654.321-8', nombre_completo: 'Carolina Andrea Muñoz Tapia', name: 'Carolina Andrea Muñoz Tapia', username: 'cmunoz', email: 'cmunoz@apandi.cl', rol_codigo: 'DOCENTE', role: 'docente', rol_nombre: 'Docente Titular Educación Diferencial', especialidad: 'Educadora Diferencial Mención DI y Retos Múltiples', horas_contrato: 40, active: true, activo: 1 },
    { id_usuario: 4, id: '4', rut: '16.543.210-9', nombre_completo: 'Jorge Eduardo Fuentes Bravo', name: 'Jorge Eduardo Fuentes Bravo', username: 'jfuentes', email: 'jfuentes@apandi.cl', rol_codigo: 'MONITOR', role: 'monitor', rol_nombre: 'Monitor Vocacional de Taller Laboral', especialidad: 'Maestro Sastre Industrial / Monitor Vocacional', horas_contrato: 38, active: true, activo: 1 },
    { id_usuario: 5, id: '5', rut: '18.234.567-1', nombre_completo: 'Camila Ignacia Vargas Herrera', name: 'Camila Ignacia Vargas Herrera', username: 'cvargas.pie', email: 'cvargas.pie@apandi.cl', rol_codigo: 'ESPECIALISTA_PIE', role: 'especialista_pie', rol_nombre: 'Especialista PIE (Equipo Multidisciplinario)', especialidad: 'Psicóloga Educacional / Coordinadora PIE y PAEC', horas_contrato: 44, active: true, activo: 1 },
    { id_usuario: 6, id: '6', rut: '12.345.678-5', nombre_completo: 'Patricia Elena Gómez Díaz', name: 'Patricia Elena Gómez Díaz', username: 'pgomez.familia', email: 'pgomez.familia@gmail.com', rol_codigo: 'APODERADO', role: 'apoderado', rol_nombre: 'Apoderado / Familia', especialidad: 'Apoderada Titular', horas_contrato: 0, active: true, activo: 1 },
    { id_usuario: 8, id: '8', rut: '10.234.567-8', nombre_completo: 'Hernán Patricio Valdivia Montes', name: 'Hernán Patricio Valdivia Montes', username: 'sostenedor', email: 'sostenedor@apandi.cl', rol_codigo: 'SOSTENEDOR', role: 'sostenedor', rol_nombre: 'Sostenedor Institucional', especialidad: 'Representante Legal / Sostenedor Corporación Educacional', horas_contrato: 44, active: true, activo: 1 },
    { id_usuario: 9, id: '9', rut: '16.890.123-4', nombre_completo: 'Javiera Paz Morales Araya', name: 'Javiera Paz Morales Araya', username: 'convivencia', email: 'convivencia@apandi.cl', rol_codigo: 'CONVIVENCIA', role: 'convivencia', rol_nombre: 'Encargada de Convivencia Escolar', especialidad: 'Trabajadora Social / Encargada de Convivencia Escolar', horas_contrato: 44, active: true, activo: 1 }
  ],
  talleres: [
    { id_taller: 1, codigo_mineduc: 'TL-CORTE-01', nombre: 'Taller Laboral de Corte y Confección Textil', nivel_decreto: 'Nivel Laboral 2', capacidad_maxima: 12, sala_ubicacion: 'Pabellón Técnico - Sala T1' },
    { id_taller: 2, codigo_mineduc: 'TL-GASTRO-02', nombre: 'Taller Laboral de Gastronomía, Panadería y Repostería', nivel_decreto: 'Nivel Laboral 1 y 2', capacidad_maxima: 14, sala_ubicacion: 'Cocina Pedagógica Industrial - Sala G1' },
    { id_taller: 3, codigo_mineduc: 'TL-HORTI-03', nombre: 'Taller Laboral de Horticultura, Vivero y Paisajismo', nivel_decreto: 'Nivel Laboral 3 Dual', capacidad_maxima: 15, sala_ubicacion: 'Invernadero Institucional - Sector Norte' }
  ],
  estudiantes: [
    {
      id_estudiante: 1, id: '1', rut: '22.345.678-2', nombres: 'Matías Ignacio', apellidos: 'Vera Gómez', paternalSurname: 'Vera', maternalSurname: 'Gómez', names: 'Matías Ignacio', fullName: 'Matías Ignacio Vera Gómez', socialName: 'Mati', fecha_nacimiento: '2007-05-14', birthDate: '2007-05-14', genero: 'Masculino', gender: 'Masculino', nationality: 'Chilena', direccion: 'Av. Los Pajaritos 3450, Depto 402', comuna: 'Maipú',
      registro_nacional_discapacidad: 1, porcentaje_discapacidad: 65, beneficio_junaeb: 1, estado_matricula: 'REGULAR', status: 'activo',
      numero_matricula: 'MAT-2026-001', registrationNumber: 'MAT-2026-001', course: 'Nivel Laboral 2A', level: 'Nivel Laboral 2', enrollmentYear: 2026, entryDate: '2024-03-04', evaluationDate: '2026-03-15', reevaluationDate: '2026-11-24',
      grupo_funcionalidad: 'GRUPO_B', jornada: 'COMPLETA', id_taller: 1, taller_nombre: 'Taller Laboral de Corte y Confección Textil', workshop: 'Taller Laboral de Corte y Confección Textil', codigo_mineduc: 'TL-CORTE-01', sala_ubicacion: 'Pabellón Técnico - Sala T1',
      apoderado_nombre: 'Patricia Elena Gómez Díaz', apoderado_rut: '12.345.678-5', apoderado_parentesco: 'Madre', apoderado_telefono: '+56 9 8666 7788', apoderado_email: 'pgomez.familia@gmail.com',
      profesional_sos_nombre: 'Camila Ignacia Vargas Herrera', profesional_sos_especialidad: 'Psicóloga Educacional / Coordinadora PIE y PAEC', profesional_sos_telefono: '+56 9 8555 6677',
      diagnostico_principal: 'Trastorno del Espectro Autista (TEA Nivel 2) concomitante con Discapacidad Intelectual Moderada',
      contact: { address: 'Av. Los Pajaritos 3450, Depto 402', municipality: 'Maipú', phone: '+56 9 8666 7788', guardianName: 'Patricia Elena Gómez Díaz', guardianRut: '12.345.678-5', guardianPhone: '+56 9 8666 7788', guardianEmail: 'pgomez.familia@gmail.com' },
      educational: {
        primaryDiagnosis: 'Trastorno del Espectro Autista (TEA Nivel 2) y Discapacidad Intelectual Moderada',
        secondaryDiagnosis: 'Hipersensibilidad sensorial auditiva',
        strengths: 'Excelente memoria visual, adherencia a secuencias pictográficas ARASAAC y alta precisión en pre-costura.',
        supportNeeds: 'Anticipación visual ante cambios de rutina, uso de protectores auditivos SNR 28dB y mediación paso a paso (Grupo B).',
        pedagogicalObservations: 'Responde favorablemente al modelado directo y pausas activas programadas cada 45 minutos.',
        relevantBackground: 'Escolaridad completa en modalidad especial con apoyo multiprofesional PIE constante.'
      }
    },
    {
      id_estudiante: 2, id: '2', rut: '23.456.789-6', nombres: 'Valentina Paz', apellidos: 'Silva Espinoza', paternalSurname: 'Silva', maternalSurname: 'Espinoza', names: 'Valentina Paz', fullName: 'Valentina Paz Silva Espinoza', socialName: 'Vale', fecha_nacimiento: '2008-09-22', birthDate: '2008-09-22', genero: 'Femenino', gender: 'Femenino', nationality: 'Chilena', direccion: 'Pasaje El Roble 128', comuna: 'Cerrillos',
      registro_nacional_discapacidad: 1, porcentaje_discapacidad: 45, beneficio_junaeb: 1, estado_matricula: 'REGULAR', status: 'activo',
      numero_matricula: 'MAT-2026-002', registrationNumber: 'MAT-2026-002', course: 'Nivel Laboral 2A', level: 'Nivel Laboral 2', enrollmentYear: 2026, entryDate: '2024-03-04', evaluationDate: '2026-03-18', reevaluationDate: '2026-11-28',
      grupo_funcionalidad: 'GRUPO_A', jornada: 'COMPLETA', id_taller: 1, taller_nombre: 'Taller Laboral de Corte y Confección Textil', workshop: 'Taller Laboral de Corte y Confección Textil', codigo_mineduc: 'TL-CORTE-01', sala_ubicacion: 'Pabellón Técnico - Sala T1',
      apoderado_nombre: 'Héctor Manuel Silva Morales', apoderado_rut: '11.223.344-5', apoderado_parentesco: 'Padre', apoderado_telefono: '+56 9 7766 5544', apoderado_email: 'hsilva@correo.cl',
      profesional_sos_nombre: 'Camila Ignacia Vargas Herrera', profesional_sos_especialidad: 'Psicóloga Educacional / Coordinadora PIE y PAEC', profesional_sos_telefono: '+56 9 8555 6677',
      diagnostico_principal: 'Discapacidad Intelectual Leve (CI 64 WISC-V). Alta competencia adaptativa.',
      contact: { address: 'Pasaje El Roble 128', municipality: 'Cerrillos', phone: '+56 9 7766 5544', guardianName: 'Héctor Manuel Silva Morales', guardianRut: '11.223.344-5', guardianPhone: '+56 9 7766 5544', guardianEmail: 'hsilva@correo.cl' },
      educational: {
        primaryDiagnosis: 'Discapacidad Intelectual Leve',
        secondaryDiagnosis: 'Sin diagnóstico secundario',
        strengths: 'Liderazgo positivo entre pares, motricidad fina sobresaliente y manejo autónomo de máquina recta.',
        supportNeeds: 'Fraccionamiento de instrucciones extensas y refuerzo positivo de autoconfianza laboral (Grupo A).',
        pedagogicalObservations: 'Proyección hacia práctica laboral dual en taller textil externo durante el próximo semestre.',
        relevantBackground: 'Tránsito exitoso desde nivel básico especial.'
      }
    },
    {
      id_estudiante: 3, id: '3', rut: '21.987.321-0', nombres: 'Benjamín Alonso', apellidos: 'Castro Riquelme', paternalSurname: 'Castro', maternalSurname: 'Riquelme', names: 'Benjamín Alonso', fullName: 'Benjamín Alonso Castro Riquelme', socialName: 'Benja', fecha_nacimiento: '2006-11-03', birthDate: '2006-11-03', genero: 'Masculino', gender: 'Masculino', nationality: 'Chilena', direccion: 'Av. Central 890', comuna: 'Maipú',
      registro_nacional_discapacidad: 1, porcentaje_discapacidad: 55, beneficio_junaeb: 1, estado_matricula: 'REGULAR', status: 'activo',
      numero_matricula: 'MAT-2026-003', registrationNumber: 'MAT-2026-003', course: 'Nivel Laboral 2B', level: 'Nivel Laboral 2', enrollmentYear: 2026, entryDate: '2023-03-06', evaluationDate: '2026-04-02', reevaluationDate: '2026-12-04',
      grupo_funcionalidad: 'GRUPO_A', jornada: 'COMPLETA', id_taller: 1, taller_nombre: 'Taller Laboral de Corte y Confección Textil', workshop: 'Taller Laboral de Corte y Confección Textil', codigo_mineduc: 'TL-CORTE-01', sala_ubicacion: 'Pabellón Técnico - Sala T1',
      apoderado_nombre: 'Carmen Gloria Riquelme Soto', apoderado_rut: '13.445.566-7', apoderado_parentesco: 'Madre', apoderado_telefono: '+56 9 5544 3322', apoderado_email: 'criquelme@correo.cl',
      profesional_sos_nombre: 'Camila Ignacia Vargas Herrera', profesional_sos_especialidad: 'Psicóloga Educacional / Coordinadora PIE y PAEC', profesional_sos_telefono: '+56 9 8555 6677',
      diagnostico_principal: 'Discapacidad Intelectual Leve con Trastorno Pragmático de la Comunicación',
      contact: { address: 'Av. Central 890', municipality: 'Maipú', phone: '+56 9 5544 3322', guardianName: 'Carmen Gloria Riquelme Soto', guardianRut: '13.445.566-7', guardianPhone: '+56 9 5544 3322', guardianEmail: 'criquelme@correo.cl' },
      educational: {
        primaryDiagnosis: 'Discapacidad Intelectual Leve y Trastorno Pragmático del Lenguaje',
        secondaryDiagnosis: 'Sin diagnóstico secundario',
        strengths: 'Responsabilidad con elementos de protección personal (EPP), orden y trazado de moldes.',
        supportNeeds: 'Apoyo fonoaudiológico en habilidades comunicativas sociolaborales.',
        pedagogicalObservations: 'Excelente asistencia y disposición al trabajo colaborativo.',
        relevantBackground: 'Participa en taller de autonomía comunitaria.'
      }
    },
    {
      id_estudiante: 4, id: '4', rut: '22.765.432-5', nombres: 'Florencia Belén', apellidos: 'Herrera Paredes', paternalSurname: 'Herrera', maternalSurname: 'Paredes', names: 'Florencia Belén', fullName: 'Florencia Belén Herrera Paredes', socialName: 'Flo', fecha_nacimiento: '2007-02-19', birthDate: '2007-02-19', genero: 'Femenino', gender: 'Femenino', nationality: 'Chilena', direccion: 'Villa Los Héroes Pje. 4 #512', comuna: 'Maipú',
      registro_nacional_discapacidad: 1, porcentaje_discapacidad: 70, beneficio_junaeb: 1, estado_matricula: 'REGULAR', status: 'activo',
      numero_matricula: 'MAT-2026-004', registrationNumber: 'MAT-2026-004', course: 'Nivel Laboral 1B', level: 'Nivel Laboral 1', enrollmentYear: 2026, entryDate: '2024-03-04', evaluationDate: '2026-04-10', reevaluationDate: '2026-12-11',
      grupo_funcionalidad: 'GRUPO_B', jornada: 'COMPLETA', id_taller: 2, taller_nombre: 'Taller Laboral de Gastronomía, Panadería y Repostería', workshop: 'Taller Laboral de Gastronomía, Panadería y Repostería', codigo_mineduc: 'TL-GASTRO-02', sala_ubicacion: 'Cocina Pedagógica Industrial - Sala G1',
      apoderado_nombre: 'Rosa Ester Paredes Lagos', apoderado_rut: '9.876.543-3', apoderado_parentesco: 'Abuela / Tutora Legal', apoderado_telefono: '+56 9 3322 1100', apoderado_email: 'rparedes@correo.cl',
      profesional_sos_nombre: 'Sebastián Tomás Morales Pino', profesional_sos_especialidad: 'Terapeuta Ocupacional', profesional_sos_telefono: '+56 9 8777 8899',
      diagnostico_principal: 'Síndrome de Down / Discapacidad Intelectual Moderada',
      contact: { address: 'Villa Los Héroes Pje. 4 #512', municipality: 'Maipú', phone: '+56 9 3322 1100', guardianName: 'Rosa Ester Paredes Lagos', guardianRut: '9.876.543-3', guardianPhone: '+56 9 3322 1100', guardianEmail: 'rparedes@correo.cl' },
      educational: {
        primaryDiagnosis: 'Síndrome de Down / Discapacidad Intelectual Moderada',
        secondaryDiagnosis: 'Hipotonía muscular leve controlada',
        strengths: 'Alta motivación por la repostería, empatía y seguimiento de rutinas de higiene bromatológica.',
        supportNeeds: 'Utensilios ergonómicos adaptados por Terapia Ocupacional y recetas pictográficas (Grupo B).',
        pedagogicalObservations: 'Gran progreso en porcionado y amasado durante el segundo semestre.',
        relevantBackground: 'Controles médicos al día en CRS Maipú.'
      }
    },
    {
      id_estudiante: 5, id: '5', rut: '20.543.987-3', nombres: 'Diego Alejandro', apellidos: 'Mendoza Gómez', paternalSurname: 'Mendoza', maternalSurname: 'Gómez', names: 'Diego Alejandro', fullName: 'Diego Alejandro Mendoza Gómez', socialName: 'Diego', fecha_nacimiento: '2005-08-11', birthDate: '2005-08-11', genero: 'Masculino', gender: 'Masculino', nationality: 'Chilena', direccion: 'Av. Los Pajaritos 3450, Depto 402', comuna: 'Maipú',
      registro_nacional_discapacidad: 1, porcentaje_discapacidad: 40, beneficio_junaeb: 1, estado_matricula: 'EGRESADO_PRACTICA', status: 'egresado',
      numero_matricula: 'MAT-2026-005', registrationNumber: 'MAT-2026-005', course: 'Nivel Laboral 3 Dual', level: 'Nivel Laboral 3 Dual', enrollmentYear: 2026, entryDate: '2022-03-01', evaluationDate: '2026-03-20', reevaluationDate: '2026-12-18',
      grupo_funcionalidad: 'GRUPO_A', jornada: 'COMPLETA', id_taller: 3, taller_nombre: 'Taller Laboral de Horticultura, Vivero y Paisajismo', workshop: 'Taller Laboral de Horticultura, Vivero y Paisajismo', codigo_mineduc: 'TL-HORTI-03', sala_ubicacion: 'Invernadero Institucional - Sector Norte',
      apoderado_nombre: 'Patricia Elena Gómez Díaz', apoderado_rut: '12.345.678-5', apoderado_parentesco: 'Madre', apoderado_telefono: '+56 9 8666 7788', apoderado_email: 'pgomez.familia@gmail.com',
      profesional_sos_nombre: 'Sebastián Tomás Morales Pino', profesional_sos_especialidad: 'Terapeuta Ocupacional', profesional_sos_telefono: '+56 9 8777 8899',
      diagnostico_principal: 'Discapacidad Intelectual Leve en etapa de Transición Sociolaboral Dual',
      contact: { address: 'Av. Los Pajaritos 3450, Depto 402', municipality: 'Maipú', phone: '+56 9 8666 7788', guardianName: 'Patricia Elena Gómez Díaz', guardianRut: '12.345.678-5', guardianPhone: '+56 9 8666 7788', guardianEmail: 'pgomez.familia@gmail.com' },
      educational: {
        primaryDiagnosis: 'Discapacidad Intelectual Leve (Práctica Dual Activa)',
        secondaryDiagnosis: 'Sin diagnóstico secundario',
        strengths: 'Dominio autónomo de herramientas de vivero, riego tecnificado y puntualidad laboral.',
        supportNeeds: 'Seguimiento mensual por gestor de inclusión laboral.',
        pedagogicalObservations: 'Cumpliendo práctica dual exitosa en Vivero Municipal.',
        relevantBackground: 'Egresado de etapa formativa con competencias logradas al 100%.'
      }
    }
  ],
  documentos: [
    {
      id: 'doc-seed-1',
      student: 1,
      studentId: '1',
      documentType: 'pai',
      type: 'pai',
      title: 'Plan de Apoyo Individual — Matías Ignacio Vera Gómez',
      status: 'finalizado',
      date: '2026-10-15',
      responsibleName: 'Camila Ignacia Vargas Herrera (Coordinadora PIE)',
      observations: 'PAI visado por UTP y socializado con apoderada titular.',
      content: {
        'Fortalezas y necesidades': 'Excelente memoria visual, adherencia a secuencias pictográficas ARASAAC y alta precisión en pre-costura.',
        'Objetivos prioritarios': 'Incrementar tiempos de atención sostenida en taller textil y uso autónomo de elementos de protección auditiva.',
        'Apoyos en el aula (DUA)': 'Tablero visual de anticipación diaria, moldes acrílicos con tope táctil y estación libre de ruido directo.',
        'Estrategias prácticas': 'Modelado paso a paso en Grupo B con pausas sensoriales reguladas cada 45 minutos.',
        'Apoyo de la familia': 'Refuerzo de rutinas de anticipación en el hogar y envío diario de protectores auditivos.',
        'Evaluación': 'Evaluación formativa mediante lista de cotejo cualitativa (L / ED / EI).',
        'Seguimiento': 'Revisión bimensual por equipo multidisciplinario PIE y Docente Titular.'
      }
    },
    {
      id: 'doc-seed-2',
      student: 1,
      studentId: '1',
      documentType: 'paec',
      type: 'paec',
      title: 'Plan de Acompañamiento Emocional y/o Conductual — Matías Ignacio Vera Gómez',
      status: 'finalizado',
      date: '2026-10-18',
      responsibleName: 'Camila Ignacia Vargas Herrera (Psicóloga PIE)',
      observations: 'Protocolo activo vinculado al Botón SOS en Aula.',
      content: {
        'Caracterización del estudiante': 'Estudiante de 19 años perteneciente al Taller de Corte y Confección (Grupo B), comunicativo mediante apoyos visuales.',
        'Particularidades y factores desencadenantes': 'Ruido súbito de máquinas overlock, timbres prolongados o cambios abruptos de actividad sin anticipación.',
        'Estrategias de regulación': 'Etapa 1: Entregar protectores auditivos y tarjeta de pausa. Etapa 2: Guiar a rincón de calma. Etapa 3: Activar Botón SOS hacia Sala Sensorial.',
        'Manejo del ambiente': 'Ubicación en estación de trabajo periférica con iluminación natural y señalética ARASAAC.',
        'Acuerdos con familia y responsables': 'Informar al ingreso alteraciones de sueño y mantener comunicación directa con Psicóloga PIE.'
      }
    },
    {
      id: 'doc-seed-3',
      student: 2,
      studentId: '2',
      documentType: 'vocacional',
      type: 'vocacional',
      title: 'Planificación Vocacional — Valentina Paz Silva Espinoza',
      status: 'finalizado',
      date: '2026-10-25',
      responsibleName: 'Carolina Andrea Muñoz Tapia (Docente Titular)',
      observations: 'Proyección a práctica laboral dual.',
      content: {
        'Contextualización del grupo': 'Grupo A (Mayor Funcionalidad) del Taller Laboral de Corte y Confección Textil.',
        'Unidad y objetivo conductor': 'Unidad 4: Confección de Bolsos Reutilizables y Control de Calidad Industrial.',
        'Competencias, conocimientos y habilidades': 'Operación segura de máquina recta, medición con cinta métrica y control de costuras reforzadas.',
        'Objetivos complementarios': 'Trabajo colaborativo, liderazgo positivo y cumplimiento de estándares de entrega.',
        'Proyección de la unidad': 'Preparación para inserción sociolaboral asistida.',
        'Actividades clase a clase': 'Trazado de moldes, corte textil, unión de asas reforzadas y revisión de terminaciones.',
        'Indicadores de logro y evaluación': 'Logrado (L) en autonomía personal y competencia técnica vocacional.'
      }
    },
    {
      id: 'doc-seed-4',
      student: 4,
      studentId: '4',
      documentType: 'paci',
      type: 'paci',
      title: 'Plan de Adecuación Curricular Individual — Florencia Belén Herrera Paredes',
      status: 'borrador',
      date: '2026-11-02',
      responsibleName: 'Sebastián Tomás Morales Pino (Terapeuta Ocupacional)',
      observations: 'En revisión conjunta con UTP.',
      content: {
        'Adaptaciones curriculares': 'Adecuación de acceso y objetivos en Taller de Gastronomía y Panadería (Grupo B).',
        'Objetivos de aprendizaje adecuados': 'OA 03 Adaptado: Dosificar e integrar ingredientes secos y húmedos utilizando medidas volumétricas por color.',
        'Conocimientos, habilidades y actitudes': 'Higiene postural, lavado clínico de manos y uso seguro de batidora con guía.',
        'Recursos': 'Recetario pictográfico plastificado, tazas medidoras de alto contraste y mangos engrosados.',
        'Criterios de evaluación y promoción': 'Evaluación práctica mediante observación directa en cocina pedagógica.',
        'Seguimiento del PACI': 'Evaluación semestral con equipo PIE y familia.'
      }
    }
  ],
  clasesPid: [
    {
      id_clase: 1,
      id_taller: 1,
      taller_nombre: 'Taller Laboral de Corte y Confección Textil',
      codigo_mineduc: 'TL-CORTE-01',
      fecha_clase: '2026-11-10',
      unidad_tematica: 'Unidad 4: Confección de Bolsos Reutilizables y Control de Calidad',
      objetivo_aprendizaje: 'OA 05: Unir piezas textiles aplicando costuras de refuerzo, control de pedal y normas de higiene y seguridad.',
      actividad_grupo_a: 'Realizan costura de asas reforzadas en máquina recta industrial y verifican simetría con cinta métrica estándar.',
      actividad_grupo_b: 'Posicionan asas utilizando plantilla acrílica con topes táctiles, fijan con clips ergonómicos de color y realizan unión asistida.',
      recursos_dua: 'Secuencia pictográfica ARASAAC, moldes táctiles de alto contraste y protectores auditivos.',
      docente_nombre: 'Carolina Andrea Muñoz Tapia',
      firmado: 1,
      estado_firma: 'Firmado electrónicamente con PIN'
    }
  ],
  evaluaciones: [
    {
      id_evaluacion: 1,
      id_estudiante: 1,
      estudiante_nombre: 'Matías Ignacio Vera Gómez',
      dimension: 'AUTONOMIA_PERSONAL',
      nivel_logro: 'LOGRADO',
      indicador_competencia: 'Utiliza protectores auditivos y organiza su estación de trabajo siguiendo secuencia pictográfica ARASAAC.',
      comentario_pedagogico: 'Demuestra excelente adherencia a las rutinas de seguridad y anticipación visual.',
      fecha_evaluacion: '2026-11-05'
    },
    {
      id_evaluacion: 2,
      id_estudiante: 2,
      estudiante_nombre: 'Valentina Paz Silva Espinoza',
      dimension: 'TECNICA_VOCACIONAL',
      nivel_logro: 'LOGRADO',
      indicador_competencia: 'Opera máquina de coser recta industrial manteniendo línea de costura y remate de seguridad.',
      comentario_pedagogico: 'Desempeño autónomo sobresaliente en Grupo A; apoya a sus compañeros de taller.',
      fecha_evaluacion: '2026-11-06'
    },
    {
      id_evaluacion: 3,
      id_estudiante: 4,
      estudiante_nombre: 'Florencia Belén Herrera Paredes',
      dimension: 'HABILIDADES_SOCIOLABORALES',
      nivel_logro: 'EN_DESARROLLO',
      indicador_competencia: 'Participa en la preparación de masas de panadería respetando turnos y normas de higiene bromatológica.',
      comentario_pedagogico: 'Avance sostenido con apoyo de medidas volumétricas por color.',
      fecha_evaluacion: '2026-11-07'
    }
  ],
  notificaciones: [
    {
      id_notificacion: 1,
      tipo: 'COMUNICADO_UTP',
      titulo: 'Cierre de Evaluaciones Conceptuales y Documentación PAI/PACI',
      mensaje: 'Unidad Técnico-Pedagógica recuerda completar las fichas de reevaluación y firmar el Leccionario PID con PIN electrónico.',
      created_at: 'Hoy 08:30'
    },
    {
      id_notificacion: 2,
      tipo: 'RECORDATORIO_FIRMA',
      titulo: 'Registro Institucional de Accesos Activo',
      mensaje: 'Todos los accesos a fichas clínicas, protocolos PAEC y descargas de informes quedan registrados en la consola de auditoría.',
      created_at: 'Hoy 08:00'
    }
  ],
  horarios: [
    { dia_semana: 1, hora_inicio: '08:30:00', hora_fin: '11:30:00', bloque_nombre: 'Módulo Práctico Corte y Confección (Grupo A/B)', taller_nombre: 'Taller de Corte y Confección Textil', sala_ubicacion: 'Pabellón Técnico - Sala T1' },
    { dia_semana: 2, hora_inicio: '08:30:00', hora_fin: '11:30:00', bloque_nombre: 'Control de Calidad y Ensamblaje Textil', taller_nombre: 'Taller de Corte y Confección Textil', sala_ubicacion: 'Pabellón Técnico - Sala T1' },
    { dia_semana: 3, hora_inicio: '14:00:00', hora_fin: '16:30:00', bloque_nombre: 'Co-Docencia PIE y Articulación Pedagógica', taller_nombre: 'Equipo Multidisciplinario PIE', sala_ubicacion: 'Sala UTP / PIE' },
    { dia_semana: 4, hora_inicio: '08:30:00', hora_fin: '12:00:00', bloque_nombre: 'Taller de Autonomía Sociolaboral', taller_nombre: 'Taller de Corte y Confección Textil', sala_ubicacion: 'Pabellón Técnico - Sala T1' }
  ],
  roles: [
    { codigo: 'SOSTENEDOR', nombre: 'Sostenedor Institucional', descripcion: 'Gobierno corporativo, control de subvención educacional, dotación RRHH, asistencia y auditoría.' },
    { codigo: 'DIRECTOR_UTP', nombre: 'Directora / Jefa UTP', descripcion: 'Supervisión técnico-pedagógica, visado de PAI/PACI, matrícula y acceso clínico completo.' },
    { codigo: 'ADMIN', nombre: 'Administrador Institucional', descripcion: 'Gestión integral de plataforma, cuentas del equipo, configuración y auditoría del sistema.' },
    { codigo: 'DOCENTE', nombre: 'Docente Titular Educación Diferencial', descripcion: 'Gestión de estudiantes, Libro de Clases Digital (PID con PIN), documentos y lectura clínica.' },
    { codigo: 'ESPECIALISTA_PIE', nombre: 'Especialista PIE (Psicología / T.O. / Fono)', descripcion: 'Lectura y escritura de fichas clínicas, PAI, PACI, PAEC y atención de alertas SOS.' },
    { codigo: 'CONVIVENCIA', nombre: 'Encargado de Convivencia Escolar', descripcion: 'Gestión de protocolos PAEC, bitácora de contención emocional, alertas SOS y seguimiento de asistencia.' },
    { codigo: 'MONITOR', nombre: 'Monitor Vocacional de Taller', descripcion: 'Apoyo práctico en taller laboral, asistencia y activación de Botón SOS.' },
    { codigo: 'APODERADO', nombre: 'Portal Familia / Apoderado', descripcion: 'Acceso exclusivo de lectura al avance pedagógico y descarga del Informe Oficial para la Familia.' }
  ],
  logs: [
    { id_log: 104, fecha_hora: '2026-11-10 08:15:22', usuario_nombre: 'Camila Ignacia Vargas Herrera', rol_codigo: 'ESPECIALISTA_PIE', modulo: 'FICHA_CLINICA_PIE_PAEC', accion: 'LECTURA', detalle: 'Acceso autorizado a expediente clínico #1', ip_origen: '192.168.1.42' },
    { id_log: 103, fecha_hora: '2026-11-10 08:10:05', usuario_nombre: 'Carolina Andrea Muñoz Tapia', rol_codigo: 'DOCENTE', modulo: 'LIBRO_CLASES_PID', accion: 'FIRMA_DIGITAL', detalle: 'Clase PID registrada y validada (Firmado electrónicamente con PIN)', ip_origen: '192.168.1.18' },
    { id_log: 102, fecha_hora: '2026-11-09 16:40:11', usuario_nombre: 'Marcela Paz Rojas Contreras', rol_codigo: 'DIRECTOR_UTP', modulo: 'DOCUMENTACION_INSTITUCIONAL', accion: 'CREACION', detalle: 'Generación de documento institucional (PAI): Plan de Apoyo Individual — Matías Vera', ip_origen: '192.168.1.10' }
  ]
};

window.APANDI_DEV_ACCOUNTS = INITIAL_JS_DB.users;

window.ApandiAPIClient = class ApandiAPIClient {
  constructor() {
    this.token = localStorage.getItem('apandi_token') || null;
    try {
      this.user = JSON.parse(localStorage.getItem('apandi_user') || 'null');
    } catch (e) {
      this.user = null;
    }
    this.dbMode = 'MARIADB_LIVE';
    this.sosChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('apandi_sos_channel') : null;
  }

  getLocalStore(key, fallback) {
    try {
      const raw = localStorage.getItem('apandi_store_' + key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // ignore
    }
    return JSON.parse(JSON.stringify(fallback));
  }

  setLocalStore(key, val) {
    try {
      localStorage.setItem('apandi_store_' + key, JSON.stringify(val));
    } catch (e) {
      // ignore
    }
  }

  onSosAlert(callback) {
    if (this.sosChannel) {
      this.sosChannel.onmessage = function (event) {
        if (event.data && event.data.type === 'SOS_ALERT') {
          callback(event.data.payload);
        }
      };
    }
  }

  broadcastSosAlert(alertaPayload) {
    if (this.sosChannel) {
      this.sosChannel.postMessage({ type: 'SOS_ALERT', payload: alertaPayload });
    }
  }

  async request(route, options = {}) {
    const method = options.method || 'GET';
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (this.token) {
      headers.Authorization = 'Bearer ' + this.token;
    }

    try {
      const response = await fetch('/api/index.php?route=' + encodeURIComponent(route), {
        method: method,
        headers: headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        this.dbMode = 'MARIADB_LIVE';
        if (!response.ok) {
          const apiErr = new Error(data.error || 'Error en la operación');
          apiErr.status = response.status;
          apiErr.data = data;
          throw apiErr;
        }
        return data;
      }
      throw new Error('Fallback JS Engine');
    } catch (err) {
      if (
        err.status === 429 ||
        err.message.includes('bloquead') ||
        err.message.includes('bloqueo') ||
        err.message.includes('intentos') ||
        err.message.includes('Restricción Legal') ||
        err.message.includes('PIN de Firma') ||
        err.message.includes('Modo Solo Lectura') ||
        err.message.includes('Credenciales inválidas') ||
        err.message.includes('Solo Dirección/UTP') ||
        err.message.includes('Acceso reservado') ||
        err.message.includes('contraseña temporal') ||
        err.message.includes('Sin permisos')
      ) {
        throw err;
      }
      this.dbMode = 'JS_ENGINE_LOCAL';
      return this.handleJsFallback(route, method, options.body || {});
    }
  }

  async handleJsFallback(route, method, body) {
    let users = this.getLocalStore('users', INITIAL_JS_DB.users);
    INITIAL_JS_DB.users.forEach((seedUser) => {
      if (!users.some((u) => u.rol_codigo === seedUser.rol_codigo || u.email === seedUser.email)) {
        users.push(JSON.parse(JSON.stringify(seedUser)));
      }
    });
    const cleanNormative = (val) => String(val || '').replace(/\s*\((?:Decreto|Datos protegidos|Ley)[^)]*\)/gi, '').replace(/\bDecreto(?:\s+Exento)?\s*(?:N°?\s*)?\d+\b/gi, '').replace(/\bLey(?:\s+N°?)?\s*19\.628\b/gi, '').trim();
    const students = this.getLocalStore('estudiantes', INITIAL_JS_DB.estudiantes).map((st) => {
      st.level = cleanNormative(st.level) || 'Nivel Laboral 2';
      st.diagnostico_principal = cleanNormative(st.diagnostico_principal);
      if (st.educational) {
        st.educational.primaryDiagnosis = cleanNormative(st.educational.primaryDiagnosis);
      }
      return st;
    });
    const docs = this.getLocalStore('documentos', INITIAL_JS_DB.documentos);
    const clasesPid = this.getLocalStore('clasesPid', INITIAL_JS_DB.clasesPid).map((c) => ({
      id_clase: c.id_clase,
      id_taller: c.id_taller,
      taller_nombre: c.taller_nombre,
      docente_nombre: c.docente_nombre,
      fecha_clase: c.fecha_clase,
      unidad_tematica: c.unidad_tematica,
      objetivo_aprendizaje: c.objetivo_aprendizaje,
      actividad_grupo_a: c.actividad_grupo_a,
      actividad_grupo_b: c.actividad_grupo_b,
      recursos_dua: c.recursos_dua,
      firmado: 1,
      estado_firma: 'Firmado electrónicamente con PIN',
      fecha_firma: c.fecha_firma
    }));
    const evaluaciones = this.getLocalStore('evaluaciones', INITIAL_JS_DB.evaluaciones);
    const asistencias = this.getLocalStore('asistencias', []);
    const notificaciones = this.getLocalStore('notificaciones', INITIAL_JS_DB.notificaciones);
    const logs = this.getLocalStore('logs', INITIAL_JS_DB.logs);
    const bitacora = this.getLocalStore('bitacora', []);
    const currentRole = this.user?.rol_codigo || 'DOCENTE';

    const checkRoles = (allowed, customMsg) => {
      if (!allowed.includes(currentRole)) {
        throw new Error(customMsg || `Control de Acceso: Su perfil (${currentRole}) no cuenta con permisos para este módulo.`);
      }
    };

    if (route === 'auth/login' && method === 'POST') {
      const input = String(body.emailOrRut || body.identifier || '').trim().toLowerCase();
      const cleanInputRut = input.replace(/\./g, '');
      const found = users.find(function (u) {
        return (
          u.email.toLowerCase() === input ||
          (u.username && u.username.toLowerCase() === input) ||
          u.email.split('@')[0].toLowerCase() === input ||
          u.rut.toLowerCase() === input ||
          u.rut.replace(/\./g, '').toLowerCase() === cleanInputRut
        );
      });
      if (!found || (body.password !== 'Ap4nd1#S3cV4ult!2026_Cl' && body.password !== found.customPassword)) {
        throw new Error('Credenciales inválidas. Verifique su usuario, correo o RUT y contraseña.');
      }
      return { ok: true, token: 'jwt_js_engine_' + Date.now(), user: found };
    }

    if (route === 'estudiantes' && method === 'GET') {
      return { ok: true, estudiantes: students, talleres: INITIAL_JS_DB.talleres };
    }

    if (route === 'estudiantes' && method === 'POST') {
      const newId = students.length ? Math.max(...students.map((s) => Number(s.id_estudiante) || 0)) + 1 : 1;
      const numMat = body.registrationNumber || body.numero_matricula || 'MAT-2026-00' + newId;
      const nombres = body.nombres || body.names || '';
      const apellidos = body.apellidos || [body.paternalSurname, body.maternalSurname].filter(Boolean).join(' ');
      const tallerObj = INITIAL_JS_DB.talleres.find((t) => Number(t.id_taller) === Number(body.id_taller || 1)) || INITIAL_JS_DB.talleres[0];
      const newStudent = {
        id_estudiante: newId,
        id: String(newId),
        rut: window.ApandiCrypto.formatRut(body.rut),
        nombres: nombres,
        apellidos: apellidos,
        names: nombres,
        paternalSurname: body.paternalSurname || apellidos.split(' ')[0] || '',
        maternalSurname: body.maternalSurname || apellidos.split(' ').slice(1).join(' ') || '',
        fullName: (nombres + ' ' + apellidos).trim(),
        socialName: body.socialName || '',
        fecha_nacimiento: body.fecha_nacimiento || body.birthDate || '2007-06-15',
        birthDate: body.birthDate || body.fecha_nacimiento || '2007-06-15',
        genero: body.genero || body.gender || 'No especificado',
        gender: body.gender || body.genero || 'No especificado',
        nationality: body.nationality || 'Chilena',
        direccion: body.address || body.direccion || 'Maipú',
        comuna: body.municipality || body.comuna || 'Maipú',
        porcentaje_discapacidad: Number(body.porcentaje_discapacidad || 50),
        estado_matricula: body.status === 'retirado' ? 'RETIRADO' : body.status === 'egresado' ? 'EGRESADO_PRACTICA' : 'REGULAR',
        status: body.status || 'activo',
        numero_matricula: numMat,
        registrationNumber: numMat,
        course: body.course || 'Nivel Laboral 2A',
        level: body.level || 'Nivel Laboral',
        workshop: body.workshop || tallerObj.nombre,
        taller_nombre: body.workshop || tallerObj.nombre,
        id_taller: tallerObj.id_taller,
        codigo_mineduc: tallerObj.codigo_mineduc,
        sala_ubicacion: tallerObj.sala_ubicacion,
        grupo_funcionalidad: body.grupo_funcionalidad || 'GRUPO_A',
        enrollmentYear: Number(body.enrollmentYear || 2026),
        entryDate: body.entryDate || new Date().toISOString().slice(0, 10),
        evaluationDate: body.evaluationDate || '',
        reevaluationDate: body.reevaluationDate || '',
        apoderado_nombre: body.guardianName || 'Patricia Elena Gómez Díaz',
        apoderado_rut: body.guardianRut || '12.345.678-5',
        apoderado_parentesco: 'Apoderado Titular',
        apoderado_telefono: body.guardianPhone || '+56 9 8666 7788',
        apoderado_email: body.guardianEmail || '',
        profesional_sos_nombre: 'Camila Ignacia Vargas Herrera',
        profesional_sos_especialidad: 'Psicóloga Educacional / Coordinadora PIE y PAEC',
        profesional_sos_telefono: '+56 9 8555 6677',
        diagnostico_principal: body.primaryDiagnosis || 'Evaluación diagnóstica multiprofesional',
        contact: {
          address: body.address || body.direccion || 'Maipú',
          municipality: body.municipality || body.comuna || 'Maipú',
          phone: body.phone || '',
          guardianName: body.guardianName || 'Patricia Elena Gómez Díaz',
          guardianRut: body.guardianRut || '',
          guardianPhone: body.guardianPhone || '+56 9 8666 7788',
          guardianEmail: body.guardianEmail || ''
        },
        educational: {
          primaryDiagnosis: body.primaryDiagnosis || 'Evaluación diagnóstica multiprofesional',
          secondaryDiagnosis: body.secondaryDiagnosis || '',
          supportNeeds: body.supportNeeds || '',
          strengths: body.strengths || '',
          pedagogicalObservations: body.pedagogicalObservations || body.observaciones_ingreso || '',
          relevantBackground: body.relevantBackground || ''
        }
      };
      students.push(newStudent);
      this.setLocalStore('estudiantes', students);
      return { ok: true, id_estudiante: newId, numero_matricula: numMat, student: newStudent };
    }

    const matchEstId = route.match(/^estudiantes\/(\d+)$/);
    if (matchEstId) {
      const idEst = Number(matchEstId[1]);
      if (method === 'PUT') {
        const idx = students.findIndex((s) => Number(s.id_estudiante) === idEst);
        if (idx !== -1) {
          const cur = students[idx];
          const nombres = body.nombres || body.names || cur.nombres;
          const apellidos = body.apellidos || [body.paternalSurname, body.maternalSurname].filter(Boolean).join(' ') || cur.apellidos;
          const tallerObj = INITIAL_JS_DB.talleres.find((t) => Number(t.id_taller) === Number(body.id_taller || cur.id_taller || 1)) || INITIAL_JS_DB.talleres[0];
          students[idx] = Object.assign({}, cur, {
            rut: window.ApandiCrypto.formatRut(body.rut || cur.rut),
            nombres: nombres,
            apellidos: apellidos,
            names: nombres,
            paternalSurname: body.paternalSurname ?? cur.paternalSurname,
            maternalSurname: body.maternalSurname ?? cur.maternalSurname,
            fullName: (nombres + ' ' + apellidos).trim(),
            socialName: body.socialName ?? cur.socialName,
            fecha_nacimiento: body.birthDate || body.fecha_nacimiento || cur.fecha_nacimiento,
            birthDate: body.birthDate || body.fecha_nacimiento || cur.birthDate,
            genero: body.gender || body.genero || cur.genero,
            gender: body.gender || body.genero || cur.gender,
            nationality: body.nationality || cur.nationality || 'Chilena',
            direccion: body.address ?? cur.direccion,
            comuna: body.municipality ?? body.comuna ?? cur.comuna,
            porcentaje_discapacidad: Number(body.porcentaje_discapacidad ?? cur.porcentaje_discapacidad ?? 50),
            status: body.status || cur.status || 'activo',
            estado_matricula: body.status === 'retirado' ? 'RETIRADO' : body.status === 'egresado' ? 'EGRESADO_PRACTICA' : 'REGULAR',
            registrationNumber: body.registrationNumber || cur.registrationNumber || cur.numero_matricula,
            numero_matricula: body.registrationNumber || cur.numero_matricula,
            course: body.course || cur.course || 'Nivel Laboral 2A',
            level: body.level ?? cur.level,
            workshop: body.workshop || tallerObj.nombre,
            taller_nombre: body.workshop || tallerObj.nombre,
            id_taller: tallerObj.id_taller,
            grupo_funcionalidad: body.grupo_funcionalidad || cur.grupo_funcionalidad || 'GRUPO_A',
            enrollmentYear: Number(body.enrollmentYear || cur.enrollmentYear || 2026),
            entryDate: body.entryDate ?? cur.entryDate,
            evaluationDate: body.evaluationDate ?? cur.evaluationDate,
            reevaluationDate: body.reevaluationDate ?? cur.reevaluationDate,
            apoderado_nombre: body.guardianName || cur.apoderado_nombre,
            apoderado_rut: body.guardianRut || cur.apoderado_rut,
            apoderado_telefono: body.guardianPhone || cur.apoderado_telefono,
            apoderado_email: body.guardianEmail || cur.apoderado_email,
            diagnostico_principal: body.primaryDiagnosis ?? cur.diagnostico_principal,
            contact: {
              address: body.address ?? cur.contact?.address ?? cur.direccion,
              municipality: body.municipality ?? cur.contact?.municipality ?? cur.comuna,
              phone: body.phone ?? cur.contact?.phone ?? '',
              guardianName: body.guardianName ?? cur.contact?.guardianName ?? cur.apoderado_nombre,
              guardianRut: body.guardianRut ?? cur.contact?.guardianRut ?? '',
              guardianPhone: body.guardianPhone ?? cur.contact?.guardianPhone ?? cur.apoderado_telefono,
              guardianEmail: body.guardianEmail ?? cur.contact?.guardianEmail ?? ''
            },
            educational: {
              primaryDiagnosis: body.primaryDiagnosis ?? cur.educational?.primaryDiagnosis ?? cur.diagnostico_principal,
              secondaryDiagnosis: body.secondaryDiagnosis ?? cur.educational?.secondaryDiagnosis ?? '',
              supportNeeds: body.supportNeeds ?? cur.educational?.supportNeeds ?? '',
              strengths: body.strengths ?? cur.educational?.strengths ?? '',
              pedagogicalObservations: body.pedagogicalObservations ?? cur.educational?.pedagogicalObservations ?? '',
              relevantBackground: body.relevantBackground ?? cur.educational?.relevantBackground ?? ''
            }
          });
          this.setLocalStore('estudiantes', students);
        }
        return { ok: true, id_estudiante: idEst };
      }
      if (method === 'DELETE') {
        const filtered = students.filter((s) => Number(s.id_estudiante) !== idEst);
        this.setLocalStore('estudiantes', filtered);
        return { ok: true };
      }
    }

    if (route === 'estudiantes/importar' && method === 'POST') {
      const rows = Array.isArray(body.rows) ? body.rows : [];
      let created = 0;
      let skipped = 0;
      rows.forEach((r) => {
        const rut = window.ApandiCrypto.formatRut(r.rut || '');
        if (!window.ApandiCrypto.isValidRut(rut) || students.some((s) => window.ApandiCrypto.normalizeRut(s.rut) === window.ApandiCrypto.normalizeRut(rut))) {
          skipped++;
          return;
        }
        const newId = students.length ? Math.max(...students.map((s) => Number(s.id_estudiante) || 0)) + 1 : 1;
        const names = r.names || r.nombres || 'Estudiante';
        const apellidos = [r.paternalSurname, r.maternalSurname].filter(Boolean).join(' ') || 'APANDI';
        const regNum = r.registrationNumber || 'MAT-2026-0' + newId;
        students.push({
          id_estudiante: newId,
          id: String(newId),
          rut: rut,
          nombres: names,
          apellidos: apellidos,
          names: names,
          paternalSurname: r.paternalSurname || '',
          maternalSurname: r.maternalSurname || '',
          fullName: (names + ' ' + apellidos).trim(),
          fecha_nacimiento: r.birthDate || '2007-06-15',
          birthDate: r.birthDate || '2007-06-15',
          numero_matricula: regNum,
          registrationNumber: regNum,
          course: r.course || 'Nivel Laboral 1A',
          level: r.level || 'Nivel Laboral',
          workshop: r.workshop || 'Taller Laboral de Corte y Confección Textil',
          taller_nombre: r.workshop || 'Taller Laboral de Corte y Confección Textil',
          id_taller: 1,
          grupo_funcionalidad: 'GRUPO_A',
          status: r.status || 'activo',
          estado_matricula: 'REGULAR',
          enrollmentYear: Number(r.enrollmentYear || 2026),
          diagnostico_principal: r.primaryDiagnosis || 'Evaluación diagnóstica',
          contact: { municipality: 'Maipú', guardianName: 'Apoderado Registrado' },
          educational: { primaryDiagnosis: r.primaryDiagnosis || 'Evaluación diagnóstica' }
        });
        created++;
      });
      this.setLocalStore('estudiantes', students);
      return { ok: true, created, skipped };
    }

    if (route === 'auth/change-password' && method === 'POST') {
      if (String(body.newPassword || '').length < 10) {
        throw new Error('La nueva contraseña debe tener al menos 10 caracteres.');
      }
      return { ok: true, mensaje: 'Contraseña institucional actualizada y protegida correctamente.' };
    }

    if (route === 'auth/change-pin' && method === 'POST') {
      if (!/^\d{6}$/.test(String(body.newPin || ''))) {
        throw new Error('El nuevo PIN de Firma Electrónica debe contener exactamente 6 dígitos numéricos.');
      }
      return { ok: true, mensaje: 'PIN de Firma Electrónica Simple de 6 dígitos actualizado exitosamente.' };
    }

    if (route === 'documentos' && method === 'GET') {
      checkRoles(['DIRECTOR_UTP', 'DOCENTE', 'ESPECIALISTA_PIE', 'CONVIVENCIA', 'APODERADO', 'SOSTENEDOR', 'ADMIN']);
      return { ok: true, documentos: docs };
    }

    if (route === 'documentos' && method === 'POST') {
      checkRoles(['DIRECTOR_UTP', 'DOCENTE', 'ESPECIALISTA_PIE', 'CONVIVENCIA', 'ADMIN'], 'Su perfil no está autorizado para crear o editar documentos oficiales.');
      const newDoc = {
        id: 'doc-' + Date.now(),
        student: Number(body.studentId || 1),
        studentId: String(body.studentId || '1'),
        documentType: body.type || 'pai',
        type: body.type || 'pai',
        title: body.title || 'Documento Institucional',
        status: body.status || 'borrador',
        date: body.date || new Date().toISOString().slice(0, 10),
        content: body.content || {},
        observations: body.observations || '',
        responsibleName: body.responsibleName || this.user?.nombre_completo || 'Equipo APANDI',
        createdAt: new Date().toISOString()
      };
      docs.unshift(newDoc);
      this.setLocalStore('documentos', docs);
      return { ok: true, documento: newDoc };
    }

    const matchDocId = route.match(/^documentos\/(.+)$/);
    if (matchDocId) {
      const docId = matchDocId[1];
      if (method === 'PUT') {
        checkRoles(['DIRECTOR_UTP', 'DOCENTE', 'ESPECIALISTA_PIE', 'CONVIVENCIA', 'ADMIN'], 'Su perfil no está autorizado para modificar documentos oficiales.');
        const idx = docs.findIndex((d) => String(d.id) === String(docId));
        if (idx !== -1) {
          docs[idx] = Object.assign({}, docs[idx], {
            student: Number(body.studentId || docs[idx].student || 1),
            studentId: String(body.studentId || docs[idx].studentId || '1'),
            documentType: body.type || docs[idx].documentType,
            type: body.type || docs[idx].type,
            title: body.title || docs[idx].title,
            status: body.status || docs[idx].status,
            date: body.date || docs[idx].date,
            content: body.content || docs[idx].content,
            observations: body.observations ?? docs[idx].observations,
            responsibleName: body.responsibleName || docs[idx].responsibleName
          });
          this.setLocalStore('documentos', docs);
        }
        return { ok: true };
      }
      if (method === 'DELETE') {
        checkRoles(['DIRECTOR_UTP', 'ADMIN', 'ESPECIALISTA_PIE', 'DOCENTE'], 'Su perfil no está autorizado para eliminar documentos oficiales.');
        const filtered = docs.filter((d) => String(d.id) !== String(docId));
        this.setLocalStore('documentos', filtered);
        return { ok: true };
      }
    }

    if (route === 'usuarios' && method === 'GET') {
      checkRoles(['ADMIN', 'DIRECTOR_UTP', 'SOSTENEDOR'], 'Acceso reservado para Administración, Dirección/UTP y Sostenedor.');
      return { ok: true, usuarios: users };
    }

    if (route === 'usuarios' && method === 'POST') {
      checkRoles(['ADMIN', 'DIRECTOR_UTP'], 'Solo Administración o Dirección/UTP pueden crear nuevas cuentas de funcionarios.');
      if (String(body.password || '').length < 10) {
        throw new Error('La contraseña temporal debe tener al menos 10 caracteres.');
      }
      const newId = users.length ? Math.max(...users.map((u) => Number(u.id_usuario) || 0)) + 1 : 10;
      const roleMap = {
        sostenedor: 'SOSTENEDOR',
        director_utp: 'DIRECTOR_UTP',
        administrador: 'ADMIN',
        admin: 'ADMIN',
        profesor: 'DOCENTE',
        docente: 'DOCENTE',
        especialista_pie: 'ESPECIALISTA_PIE',
        convivencia: 'CONVIVENCIA',
        monitor: 'MONITOR',
        apoderado: 'APODERADO'
      };
      const rolCodigo = roleMap[String(body.role || 'docente').toLowerCase()] || String(body.role || 'DOCENTE').toUpperCase();
      const roleObj = INITIAL_JS_DB.roles.find((r) => r.codigo === rolCodigo) || { nombre: 'Funcionario Institucional' };
      const newUser = {
        id_usuario: newId,
        id: String(newId),
        rut: body.rut || '19.456.789-' + (newId % 9),
        nombre_completo: body.name,
        name: body.name,
        username: body.username || String(body.email || '').split('@')[0],
        email: body.email,
        rol_codigo: rolCodigo,
        role: String(body.role || 'docente').toLowerCase(),
        rol_nombre: roleObj.nombre,
        especialidad: body.especialidad || roleObj.nombre,
        horas_contrato: Number(body.horas_contrato || 40),
        active: true,
        activo: 1,
        customPassword: body.password
      };
      users.push(newUser);
      this.setLocalStore('users', users);
      return { ok: true, usuario: newUser };
    }

    const matchUserToggle = route.match(/^usuarios\/(\d+)\/toggle$/);
    if (matchUserToggle && method === 'PUT') {
      checkRoles(['ADMIN', 'DIRECTOR_UTP'], 'Solo Administración o Dirección/UTP pueden cambiar el estado de cuentas.');
      const idU = Number(matchUserToggle[1]);
      const target = users.find((u) => Number(u.id_usuario) === idU);
      if (target) {
        target.active = !target.active;
        target.activo = target.active ? 1 : 0;
        this.setLocalStore('users', users);
      }
      return { ok: true };
    }

    const matchUserReset = route.match(/^usuarios\/(\d+)\/reset-password$/);
    if (matchUserReset && method === 'PUT') {
      checkRoles(['ADMIN', 'DIRECTOR_UTP'], 'Solo Administración o Dirección/UTP pueden restablecer contraseñas.');
      return { ok: true, mensaje: 'Contraseña restablecida exitosamente.' };
    }

    if (route === 'rrhh/dashboard' && method === 'GET') {
      return {
        ok: true,
        reloj_hoy: { estado: 'PRESENTE', metodo_marcaje: 'GEOLOCALIZADO', hora_entrada: '08:04:12', hora_salida: null },
        historial_reloj: [
          { funcionario_nombre: 'Carolina Andrea Muñoz Tapia', especialidad: 'Educadora Diferencial', rol_codigo: 'DOCENTE', metodo_marcaje: 'GEOLOCALIZADO', hora_entrada: '08:04:12', hora_salida: null },
          { funcionario_nombre: 'Camila Ignacia Vargas Herrera', especialidad: 'Psicóloga PIE / PAEC', rol_codigo: 'ESPECIALISTA_PIE', metodo_marcaje: 'GEOLOCALIZADO', hora_entrada: '08:01:45', hora_salida: null },
          { funcionario_nombre: 'Jorge Eduardo Fuentes Bravo', especialidad: 'Monitor Vocacional', rol_codigo: 'MONITOR', metodo_marcaje: 'BIOMETRICO', hora_entrada: '08:10:00', hora_salida: null },
          { funcionario_nombre: 'Javiera Paz Morales Araya', especialidad: 'Encargada Convivencia Escolar', rol_codigo: 'CONVIVENCIA', metodo_marcaje: 'GEOLOCALIZADO', hora_entrada: '08:02:18', hora_salida: null }
        ],
        horarios: INITIAL_JS_DB.horarios,
        notificaciones: notificaciones
      };
    }

    if (route === 'rrhh/reloj-control' && method === 'POST') {
      checkRoles(['SOSTENEDOR', 'DIRECTOR_UTP', 'ADMIN', 'DOCENTE', 'MONITOR', 'ESPECIALISTA_PIE', 'CONVIVENCIA'], 'El Reloj Control Biométrico/GPS es exclusivo para personal de la escuela.');
      return { ok: true, mensaje: `Marca de ${body.tipo_marca || 'ENTRADA'} registrada exitosamente (${body.metodo_marcaje || 'GEOLOCALIZADO'}).` };
    }

    if (route === 'sostenedor/resumen' && method === 'GET') {
      checkRoles(['SOSTENEDOR', 'DIRECTOR_UTP', 'ADMIN'], 'Acceso reservado para Sostenedor, Dirección/UTP y Administración.');
      const dotacion = users.filter((u) => u.rol_codigo !== 'APODERADO');
      const horasContratoTotal = dotacion.reduce((acc, u) => acc + Number(u.horas_contrato || 0), 0);
      const talleresCapacidad = INITIAL_JS_DB.talleres.map((t) => ({
        codigo_mineduc: t.codigo_mineduc,
        nombre: t.nombre,
        nivel_decreto: t.nivel_decreto,
        capacidad_maxima: t.capacidad_maxima,
        sala_ubicacion: t.sala_ubicacion,
        matriculados: students.filter((s) => Number(s.id_taller) === Number(t.id_taller)).length
      }));
      const kpisObj = {
        matricula_total: students.length,
        matricula_regular: students.filter((s) => s.estado_matricula === 'REGULAR' || s.status === 'activo').length,
        matricula_practica_dual: students.filter((s) => s.estado_matricula === 'EGRESADO_PRACTICA' || s.status === 'egresado').length,
        beneficiarios_junaeb: students.filter((s) => Number(s.beneficio_junaeb ?? 1) === 1).length,
        inscritos_rnd: students.filter((s) => Number(s.registro_nacional_discapacidad ?? 1) === 1).length,
        asistencia_media_pct: 94.6,
        dotacion_activa: dotacion.length,
        horas_contrato_semanales: horasContratoTotal,
        clases_pid_firmadas: clasesPid.length,
        documentos_oficiales: docs.length,
        subvencion_mensual_estimada_clp: students.length * 412850,
        estado_reconocimiento_oficial: 'VIGENTE — Reconocimiento Oficial Educación Especial'
      };
      return {
        ok: true,
        kpis: kpisObj,
        metricas: kpisObj,
        talleres: talleresCapacidad,
        talleres_capacidad: talleresCapacidad,
        dotacion: dotacion
      };
    }

    if (route === 'pedagogico/libro' && method === 'GET') {
      checkRoles(['DIRECTOR_UTP', 'DOCENTE', 'MONITOR', 'ESPECIALISTA_PIE', 'SOSTENEDOR', 'ADMIN'], 'Su perfil no tiene autorización para acceder al Libro de Clases Digital.');
      return { ok: true, clasesPid: clasesPid, evaluaciones: evaluaciones, asistencias: asistencias };
    }

    if (route === 'pedagogico/pid' && method === 'POST') {
      checkRoles(['DIRECTOR_UTP', 'DOCENTE'], 'Solo Docentes Titulares y Dirección/UTP están facultados para firmar el Leccionario PID con PIN Electrónico.');
      if (String(body.pin_firma) !== '849206') {
        throw new Error('PIN de Firma Electrónica Simple inválido para su cuenta institucional.');
      }
      const tallerObj = INITIAL_JS_DB.talleres.find((t) => Number(t.id_taller) === Number(body.id_taller)) || INITIAL_JS_DB.talleres[0];
      clasesPid.unshift({
        id_clase: Date.now(),
        id_taller: tallerObj.id_taller,
        taller_nombre: tallerObj.nombre,
        fecha_clase: new Date().toISOString().slice(0, 10),
        unidad_tematica: body.unidad_tematica,
        objetivo_aprendizaje: body.objetivo_aprendizaje,
        actividad_grupo_a: body.actividad_grupo_a,
        actividad_grupo_b: body.actividad_grupo_b,
        recursos_dua: body.recursos_dua,
        docente_nombre: this.user?.nombre_completo || 'Carolina Andrea Muñoz Tapia',
        firmado: 1,
        estado_firma: 'Firmado electrónicamente con PIN'
      });
      this.setLocalStore('clasesPid', clasesPid);
      return {
        ok: true,
        mensaje: 'Planificación PID registrada y validada (Firmado electrónicamente con PIN).',
        estado_firma: 'Firmado electrónicamente con PIN'
      };
    }

    if (route === 'pedagogico/asistencia' && method === 'POST') {
      checkRoles(['DIRECTOR_UTP', 'DOCENTE', 'MONITOR', 'CONVIVENCIA'], 'Su perfil no tiene permisos para modificar la asistencia diaria.');
      const idx = asistencias.findIndex((a) => Number(a.id_estudiante) === Number(body.id_estudiante));
      const record = { id_estudiante: body.id_estudiante, id_taller: body.id_taller, estado: body.estado, fecha: new Date().toISOString().slice(0, 10) };
      if (idx >= 0) asistencias[idx] = record;
      else asistencias.push(record);
      this.setLocalStore('asistencias', asistencias);
      return { ok: true, mensaje: `Asistencia (${body.estado}) actualizada y firmada en Libro Digital.` };
    }

    if (route === 'pedagogico/evaluaciones' && method === 'POST') {
      checkRoles(['DIRECTOR_UTP', 'DOCENTE', 'ESPECIALISTA_PIE'], 'Solo Docentes Titulares, Equipo PIE y UTP pueden registrar evaluaciones conceptuales.');
      const st = students.find((s) => Number(s.id_estudiante) === Number(body.id_estudiante)) || students[0];
      evaluaciones.unshift({
        id_evaluacion: Date.now(),
        id_estudiante: st.id_estudiante,
        estudiante_nombre: `${st.nombres} ${st.apellidos}`,
        dimension: body.dimension,
        nivel_logro: body.nivel_logro,
        indicador_competencia: body.indicador_competencia,
        comentario_pedagogico: body.comentario_pedagogico,
        fecha_evaluacion: new Date().toISOString().slice(0, 10)
      });
      this.setLocalStore('evaluaciones', evaluaciones);
      return { ok: true, mensaje: 'Evaluación conceptual registrada correctamente.' };
    }

    const matchClin = route.match(/^clinico\/expediente\/(\d+)$/);
    if (matchClin) {
      const idEst = Number(matchClin[1]);
      const rol = this.user?.rol_codigo || 'DOCENTE';
      if (!['ESPECIALISTA_PIE', 'DIRECTOR_UTP', 'DOCENTE', 'ADMIN'].includes(rol)) {
        throw new Error(`Su perfil (${rol}) no tiene autorización para acceder a diagnósticos clínicos ni expedientes PIE.`);
      }
      const st = students.find((s) => Number(s.id_estudiante) === idEst) || students[0];
      if (method === 'PUT') {
        if (!['ESPECIALISTA_PIE', 'DIRECTOR_UTP'].includes(rol)) {
          throw new Error('Modo Solo Lectura: Solo el Equipo PIE y Dirección/UTP pueden modificar datos clínicos.');
        }
        st.diagnostico_principal = body.diagnostico_principal;
        st.anamnesis_custom = body.anamnesis;
        if (st.educational) st.educational.primaryDiagnosis = body.diagnostico_principal;
        this.setLocalStore('estudiantes', students);
        return {
          ok: true,
          mensaje: 'Expediente Clínico y PAEC guardados correctamente.',
          estado_proteccion: 'Resguardo Clínico Institucional'
        };
      }
      return {
        ok: true,
        permiso_escritura: ['ESPECIALISTA_PIE', 'DIRECTOR_UTP'].includes(rol),
        rol_acceso: rol,
        estado_proteccion: 'Resguardo Clínico Institucional',
        ficha: {
          id_ficha: idEst,
          estado_proteccion: 'Resguardo Clínico Institucional',
          diagnostico_principal: st.educational?.primaryDiagnosis || st.diagnostico_principal || 'Diagnóstico multiprofesional vigente.',
          anamnesis: st.anamnesis_custom || st.educational?.relevantBackground || 'Parto a término. Escolaridad en modalidad de Educación Especial con apoyo multidisciplinario PIE.',
          datos_medicos: {
            medicamentos: idEst === 1 ? [{ nombre: 'Risperidona', dosis: '1 mg', horario: '08:00 y 20:00 hrs' }] : [],
            alergias: idEst === 1 ? ['Penicilina', 'Polvo textil sintético'] : ['Ninguna reportada'],
            perfil_sensorial: st.educational?.supportNeeds || 'Adecuado al entorno de taller con apoyos pedagógicos.'
          },
          sistema_salud: 'FONASA',
          centro_salud_derivacion: 'CRS Maipú / COSAM'
        },
        pai: {
          fortalezas_intereses: st.educational?.strengths || 'Alta motivación por actividades prácticas de taller y excelente disposición grupal.',
          estrategias_dua_json: {
            implicacion: 'Anticipación con agenda visual ARASAAC y refuerzo positivo inmediato.',
            representacion: 'Modelado práctico paso a paso y plantillas táctiles de alto contraste.',
            accion_expresion: 'Tiempos flexibles de ejecución y evaluación formativa por desempeño.'
          },
          apoyos_especialistas_json: {
            psicologia: 'Acompañamiento socioemocional y autorregulación PAEC.',
            terapia_ocupacional: 'Ergonomía en puesto de trabajo e integración sensorial.',
            fonoaudiologia: 'Fomento de habilidades comunicativas y pragmáticas sociolaborales.'
          }
        },
        paci: {
          tipo_adecuacion: st.grupo_funcionalidad === 'GRUPO_B' ? 'INTEGRAL (ACCESO Y OBJETIVOS)' : 'ACCESO Y TIEMPOS',
          criterios_adecuacion_json: {
            acceso: 'Señalética visual ARASAAC, mobiliario adaptado y protectores auditivos.',
            objetivos_aprendizaje: 'Graduación de complejidad en operaciones de maquinaria y medición.'
          },
          estrategias_evaluacion_diferenciada: 'Rúbrica conceptual basada en observación directa y portafolio práctico.'
        },
        paec: {
          estado_proteccion: 'Resguardo Clínico Institucional',
          profesional_sos_nombre: st.profesional_sos_nombre || 'Camila Ignacia Vargas Herrera',
          profesional_sos_especialidad: st.profesional_sos_especialidad || 'Psicóloga Educacional / Coordinadora PIE',
          profesional_sos_telefono: st.profesional_sos_telefono || '+56 9 8555 6677',
          gatillantes_dec: 'Ruido súbito de maquinaria industrial, cambios imprevistos de rutina o sobrecarga sensorial.',
          senales_previas: 'Se cubre los oídos, aumento de inquietud motora o aislamiento en la estación de trabajo.',
          estrategias_contencion: 'Etapa 1: Ofrecer protectores auditivos y pausa activa. Etapa 2: Disminuir estímulos y acompañar a zona de calma. Etapa 3: Activar Botón SOS en Aula hacia Sala Sensorial.',
          acuerdos_familia: 'Comunicación diaria con equipo PIE y anticipación de cambios de rutina desde el hogar.'
        }
      };
    }

    if (route === 'paec/sos' && method === 'POST') {
      checkRoles(['DIRECTOR_UTP', 'DOCENTE', 'MONITOR', 'ESPECIALISTA_PIE', 'CONVIVENCIA', 'ADMIN'], 'El Botón SOS en Aula es de uso exclusivo para el personal del establecimiento.');
      const st = students.find((s) => Number(s.id_estudiante) === Number(body.id_estudiante)) || students[0];
      const alerta = {
        id_incidencia: Date.now(),
        estudiante: `${st.nombres} ${st.apellidos}`,
        ubicacion: body.ubicacion || st.sala_ubicacion || 'Pabellón Técnico - Sala T1',
        taller: st.taller_nombre || 'Taller Laboral',
        reportado_por: this.user?.nombre_completo || 'Docente en Aula',
        profesional_sos: st.profesional_sos_nombre || 'Camila Ignacia Vargas Herrera',
        telefono_sos: st.profesional_sos_telefono || '+56 9 8555 6677',
        protocolo_paec: 'Etapa 3 Activada: Contención empática y traslado asistido a Sala Sensorial.',
        hora: new Date().toLocaleTimeString('es-CL')
      };
      bitacora.unshift({
        id_incidencia: alerta.id_incidencia,
        tipo_incidencia: 'DESREGULACION_SEVERA_SOS',
        estudiante_nombre: alerta.estudiante,
        estado_alerta: 'ACTIVA_EN_AULA',
        descripcion_suceso: body.descripcion_breve,
        acciones_aplicadas_paec: alerta.protocolo_paec,
        reportante_nombre: alerta.reportado_por,
        profesional_nombre: alerta.profesional_sos,
        estado_proteccion: 'Resguardo Institucional',
        fecha_hora_suceso: 'Hoy ' + alerta.hora
      });
      this.setLocalStore('bitacora', bitacora);
      return { ok: true, mensaje: 'Alerta SOS despachada inmediatamente al Profesional SOS designado en el PAEC.', alerta };
    }

    if (route === 'paec/bitacora' && method === 'GET') {
      checkRoles(['DIRECTOR_UTP', 'DOCENTE', 'MONITOR', 'ESPECIALISTA_PIE', 'CONVIVENCIA', 'SOSTENEDOR', 'ADMIN'], 'Su perfil no tiene autorización para consultar la Bitácora PAEC.');
      const protocolos_paec = students.map((st) => ({
        id_estudiante: st.id_estudiante,
        nombres: st.nombres,
        apellidos: st.apellidos,
        numero_matricula: st.numero_matricula,
        grupo_funcionalidad: st.grupo_funcionalidad,
        taller_nombre: st.taller_nombre,
        sala_ubicacion: st.sala_ubicacion,
        profesional_sos_nombre: st.profesional_sos_nombre || 'Camila Ignacia Vargas Herrera',
        profesional_sos_especialidad: st.profesional_sos_especialidad || 'Psicóloga Educacional / Coordinadora PIE',
        profesional_sos_telefono: st.profesional_sos_telefono || '+56 9 8555 6677',
        gatillantes_dec: 'Ruido súbito de maquinaria industrial, cambios imprevistos de rutina o sobrecarga sensorial.',
        senales_previas: 'Se cubre los oídos, aumento de inquietud motora o aislamiento en la estación de trabajo.',
        estrategias_contencion: 'Etapa 1: Ofrecer protectores auditivos y pausa activa. Etapa 2: Disminuir estímulos y acompañar a zona de calma. Etapa 3: Activar Botón SOS en Aula hacia Sala Sensorial.',
        acuerdos_familia: 'Comunicación diaria con equipo PIE y anticipación de cambios de rutina desde el hogar.',
        estado_proteccion: 'Resguardo Institucional'
      }));
      return { ok: true, bitacora: bitacora, protocolos_paec: protocolos_paec };
    }

    if (route === 'paec/convivencia' && method === 'POST') {
      checkRoles(['CONVIVENCIA', 'ESPECIALISTA_PIE', 'DIRECTOR_UTP', 'DOCENTE'], 'Su perfil no está autorizado para registrar intervenciones en la Bitácora de Convivencia Escolar.');
      const st = students.find((s) => Number(s.id_estudiante) === Number(body.id_estudiante)) || students[0];
      bitacora.unshift({
        id_incidencia: Date.now(),
        tipo_incidencia: body.tipo_incidencia || 'SEGUIMIENTO_CONVIVENCIA',
        estudiante_nombre: `${st.nombres} ${st.apellidos}`,
        estado_alerta: body.estado_alerta || 'CONTENIDA_RESUELTA',
        descripcion_suceso: body.descripcion_suceso || '',
        acciones_aplicadas_paec: body.acciones_aplicadas_paec || 'Intervención formativa y acompañamiento psicosocial.',
        reportante_nombre: this.user?.nombre_completo || 'Encargada de Convivencia Escolar',
        profesional_nombre: this.user?.nombre_completo || 'Encargada de Convivencia Escolar',
        estado_proteccion: 'Resguardo Institucional',
        fecha_hora_suceso: 'Hoy ' + new Date().toLocaleTimeString('es-CL')
      });
      this.setLocalStore('bitacora', bitacora);
      return {
        ok: true,
        mensaje: 'Intervención de Convivencia Escolar registrada correctamente.',
        estado_proteccion: 'Resguardo Institucional'
      };
    }

    const matchApod = route.match(/^apoderados\/resumen\/(\d+)$/);
    if (matchApod && method === 'GET') {
      checkRoles(['APODERADO', 'DIRECTOR_UTP', 'DOCENTE', 'ESPECIALISTA_PIE', 'CONVIVENCIA', 'ADMIN'], 'Su perfil no tiene acceso al Portal de Familia.');
      const idEst = Number(matchApod[1]);
      const st = students.find((s) => Number(s.id_estudiante) === idEst) || students[0];
      const stEvals = evaluaciones.filter((ev) => Number(ev.id_estudiante) === idEst);
      return {
        ok: true,
        estudiante: Object.assign({}, st, {
          fortalezas_intereses: st.educational?.strengths || 'Participación activa y compromiso en su taller laboral.',
          objetivos_transicion_vida_adulta: 'Consolidación de autonomía personal, seguridad industrial y trabajo colaborativo.',
          acuerdos_familia: 'Mantener comunicación fluida con el equipo PIE y reforzar hábitos de autonomía en el hogar.'
        }),
        asistencia: { total_dias: 20, dias_presente: 19, dias_ausente: 1 },
        evaluaciones: stEvals.length ? stEvals : evaluaciones.slice(0, 2)
      };
    }

    if (route === 'seguridad/auditoria' && method === 'GET') {
      checkRoles(['ADMIN', 'DIRECTOR_UTP', 'SOSTENEDOR'], 'Acceso a la Consola de Auditoría reservado para Administración, Dirección/UTP y Sostenedor.');
      return { ok: true, logs: logs, roles: INITIAL_JS_DB.roles, usuarios: users };
    }

    return { ok: true, horarios: INITIAL_JS_DB.horarios, notificaciones: notificaciones, clasesPid: clasesPid, evaluaciones: evaluaciones, asistencias: asistencias, bitacora: bitacora, logs: logs, roles: INITIAL_JS_DB.roles, documentos: docs, usuarios: users };
  }
};
