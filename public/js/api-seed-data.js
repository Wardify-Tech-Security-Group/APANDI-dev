/** Datos iniciales usados por el motor local de respaldo. */
window.APANDI_INITIAL_DB = {
  users: [
    { id_usuario: 1, id: '1', rut: '15.432.198-K', nombre_completo: 'Roberto Andrés Soto Valdés', name: 'Roberto Andrés Soto Valdés', username: 'admin', email: 'admin@apandi.cl', rol_codigo: 'ADMIN', role: 'administrador', rol_nombre: 'Administrador Institucional', especialidad: 'Ingeniero en Informática / Encargado SIGE', horas_contrato: 44, active: true, activo: 1 },
    { id_usuario: 2, id: '2', rut: '13.876.543-2', nombre_completo: 'Marcela Paz Rojas Contreras', name: 'Marcela Paz Rojas Contreras', username: 'utp', email: 'utp@apandi.cl', rol_codigo: 'DIRECTOR_UTP', role: 'administrador', rol_nombre: 'Directora / Jefa UTP', especialidad: 'Directora / Jefa Unidad Técnico-Pedagógica', horas_contrato: 44, active: true, activo: 1 },
    { id_usuario: 3, id: '3', rut: '17.654.321-8', nombre_completo: 'Carolina Andrea Muñoz Tapia', name: 'Carolina Andrea Muñoz Tapia', username: 'cmunoz', email: 'cmunoz@apandi.cl', rol_codigo: 'DOCENTE', role: 'profesor', rol_nombre: 'Docente Titular Educación Diferencial', especialidad: 'Educadora Diferencial Mención DI y Retos Múltiples', horas_contrato: 40, active: true, activo: 1 },
    { id_usuario: 4, id: '4', rut: '16.543.210-9', nombre_completo: 'Jorge Eduardo Fuentes Bravo', name: 'Jorge Eduardo Fuentes Bravo', username: 'jfuentes', email: 'jfuentes@apandi.cl', rol_codigo: 'MONITOR', role: 'docente', rol_nombre: 'Monitor Vocacional de Taller Laboral', especialidad: 'Maestro Sastre Industrial / Monitor Vocacional', horas_contrato: 38, active: true, activo: 1 },
    { id_usuario: 5, id: '5', rut: '18.234.567-1', nombre_completo: 'Camila Ignacia Vargas Herrera', name: 'Camila Ignacia Vargas Herrera', username: 'cvargas.pie', email: 'cvargas.pie@apandi.cl', rol_codigo: 'ESPECIALISTA_PIE', role: 'profesor', rol_nombre: 'Especialista PIE (Equipo Multidisciplinario)', especialidad: 'Psicóloga Educacional / Coordinadora PIE y PAEC', horas_contrato: 44, active: true, activo: 1 },
    { id_usuario: 6, id: '6', rut: '12.345.678-5', nombre_completo: 'Patricia Elena Gómez Díaz', name: 'Patricia Elena Gómez Díaz', username: 'pgomez.familia', email: 'pgomez.familia@gmail.com', rol_codigo: 'APODERADO', role: 'apoderado', rol_nombre: 'Apoderado / Familia', especialidad: 'Apoderada Titular', horas_contrato: 0, active: true, activo: 1 }
  ],
  talleres: [
    { id_taller: 1, codigo_mineduc: 'TL-CORTE-01', nombre: 'Taller Laboral de Corte y Confección Textil', nivel_decreto: 'Nivel Laboral 2 (Decreto Exento N° 83)', capacidad_maxima: 12, sala_ubicacion: 'Pabellón Técnico - Sala T1' },
    { id_taller: 2, codigo_mineduc: 'TL-GASTRO-02', nombre: 'Taller Laboral de Gastronomía, Panadería y Repostería', nivel_decreto: 'Nivel Laboral 1 y 2 (Decreto Exento N° 83)', capacidad_maxima: 14, sala_ubicacion: 'Cocina Pedagógica Industrial - Sala G1' },
    { id_taller: 3, codigo_mineduc: 'TL-HORTI-03', nombre: 'Taller Laboral de Horticultura, Vivero y Paisajismo', nivel_decreto: 'Nivel Laboral 3 Dual (Decreto Exento N° 83)', capacidad_maxima: 15, sala_ubicacion: 'Invernadero Institucional - Sector Norte' }
  ],
  estudiantes: [
    {
      id_estudiante: 1, id: '1', rut: '22.345.678-2', nombres: 'Matías Ignacio', apellidos: 'Vera Gómez', paternalSurname: 'Vera', maternalSurname: 'Gómez', names: 'Matías Ignacio', fullName: 'Matías Ignacio Vera Gómez', socialName: 'Mati', fecha_nacimiento: '2007-05-14', birthDate: '2007-05-14', genero: 'Masculino', gender: 'Masculino', nationality: 'Chilena', direccion: 'Av. Los Pajaritos 3450, Depto 402', comuna: 'Maipú',
      registro_nacional_discapacidad: 1, porcentaje_discapacidad: 65, beneficio_junaeb: 1, estado_matricula: 'REGULAR', status: 'activo',
      numero_matricula: 'MAT-2026-001', registrationNumber: 'MAT-2026-001', course: 'Nivel Laboral 2A', level: 'Nivel Laboral 2 (Decreto 83)', enrollmentYear: 2026, entryDate: '2024-03-04', evaluationDate: '2026-03-15', reevaluationDate: '2026-11-24',
      grupo_funcionalidad: 'GRUPO_B', jornada: 'COMPLETA', id_taller: 1, taller_nombre: 'Taller Laboral de Corte y Confección Textil', workshop: 'Taller Laboral de Corte y Confección Textil', codigo_mineduc: 'TL-CORTE-01', sala_ubicacion: 'Pabellón Técnico - Sala T1',
      apoderado_nombre: 'Patricia Elena Gómez Díaz', apoderado_rut: '12.345.678-5', apoderado_parentesco: 'Madre', apoderado_telefono: '+56 9 8666 7788', apoderado_email: 'pgomez.familia@gmail.com',
      profesional_sos_nombre: 'Camila Ignacia Vargas Herrera', profesional_sos_especialidad: 'Psicóloga Educacional / Coordinadora PIE y PAEC', profesional_sos_telefono: '+56 9 8555 6677',
      diagnostico_principal: 'Trastorno del Espectro Autista (TEA Nivel 2) concomitante con Discapacidad Intelectual Moderada',
      contact: { address: 'Av. Los Pajaritos 3450, Depto 402', municipality: 'Maipú', phone: '+56 9 8666 7788', guardianName: 'Patricia Elena Gómez Díaz', guardianRut: '12.345.678-5', guardianPhone: '+56 9 8666 7788', guardianEmail: 'pgomez.familia@gmail.com' },
      educational: {
        primaryDiagnosis: 'Trastorno del Espectro Autista (TEA Nivel 2) y DI Moderada (Decreto 170)',
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
      numero_matricula: 'MAT-2026-002', registrationNumber: 'MAT-2026-002', course: 'Nivel Laboral 2A', level: 'Nivel Laboral 2 (Decreto 83)', enrollmentYear: 2026, entryDate: '2024-03-04', evaluationDate: '2026-03-18', reevaluationDate: '2026-11-28',
      grupo_funcionalidad: 'GRUPO_A', jornada: 'COMPLETA', id_taller: 1, taller_nombre: 'Taller Laboral de Corte y Confección Textil', workshop: 'Taller Laboral de Corte y Confección Textil', codigo_mineduc: 'TL-CORTE-01', sala_ubicacion: 'Pabellón Técnico - Sala T1',
      apoderado_nombre: 'Héctor Manuel Silva Morales', apoderado_rut: '11.223.344-5', apoderado_parentesco: 'Padre', apoderado_telefono: '+56 9 7766 5544', apoderado_email: 'hsilva@correo.cl',
      profesional_sos_nombre: 'Camila Ignacia Vargas Herrera', profesional_sos_especialidad: 'Psicóloga Educacional / Coordinadora PIE y PAEC', profesional_sos_telefono: '+56 9 8555 6677',
      diagnostico_principal: 'Discapacidad Intelectual Leve (CI 64 WISC-V). Alta competencia adaptativa.',
      contact: { address: 'Pasaje El Roble 128', municipality: 'Cerrillos', phone: '+56 9 7766 5544', guardianName: 'Héctor Manuel Silva Morales', guardianRut: '11.223.344-5', guardianPhone: '+56 9 7766 5544', guardianEmail: 'hsilva@correo.cl' },
      educational: {
        primaryDiagnosis: 'Discapacidad Intelectual Leve (Decreto 170 MINEDUC)',
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
      numero_matricula: 'MAT-2026-003', registrationNumber: 'MAT-2026-003', course: 'Nivel Laboral 2B', level: 'Nivel Laboral 2 (Decreto 83)', enrollmentYear: 2026, entryDate: '2023-03-06', evaluationDate: '2026-04-02', reevaluationDate: '2026-12-04',
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
      numero_matricula: 'MAT-2026-004', registrationNumber: 'MAT-2026-004', course: 'Nivel Laboral 1B', level: 'Nivel Laboral 1 (Decreto 83)', enrollmentYear: 2026, entryDate: '2024-03-04', evaluationDate: '2026-04-10', reevaluationDate: '2026-12-11',
      grupo_funcionalidad: 'GRUPO_B', jornada: 'COMPLETA', id_taller: 2, taller_nombre: 'Taller Laboral de Gastronomía, Panadería y Repostería', workshop: 'Taller Laboral de Gastronomía, Panadería y Repostería', codigo_mineduc: 'TL-GASTRO-02', sala_ubicacion: 'Cocina Pedagógica Industrial - Sala G1',
      apoderado_nombre: 'Rosa Ester Paredes Lagos', apoderado_rut: '9.876.543-3', apoderado_parentesco: 'Abuela / Tutora Legal', apoderado_telefono: '+56 9 3322 1100', apoderado_email: 'rparedes@correo.cl',
      profesional_sos_nombre: 'Sebastián Tomás Morales Pino', profesional_sos_especialidad: 'Terapeuta Ocupacional', profesional_sos_telefono: '+56 9 8777 8899',
      diagnostico_principal: 'Síndrome de Down / Discapacidad Intelectual Moderada (Decreto 170)',
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
      numero_matricula: 'MAT-2026-005', registrationNumber: 'MAT-2026-005', course: 'Nivel Laboral 3 Dual', level: 'Nivel Laboral 3 Dual (Decreto 83)', enrollmentYear: 2026, entryDate: '2022-03-01', evaluationDate: '2026-03-20', reevaluationDate: '2026-12-18',
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
        'Evaluación': 'Evaluación formativa mediante lista de cotejo cualitativa Decreto 83 (L / ED / EI).',
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
      hash_firma_electronica: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
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
      titulo: '📋 Cierre de Evaluaciones Conceptuales Decreto 83 y Documentación PAI/PACI',
      mensaje: 'Unidad Técnico-Pedagógica recuerda completar las fichas de reevaluación y firmar el Leccionario PID con PIN electrónico.',
      created_at: 'Hoy 08:30'
    },
    {
      id_notificacion: 2,
      tipo: 'RECORDATORIO_FIRMA',
      titulo: '🔒 Resguardo de Datos Sensibles Ley N° 19.628 Activo',
      mensaje: 'Todos los accesos a fichas clínicas, protocolos PAEC y descargas de informes quedan registrados en la consola forense.',
      created_at: 'Hoy 08:00'
    }
  ],
  horarios: [
    { dia_semana: 1, hora_inicio: '08:30:00', hora_fin: '11:30:00', bloque_nombre: 'Módulo Práctico Corte y Confección (Grupo A/B)', taller_nombre: 'Taller de Corte y Confección Textil', sala_ubicacion: 'Pabellón Técnico - Sala T1' },
    { dia_semana: 2, hora_inicio: '08:30:00', hora_fin: '11:30:00', bloque_nombre: 'Control de Calidad y Ensamblaje Textil', taller_nombre: 'Taller de Corte y Confección Textil', sala_ubicacion: 'Pabellón Técnico - Sala T1' },
    { dia_semana: 3, hora_inicio: '14:00:00', hora_fin: '16:30:00', bloque_nombre: 'Co-Docencia PIE y Articulación DUA', taller_nombre: 'Equipo Multidisciplinario PIE', sala_ubicacion: 'Sala UTP / PIE' },
    { dia_semana: 4, hora_inicio: '08:30:00', hora_fin: '12:00:00', bloque_nombre: 'Taller de Autonomía Sociolaboral Decreto 83', taller_nombre: 'Taller de Corte y Confección Textil', sala_ubicacion: 'Pabellón Técnico - Sala T1' }
  ],
  roles: [
    { codigo: 'ADMIN', nombre: 'Administrador Institucional', descripcion: 'Gestión integral de plataforma, cuentas del equipo, configuración y auditoría forense.' },
    { codigo: 'DIRECTOR_UTP', nombre: 'Directora / Jefa UTP', descripcion: 'Supervisión técnico-pedagógica, visado de PAI/PACI, matrícula y acceso clínico completo.' },
    { codigo: 'DOCENTE', nombre: 'Docente Titular Educación Diferencial', descripcion: 'Gestión de estudiantes, Libro de Clases Digital (PID con PIN), documentos y lectura clínica.' },
    { codigo: 'ESPECIALISTA_PIE', nombre: 'Especialista PIE (Psicología / T.O. / Fono)', descripcion: 'Lectura y escritura encriptada AES-256 de fichas clínicas, PAI, PACI, PAEC y atención SOS.' },
    { codigo: 'MONITOR', nombre: 'Monitor Vocacional de Taller', descripcion: 'Apoyo práctico en taller laboral y activación de Botón SOS (sin acceso a datos clínicos Ley 19.628).' },
    { codigo: 'APODERADO', nombre: 'Portal Familia / Apoderado', descripcion: 'Acceso exclusivo de lectura al avance pedagógico y descarga del Informe Oficial para la Familia.' }
  ],
  logs: [
    { id_log: 104, fecha_hora: '2026-11-10 08:15:22', usuario_nombre: 'Camila Ignacia Vargas Herrera', rol_codigo: 'ESPECIALISTA_PIE', modulo: 'FICHA_CLINICA_PIE_PAEC', accion: 'LECTURA', detalle: 'Acceso autorizado y desencriptación AES-256-GCM de expediente #1', ip_origen: '192.168.1.42' },
    { id_log: 103, fecha_hora: '2026-11-10 08:10:05', usuario_nombre: 'Carolina Andrea Muñoz Tapia', rol_codigo: 'DOCENTE', modulo: 'LIBRO_CLASES_PID', accion: 'FIRMA_DIGITAL', detalle: 'Clase PID firmada con PIN electrónico Bcrypt. Sello SHA-256: 9f86d081884c7d65', ip_origen: '192.168.1.18' },
    { id_log: 102, fecha_hora: '2026-11-09 16:40:11', usuario_nombre: 'Marcela Paz Rojas Contreras', rol_codigo: 'DIRECTOR_UTP', modulo: 'DOCUMENTACION_INSTITUCIONAL', accion: 'CREACION', detalle: 'Generación de documento institucional (PAI): Plan de Apoyo Individual — Matías Vera', ip_origen: '192.168.1.10' }
  ]
};

