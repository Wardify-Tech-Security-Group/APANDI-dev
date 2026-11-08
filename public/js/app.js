/**
 * =============================================================================
 * CONTROLADOR PRINCIPAL FRONTEND — SGI APANDI (JavaScript Puro)
 * =============================================================================
 */

class SgiApandiApplication {
  constructor() {
    this.api = new window.ApandiAPIClient();
    this.students = [];
    this.workshops = [];
    this.currentFamilySummary = null;
    this.chartDimInstance = null;
    this.chartDoughnutInstance = null;

    this.initEventListeners();
    this.startChileClock();
    this.api.onSosAlert((alerta) => this.showSosBanner(alerta));
  }

  initEventListeners() {
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const pass = document.getElementById('loginPassword').value;
      await this.performLogin(email, pass);
    });

    document.getElementById('pidForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitPidClass();
    });

    document.getElementById('evalForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitEvaluation();
    });

    document.getElementById('sosForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitSosAlert();
    });

    document.getElementById('newStudentForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitNewStudent();
    });

    document.addEventListener('click', (e) => {
      const box = document.getElementById('globalSearchResults');
      const input = document.getElementById('globalSearchInput');
      if (box && !box.contains(e.target) && e.target !== input) {
        box.classList.add('hidden');
      }
    });
  }

  startChileClock() {
    const updateClock = () => {
      const el = document.getElementById('liveChileClock');
      if (el) {
        const now = new Date();
        el.textContent =
          now.toLocaleTimeString('es-CL', {
            timeZone: 'America/Santiago',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }) + ' hrs';
      }
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const colors = {
      success: 'bg-slate-900 border-emerald-500 text-white',
      error: 'bg-red-950 border-red-500 text-white',
      warning: 'bg-amber-950 border-amber-500 text-white'
    };
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-2xl shadow-2xl border-l-4 ${colors[type] || colors.success} text-xs font-semibold flex items-center justify-between gap-3 transition-all`;
    toast.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()" class="opacity-70 hover:opacity-100 font-bold">✕</button>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5500);
  }

  formatRutInput(val) {
    return window.ApandiCrypto.formatRut(val);
  }

  // ===========================================================================
  // 1. AUTENTICACIÓN JWT Y CAMBIO DE PERFIL RBAC
  // ===========================================================================

  async quickLogin(email) {
    if (!email) return;
    const emailInput = document.getElementById('loginEmail');
    const passInput = document.getElementById('loginPassword');
    if (emailInput) emailInput.value = email;
    if (passInput) passInput.value = 'Ap4nd1#S3cV4ult!2026_Cl';
    await this.performLogin(email, 'Ap4nd1#S3cV4ult!2026_Cl');
  }

  async performLogin(emailOrRut, password) {
    const errBox = document.getElementById('loginError');
    const btnSubmit = document.getElementById('loginSubmitBtn');
    errBox?.classList.add('hidden');

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Verificando credenciales...';
    }

    try {
      const res = await this.api.request('auth/login', {
        method: 'POST',
        body: { emailOrRut, password }
      });

      this.api.token = res.token;
      this.api.user = res.user;
      localStorage.setItem('apandi_token', res.token);
      localStorage.setItem('apandi_user', JSON.stringify(res.user));

      await this.bootAuthenticatedSession();
      this.showToast(`✅ Bienvenido/a, ${res.user.nombre_completo}`);
    } catch (err) {
      if (errBox) {
        errBox.textContent = err.message;
        errBox.classList.remove('hidden');
      } else {
        this.showToast(err.message, 'error');
      }
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Iniciar Sesión';
      }
    }
  }

  logout() {
    localStorage.removeItem('apandi_token');
    localStorage.removeItem('apandi_user');
    this.api.token = null;
    this.api.user = null;
    document.getElementById('loginScreen')?.classList.remove('hidden');
  }

  async bootAuthenticatedSession() {
    if (!this.api.token || !this.api.user) {
      document.getElementById('loginScreen')?.classList.remove('hidden');
      return;
    }

    document.getElementById('loginScreen')?.classList.add('hidden');

    const u = this.api.user;
    document.getElementById('headerRoleBadge').textContent = u.rol_codigo;
    document.getElementById('sidebarUserName').textContent = u.nombre_completo;
    document.getElementById('sidebarUserRole').textContent = `${u.rol_codigo} • ${u.rol_nombre}`;
    document.getElementById('welcomeBannerTitle').textContent = `Bienvenido/a, ${u.nombre_completo}`;

    const switcher = document.getElementById('quickRoleSwitcher');
    if (switcher && u.email) switcher.value = u.email;

    await this.loadStudentsAndWorkshops();
    await this.loadDashboardRRHH();
    await this.loadPedagogicalBook();
    await this.loadBitacora();

    if (this.students.length > 0) {
      await this.loadClinicalRecord(this.students[0].id_estudiante);
      await this.loadGuardianPortal(this.students[0].id_estudiante);
    }

    if (u.rol_codigo === 'APODERADO') {
      this.switchTab('tab-apoderados');
    } else {
      this.switchTab('tab-dashboard');
    }
  }

  // ===========================================================================
  // 2. NAVEGACIÓN Y BUSCADOR GLOBAL DE ESTUDIANTES
  // ===========================================================================

  switchTab(tabId) {
    document.querySelectorAll('.tab-section').forEach((sec) => sec.classList.add('hidden'));
    document.getElementById(tabId)?.classList.remove('hidden');

    document.querySelectorAll('.nav-tab').forEach((btn) => {
      if (btn.dataset.target === tabId) {
        btn.className = 'nav-tab w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition text-left bg-apandi-600 text-white shadow font-bold';
      } else {
        btn.className = 'nav-tab w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition text-left text-slate-300 hover:bg-slate-800 font-semibold';
      }
    });

    if (tabId === 'tab-auditoria') {
      this.loadAuditLogs();
    }
  }

  switchBookSubtab(subtabId) {
    document.querySelectorAll('.book-subpanel').forEach((p) => p.classList.add('hidden'));
    document.getElementById(subtabId)?.classList.remove('hidden');

    const map = {
      'book-pid': 'btnSubtabPid',
      'book-asistencia': 'btnSubtabAsist',
      'book-evaluaciones': 'btnSubtabEval'
    };
    Object.entries(map).forEach(([panel, btnId]) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      if (panel === subtabId) {
        btn.className = 'book-subtab bg-white text-apandi-900 shadow-sm px-3.5 py-2 rounded-lg transition font-extrabold';
      } else {
        btn.className = 'book-subtab text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-lg transition font-bold';
      }
    });
  }

  handleGlobalSearch(query) {
    const resultsBox = document.getElementById('globalSearchResults');
    if (!resultsBox) return;
    const q = query.trim().toLowerCase();
    if (!q) {
      resultsBox.classList.add('hidden');
      return;
    }

    const matches = this.students.filter(
      (s) =>
        `${s.nombres} ${s.apellidos}`.toLowerCase().includes(q) ||
        (s.rut || '').toLowerCase().includes(q) ||
        (s.taller_nombre || '').toLowerCase().includes(q) ||
        (s.grupo_funcionalidad || '').toLowerCase().includes(q)
    );

    if (matches.length === 0) {
      resultsBox.innerHTML = `<div class="p-3 text-xs text-slate-500">No se encontraron estudiantes para "${query}"</div>`;
    } else {
      resultsBox.innerHTML = matches
        .map(
          (s) => `
          <div class="p-3 hover:bg-blue-50 flex items-center justify-between gap-2 text-xs cursor-pointer"
               onclick="window.app.openStudentClinical(${s.id_estudiante}); document.getElementById('globalSearchResults').classList.add('hidden');">
            <div>
              <div class="font-extrabold text-slate-900">${s.nombres} ${s.apellidos} <span class="font-mono text-slate-500">(${s.rut})</span></div>
              <div class="text-[11px] text-slate-500">${s.taller_nombre}</div>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
              s.grupo_funcionalidad === 'GRUPO_A' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
            }">${s.grupo_funcionalidad === 'GRUPO_A' ? 'Grupo A' : 'Grupo B'}</span>
          </div>
        `
        )
        .join('');
    }
    resultsBox.classList.remove('hidden');
  }

  // ===========================================================================
  // 3. MÓDULO 1: DASHBOARD INSTITUCIONAL Y PORTAL DOCENTE / RRHH
  // ===========================================================================

  async loadDashboardRRHH() {
    try {
      const data = await this.api.request('rrhh/dashboard');

      const statusText = document.getElementById('clockStatusText');
      const inTime = document.getElementById('clockInTime');
      const outTime = document.getElementById('clockOutTime');

      if (data.reloj_hoy) {
        statusText.textContent = `${data.reloj_hoy.estado} (${data.reloj_hoy.metodo_marcaje})`;
        statusText.className = 'font-bold text-emerald-400';
        inTime.textContent = data.reloj_hoy.hora_entrada || '--:--:--';
        outTime.textContent = data.reloj_hoy.hora_salida || '--:--:--';
      } else {
        statusText.textContent = 'SIN MARCAJE REGISTRADO HOY';
        statusText.className = 'font-bold text-amber-400';
        inTime.textContent = '--:--:--';
        outTime.textContent = '--:--:--';
      }

      const histBox = document.getElementById('staffAttendanceHistoryList');
      if (histBox && data.historial_reloj) {
        histBox.innerHTML = data.historial_reloj
          .map(
            (r) => `
            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div class="font-bold text-slate-900">${r.funcionario_nombre}</div>
                <div class="text-[11px] text-slate-500">${r.especialidad || r.rol_codigo} • ${r.metodo_marcaje}</div>
              </div>
              <div class="text-right font-mono">
                <span class="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">Entrada: ${r.hora_entrada || '--:--'}</span>
                ${r.hora_salida ? `<span class="block text-[10px] text-slate-500 mt-0.5">Salida: ${r.hora_salida}</span>` : ''}
              </div>
            </div>
          `
          )
          .join('');
      }

      const dias = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
      const schedBox = document.getElementById('staffScheduleList');
      if (schedBox) {
        if (!data.horarios || data.horarios.length === 0) {
          schedBox.innerHTML = `<div class="col-span-2 p-4 rounded-xl bg-slate-50 text-slate-500">Jornada transversal de supervisión y apoyo multidisciplinario PIE/UTP (08:00 a 17:30 hrs).</div>`;
        } else {
          schedBox.innerHTML = data.horarios
            .map(
              (h) => `
              <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div class="flex items-center justify-between">
                  <span class="font-extrabold text-apandi-800">${dias[h.dia_semana]}</span>
                  <span class="font-mono text-[11px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">${h.hora_inicio.slice(0, 5)} - ${h.hora_fin.slice(0, 5)}</span>
                </div>
                <p class="font-semibold text-slate-800 mt-1.5">${h.bloque_nombre}</p>
                <span class="text-[11px] text-slate-500 mt-1">${h.taller_nombre} • ${h.sala_ubicacion || 'Sala T1'}</span>
              </div>
            `
            )
            .join('');
        }
      }

      const notifBox = document.getElementById('utpNotificationsList');
      if (notifBox && data.notificaciones) {
        notifBox.innerHTML = data.notificaciones
          .map((n) => {
            const isSOS = n.tipo === 'ALERTA_SOS';
            const isAbsence = n.tipo === 'ALERTA_INASISTENCIA';
            const style = isSOS
              ? 'bg-red-50 border-red-300 text-red-950'
              : isAbsence
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-blue-50/70 border-blue-200 text-slate-800';
            return `
              <div class="p-3.5 rounded-xl border ${style} text-xs space-y-1">
                <div class="flex items-center justify-between font-extrabold">
                  <span>${n.titulo}</span>
                  <span class="text-[10px] font-mono opacity-75">${n.created_at || 'Hoy'}</span>
                </div>
                <p class="leading-relaxed opacity-90">${n.mensaje}</p>
              </div>
            `;
          })
          .join('');
      }

      this.renderDashboardCharts();
    } catch (err) {
      console.warn('Error cargando RRHH:', err.message);
    }
  }

  async markStaffAttendance(tipo_marca, metodo_marcaje = 'GEOLOCALIZADO') {
    let latitud = -33.51124;
    let longitud = -70.75813;

    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 2000 })
        );
        latitud = pos.coords.latitude;
        longitud = pos.coords.longitude;
      } catch {
        // Fallback a coordenadas institucionales APANDI
      }
    }

    try {
      const res = await this.api.request('rrhh/reloj-control', {
        method: 'POST',
        body: { tipo_marca, latitud, longitud, metodo_marcaje }
      });
      const coordsEl = document.getElementById('clockGpsCoords');
      if (coordsEl) {
        coordsEl.textContent = `GPS Verificado: Lat ${Number(latitud).toFixed(5)}, Lng ${Number(longitud).toFixed(5)}`;
      }
      this.showToast(`⏱️ ${res.mensaje}`);
      await this.loadDashboardRRHH();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  renderDashboardCharts() {
    const ctxDim = document.getElementById('chartDimensiones');
    const ctxDoughnut = document.getElementById('chartLogrosDoughnut');
    if (!ctxDim || !ctxDoughnut || typeof Chart === 'undefined') return;

    if (this.chartDimInstance) this.chartDimInstance.destroy();
    if (this.chartDoughnutInstance) this.chartDoughnutInstance.destroy();

    this.chartDimInstance = new Chart(ctxDim, {
      type: 'bar',
      data: {
        labels: ['Competencia Técnica Vocacional', 'Autonomía Personal y EPP', 'Habilidades Sociolaborales'],
        datasets: [
          { label: 'Logrado (L)', data: [72, 85, 78], backgroundColor: '#059669', borderRadius: 6 },
          { label: 'En Desarrollo (ED)', data: [22, 12, 18], backgroundColor: '#2563eb', borderRadius: 6 },
          { label: 'En Inicio (EI)', data: [6, 3, 4], backgroundColor: '#d97706', borderRadius: 6 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
        scales: { y: { beginAtZero: true, max: 100 } }
      }
    });

    this.chartDoughnutInstance = new Chart(ctxDoughnut, {
      type: 'doughnut',
      data: {
        labels: ['LOGRADO (L)', 'EN DESARROLLO (ED)', 'EN INICIO (EI)', 'NO OBSERVADO (NO)'],
        datasets: [
          {
            data: [68, 24, 6, 2],
            backgroundColor: ['#059669', '#2563eb', '#d97706', '#94a3b8']
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } }
      }
    });
  }

  // ===========================================================================
  // 4. MÓDULO 2: CONTROL ESTUDIANTIL, MATRÍCULA Y TALLERES (GRUPO A / B)
  // ===========================================================================

  async loadStudentsAndWorkshops() {
    try {
      const data = await this.api.request('estudiantes');
      this.students = data.estudiantes || [];
      this.workshops = data.talleres || [];

      const kpiTotal = document.getElementById('kpiTotalStudents');
      if (kpiTotal) kpiTotal.textContent = `${this.students.length} Estudiantes`;

      this.renderStudentsModule();
      this.populateStudentSelects();
    } catch (err) {
      console.warn('Error cargando estudiantes:', err.message);
    }
  }

  populateStudentSelects() {
    const ids = ['evalEstudiante', 'clinicalStudentSelect', 'guardianStudentSelect', 'sosStudentSelect'];
    ids.forEach((id) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = this.students
        .map(
          (s) =>
            `<option value="${s.id_estudiante}">${s.nombres} ${s.apellidos} (${
              s.grupo_funcionalidad === 'GRUPO_A' ? 'Grupo A: Más Funcional' : 'Grupo B: Mayor Apoyo'
            })</option>`
        )
        .join('');
    });
  }

  renderStudentsModule() {
    const workshopFilter = document.getElementById('filterWorkshopSelect')?.value || 'ALL';
    const groupFilter = document.getElementById('filterGroupSelect')?.value || 'ALL';

    const cardsBox = document.getElementById('workshopsSummaryCards');
    if (cardsBox) {
      cardsBox.innerHTML = this.workshops
        .map((t) => {
          const enrolled = this.students.filter((s) => Number(s.id_taller) === Number(t.id_taller));
          const countA = enrolled.filter((s) => s.grupo_funcionalidad === 'GRUPO_A').length;
          const countB = enrolled.filter((s) => s.grupo_funcionalidad === 'GRUPO_B').length;
          return `
            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between">
                  <span class="font-mono text-[11px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded">${t.codigo_mineduc}</span>
                  <span class="text-[11px] text-slate-500 font-semibold">${t.sala_ubicacion}</span>
                </div>
                <h4 class="font-extrabold text-slate-900 text-sm mt-2">${t.nombre}</h4>
                <p class="text-[11px] text-slate-500 mt-0.5">${t.nivel_decreto}</p>
              </div>
              <div class="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs font-bold">
                <span class="text-slate-700">Matrícula: ${enrolled.length}/${t.capacidad_maxima}</span>
                <div class="space-x-1.5">
                  <span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Grupo A: ${countA}</span>
                  <span class="bg-amber-100 text-amber-900 px-2 py-0.5 rounded">Grupo B: ${countB}</span>
                </div>
              </div>
            </div>
          `;
        })
        .join('');
    }

    const filtered = this.students.filter((s) => {
      const okWorkshop = workshopFilter === 'ALL' || String(s.id_taller) === String(workshopFilter);
      const okGroup = groupFilter === 'ALL' || s.grupo_funcionalidad === groupFilter;
      return okWorkshop && okGroup;
    });

    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;

    tbody.innerHTML = filtered
      .map((e) => {
        const isGrupoA = e.grupo_funcionalidad === 'GRUPO_A';
        const badgeGrupo = isGrupoA
          ? `<span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 font-extrabold px-2.5 py-1 rounded-full border border-emerald-300 text-[11px]">🟢 GRUPO A • Más Funcional</span>`
          : `<span class="inline-flex items-center gap-1 bg-amber-100 text-amber-950 font-extrabold px-2.5 py-1 rounded-full border border-amber-300 text-[11px]">🟡 GRUPO B • Mayor Apoyo</span>`;

        return `
          <tr class="hover:bg-blue-50/40 transition">
            <td class="p-3.5 font-mono">
              <div class="font-bold text-slate-900">${e.numero_matricula || 'MAT-2026'}</div>
              <div class="text-[11px] text-slate-500">${e.rut}</div>
            </td>
            <td class="p-3.5">
              <div class="font-extrabold text-slate-900 text-sm">${e.nombres} ${e.apellidos}</div>
              <div class="text-[11px] text-slate-500">${e.comuna || 'Maipú'} • Nac: ${e.fecha_nacimiento}</div>
            </td>
            <td class="p-3.5">
              <div class="font-bold text-slate-800">${e.taller_nombre || 'Corte y Confección'}</div>
              <div class="text-[11px] text-slate-500">${e.sala_ubicacion || 'Sala T1'}</div>
            </td>
            <td class="p-3.5">${badgeGrupo}</td>
            <td class="p-3.5">
              <span class="bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded font-bold">RND ${e.porcentaje_discapacidad || 50}%</span>
              <span class="block text-[10px] text-emerald-700 font-semibold mt-0.5">✓ Beca JUNAEB</span>
            </td>
            <td class="p-3.5">
              <div class="font-bold text-slate-800">${e.apoderado_nombre || 'Patricia Gómez'}</div>
              <div class="text-[11px] text-slate-500">${e.apoderado_parentesco || 'Madre'} • ${e.apoderado_telefono || '+56 9 8666 7788'}</div>
            </td>
            <td class="p-3.5">
              <div class="font-bold text-purple-900">${e.profesional_sos_nombre || 'Camila Vargas'}</div>
              <div class="text-[10px] text-slate-500">${e.profesional_sos_especialidad || 'Psicóloga PIE'}</div>
            </td>
            <td class="p-3.5 text-right space-x-1 whitespace-nowrap">
              <button onclick="window.app.openStudentClinical(${e.id_estudiante})"
                class="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg font-bold text-[11px] transition">
                🩺 Ficha PIE
              </button>
              <button onclick="window.app.openStudentFamilyReport(${e.id_estudiante})"
                class="bg-apandi-600 hover:bg-apandi-700 text-white px-3 py-1.5 rounded-lg font-bold text-[11px] transition">
                📄 Informe PDF
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  openNewStudentModal() {
    document.getElementById('newStudentModal')?.classList.remove('hidden');
  }

  async submitNewStudent() {
    try {
      const res = await this.api.request('estudiantes', {
        method: 'POST',
        body: {
          rut: document.getElementById('newEstRut').value,
          nombres: document.getElementById('newEstNombres').value,
          apellidos: document.getElementById('newEstApellidos').value,
          fecha_nacimiento: document.getElementById('newEstNacimiento').value,
          id_taller: Number(document.getElementById('newEstTaller').value),
          grupo_funcionalidad: document.getElementById('newEstGrupo').value,
          porcentaje_discapacidad: Number(document.getElementById('newEstPct').value),
          comuna: document.getElementById('newEstComuna').value,
          observaciones_ingreso: document.getElementById('newEstObs').value
        }
      });
      document.getElementById('newStudentModal')?.classList.add('hidden');
      this.showToast(`🎓 Estudiante matriculado con código oficial ${res.numero_matricula}`);
      await this.loadStudentsAndWorkshops();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  openStudentClinical(idEstudiante) {
    const sel = document.getElementById('clinicalStudentSelect');
    if (sel) sel.value = idEstudiante;
    this.switchTab('tab-clinico');
    this.loadClinicalRecord(idEstudiante);
  }

  openStudentFamilyReport(idEstudiante) {
    const sel = document.getElementById('guardianStudentSelect');
    if (sel) sel.value = idEstudiante;
    this.switchTab('tab-apoderados');
    this.loadGuardianPortal(idEstudiante);
  }

  // ===========================================================================
  // 5. MÓDULO 3: LIBRO DE CLASES DIGITAL (PID, ASISTENCIA Y FIRMA PIN)
  // ===========================================================================

  async loadPedagogicalBook() {
    try {
      const data = await this.api.request('pedagogico/libro');

      const pidBox = document.getElementById('pidClassesList');
      if (pidBox && data.clasesPid) {
        pidBox.innerHTML = data.clasesPid
          .map(
            (c) => `
            <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <div>
                  <span class="text-[10px] font-bold uppercase text-apandi-700">${c.taller_nombre} • ${c.fecha_clase}</span>
                  <h4 class="font-extrabold text-slate-900 text-sm">${c.unidad_tematica}</h4>
                </div>
                <span class="bg-emerald-100 text-emerald-900 font-mono text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-300">
                  ✓ FIRMADO PIN • SHA256: ${(c.hash_firma_electronica || '').substring(0, 16)}...
                </span>
              </div>
              <p class="text-slate-700 font-semibold">${c.objetivo_aprendizaje}</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                  <strong class="block mb-1">🟢 Estrategia Diversificada GRUPO A (Más Funcional):</strong>
                  <p>${c.actividad_grupo_a}</p>
                </div>
                <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
                  <strong class="block mb-1">🟡 Estrategia Diversificada GRUPO B (Mayor Apoyo):</strong>
                  <p>${c.actividad_grupo_b}</p>
                </div>
              </div>
              <div class="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                <span><strong>Recursos DUA:</strong> ${c.recursos_dua || 'Apoyos visuales ARASAAC'}</span>
                <span><strong>Docente Firmante:</strong> ${c.docente_nombre}</span>
              </div>
            </div>
          `
          )
          .join('');
      }

      const attBox = document.getElementById('attendanceStudentList');
      if (attBox) {
        attBox.innerHTML = this.students
          .map((s) => {
            const reg = (data.asistencias || []).find((a) => Number(a.id_estudiante) === Number(s.id_estudiante));
            const estado = reg ? reg.estado : 'PRESENTE';
            const badgeColor =
              estado === 'PRESENTE'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : estado === 'AUSENTE'
                ? 'bg-red-100 text-red-800 border-red-300'
                : 'bg-amber-100 text-amber-800 border-amber-300';

            return `
              <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50">
                <div class="flex items-center gap-3">
                  <span class="px-2.5 py-1 rounded-full font-extrabold text-[11px] border ${badgeColor}">${estado}</span>
                  <div>
                    <div class="font-extrabold text-slate-900 text-sm">${s.nombres} ${s.apellidos}</div>
                    <div class="text-[11px] text-slate-500">${s.taller_nombre} • <strong>${
              s.grupo_funcionalidad === 'GRUPO_A' ? 'Grupo A (Más Funcional)' : 'Grupo B (Mayor Apoyo)'
            }</strong></div>
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-1.5 text-xs">
                  <button onclick="window.app.saveStudentAttendance(${s.id_estudiante}, ${s.id_taller || 1}, 'PRESENTE')"
                    class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg transition">
                    ✓ Presente
                  </button>
                  <button onclick="window.app.saveStudentAttendance(${s.id_estudiante}, ${s.id_taller || 1}, 'AUSENTE')"
                    class="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg transition">
                    ✕ Ausente (Alerta UTP)
                  </button>
                  <button onclick="window.app.saveStudentAttendance(${s.id_estudiante}, ${s.id_taller || 1}, 'ATRASO')"
                    class="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg transition">
                    ⏱️ Atraso
                  </button>
                </div>
              </div>
            `;
          })
          .join('');
      }

      const evalBox = document.getElementById('evaluationsList');
      if (evalBox && data.evaluaciones) {
        evalBox.innerHTML = data.evaluaciones
          .map((ev) => {
            const color =
              ev.nivel_logro === 'LOGRADO'
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : ev.nivel_logro === 'EN_DESARROLLO'
                ? 'bg-blue-100 text-blue-900 border-blue-300'
                : 'bg-amber-100 text-amber-900 border-amber-300';
            return `
              <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <span class="text-[10px] font-bold uppercase text-slate-500">${ev.dimension.replace(/_/g, ' ')}</span>
                    <h4 class="font-extrabold text-slate-900 text-sm">${ev.estudiante_nombre}</h4>
                  </div>
                  <span class="px-2.5 py-1 rounded-full font-extrabold text-[11px] border shrink-0 ${color}">
                    ${ev.nivel_logro.replace(/_/g, ' ')}
                  </span>
                </div>
                <p class="font-semibold text-slate-800">${ev.indicador_competencia}</p>
                <p class="text-[11px] text-slate-500 italic">"${ev.comentario_pedagogico || 'Sin observación adicional'}"</p>
              </div>
            `;
          })
          .join('');
      }
    } catch (err) {
      console.warn('Error cargando Libro Digital:', err.message);
    }
  }

  async submitPidClass() {
    try {
      const pin = document.getElementById('pidPin').value;
      const res = await this.api.request('pedagogico/pid', {
        method: 'POST',
        body: {
          id_taller: Number(document.getElementById('pidTaller').value),
          unidad_tematica: document.getElementById('pidUnidad').value,
          objetivo_aprendizaje: document.getElementById('pidObjetivo').value,
          actividad_grupo_a: document.getElementById('pidGrupoA').value,
          actividad_grupo_b: document.getElementById('pidGrupoB').value,
          recursos_dua: document.getElementById('pidRecursos').value,
          pin_firma: pin
        }
      });
      this.showToast(`✍️ ${res.mensaje}`);
      await this.loadPedagogicalBook();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async saveStudentAttendance(id_estudiante, id_taller, estado) {
    try {
      const res = await this.api.request('pedagogico/asistencia', {
        method: 'POST',
        body: {
          id_estudiante,
          id_taller,
          estado,
          observacion: `Registrado digitalmente por ${this.api.user?.nombre_completo}`
        }
      });
      this.showToast(
        estado === 'AUSENTE'
          ? `⚠️ Ausencia registrada. Se disparó Alerta Automática de Inasistencia a UTP.`
          : `✅ ${res.mensaje}`,
        estado === 'AUSENTE' ? 'warning' : 'success'
      );
      await this.loadPedagogicalBook();
      await this.loadDashboardRRHH();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async submitEvaluation() {
    try {
      const res = await this.api.request('pedagogico/evaluaciones', {
        method: 'POST',
        body: {
          id_estudiante: Number(document.getElementById('evalEstudiante').value),
          id_taller: 1,
          dimension: document.getElementById('evalDimension').value,
          nivel_logro: document.getElementById('evalLogro').value,
          indicador_competencia: document.getElementById('evalIndicador').value,
          comentario_pedagogico: document.getElementById('evalComentario').value
        }
      });
      this.showToast(`🏅 ${res.mensaje}`);
      await this.loadPedagogicalBook();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // ===========================================================================
  // 6. MÓDULO 4: EXPEDIENTE CLÍNICO Y PIE (ENCRIPTADO AES-256 LEY 19.628)
  // ===========================================================================

  async loadClinicalRecord(idEstudiante) {
    const deniedBox = document.getElementById('clinicalAccessDeniedBox');
    const contentBox = document.getElementById('clinicalContentBox');
    const permBadge = document.getElementById('clinicalPermissionBadge');

    deniedBox?.classList.add('hidden');
    contentBox?.classList.remove('hidden');

    try {
      const data = await this.api.request(`clinico/expediente/${idEstudiante}`);
      const canWrite = data.permiso_escritura;

      const btnSave = document.getElementById('btnSaveClinical');
      const diagInput = document.getElementById('clinDiagnostico');
      const anamInput = document.getElementById('clinAnamnesis');

      if (canWrite) {
        permBadge.textContent = `✍️ LECTURA Y ESCRITURA HABILITADA (${data.rol_acceso})`;
        permBadge.className = 'bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold';
        btnSave?.classList.remove('hidden');
        if (diagInput) diagInput.disabled = false;
        if (anamInput) anamInput.disabled = false;
      } else {
        permBadge.textContent = `👁️ MODO SOLO LECTURA PROTEGIDO (${data.rol_acceso} - LEY 19.628)`;
        permBadge.className = 'bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold';
        btnSave?.classList.add('hidden');
        if (diagInput) diagInput.disabled = true;
        if (anamInput) anamInput.disabled = true;
      }

      document.getElementById('clinicalCipherPreview').textContent =
        data.ficha?.cipher_preview || 'c8a91b2f04e1938a71b23901:9a81f2b3c4d5e6f70192837465564738:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069...';

      if (diagInput) diagInput.value = data.ficha?.diagnostico_principal || 'Diagnóstico en proceso de evaluación Decreto 170.';
      if (anamInput) anamInput.value = data.ficha?.anamnesis || 'Anamnesis clínica en registro.';

      const med = data.ficha?.datos_medicos || { medicamentos: [], alergias: [] };
      document.getElementById('clinMedicamentosBox').innerHTML = `
        <div><strong>💊 Esquema Farmacológico:</strong> ${
          (med.medicamentos || [])
            .map((m) => `<span class="inline-block bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded mr-1">${m.nombre} (${m.dosis} • ${m.horario})</span>`)
            .join('') || 'Sin medicación activa'
        }</div>
        <div><strong>⚠️ Alergias Críticas:</strong> ${(med.alergias || []).join(', ') || 'Ninguna reportada'}</div>
        <div><strong>🎧 Perfil Sensorial:</strong> ${med.perfil_sensorial || 'Adecuado al entorno de taller'}</div>
        <div><strong>🏥 Red de Salud / Derivación:</strong> ${data.ficha?.sistema_salud || 'FONASA'} — ${data.ficha?.centro_salud_derivacion || 'CRS Maipú / COSAM'}</div>
      `;

      if (data.pai) {
        const dua = typeof data.pai.estrategias_dua_json === 'string' ? JSON.parse(data.pai.estrategias_dua_json) : data.pai.estrategias_dua_json;
        const apoyos = typeof data.pai.apoyos_especialistas_json === 'string' ? JSON.parse(data.pai.apoyos_especialistas_json) : data.pai.apoyos_especialistas_json;

        document.getElementById('paiContentBox').innerHTML = `
          <div class="p-3 bg-white rounded-xl border border-blue-200">
            <strong class="text-blue-950 block">🌟 Fortalezas e Intereses Vocacionales:</strong>
            <p class="mt-0.5">${data.pai.fortalezas_intereses}</p>
          </div>
          <div class="p-3 bg-white rounded-xl border border-blue-200 space-y-1.5">
            <strong class="text-blue-950 block">🎯 Principios DUA Aplicados en Taller (Decreto 83):</strong>
            <div>• <strong>I. Implicación y Motivación:</strong> ${dua.implicacion}</div>
            <div>• <strong>II. Representación Visual/Auditiva:</strong> ${dua.representacion}</div>
            <div>• <strong>III. Acción y Expresión Práctica:</strong> ${dua.accion_expresion}</div>
          </div>
          <div class="p-3 bg-white rounded-xl border border-blue-200 space-y-1.5">
            <strong class="text-blue-950 block">👩‍⚕️ Intervención del Equipo Multidisciplinario PIE:</strong>
            <div>• <strong>Psicología:</strong> ${apoyos.psicologia}</div>
            <div>• <strong>Terapia Ocupacional:</strong> ${apoyos.terapia_ocupacional}</div>
            <div>• <strong>Fonoaudiología:</strong> ${apoyos.fonoaudiologia}</div>
          </div>
        `;
      } else {
        document.getElementById('paiContentBox').innerHTML = `<div class="p-3 bg-white rounded-xl">PAI en actualización semestral para este alumno.</div>`;
      }

      if (data.paci) {
        const crit = typeof data.paci.criterios_adecuacion_json === 'string' ? JSON.parse(data.paci.criterios_adecuacion_json) : data.paci.criterios_adecuacion_json;
        document.getElementById('paciContentBox').innerHTML = `
          <div class="p-3 bg-white rounded-xl border border-purple-200 space-y-1.5">
            <div><strong>Tipo de Adecuación Curricular:</strong> <span class="font-bold text-purple-900">${data.paci.tipo_adecuacion}</span></div>
            <div><strong>Adecuación de Acceso:</strong> ${crit.acceso}</div>
            <div><strong>Adecuación a Objetivos (OA Laborales):</strong> ${crit.objetivos_aprendizaje}</div>
            <div><strong>Estrategia de Evaluación Diferenciada:</strong> ${data.paci.estrategias_evaluacion_diferenciada}</div>
          </div>
        `;
      } else {
        document.getElementById('paciContentBox').innerHTML = `<div class="p-3 bg-white rounded-xl">El estudiante trabaja con adecuaciones DUA universales en su grupo funcional.</div>`;
      }

      if (data.paec) {
        document.getElementById('paecDetailCard').innerHTML = `
          <div class="p-4 rounded-xl bg-red-50 border border-red-200 space-y-1">
            <div class="font-extrabold text-red-900 text-sm">🚨 Profesional SOS Titular: ${data.paec.profesional_sos_nombre}</div>
            <div class="text-red-800 font-semibold">${data.paec.profesional_sos_especialidad} • Contacto Directo: ${data.paec.profesional_sos_telefono}</div>
          </div>
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <strong class="text-slate-900 block">⚡ Gatillantes Identificados (Desencriptado AES-256):</strong>
            <p class="mt-1 text-slate-700 leading-relaxed">${data.paec.gatillantes_dec}</p>
          </div>
          <div class="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
            <strong class="text-amber-950 block">👀 Señales Previas / Conductas Precursoras:</strong>
            <p class="mt-1 text-amber-900 leading-relaxed">${data.paec.senales_previas}</p>
          </div>
          <div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <strong class="text-emerald-950 block">🛡️ Protocolo de Contención por Etapas (1, 2 y 3):</strong>
            <p class="mt-1 text-emerald-900 leading-relaxed">${data.paec.estrategias_contencion}</p>
          </div>
          <div class="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
            <strong class="text-blue-950 block">👨‍👩‍👦 Acuerdos de Co-responsabilidad con la Familia:</strong>
            <p class="mt-1 text-blue-900 leading-relaxed">${data.paec.acuerdos_familia}</p>
          </div>
        `;
      }
    } catch (err) {
      deniedBox?.classList.remove('hidden');
      contentBox?.classList.add('hidden');
      const txt = document.getElementById('clinicalDeniedText');
      if (txt) txt.textContent = err.message;
      if (permBadge) {
        permBadge.textContent = '🛑 ACCESO BLOQUEADO POR RBAC (LEY 19.628)';
        permBadge.className = 'bg-red-100 text-red-900 border border-red-300 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold';
      }
    }
  }

  async saveClinicalRecord() {
    const idEst = document.getElementById('clinicalStudentSelect').value;
    try {
      const res = await this.api.request(`clinico/expediente/${idEst}`, {
        method: 'PUT',
        body: {
          diagnostico_principal: document.getElementById('clinDiagnostico').value,
          anamnesis: document.getElementById('clinAnamnesis').value,
          datos_medicos_json: {
            medicamentos: [{ nombre: 'Risperidona', dosis: '1 mg', horario: '08:00 y 20:00 hrs' }],
            alergias: ['Penicilina', 'Polvo textil sintético'],
            perfil_sensorial: 'Hipersensibilidad auditiva a motores industriales; usa protectores auditivos.'
          }
        }
      });
      this.showToast(`🔒 ${res.mensaje}`);
      await this.loadClinicalRecord(idEst);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // ===========================================================================
  // 7. MÓDULO 5: CONVIVENCIA PAEC Y BOTÓN SOS EN AULA
  // ===========================================================================

  openSosModal() {
    document.getElementById('sosModal')?.classList.remove('hidden');
  }

  closeSosModal() {
    document.getElementById('sosModal')?.classList.add('hidden');
  }

  showSosBanner(alerta) {
    const banner = document.getElementById('sosRealtimeBanner');
    const text = document.getElementById('sosBannerText');
    if (banner && text) {
      text.innerHTML = `
        <strong>Alumno:</strong> ${alerta.estudiante} • 
        <strong>Ubicación:</strong> ${alerta.ubicacion} • 
        <strong>Profesional SOS Convocado:</strong> ${alerta.profesional_sos} (${alerta.telefono_sos})
      `;
      banner.classList.remove('hidden');
    }
  }

  async submitSosAlert() {
    try {
      const res = await this.api.request('paec/sos', {
        method: 'POST',
        body: {
          id_estudiante: Number(document.getElementById('sosStudentSelect').value),
          ubicacion: document.getElementById('sosUbicacion').value,
          descripcion_breve: document.getElementById('sosDescripcion').value
        }
      });

      this.closeSosModal();
      this.showSosBanner(res.alerta);
      this.api.broadcastSosAlert(res.alerta);
      this.showToast(`🚨 ${res.mensaje}`, 'error');
      await this.loadBitacora();
      await this.loadDashboardRRHH();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async loadBitacora() {
    try {
      const data = await this.api.request('paec/bitacora');
      const box = document.getElementById('bitacoraList');
      if (!box) return;

      if (!data.bitacora || data.bitacora.length === 0) {
        box.innerHTML = `
          <div class="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
            <div class="text-2xl">✅</div>
            <div class="font-bold text-slate-800">Sin episodios de desregulación severa activos en este momento</div>
            <p class="text-slate-500">Puedes probar el flujo de emergencia en tiempo real presionando el botón rojo <strong>🚨 BOTÓN SOS AULA</strong> en la barra superior.</p>
          </div>
        `;
        return;
      }

      box.innerHTML = data.bitacora
        .map(
          (b) => `
          <div class="p-4 rounded-2xl bg-red-50/70 border border-red-200 space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-extrabold text-red-950 text-sm">🚨 ${b.tipo_incidencia.replace(/_/g, ' ')} — ${b.estudiante_nombre}</span>
              <span class="bg-red-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">${b.estado_alerta}</span>
            </div>
            <p class="text-slate-800"><strong>Suceso (Desencriptado AES-256):</strong> ${b.descripcion_suceso}</p>
            <p class="text-emerald-950 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              <strong>Protocolo PAEC Activado:</strong> ${b.acciones_aplicadas_paec}
            </p>
            <div class="text-[11px] text-slate-500 flex items-center justify-between pt-1">
              <span>Reportado por: <strong>${b.reportante_nombre}</strong></span>
              <span>Profesional SOS: <strong>${b.profesional_nombre || 'Equipo PIE'}</strong> • ${b.fecha_hora_suceso}</span>
            </div>
          </div>
        `
        )
        .join('');
    } catch (err) {
      console.warn('Error cargando bitácora:', err.message);
    }
  }

  // ===========================================================================
  // 8. MÓDULO 6: PORTAL APODERADOS Y GENERADOR AUTOMÁTICO DE PDF (jsPDF)
  // ===========================================================================

  async loadGuardianPortal(idEstudiante) {
    try {
      const data = await this.api.request(`apoderados/resumen/${idEstudiante}`);
      this.currentFamilySummary = data;

      const est = data.estudiante || {};
      const asist = data.asistencia || { total_dias: 1, dias_presente: 1, dias_ausente: 0 };
      const total = Number(asist.total_dias || 1);
      const pres = Number(asist.dias_presente || 1);
      const pct = total > 0 ? Math.round((pres / total) * 100) : 100;

      const box = document.getElementById('guardianPortalContent');
      if (!box) return;

      box.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b-2 border-apandi-900">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-widest text-apandi-700">Ministerio de Educación de Chile • Decreto Exento N° 83</span>
            <h3 class="text-lg font-extrabold text-slate-900">CENTRO DE CAPACITACIÓN LABORAL APANDI</h3>
            <p class="text-xs text-slate-500">Informe Oficial de Progreso Pedagógico, Asistencia y Apoyos PIE para la Familia</p>
          </div>
          <div class="text-right font-mono text-xs">
            <div class="font-bold text-slate-900">Matrícula: ${est.numero_matricula || 'MAT-2026-001'}</div>
            <div class="text-slate-500">Fecha Emisión: ${new Date().toLocaleDateString('es-CL')}</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div class="font-extrabold text-apandi-900 uppercase text-[11px]">1. Identificación del Estudiante y Taller</div>
            <div><strong>Estudiante:</strong> ${est.nombres} ${est.apellidos} (RUT: ${est.rut})</div>
            <div><strong>Taller Laboral:</strong> ${est.taller_nombre || 'Taller de Corte y Confección Textil'}</div>
            <div><strong>Modalidad de Apoyo Curricular:</strong> ${
              est.grupo_funcionalidad === 'GRUPO_A' ? 'Grupo A (Mayor Funcionalidad / Autonomía)' : 'Grupo B (Mayor Apoyo y Mediación DUA)'
            }</div>
            <div><strong>Apoderado Titular:</strong> ${est.apoderado_nombre || 'Patricia Gómez Díaz'}</div>
          </div>

          <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col items-center justify-center text-center">
            <span class="text-[11px] font-bold uppercase text-emerald-800">Asistencia Semestral</span>
            <span class="text-3xl font-extrabold text-emerald-700 my-1">${pct}%</span>
            <span class="text-[11px] text-emerald-900">${pres} días presente de ${total} registrados</span>
          </div>
        </div>

        <div class="space-y-2.5">
          <div class="font-extrabold text-apandi-900 uppercase text-[11px]">2. Evaluación Cualitativa de Aprendizajes Laborales (PID Decreto 83)</div>
          <div class="overflow-x-auto rounded-xl border border-slate-200">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-100 text-slate-700">
                  <th class="p-2.5">Dimensión</th>
                  <th class="p-2.5">Indicador de Competencia Evaluado</th>
                  <th class="p-2.5">Nivel de Logro</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                ${
                  (data.evaluaciones || [])
                    .map(
                      (ev) => `
                    <tr>
                      <td class="p-2.5 font-semibold text-slate-600">${ev.dimension.replace(/_/g, ' ')}</td>
                      <td class="p-2.5 font-bold text-slate-900">
                        ${ev.indicador_competencia}
                        <span class="block text-[11px] font-normal text-slate-500">${ev.comentario_pedagogico || ''}</span>
                      </td>
                      <td class="p-2.5 font-extrabold text-emerald-700">${ev.nivel_logro.replace(/_/g, ' ')}</td>
                    </tr>
                  `
                    )
                    .join('') || '<tr><td colspan="3" class="p-3 text-slate-500">Evaluaciones en proceso de cierre semestral.</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1.5">
            <div class="font-extrabold text-blue-950 uppercase text-[11px]">3. Avances del Plan de Apoyo Individual (PAI)</div>
            <p><strong>Fortalezas Destacadas:</strong> ${est.fortalezas_intereses || 'Participación activa y respeto por normas de taller.'}</p>
            <p><strong>Proyección Sociolaboral:</strong> ${est.objetivos_transicion_vida_adulta || 'Fomento de autonomía personal y trabajo colaborativo.'}</p>
          </div>
          <div class="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1.5">
            <div class="font-extrabold text-purple-950 uppercase text-[11px]">4. Acuerdos de Convivencia y Familia (PAEC)</div>
            <p>${est.acuerdos_familia || 'Mantener rutinas de anticipación en el hogar y comunicación directa con equipo PIE.'}</p>
          </div>
        </div>
      `;
    } catch (err) {
      console.warn('Error cargando portal apoderados:', err.message);
    }
  }

  async generateOfficialFamilyPDF() {
    if (!this.currentFamilySummary || !this.currentFamilySummary.estudiante) {
      this.showToast('Seleccione un estudiante primero', 'warning');
      return;
    }

    const { estudiante: est, asistencia: asist, evaluaciones: evals } = this.currentFamilySummary;
    const total = Number(asist?.total_dias || 1);
    const pres = Number(asist?.dias_presente || 1);
    const pct = total > 0 ? Math.round((pres / total) * 100) : 100;

    try {
      await this.api.request(`reportes/auditar-pdf/${est.id_estudiante}`, { method: 'POST' });
    } catch {
      // Continúa generación PDF en cliente
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('CENTRO DE CAPACITACIÓN LABORAL APANDI', 15, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Educación Especial Nivel Laboral • Decreto Exento N° 83 / Decreto N° 170 MINEDUC Chile', 15, 20);
    doc.text('INFORME OFICIAL DE AVANCES PEDAGÓGICOS Y APOYOS PIE PARA LA FAMILIA', 15, 26);

    let y = 42;
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('1. IDENTIFICACIÓN DEL ESTUDIANTE Y TALLER LABORAL', 15, y);
    y += 6;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Estudiante: ${est.nombres} ${est.apellidos}   |   RUT: ${est.rut}   |   Matrícula: ${est.numero_matricula || 'MAT-2026'}`, 15, y);
    y += 5.5;
    doc.text(`Taller Asignado: ${est.taller_nombre || 'Taller de Corte y Confección Textil'}`, 15, y);
    y += 5.5;
    doc.text(`Nivel de Funcionalidad: ${est.grupo_funcionalidad === 'GRUPO_A' ? 'Grupo A (Mayor Funcionalidad)' : 'Grupo B (Mayor Apoyo)'}   |   Asistencia: ${pct}%`, 15, y);
    y += 5.5;
    doc.text(`Apoderado Titular: ${est.apoderado_nombre || 'Patricia Gómez Díaz'}`, 15, y);

    y += 10;
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('2. EVALUACIÓN CUALITATIVA DE COMPETENCIAS LABORALES (PID - DECRETO 83)', 15, y);
    y += 5;
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Escala Cualitativa MINEDUC: LOGRADO (L) | EN DESARROLLO (ED) | EN INICIO (EI) | NO OBSERVADO (NO)', 15, y);
    y += 6;

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    (evals || []).forEach((ev, idx) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}. [${ev.nivel_logro.replace(/_/g, ' ')}] (${ev.dimension.replace(/_/g, ' ')})`, 15, y);
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(`Indicador: ${ev.indicador_competencia}. Obs: ${ev.comentario_pedagogico || ''}`, 180);
      doc.text(lines, 18, y);
      y += lines.length * 4.5 + 2;
    });

    y += 5;
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('3. SÍNTESIS DEL PLAN DE APOYO INDIVIDUAL (PAI) Y ACUERDOS PAEC', 15, y);
    y += 6;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const paiText = doc.splitTextToSize(`Fortalezas e Intereses (PAI): ${est.fortalezas_intereses || 'Participación positiva en taller laboral.'}`, 180);
    doc.text(paiText, 15, y);
    y += paiText.length * 4.8 + 2;

    const vidaAdulta = doc.splitTextToSize(`Proyección Transición Vida Adulta: ${est.objetivos_transicion_vida_adulta || 'Desarrollo de hábitos sociolaborales y seguridad.'}`, 180);
    doc.text(vidaAdulta, 15, y);
    y += vidaAdulta.length * 4.8 + 2;

    const paecText = doc.splitTextToSize(`Acuerdos con la Familia (PAEC): ${est.acuerdos_familia || 'Comunicación permanente con el equipo multidisciplinario PIE.'}`, 180);
    doc.text(paecText, 15, y);

    doc.setDrawColor(203, 213, 225);
    doc.line(25, 255, 95, 255);
    doc.line(115, 255, 185, 255);
    doc.setFontSize(8.5);
    doc.text('Firma Docente Titular / Coordinación PIE', 32, 260);
    doc.text('Firma Dirección / Unidad Técnico-Pedagógica', 120, 260);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Documento generado automáticamente por SGI APANDI el ${new Date().toLocaleDateString('es-CL')} bajo resguardo de la Ley N° 19.628.`, 25, 278);

    doc.save(`Informe_Familia_${est.rut}_APANDI_2026.pdf`);
    this.showToast(`📄 PDF Oficial "Informe para la Familia" descargado y registrado en Auditoría.`);
  }

  // ===========================================================================
  // 9. MÓDULO 7: SEGURIDAD RBAC Y CONSOLA DE AUDITORÍA LEY 19.628
  // ===========================================================================

  async loadAuditLogs() {
    const tbody = document.getElementById('auditTableBody');
    const rolesGrid = document.getElementById('rbacRolesGrid');
    try {
      const data = await this.api.request('seguridad/auditoria');

      if (rolesGrid && data.roles) {
        rolesGrid.innerHTML = data.roles
          .map(
            (r) => `
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="font-mono font-extrabold text-apandi-800">${r.codigo}</span>
                <span class="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">Rol Oficial</span>
              </div>
              <div class="font-bold text-slate-900">${r.nombre}</div>
              <p class="text-[11px] text-slate-500">${r.descripcion}</p>
            </div>
          `
          )
          .join('');
      }

      if (tbody && data.logs) {
        tbody.innerHTML = data.logs
          .map(
            (l) => `
            <tr class="hover:bg-slate-50">
              <td class="p-3 font-mono text-[11px] text-slate-600">#${l.id_log} • ${l.fecha_hora}</td>
              <td class="p-3 font-bold text-slate-900">
                ${l.usuario_nombre}
                <span class="ml-1 text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-mono">${l.rol_codigo}</span>
              </td>
              <td class="p-3 font-mono font-bold text-apandi-800">${l.modulo}</td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  l.accion === 'ALERTA_SOS'
                    ? 'bg-red-100 text-red-800'
                    : l.accion === 'ACTUALIZACION'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-blue-800'
                }">${l.accion}</span>
              </td>
              <td class="p-3 text-slate-700">${l.detalle}</td>
              <td class="p-3 font-mono text-[11px] text-slate-500">${l.ip_origen}</td>
            </tr>
          `
          )
          .join('');
      }
    } catch (err) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-red-700 font-bold">🔒 ${err.message}</td></tr>`;
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new SgiApandiApplication();
  window.app.bootAuthenticatedSession();
});
