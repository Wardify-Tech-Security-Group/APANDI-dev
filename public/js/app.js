// =============================================================================
// SGI APANDI — Frontend en JavaScript Puro (Vanilla JS ES6+)
// =============================================================================

let currentToken = localStorage.getItem('apandi_token') || null;
let currentUser = JSON.parse(localStorage.getItem('apandi_user') || 'null');
let globalStudents = [];
let chartLogrosInstance = null;
let chartAsistenciaInstance = null;

// Conectar Socket.io para recibir alertas del Botón SOS en tiempo real
const socket = typeof io !== 'undefined' ? io() : null;
if (socket) {
  socket.on('sos_alert_triggered', (alerta) => {
    const banner = document.getElementById('sosRealtimeBanner');
    const text = document.getElementById('sosBannerText');
    if (banner && text) {
      text.innerHTML = `
        <strong>Estudiante:</strong> ${alerta.estudiante} | 
        <strong>Sala:</strong> ${alerta.ubicacion} | 
        <strong>Profesional SOS Convocado:</strong> ${alerta.profesional_sos} (${alerta.telefono_sos})
      `;
      banner.classList.remove('hidden');
    }
    loadBitacora();
    loadDashboardRRHH();
  });
}

// Helper para peticiones autenticadas con JWT
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (currentToken) {
    headers.Authorization = `Bearer ${currentToken}`;
  }
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Error en la petición al servidor');
  }
  return data;
}

// =============================================================================
// 1. AUTENTICACIÓN Y CAMBIO RÁPIDO DE ROL (RBAC)
// =============================================================================

window.quickLogin = async function (email) {
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPassword').value = 'Apandi2026!';
  await performLogin(email, 'Apandi2026!');
};

async function performLogin(emailOrRut, password) {
  const errBox = document.getElementById('loginError');
  errBox.classList.add('hidden');
  try {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrRut, password })
    });
    currentToken = res.token;
    currentUser = res.user;
    localStorage.setItem('apandi_token', currentToken);
    localStorage.setItem('apandi_user', JSON.stringify(currentUser));
    initAppAfterLogin();
  } catch (err) {
    errBox.textContent = err.message;
    errBox.classList.remove('hidden');
  }
}

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value;
  await performLogin(email, pass);
});

window.logout = function () {
  localStorage.removeItem('apandi_token');
  localStorage.removeItem('apandi_user');
  currentToken = null;
  currentUser = null;
  document.getElementById('loginScreen').classList.remove('hidden');
};

function initAppAfterLogin() {
  if (!currentToken || !currentUser) {
    document.getElementById('loginScreen').classList.remove('hidden');
    return;
  }
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('headerRoleBadge').textContent = currentUser.rol_codigo;
  document.getElementById('headerUserName').textContent = `${currentUser.nombre_completo} • ${currentUser.rol_nombre}`;

  // Si ingresa un Apoderado, llevarlo directo al Portal Apoderados
  if (currentUser.rol_codigo === 'APODERADO') {
    switchTab('tab-apoderados');
  } else {
    switchTab('tab-dashboard');
  }

  loadAllData();
}

async function loadAllData() {
  await loadStudentsAndWorkshops();
  await loadDashboardRRHH();
  await loadPedagogicalBook();
  await loadBitacora();
  if (globalStudents.length > 0) {
    await loadClinicalRecord(globalStudents[0].id_estudiante);
    await loadGuardianPortal(globalStudents[0].id_estudiante);
  }
}

// =============================================================================
// 2. NAVEGACIÓN DE PESTAÑAS
// =============================================================================

window.switchTab = function (tabId) {
  document.querySelectorAll('.tab-section').forEach((sec) => sec.classList.add('hidden'));
  document.getElementById(tabId)?.classList.remove('hidden');

  document.querySelectorAll('.nav-tab').forEach((btn) => {
    if (btn.dataset.target === tabId) {
      btn.className = 'nav-tab bg-white text-apandi-900 px-3.5 py-2 rounded-lg transition font-bold shadow-sm';
    } else {
      btn.className = 'nav-tab text-blue-100 hover:bg-blue-700/60 px-3.5 py-2 rounded-lg transition';
    }
  });

  if (tabId === 'tab-auditoria') {
    loadAuditLogs();
  }
};

// =============================================================================
// 3. MÓDULO PORTAL DOCENTE / RRHH Y DASHBOARD
// =============================================================================

async function loadDashboardRRHH() {
  try {
    const data = await apiFetch('/rrhh/dashboard');

    // Estado del Reloj Control
    const statusText = document.getElementById('clockStatusText');
    const inTime = document.getElementById('clockInTime');
    const outTime = document.getElementById('clockOutTime');

    if (data.reloj_hoy) {
      statusText.textContent = `${data.reloj_hoy.estado} (${data.reloj_hoy.metodo_marcaje})`;
      statusText.className = 'text-emerald-700 font-bold';
      inTime.textContent = data.reloj_hoy.hora_entrada || '--:--';
      outTime.textContent = data.reloj_hoy.hora_salida || '--:--';
    } else {
      statusText.textContent = 'Pendiente de marcaje hoy';
      statusText.className = 'text-amber-700 font-bold';
      inTime.textContent = '--:--';
      outTime.textContent = '--:--';
    }

    // Horarios
    const dias = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const schedContainer = document.getElementById('staffScheduleList');
    if (data.horarios.length === 0) {
      schedContainer.innerHTML = `<div class="text-slate-400 italic">Horario general administrativo / multidisciplinario</div>`;
    } else {
      schedContainer.innerHTML = data.horarios
        .map(
          (h) => `
          <div class="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span class="font-bold text-apandi-800">${dias[h.dia_semana]} (${h.hora_inicio.slice(0, 5)} - ${h.hora_fin.slice(0, 5)})</span>
              <p class="text-slate-600">${h.bloque_nombre} • ${h.taller_nombre}</p>
            </div>
            <span class="text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded">${h.sala_ubicacion || 'Sala T1'}</span>
          </div>`
        )
        .join('');
    }

    // Notificaciones de UTP y Alertas Automáticas
    const notifContainer = document.getElementById('utpNotificationsList');
    notifContainer.innerHTML = data.notificaciones
      .map((n) => {
        const isSOS = n.tipo === 'ALERTA_SOS';
        const isAbsence = n.tipo === 'ALERTA_INASISTENCIA';
        const badgeClass = isSOS
          ? 'bg-red-100 border-red-300 text-red-900'
          : isAbsence
          ? 'bg-amber-50 border-amber-300 text-amber-900'
          : 'bg-blue-50 border-blue-200 text-slate-800';
        return `
          <div class="p-3 rounded-lg border ${badgeClass} text-xs">
            <div class="flex items-center justify-between font-bold">
              <span>${n.titulo}</span>
              <span class="text-[10px] opacity-75">${new Date(n.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p class="mt-1 opacity-90">${n.mensaje}</p>
          </div>
        `;
      })
      .join('');

    renderCharts();
  } catch (err) {
    console.warn('Error cargando dashboard RRHH:', err.message);
  }
}

window.markStaffAttendance = async function (tipo_marca) {
  let latitud = -33.5112;
  let longitud = -70.7581;

  if (navigator.geolocation) {
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 2500 })
      );
      latitud = pos.coords.latitude;
      longitud = pos.coords.longitude;
    } catch {
      // Fallback a coordenadas institucionales si el navegador bloquea GPS local
    }
  }

  try {
    const res = await apiFetch('/rrhh/reloj-control', {
      method: 'POST',
      body: JSON.stringify({ tipo_marca, latitud, longitud })
    });
    alert(`✅ ${res.mensaje}`);
    await loadDashboardRRHH();
  } catch (err) {
    alert(err.message);
  }
};

function renderCharts() {
  const ctx1 = document.getElementById('chartLogros');
  const ctx2 = document.getElementById('chartAsistencia');
  if (!ctx1 || !ctx2 || typeof Chart === 'undefined') return;

  if (chartLogrosInstance) chartLogrosInstance.destroy();
  if (chartAsistenciaInstance) chartAsistenciaInstance.destroy();

  chartLogrosInstance = new Chart(ctx1, {
    type: 'doughnut',
    data: {
      labels: ['Logrado (L)', 'En Desarrollo (ED)', 'En Inicio (EI)'],
      datasets: [
        {
          data: [65, 25, 10],
          backgroundColor: ['#059669', '#2563eb', '#d97706']
        }
      ]
    },
    options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } } }
  });

  chartAsistenciaInstance = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: ['Grupo A (Más Funcional)', 'Grupo B (Mayor Apoyo)'],
      datasets: [
        {
          label: '% Asistencia Mensual',
          data: [92, 87],
          backgroundColor: ['#1d4ed8', '#0d9488'],
          borderRadius: 6
        }
      ]
    },
    options: {
      scales: { y: { beginAtZero: true, max: 100 } },
      plugins: { legend: { display: false } }
    }
  });
}

// =============================================================================
// 4. MÓDULO ESTUDIANTES, MATRÍCULA Y TALLERES (GRUPO A / GRUPO B)
// =============================================================================

async function loadStudentsAndWorkshops() {
  try {
    const data = await apiFetch('/estudiantes');
    globalStudents = data.estudiantes || [];

    // Poblar tabla de estudiantes
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = globalStudents
      .map((e) => {
        const isGrupoA = e.grupo_funcionalidad === 'GRUPO_A';
        const badgeGrupo = isGrupoA
          ? `<span class="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">GRUPO A • Más Funcional</span>`
          : `<span class="bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-full">GRUPO B • Mayor Apoyo</span>`;

        return `
          <tr class="hover:bg-slate-50">
            <td class="p-3 font-mono font-semibold text-slate-700">
              <div>${e.numero_matricula || 'MAT-2026'}</div>
              <div class="text-[11px] text-slate-500">${e.rut}</div>
            </td>
            <td class="p-3 font-bold text-slate-900">${e.nombres} ${e.apellidos}</td>
            <td class="p-3">${e.taller_nombre || 'Corte y Confección'}</td>
            <td class="p-3">${badgeGrupo}</td>
            <td class="p-3">
              <span class="bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-semibold">RND ${e.porcentaje_discapacidad || 50}%</span>
            </td>
            <td class="p-3">
              <div class="font-semibold">${e.apoderado_nombre || 'Patricia Gómez'}</div>
              <div class="text-[11px] text-slate-500">${e.apoderado_telefono || '+56986667788'}</div>
            </td>
            <td class="p-3">
              <span class="font-semibold text-purple-900">${e.profesional_sos_nombre || 'Camila Vargas (PIE)'}</span>
            </td>
            <td class="p-3 text-right space-x-1">
              <button onclick="openStudentClinical(${e.id_estudiante})" class="bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1 rounded font-semibold">
                🩺 Ficha PIE
              </button>
              <button onclick="downloadStudentPDF(${e.id_estudiante})" class="bg-apandi-600 hover:bg-apandi-700 text-white px-2.5 py-1 rounded font-semibold">
                📄 PDF Familia
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    // Poblar selectores de estudiantes en todos los módulos
    const selects = ['evalEstudiante', 'clinicalStudentSelect', 'guardianStudentSelect', 'sosStudentSelect'];
    selects.forEach((id) => {
      const sel = document.getElementById(id);
      if (sel) {
        sel.innerHTML = globalStudents
          .map(
            (s) =>
              `<option value="${s.id_estudiante}">${s.nombres} ${s.apellidos} (${s.grupo_funcionalidad === 'GRUPO_A' ? 'Grupo A' : 'Grupo B'})</option>`
          )
          .join('');
      }
    });
  } catch (err) {
    console.warn('Error cargando estudiantes:', err.message);
  }
}

window.openStudentClinical = function (idEstudiante) {
  document.getElementById('clinicalStudentSelect').value = idEstudiante;
  switchTab('tab-clinico');
  loadClinicalRecord(idEstudiante);
};

// =============================================================================
// 5. MÓDULO PEDAGÓGICO (LIBRO DE CLASES DIGITAL: PID, ASISTENCIA Y FIRMA PIN)
// =============================================================================

async function loadPedagogicalBook() {
  try {
    const data = await apiFetch('/pedagogico/libro');

    // Renderizar toma de asistencia rápida por estudiante
    const attContainer = document.getElementById('attendanceStudentList');
    attContainer.innerHTML = globalStudents
      .map((s) => {
        const regHoy = data.asistencias.find((a) => a.id_estudiante === s.id_estudiante);
        const estadoActual = regHoy ? regHoy.estado : 'PRESENTE';
        return `
          <div class="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span class="font-bold text-slate-900">${s.nombres} ${s.apellidos}</span>
              <span class="ml-2 text-[11px] px-2 py-0.5 rounded bg-slate-100 font-semibold">${s.grupo_funcionalidad}</span>
              <span class="ml-2 text-[11px] font-bold ${estadoActual === 'AUSENTE' ? 'text-red-600' : 'text-emerald-700'}">
                Estado actual: ${estadoActual}
              </span>
            </div>
            <div class="flex items-center gap-1.5">
              <button onclick="saveStudentAttendance(${s.id_estudiante}, 'PRESENTE')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded font-bold">
                Presente
              </button>
              <button onclick="saveStudentAttendance(${s.id_estudiante}, 'AUSENTE')" class="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded font-bold">
                Ausente (Alerta UTP)
              </button>
              <button onclick="saveStudentAttendance(${s.id_estudiante}, 'ATRASO')" class="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded font-bold">
                Atraso
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    // Renderizar Evaluaciones Cualitativas Decreto 83
    const evalContainer = document.getElementById('evaluationsList');
    evalContainer.innerHTML = data.evaluaciones
      .map((ev) => {
        const badgeColor =
          ev.nivel_logro === 'LOGRADO'
            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
            : ev.nivel_logro === 'EN_DESARROLLO'
            ? 'bg-blue-100 text-blue-800 border-blue-300'
            : 'bg-amber-100 text-amber-800 border-amber-300';
        return `
          <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-3">
            <div>
              <div class="font-bold text-slate-900">${ev.estudiante_nombre} <span class="text-[10px] text-slate-500">(${ev.dimension})</span></div>
              <p class="text-slate-700 mt-0.5">${ev.indicador_competencia}</p>
            </div>
            <span class="px-2.5 py-1 rounded-full font-extrabold text-[11px] border whitespace-nowrap ${badgeColor}">
              ${ev.nivel_logro.replace('_', ' ')}
            </span>
          </div>
        `;
      })
      .join('');

    // Renderizar Clases PID Firmadas
    const pidContainer = document.getElementById('pidClassesList');
    pidContainer.innerHTML = data.clasesPid
      .map(
        (c) => `
        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="font-bold text-apandi-900 text-sm">${c.unidad_tematica}</span>
            <span class="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
              ✍️ Firmado con PIN • Hash: ${(c.hash_firma_electronica || '').substring(0, 14)}...
            </span>
          </div>
          <p class="text-slate-700 font-medium">${c.objetivo_aprendizaje}</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div class="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-950">
              <strong>Grupo A (Más Funcional):</strong> ${c.actividad_grupo_a}
            </div>
            <div class="p-2 rounded bg-amber-50 border border-amber-200 text-amber-950">
              <strong>Grupo B (Mayor Apoyo):</strong> ${c.actividad_grupo_b}
            </div>
          </div>
        </div>
      `
      )
      .join('');
  } catch (err) {
    console.warn('Error cargando libro pedagógico:', err.message);
  }
}

window.saveStudentAttendance = async function (id_estudiante, estado) {
  try {
    await apiFetch('/pedagogico/asistencia', {
      method: 'POST',
      body: JSON.stringify({
        id_estudiante,
        id_taller: 1,
        estado,
        observacion: `Marcaje digital por ${currentUser.nombre_completo}`,
        pin_firma: '1234'
      })
    });
    await loadPedagogicalBook();
    await loadDashboardRRHH();
  } catch (err) {
    alert(err.message);
  }
};

document.getElementById('pidForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const res = await apiFetch('/pedagogico/pid', {
      method: 'POST',
      body: JSON.stringify({
        id_taller: 1,
        unidad_tematica: document.getElementById('pidUnidad').value,
        objetivo_aprendizaje: document.getElementById('pidObjetivo').value,
        actividad_grupo_a: document.getElementById('pidGrupoA').value,
        actividad_grupo_b: document.getElementById('pidGrupoB').value,
        recursos_dua: document.getElementById('pidRecursos').value,
        pin_firma: document.getElementById('pidPin').value
      })
    });
    alert(`✅ ${res.mensaje}\nSello SHA-256: ${res.hash_firma}`);
    await loadPedagogicalBook();
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
});

document.getElementById('evalForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await apiFetch('/pedagogico/evaluaciones', {
      method: 'POST',
      body: JSON.stringify({
        id_estudiante: Number(document.getElementById('evalEstudiante').value),
        id_taller: 1,
        indicador_competencia: document.getElementById('evalIndicador').value,
        dimension: document.getElementById('evalDimension').value,
        nivel_logro: document.getElementById('evalLogro').value,
        comentario_pedagogico: 'Evaluación formativa registrada en taller práctico.'
      })
    });
    await loadPedagogicalBook();
  } catch (err) {
    alert(err.message);
  }
});

// =============================================================================
// 6. MÓDULO CLÍNICO, PIE Y PAEC (ENCRIPTACIÓN AES-256 LEY 19.628)
// =============================================================================

window.loadClinicalRecord = async function (idEstudiante) {
  const deniedBox = document.getElementById('clinicalAccessDeniedBox');
  const contentBox = document.getElementById('clinicalContentBox');
  deniedBox.classList.add('hidden');
  contentBox.classList.remove('hidden');

  try {
    const data = await apiFetch(`/clinico/expediente/${idEstudiante}`);
    const canWrite = data.permiso_escritura;

    const badge = document.getElementById('clinicalPermissionBadge');
    const btnSave = document.getElementById('btnSaveClinical');
    const diagInput = document.getElementById('clinDiagnostico');
    const anamInput = document.getElementById('clinAnamnesis');

    if (canWrite) {
      badge.textContent = 'MODO EDICIÓN AUTORIZADO (PIE / DIRECCIÓN)';
      badge.className = 'px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold';
      btnSave.classList.remove('hidden');
      diagInput.disabled = false;
      anamInput.disabled = false;
    } else {
      badge.textContent = 'SOLO LECTURA (DOCENTE TITULAR - LEY 19.628)';
      badge.className = 'px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-bold';
      btnSave.classList.add('hidden');
      diagInput.disabled = true;
      anamInput.disabled = true;
    }

    document.getElementById('clinicalCipherPreview').textContent =
      data.ficha?.cipher_preview || 'iv:authTag:aes256_ciphertext';
    diagInput.value = data.ficha?.diagnostico_principal || 'Sin diagnóstico registrado';
    anamInput.value = data.ficha?.anamnesis || 'Sin anamnesis registrada';

    const medData = data.ficha?.datos_medicos || { medicamentos: [], alergias: [] };
    document.getElementById('clinMedicamentosBox').innerHTML = `
      <div><strong>Medicamentos:</strong> ${
        (medData.medicamentos || []).map((m) => `${m.nombre} (${m.dosis} - ${m.horario})`).join(', ') || 'Ninguno'
      }</div>
      <div><strong>Alergias:</strong> ${(medData.alergias || []).join(', ') || 'Ninguna'}</div>
      <div><strong> Derivación Salud:</strong> ${data.ficha?.centro_salud_derivacion || 'CESFAM / COSAM'}</div>
    `;

    // Renderizar PAI (Estrategias DUA)
    if (data.pai) {
      const dua = typeof data.pai.estrategias_dua_json === 'string'
        ? JSON.parse(data.pai.estrategias_dua_json)
        : data.pai.estrategias_dua_json;
      const apoyos = typeof data.pai.apoyos_especialistas_json === 'string'
        ? JSON.parse(data.pai.apoyos_especialistas_json)
        : data.pai.apoyos_especialistas_json;

      document.getElementById('paiContentBox').innerHTML = `
        <div><strong>Fortalezas e Intereses:</strong> ${data.pai.fortalezas_intereses}</div>
        <div><strong>Barreras Identificadas:</strong> ${data.pai.barreras_aprendizaje}</div>
        <div class="p-2.5 bg-white rounded border border-blue-200 space-y-1">
          <div class="font-bold text-blue-900">Estrategias DUA (Decreto 83):</div>
          <div>• <strong>Implicación:</strong> ${dua.implicacion}</div>
          <div>• <strong>Representación:</strong> ${dua.representacion}</div>
          <div>• <strong>Acción y Expresión:</strong> ${dua.accion_expresion}</div>
        </div>
        <div class="p-2.5 bg-white rounded border border-blue-200 space-y-1">
          <div class="font-bold text-blue-900">Equipo Multidisciplinario PIE:</div>
          <div>• <strong>Psicología:</strong> ${apoyos.psicologia}</div>
          <div>• <strong>Terapia Ocupacional:</strong> ${apoyos.terapia_ocupacional}</div>
          <div>• <strong>Fonoaudiología:</strong> ${apoyos.fonoaudiologia}</div>
        </div>
      `;
    } else {
      document.getElementById('paiContentBox').innerHTML = '<div>PAI en proceso de formulación para este estudiante.</div>';
    }

    // Renderizar PACI
    if (data.paci) {
      const crit = typeof data.paci.criterios_adecuacion_json === 'string'
        ? JSON.parse(data.paci.criterios_adecuacion_json)
        : data.paci.criterios_adecuacion_json;
      document.getElementById('paciContentBox').innerHTML = `
        <div><strong>Tipo de Adecuación:</strong> ${data.paci.tipo_adecuacion}</div>
        <div><strong>Adecuación de Acceso:</strong> ${crit.acceso}</div>
        <div><strong>Adecuación a OA Laborales:</strong> ${crit.objetivos_aprendizaje}</div>
        <div><strong>Evaluación Diferenciada:</strong> ${data.paci.estrategias_evaluacion_diferenciada}</div>
      `;
    } else {
      document.getElementById('paciContentBox').innerHTML = '<div>Estudiante no requiere PACI de objetivos adicionales.</div>';
    }

    // Renderizar PAEC en la pestaña de Convivencia Escolar
    if (data.paec) {
      document.getElementById('paecDetailCard').innerHTML = `
        <div class="p-3 rounded-lg bg-red-50 border border-red-200">
          <div class="font-bold text-red-900">🚨 Profesional SOS Designado: ${data.paec.profesional_sos_nombre}</div>
          <div class="text-red-700">${data.paec.profesional_sos_especialidad} • Tel: ${data.paec.profesional_sos_telefono}</div>
        </div>
        <div class="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <strong class="text-slate-900 block">⚡ Gatillantes de Desregulación (Desencriptado AES-256):</strong>
          <p class="mt-1 text-slate-700">${data.paec.gatillantes_dec}</p>
        </div>
        <div class="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <strong class="text-slate-900 block">👀 Señales Previas / Indicadores Iniciales:</strong>
          <p class="mt-1 text-slate-700">${data.paec.senales_previas}</p>
        </div>
        <div class="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <strong class="text-emerald-950 block">🛡️ Protocolo de Contención por Etapas:</strong>
          <p class="mt-1 text-emerald-900">${data.paec.estrategias_contencion}</p>
        </div>
        <div class="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <strong class="text-blue-950 block">👨‍👩‍👦 Acuerdos con la Familia:</strong>
          <p class="mt-1 text-blue-900">${data.paec.acuerdos_familia}</p>
        </div>
      `;
    }
  } catch (err) {
    deniedBox.textContent = `🔒 ${err.message}`;
    deniedBox.classList.remove('hidden');
    contentBox.classList.add('hidden');
  }
};

window.saveClinicalRecord = async function () {
  const idEstudiante = document.getElementById('clinicalStudentSelect').value;
  try {
    const res = await apiFetch(`/clinico/expediente/${idEstudiante}`, {
      method: 'PUT',
      body: JSON.stringify({
        diagnostico_principal: document.getElementById('clinDiagnostico').value,
        anamnesis: document.getElementById('clinAnamnesis').value,
        datos_medicos_json: {
          medicamentos: [{ nombre: 'Risperidona', dosis: '1 mg', horario: '08:00 y 20:00 hrs' }],
          alergias: ['Penicilina']
        }
      })
    });
    alert(`✅ ${res.mensaje}`);
    await loadClinicalRecord(idEstudiante);
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
};

// =============================================================================
// 7. BOTÓN SOS EN AULA Y BITÁCORA DE INCIDENCIAS (PAEC)
// =============================================================================

window.openSosModal = function () {
  document.getElementById('sosModal').classList.remove('hidden');
};

window.closeSosModal = function () {
  document.getElementById('sosModal').classList.add('hidden');
};

document.getElementById('sosForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const res = await apiFetch('/paec/sos', {
      method: 'POST',
      body: JSON.stringify({
        id_estudiante: Number(document.getElementById('sosStudentSelect').value),
        id_taller: 1,
        ubicacion: document.getElementById('sosUbicacion').value,
        descripcion_breve: document.getElementById('sosDescripcion').value
      })
    });
    closeSosModal();
    alert(
      `🚨 ${res.mensaje}\n\nProtocolo PAEC activado:\n${res.alerta.protocolo_paec}`
    );
    await loadBitacora();
  } catch (err) {
    alert(err.message);
  }
});

async function loadBitacora() {
  try {
    const data = await apiFetch('/paec/bitacora');
    const container = document.getElementById('bitacoraList');
    if (!data.bitacora || data.bitacora.length === 0) {
      container.innerHTML = `<div class="p-4 text-slate-500 bg-slate-50 rounded-lg">No hay episodios de desregulación severa registrados hoy. Puedes probar el <strong>Botón SOS Aula</strong> arriba a la derecha.</div>`;
      return;
    }
    container.innerHTML = data.bitacora
      .map(
        (b) => `
        <div class="p-3.5 rounded-xl bg-red-50/70 border border-red-200 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="font-extrabold text-red-900">🚨 ${b.tipo_incidencia} — ${b.estudiante_nombre}</span>
            <span class="text-[11px] bg-red-600 text-white px-2 py-0.5 rounded font-bold">${b.estado_alerta}</span>
          </div>
          <p class="text-slate-800"><strong>Suceso (Desencriptado AES-256):</strong> ${b.descripcion_suceso}</p>
          <p class="text-slate-700"><strong>Acción PAEC:</strong> ${b.acciones_aplicadas_paec}</p>
          <div class="text-[11px] text-slate-500 pt-1">
            Reportado por: ${b.reportante_nombre} • Profesional SOS convocado: ${b.profesional_nombre || 'Equipo PIE'}
          </div>
        </div>
      `
      )
      .join('');
  } catch (err) {
    console.warn('Error cargando bitácora PAEC:', err.message);
  }
}

// =============================================================================
// 8. PORTAL APODERADOS Y DESCARGA DE PDF "INFORME PARA LA FAMILIA"
// =============================================================================

window.loadGuardianPortal = async function (idEstudiante) {
  try {
    const data = await apiFetch(`/apoderados/resumen/${idEstudiante}`);
    const est = data.estudiante || {};
    const asist = data.asistencia || { total_dias: 1, dias_presente: 1 };
    const pct = asist.total_dias > 0 ? Math.round((asist.dias_presente / asist.total_dias) * 100) : 100;

    document.getElementById('guardianPortalContent').innerHTML = `
      <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <h3 class="font-bold text-slate-900 text-sm">🎓 Resumen de Asistencia y Taller</h3>
        <p><strong>Estudiante:</strong> ${est.nombres} ${est.apellidos}</p>
        <p><strong>Taller Laboral:</strong> ${est.taller_nombre || 'Taller de Corte y Confección'}</p>
        <p><strong>Grupo Curricular:</strong> ${est.grupo_funcionalidad === 'GRUPO_A' ? 'Grupo A (Mayor Funcionalidad)' : 'Grupo B (Mayor Apoyo)'}</p>
        <div class="p-3 rounded-lg bg-emerald-100 text-emerald-900 font-extrabold text-base text-center mt-2">
          Asistencia Registrada: ${pct}%
        </div>
      </div>

      <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <h3 class="font-bold text-slate-900 text-sm">🏅 Avances Cualitativos (PID Decreto 83)</h3>
        <div class="space-y-2">
          ${
            (data.evaluaciones || [])
              .map(
                (ev) => `
              <div class="p-2 bg-white rounded border border-slate-200">
                <span class="font-bold text-emerald-700">[${ev.nivel_logro.replace('_', ' ')}]</span>
                <p class="text-slate-700 mt-0.5">${ev.indicador_competencia}</p>
              </div>
            `
              )
              .join('') || '<p>Sin evaluaciones registradas aún.</p>'
          }
        </div>
      </div>

      <div class="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
        <h3 class="font-bold text-blue-950 text-sm">🤝 Acuerdos PAEC y Proyección PAI</h3>
        <p><strong>Fortalezas Destacadas:</strong> ${est.fortalezas_intereses || 'Participación positiva en taller práctico.'}</p>
        <p><strong>Acuerdos con la Familia (PAEC):</strong> ${est.acuerdos_familia || 'Comunicación permanente con equipo PIE.'}</p>
      </div>
    `;
  } catch (err) {
    console.warn('Error cargando portal apoderados:', err.message);
  }
};

window.downloadFamilyReportPDF = function () {
  const idEst = document.getElementById('guardianStudentSelect').value || 1;
  downloadStudentPDF(idEst);
};

window.downloadStudentPDF = async function (idEstudiante) {
  try {
    const res = await fetch(`/api/reportes/informe-familia/${idEstudiante}/pdf`, {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    if (!res.ok) throw new Error('No se pudo generar el PDF');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Informe_Familia_Estudiante_${idEstudiante}_APANDI.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message);
  }
};

// =============================================================================
// 9. AUDITORÍA DE ACCESOS CLÍNICOS (LEY 19.628)
// =============================================================================

window.loadAuditLogs = async function () {
  const tbody = document.getElementById('auditTableBody');
  try {
    const data = await apiFetch('/seguridad/auditoria');
    tbody.innerHTML = data.logs
      .map(
        (l) => `
        <tr class="hover:bg-slate-50">
          <td class="p-2.5 font-mono text-[11px]">${new Date(l.fecha_hora).toLocaleString('es-CL')}</td>
          <td class="p-2.5 font-bold">${l.usuario_nombre} <span class="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">${l.rol_codigo}</span></td>
          <td class="p-2.5 font-semibold text-apandi-800">${l.modulo}</td>
          <td class="p-2.5"><span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">${l.accion}</span></td>
          <td class="p-2.5 text-slate-700">${l.detalle}</td>
          <td class="p-2.5 font-mono text-[11px] text-slate-500">${l.ip_origen}</td>
        </tr>
      `
      )
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-600 font-bold">🔒 ${err.message}</td></tr>`;
  }
};

// Inicializar aplicación si hay sesión guardada
window.addEventListener('DOMContentLoaded', () => {
  initAppAfterLogin();
});

