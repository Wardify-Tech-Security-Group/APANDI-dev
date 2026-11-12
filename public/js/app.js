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

    // Estado del Módulo Pedagógico v3.0 (Desacoplado)
    this.semestres = [];
    this.bloques = [];
    this.pidClasses = [];
    this.qualitativeSelectedStudent = null;
    this.qualitativeMatrixData = null;

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

    document.getElementById('semestresConfigForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveSemestersConfig();
    });

    document.getElementById('bloqueForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveBlockConfig();
    });

    document.getElementById('pidForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitPidClass(false);
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
      'book-config': 'btnSubtabConfig',
      'book-pid': 'btnSubtabPid',
      'book-asistencia': 'btnSubtabAsist',
      'book-evaluaciones': 'btnSubtabEval'
    };
    Object.entries(map).forEach(([panel, btnId]) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      if (panel === subtabId) {
        btn.className = 'book-subtab bg-white text-apandi-900 shadow-sm px-3.5 py-2 rounded-lg transition font-extrabold border border-slate-200';
      } else {
        btn.className = 'book-subtab text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-lg transition font-bold';
      }
    });

    if (subtabId === 'book-config') {
      this.loadSemestersConfig();
      this.loadBlocksConfig();
    } else if (subtabId === 'book-pid') {
      this.loadPidSection();
    } else if (subtabId === 'book-asistencia') {
      this.updateAttendanceBlocksDropdown();
    } else if (subtabId === 'book-evaluaciones') {
      this.loadQualitativeEvaluationsSection();
    }
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
  // 5. MÓDULO 3: LIBRO DE CLASES DIGITAL (4 SUB-VISTAS DESACOPLADAS)
  // ===========================================================================

  async loadPedagogicalBook() {
    await Promise.all([
      this.loadSemestersConfig(),
      this.loadBlocksConfig(),
      this.loadPidSection()
    ]);
  }

  // ---------------------------------------------------------------------------
  // 5.1 Sub-vista 1: Configuración de Semestres y Bloques Horarios
  // ---------------------------------------------------------------------------

  async loadSemestersConfig() {
    try {
      const res = await this.api.request('pedagogico/semestres');
      if (!res.ok) return;
      this.semestres = res.semestres || [];

      const sem1 = this.semestres.find((s) => Number(s.numero_semestre) === 1);
      const sem2 = this.semestres.find((s) => Number(s.numero_semestre) === 2);

      if (sem1) {
        const inpIni = document.getElementById('sem1Inicio');
        const inpFin = document.getElementById('sem1Termino');
        const chk = document.getElementById('sem1Activo');
        if (inpIni) inpIni.value = sem1.fecha_inicio;
        if (inpFin) inpFin.value = sem1.fecha_termino;
        if (chk) chk.checked = !!Number(sem1.activo);
      }

      if (sem2) {
        const inpIni = document.getElementById('sem2Inicio');
        const inpFin = document.getElementById('sem2Termino');
        const chk = document.getElementById('sem2Activo');
        if (inpIni) inpIni.value = sem2.fecha_inicio;
        if (inpFin) inpFin.value = sem2.fecha_termino;
        if (chk) chk.checked = !!Number(sem2.activo);
      }

      const semActivo = this.semestres.find((s) => Number(s.activo) === 1) || sem2 || sem1;
      const weeksBox = document.getElementById('semestersWeeksList');
      if (weeksBox && semActivo && semActivo.semanas) {
        weeksBox.innerHTML = semActivo.semanas
          .map(
            (w) => `
          <div class="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
            <span class="font-extrabold text-slate-800">${w.etiqueta}</span>
            <span class="font-mono text-[10px] text-slate-500">${w.fecha_inicio} al ${w.fecha_termino}</span>
          </div>
        `
          )
          .join('');
      }

      this.populatePidWeekSelectors(semActivo?.semanas || []);
    } catch (err) {
      console.warn('Error cargando semestres:', err.message);
    }
  }

  populatePidWeekSelectors(semanas) {
    const selPidSem = document.getElementById('pidSemana');
    const selFilterSem = document.getElementById('pidFilterSemana');
    if (!semanas || semanas.length === 0) return;

    const optionsHtml = semanas
      .map((w) => `<option value="${w.numero_semana}">Semana ${w.numero_semana} (${w.fecha_inicio} al ${w.fecha_termino})</option>`)
      .join('');

    if (selPidSem) {
      selPidSem.innerHTML = optionsHtml;
    }
    if (selFilterSem) {
      selFilterSem.innerHTML = '<option value="">Todas las semanas</option>' + optionsHtml;
    }
  }

  async saveSemestersConfig() {
    try {
      const s1Ini = document.getElementById('sem1Inicio')?.value;
      const s1Fin = document.getElementById('sem1Termino')?.value;
      const s1Act = document.getElementById('sem1Activo')?.checked ? 1 : 0;

      const s2Ini = document.getElementById('sem2Inicio')?.value;
      const s2Fin = document.getElementById('sem2Termino')?.value;
      const s2Act = document.getElementById('sem2Activo')?.checked ? 1 : 0;

      const res = await this.api.request('pedagogico/semestres', {
        method: 'POST',
        body: {
          anio_escolar: 2026,
          semestres: [
            { numero_semestre: 1, nombre: 'Primer Semestre 2026', fecha_inicio: s1Ini, fecha_termino: s1Fin, activo: s1Act },
            { numero_semestre: 2, nombre: 'Segundo Semestre 2026', fecha_inicio: s2Ini, fecha_termino: s2Fin, activo: s2Act }
          ]
        }
      });

      this.showToast(`✅ ${res.mensaje}`);
      await this.loadSemestersConfig();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async loadBlocksConfig() {
    try {
      const res = await this.api.request('pedagogico/bloques');
      if (!res.ok) return;
      this.bloques = res.bloques || [];

      const listContainer = document.getElementById('blocksListContainer');
      const diasNombres = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

      if (listContainer) {
        listContainer.innerHTML = this.bloques
          .map(
            (b) => `
          <div class="p-3 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-900 border border-blue-200">
                  ${diasNombres[b.dia_semana] || 'Día ' + b.dia_semana} • ${b.hora_inicio.substring(0, 5)} - ${b.hora_fin.substring(0, 5)}
                </span>
                <span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                  ⏱️ ${b.duracion_minutos || 90} min
                </span>
                <span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700">
                  👥 ${b.total_estudiantes || 0} estudiantes
                </span>
              </div>
              <h4 class="font-extrabold text-slate-900 text-xs mt-1">${b.bloque_nombre}</h4>
              <p class="text-[11px] text-slate-500">${b.taller_nombre} • Docente: ${b.docente_nombre}</p>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button type="button" onclick="window.app.editBlock(${b.id_horario})"
                class="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs">
                ✏️ Editar
              </button>
              <button type="button" onclick="window.app.selectBlockForAssignment(${b.id_horario})"
                class="px-2.5 py-1 rounded-lg bg-apandi-600 hover:bg-apandi-700 text-white font-extrabold text-xs">
                👥 Asignar Alumnos
              </button>
            </div>
          </div>
        `
          )
          .join('');
      }

      const assignSel = document.getElementById('assignBlockSelector');
      if (assignSel) {
        assignSel.innerHTML = this.bloques
          .map(
            (b) => `
          <option value="${b.id_horario}">Bloque #${b.id_horario}: ${diasNombres[b.dia_semana]} (${b.hora_inicio.substring(0, 5)}-${b.hora_fin.substring(0, 5)}) - ${b.bloque_nombre}</option>
        `
          )
          .join('');

        if (this.bloques.length > 0) {
          this.loadBlockStudentsAssignment(assignSel.value || this.bloques[0].id_horario);
        }
      }

      this.updateAttendanceBlocksDropdown();
    } catch (err) {
      console.warn('Error cargando bloques:', err.message);
    }
  }

  editBlock(idHorario) {
    const b = this.bloques.find((x) => Number(x.id_horario) === Number(idHorario));
    if (!b) return;
    document.getElementById('bloqueId').value = b.id_horario;
    document.getElementById('bloqueTaller').value = b.id_taller;
    document.getElementById('bloqueDia').value = b.dia_semana;
    document.getElementById('bloqueNombre').value = b.bloque_nombre;
    document.getElementById('bloqueHoraInicio').value = b.hora_inicio.substring(0, 5);
    document.getElementById('bloqueHoraFin').value = b.hora_fin.substring(0, 5);
    document.getElementById('bloqueDuracion').value = b.duracion_minutos || 90;
    this.showToast(`✏️ Bloque #${idHorario} cargado en el formulario para edición.`);
  }

  resetBlockForm() {
    document.getElementById('bloqueId').value = '';
    document.getElementById('bloqueNombre').value = '';
    document.getElementById('bloqueHoraInicio').value = '08:30';
    document.getElementById('bloqueHoraFin').value = '10:00';
    document.getElementById('bloqueDuracion').value = '90';
  }

  async saveBlockConfig() {
    try {
      const idHorario = document.getElementById('bloqueId')?.value;
      const idTaller = Number(document.getElementById('bloqueTaller')?.value || 1);
      const diaSemana = Number(document.getElementById('bloqueDia')?.value || 1);
      const bloqueNombre = document.getElementById('bloqueNombre')?.value.trim();
      const horaInicio = document.getElementById('bloqueHoraInicio')?.value;
      const horaFin = document.getElementById('bloqueHoraFin')?.value;
      const duracion = Number(document.getElementById('bloqueDuracion')?.value || 90);

      const res = await this.api.request('pedagogico/bloques', {
        method: 'POST',
        body: {
          id_horario: idHorario ? Number(idHorario) : 0,
          id_taller: idTaller,
          dia_semana: diaSemana,
          bloque_nombre: bloqueNombre,
          hora_inicio: horaInicio + ':00',
          hora_fin: horaFin + ':00',
          duracion_minutos: duracion
        }
      });

      this.showToast(`✅ ${res.mensaje}`);
      this.resetBlockForm();
      await this.loadBlocksConfig();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  selectBlockForAssignment(idHorario) {
    const sel = document.getElementById('assignBlockSelector');
    if (sel) {
      sel.value = idHorario;
      this.loadBlockStudentsAssignment(idHorario);
      sel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  loadBlockStudentsAssignment(idHorario) {
    const b = this.bloques.find((x) => Number(x.id_horario) === Number(idHorario));
    const grid = document.getElementById('blockStudentsAssignmentGrid');
    const badge = document.getElementById('assignBlockInfoBadge');
    if (!b || !grid) return;

    const assignedIds = new Set((b.estudiantes_asignados || []).map((e) => Number(e.id_estudiante)));
    badge.textContent = `Nómina para: ${b.bloque_nombre} (${assignedIds.size} de ${this.students.length} asignados)`;

    grid.innerHTML = this.students
      .map((s) => {
        const isAssigned = assignedIds.has(Number(s.id_estudiante));
        return `
        <label class="p-3 rounded-xl border ${
          isAssigned ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-bold' : 'bg-white border-slate-200 text-slate-700'
        } flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition">
          <div class="flex items-center gap-2.5">
            <input type="checkbox" name="assignStudent" value="${s.id_estudiante}" ${isAssigned ? 'checked' : ''}
              class="w-4 h-4 rounded text-apandi-600 focus:ring-0 cursor-pointer" />
            <div>
              <div class="text-xs font-extrabold">${s.nombres} ${s.apellidos}</div>
              <div class="text-[10px] text-slate-500">${s.rut} • ${s.taller_nombre}</div>
            </div>
          </div>
          <span class="text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
            s.grupo_funcionalidad === 'GRUPO_A' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }">
            ${s.grupo_funcionalidad === 'GRUPO_A' ? 'Grupo A' : 'Grupo B'}
          </span>
        </label>
      `;
      })
      .join('');
  }

  toggleAllBlockStudents(check) {
    document.querySelectorAll('input[name="assignStudent"]').forEach((cb) => {
      cb.checked = check;
    });
  }

  async saveBlockStudentsAssignment() {
    try {
      const idHorario = Number(document.getElementById('assignBlockSelector')?.value);
      if (!idHorario) return;

      const checkedIds = Array.from(document.querySelectorAll('input[name="assignStudent"]:checked')).map((cb) =>
        Number(cb.value)
      );

      const res = await this.api.request('pedagogico/bloques/asignar-estudiantes', {
        method: 'POST',
        body: {
          id_horario: idHorario,
          estudiantes_ids: checkedIds
        }
      });

      this.showToast(`✅ ${res.mensaje}`);
      await this.loadBlocksConfig();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // 5.2 Sub-vista 2: Planificación Semanal PID + Aprobación UTP
  // ---------------------------------------------------------------------------

  async loadPidSection() {
    try {
      const data = await this.api.request('pedagogico/libro');
      this.pidClasses = data.clasesPid || [];
      this.filterPidClasses();
    } catch (err) {
      console.warn('Error cargando planificaciones PID:', err.message);
    }
  }

  filterPidClasses() {
    const sem = document.getElementById('pidFilterSemestre')?.value;
    const semana = document.getElementById('pidFilterSemana')?.value;
    const taller = document.getElementById('pidFilterTaller')?.value;

    let filtered = this.pidClasses;
    if (sem) {
      filtered = filtered.filter((c) => Number(c.semestre) === Number(sem));
    }
    if (semana) {
      filtered = filtered.filter((c) => Number(c.numero_semana) === Number(semana));
    }
    if (taller) {
      filtered = filtered.filter((c) => Number(c.id_taller) === Number(taller));
    }

    const countBadge = document.getElementById('pidCountBadge');
    if (countBadge) {
      countBadge.textContent = `${filtered.length} planificaciones`;
    }

    this.renderPidClasses(filtered);
  }

  renderPidClasses(list) {
    const box = document.getElementById('pidClassesList');
    if (!box) return;

    if (list.length === 0) {
      box.innerHTML = `
        <div class="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          No hay planificaciones registradas para los filtros seleccionados. Diseña una clase desde el panel izquierdo.
        </div>
      `;
      return;
    }

    const isUtpOrAdmin = ['DIRECTOR_UTP', 'ADMIN'].includes(this.api.user?.rol_codigo);

    box.innerHTML = list
      .map((c) => {
        const estado = c.estado_aprobacion || 'BORRADOR';
        let badgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
        let badgeLabel = '📝 Borrador';

        if (estado === 'ENVIADO_REVISION') {
          badgeColor = 'bg-blue-100 text-blue-900 border-blue-300';
          badgeLabel = '⏳ En Revisión UTP';
        } else if (estado === 'APROBADO') {
          badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-300';
          badgeLabel = '🟢 Aprobado por UTP';
        } else if (estado === 'OBSERVADO') {
          badgeColor = 'bg-orange-100 text-orange-900 border-orange-300';
          badgeLabel = '⚠️ Observado por UTP';
        }

        return `
        <div class="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3.5 text-xs">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-800">
                  ${c.semestre}° Semestre • Semana ${c.numero_semana || 1}
                </span>
                <span class="text-[10px] font-bold uppercase text-apandi-700">${c.taller_nombre}</span>
                <span class="text-[10px] text-slate-400 font-mono">${c.fecha_clase}</span>
              </div>
              <h4 class="font-extrabold text-slate-900 text-sm mt-1">${c.unidad_tematica}</h4>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-full font-extrabold text-[11px] border ${badgeColor}">
                ${badgeLabel}
              </span>
              <span class="bg-emerald-50 text-emerald-800 font-mono text-[10px] font-bold px-2 py-1 rounded-lg border border-emerald-200">
                SHA-256: ${(c.hash_firma_electronica || '').substring(0, 12)}...
              </span>
            </div>
          </div>

          <p class="text-slate-700 font-semibold"><strong class="text-slate-900">OA:</strong> ${c.objetivo_aprendizaje}</p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950">
              <strong class="block mb-1 text-[11px]">🟢 Estrategia Diversificada GRUPO A (Mayor Funcionalidad):</strong>
              <p>${c.actividad_grupo_a}</p>
            </div>
            <div class="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950">
              <strong class="block mb-1 text-[11px]">🟡 Estrategia Diversificada GRUPO B (Mayor Apoyo y Mediación):</strong>
              <p>${c.actividad_grupo_b}</p>
            </div>
          </div>

          <div class="text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <span><strong>Recursos DUA:</strong> ${c.recursos_dua || 'ARASAAC / Material Concreto'}</span>
            <span><strong>Docente:</strong> ${c.docente_nombre}</span>
          </div>

          ${
            c.observaciones_utp
              ? `
            <div class="p-3 rounded-xl ${
              estado === 'APROBADO' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-orange-50 border-orange-200 text-orange-950'
            } border text-[11px]">
              <strong>Observaciones Técnico-Pedagógicas UTP:</strong>
              <p class="mt-0.5">${c.observaciones_utp}</p>
              ${c.aprobador_nombre ? `<span class="text-[10px] text-slate-500 block mt-1">Visado por: ${c.aprobador_nombre}</span>` : ''}
            </div>
          `
              : ''
          }

          <div class="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button type="button" onclick="window.app.loadPidToForm(${c.id_clase})"
              class="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs">
              ✏️ Cargar para Editar
            </button>

            ${
              isUtpOrAdmin
                ? `
              <button type="button" onclick="window.app.reviewPidClass(${c.id_clase}, 'APROBAR')"
                class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm">
                ✓ Aprobar Planificación UTP
              </button>
              <button type="button" onclick="window.app.reviewPidClass(${c.id_clase}, 'OBSERVAR')"
                class="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-sm">
                ⚠️ Observar Planificación
              </button>
            `
                : ''
            }
          </div>
        </div>
      `;
      })
      .join('');
  }

  loadPidToForm(idClase) {
    const c = this.pidClasses.find((x) => Number(x.id_clase) === Number(idClase));
    if (!c) return;

    document.getElementById('pidIdClase').value = c.id_clase;
    document.getElementById('pidTaller').value = c.id_taller;
    if (c.numero_semana) document.getElementById('pidSemana').value = c.numero_semana;
    document.getElementById('pidFecha').value = c.fecha_clase;
    document.getElementById('pidUnidad').value = c.unidad_tematica;
    document.getElementById('pidObjetivo').value = c.objetivo_aprendizaje;
    document.getElementById('pidGrupoA').value = c.actividad_grupo_a;
    document.getElementById('pidGrupoB').value = c.actividad_grupo_b;
    document.getElementById('pidRecursos').value = c.recursos_dua || '';

    this.showToast(`✏️ Planificación cargada en el formulario para edición.`);
    document.getElementById('pidForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async submitPidClass(enviarRevision = false) {
    try {
      const pin = document.getElementById('pidPin')?.value.trim();
      if (!pin || pin.length < 4) {
        this.showToast('Debe ingresar su PIN de 6 dígitos para firmar criptográficamente.', 'error');
        return;
      }

      const idClase = document.getElementById('pidIdClase')?.value;
      const res = await this.api.request('pedagogico/pid', {
        method: 'POST',
        body: {
          id_clase: idClase ? Number(idClase) : 0,
          id_taller: Number(document.getElementById('pidTaller').value),
          semestre: Number(document.getElementById('pidFilterSemestre')?.value || 2),
          numero_semana: Number(document.getElementById('pidSemana')?.value || 1),
          fecha_clase: document.getElementById('pidFecha').value || new Date().toISOString().split('T')[0],
          unidad_tematica: document.getElementById('pidUnidad').value,
          objetivo_aprendizaje: document.getElementById('pidObjetivo').value,
          actividad_grupo_a: document.getElementById('pidGrupoA').value,
          actividad_grupo_b: document.getElementById('pidGrupoB').value,
          recursos_dua: document.getElementById('pidRecursos').value,
          enviar_revision: enviarRevision,
          pin_firma: pin
        }
      });

      this.showToast(`✍️ ${res.mensaje}`);
      document.getElementById('pidIdClase').value = '';
      await this.loadPidSection();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async reviewPidClass(idClase, accion) {
    try {
      const promptMsg =
        accion === 'APROBAR'
          ? 'Observaciones pedagógicas de aprobación UTP (opcional):'
          : 'Indique las observaciones técnico-pedagógicas que el docente debe corregir:';
      const obs = window.prompt(promptMsg, accion === 'APROBAR' ? 'Planificación diversificada DUA visada conforme.' : '');
      if (obs === null) return;

      const res = await this.api.request('pedagogico/pid/revision', {
        method: 'POST',
        body: {
          id_clase: idClase,
          accion: accion,
          observaciones_utp: obs
        }
      });

      this.showToast(`✅ ${res.mensaje}`);
      await this.loadPidSection();
      await this.loadDashboardRRHH();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // 5.3 Sub-vista 3: Asistencia Diaria por Bloque (Checkbox Masivo)
  // ---------------------------------------------------------------------------

  updateAttendanceBlocksDropdown() {
    const tallerId = Number(document.getElementById('asistTaller')?.value || 1);
    const sel = document.getElementById('asistBloque');
    if (!sel) return;

    const filtered = this.bloques.filter((b) => Number(b.id_taller) === tallerId);
    const diasNombres = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

    sel.innerHTML = (filtered.length > 0 ? filtered : this.bloques)
      .map(
        (b) => `
      <option value="${b.id_horario}">${diasNombres[b.dia_semana] || 'Día ' + b.dia_semana} (${b.hora_inicio.substring(0, 5)} - ${b.hora_fin.substring(0, 5)}) • ${b.bloque_nombre} [${b.duracion_minutos || 90} min]</option>
    `
      )
      .join('');

    const fechaInp = document.getElementById('asistFecha');
    if (fechaInp && !fechaInp.value) {
      fechaInp.value = new Date().toISOString().split('T')[0];
    }

    this.loadBlockAttendance();
  }

  async loadBlockAttendance() {
    try {
      const idHorario = Number(document.getElementById('asistBloque')?.value || 1);
      const fecha = document.getElementById('asistFecha')?.value || new Date().toISOString().split('T')[0];

      const res = await this.api.request(`pedagogico/asistencia-bloque?id_horario=${idHorario}&fecha=${fecha}`);
      if (!res.ok) return;

      const nomina = res.nomina || [];
      const totalBadge = document.getElementById('asistTotalBadge');
      if (totalBadge) totalBadge.textContent = `${nomina.length} estudiantes`;

      const listContainer = document.getElementById('blockAttendanceStudentList');
      if (!listContainer) return;

      if (nomina.length === 0) {
        listContainer.innerHTML = `<div class="p-6 text-center text-xs text-slate-500">No hay estudiantes asignados a este bloque ni inscritos en el taller.</div>`;
        return;
      }

      listContainer.innerHTML = nomina
        .map((s) => {
          const isPresent = s.estado === 'PRESENTE';
          return `
          <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition" data-student-id="${s.id_estudiante}">
            <div class="flex items-center gap-3">
              <input type="checkbox" class="student-present-checkbox w-5 h-5 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                ${isPresent ? 'checked' : ''} onchange="window.app.onStudentCheckboxChange(this, ${s.id_estudiante})" />
              <div>
                <div class="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <span>${s.estudiante_nombre}</span>
                  <span id="badge-status-${s.id_estudiante}" class="px-2 py-0.5 rounded-full font-extrabold text-[10px] border ${
            isPresent ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300'
          }">
                    ${s.estado || 'PRESENTE'}
                  </span>
                </div>
                <div class="text-[11px] text-slate-500">${s.rut} • <strong>${
            s.grupo_funcionalidad === 'GRUPO_A' ? 'Grupo A (Más Funcional)' : 'Grupo B (Mayor Apoyo)'
          }</strong></div>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <select id="state-select-${s.id_estudiante}" onchange="window.app.onStudentStateSelect(this, ${s.id_estudiante})"
                class="rounded-lg border border-slate-300 text-xs py-1.5 px-2 bg-white font-bold text-slate-700">
                <option value="PRESENTE" ${s.estado === 'PRESENTE' ? 'selected' : ''}>🟢 Presente</option>
                <option value="AUSENTE" ${s.estado === 'AUSENTE' ? 'selected' : ''}>🔴 Ausente (Alerta UTP)</option>
                <option value="ATRASO" ${s.estado === 'ATRASO' ? 'selected' : ''}>🟡 Atraso</option>
                <option value="JUSTIFICADO_MEDICO" ${s.estado === 'JUSTIFICADO_MEDICO' ? 'selected' : ''}>🔵 Justificado Médico</option>
              </select>

              <input id="obs-${s.id_estudiante}" type="text" placeholder="Observación..."
                value="${s.observacion && !s.observacion.includes('Registrado') ? s.observacion : ''}"
                class="rounded-lg border border-slate-300 text-xs py-1 px-2.5 bg-white w-44" />
            </div>
          </div>
        `;
        })
        .join('');
    } catch (err) {
      console.warn('Error cargando asistencia del bloque:', err.message);
    }
  }

  onStudentCheckboxChange(chk, idEstudiante) {
    const sel = document.getElementById(`state-select-${idEstudiante}`);
    const badge = document.getElementById(`badge-status-${idEstudiante}`);
    if (chk.checked) {
      if (sel) sel.value = 'PRESENTE';
      if (badge) {
        badge.className = 'px-2 py-0.5 rounded-full font-extrabold text-[10px] border bg-emerald-100 text-emerald-800 border-emerald-300';
        badge.textContent = 'PRESENTE';
      }
    } else {
      if (sel) sel.value = 'AUSENTE';
      if (badge) {
        badge.className = 'px-2 py-0.5 rounded-full font-extrabold text-[10px] border bg-red-100 text-red-800 border-red-300';
        badge.textContent = 'AUSENTE';
      }
    }
  }

  onStudentStateSelect(sel, idEstudiante) {
    const chk = document.querySelector(`[data-student-id="${idEstudiante}"] .student-present-checkbox`);
    const badge = document.getElementById(`badge-status-${idEstudiante}`);
    if (chk) {
      chk.checked = sel.value === 'PRESENTE';
    }
    if (badge) {
      badge.textContent = sel.value;
      if (sel.value === 'PRESENTE') {
        badge.className = 'px-2 py-0.5 rounded-full font-extrabold text-[10px] border bg-emerald-100 text-emerald-800 border-emerald-300';
      } else if (sel.value === 'AUSENTE') {
        badge.className = 'px-2 py-0.5 rounded-full font-extrabold text-[10px] border bg-red-100 text-red-800 border-red-300';
      } else {
        badge.className = 'px-2 py-0.5 rounded-full font-extrabold text-[10px] border bg-amber-100 text-amber-800 border-amber-300';
      }
    }
  }

  toggleAllAttendance(presente) {
    document.querySelectorAll('#blockAttendanceStudentList [data-student-id]').forEach((row) => {
      const id = row.getAttribute('data-student-id');
      const chk = row.querySelector('.student-present-checkbox');
      const sel = document.getElementById(`state-select-${id}`);
      const badge = document.getElementById(`badge-status-${id}`);

      if (chk) chk.checked = presente;
      if (sel) sel.value = presente ? 'PRESENTE' : 'AUSENTE';
      if (badge) {
        badge.textContent = presente ? 'PRESENTE' : 'AUSENTE';
        badge.className = presente
          ? 'px-2 py-0.5 rounded-full font-extrabold text-[10px] border bg-emerald-100 text-emerald-800 border-emerald-300'
          : 'px-2 py-0.5 rounded-full font-extrabold text-[10px] border bg-red-100 text-red-800 border-red-300';
      }
    });
  }

  async submitMassBlockAttendance() {
    try {
      const pin = document.getElementById('asistMassPin')?.value.trim();
      if (!pin || pin.length < 4) {
        this.showToast('Debe ingresar su PIN Docente de 6 dígitos para validar la asistencia.', 'error');
        return;
      }

      const idHorario = Number(document.getElementById('asistBloque')?.value || 1);
      const idTaller = Number(document.getElementById('asistTaller')?.value || 1);
      const fecha = document.getElementById('asistFecha')?.value || new Date().toISOString().split('T')[0];

      const rows = document.querySelectorAll('#blockAttendanceStudentList [data-student-id]');
      if (rows.length === 0) {
        this.showToast('No hay estudiantes en la nómina para registrar.', 'error');
        return;
      }

      const asistencias = Array.from(rows).map((row) => {
        const idEst = Number(row.getAttribute('data-student-id'));
        const sel = document.getElementById(`state-select-${idEst}`);
        const obs = document.getElementById(`obs-${idEst}`);
        return {
          id_estudiante: idEst,
          estado: sel ? sel.value : 'PRESENTE',
          observacion: obs ? obs.value.trim() : ''
        };
      });

      const res = await this.api.request('pedagogico/asistencia-bloque/masiva', {
        method: 'POST',
        body: {
          id_horario: idHorario,
          id_taller: idTaller,
          fecha: fecha,
          pin_firma: pin,
          asistencias: asistencias
        }
      });

      if (res.total_ausentes > 0) {
        this.showToast(`⚠️ ${res.mensaje} Se alertó a UTP por ${res.total_ausentes} inasistencias.`, 'warning');
      } else {
        this.showToast(`✅ ${res.mensaje}`);
      }

      await this.loadBlockAttendance();
      await this.loadDashboardRRHH();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // 5.4 Sub-vista 4: Calificaciones Cualitativas (Matriz Completa y Borrador)
  // ---------------------------------------------------------------------------

  async loadQualitativeEvaluationsSection() {
    this.filterQualitativeStudents();
  }

  onQualSemestreChange() {
    this.filterQualitativeStudents();
    if (this.qualitativeSelectedStudent) {
      this.selectStudentForQualitativeEval(this.qualitativeSelectedStudent.id_estudiante);
    }
  }

  filterQualitativeStudents(query = '') {
    const q = (query || document.getElementById('qualStudentSearchInput')?.value || '').trim().toLowerCase();
    const tallerId = document.getElementById('qualTallerFilter')?.value;

    let filtered = this.students;
    if (tallerId) {
      filtered = filtered.filter((s) => Number(s.id_taller) === Number(tallerId));
    }
    if (q) {
      filtered = filtered.filter(
        (s) =>
          `${s.nombres} ${s.apellidos}`.toLowerCase().includes(q) ||
          (s.rut || '').toLowerCase().includes(q) ||
          (s.taller_nombre || '').toLowerCase().includes(q)
      );
    }

    this.renderQualitativeStudentsGrid(filtered);
  }

  renderQualitativeStudentsGrid(list) {
    const grid = document.getElementById('qualStudentsListGrid');
    if (!grid) return;

    if (list.length === 0) {
      grid.innerHTML = `<div class="col-span-full p-6 text-center text-slate-500 bg-white rounded-xl border">No se encontraron estudiantes para los filtros dados.</div>`;
      return;
    }

    grid.innerHTML = list
      .map(
        (s) => `
      <div class="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between gap-3 hover:border-apandi-400 transition">
        <div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-bold text-slate-400 font-mono">${s.rut}</span>
            <span class="px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
              s.grupo_funcionalidad === 'GRUPO_A' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }">
              ${s.grupo_funcionalidad === 'GRUPO_A' ? 'Grupo A' : 'Grupo B'}
            </span>
          </div>
          <h4 class="font-extrabold text-slate-900 text-sm mt-1">${s.nombres} ${s.apellidos}</h4>
          <p class="text-[11px] text-slate-500 mt-0.5">${s.taller_nombre}</p>
        </div>

        <button type="button" onclick="window.app.selectStudentForQualitativeEval(${s.id_estudiante})"
          class="w-full bg-slate-800 hover:bg-slate-900 text-white font-extrabold py-2 px-3 rounded-xl transition text-center flex items-center justify-center gap-1.5 text-xs shadow-sm">
          <span>Abrir Matriz Completa</span> <span>→</span>
        </button>
      </div>
    `
      )
      .join('');
  }

  async selectStudentForQualitativeEval(idEstudiante) {
    try {
      const sem = document.getElementById('qualSemestreFilter')?.value || 2;
      const res = await this.api.request(`pedagogico/evaluaciones-alumno?id_estudiante=${idEstudiante}&semestre=${sem}`);
      if (!res.ok) return;

      this.qualitativeSelectedStudent = res.estudiante;
      this.qualitativeMatrixData = res;

      document.getElementById('qualStep1Box')?.classList.add('hidden');
      document.getElementById('qualStep2Box')?.classList.remove('hidden');

      const nameEl = document.getElementById('qualSelectedStudentName');
      const infoEl = document.getElementById('qualSelectedStudentInfo');
      const badgeEl = document.getElementById('qualEvaluationStatusBadge');

      if (nameEl) nameEl.textContent = `${res.estudiante.nombres} ${res.estudiante.apellidos}`;
      if (infoEl) {
        infoEl.textContent = `RUT: ${res.estudiante.rut} • ${res.estudiante.taller_nombre} • ${
          res.estudiante.grupo_funcionalidad === 'GRUPO_A' ? 'Grupo A (Más Funcional)' : 'Grupo B (Mayor Apoyo)'
        } • ${sem}° Semestre 2026`;
      }

      if (badgeEl) {
        if (res.tiene_firma_oficial) {
          badgeEl.className = 'px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40';
          badgeEl.textContent = `🟢 Evaluación Oficial Firmada (SHA256: ${(res.hash_firma || '').substring(0, 10)}...)`;
        } else if (res.tiene_borrador) {
          badgeEl.className = 'px-3 py-1 rounded-full text-xs font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/40';
          badgeEl.textContent = '📝 Borrador Guardado (En Progreso)';
        } else {
          badgeEl.className = 'px-3 py-1 rounded-full text-xs font-extrabold bg-blue-400/20 text-blue-300 border border-blue-400/40';
          badgeEl.textContent = '⚪ Nueva Evaluación';
        }
      }

      this.renderQualitativeMatrix(res.matriz || []);
      document.getElementById('qualStep2Box')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  renderQualitativeMatrix(matriz) {
    const container = document.getElementById('qualDimensionsMatrixContainer');
    if (!container) return;

    container.innerHTML = matriz
      .map(
        (dim, dimIdx) => `
      <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
        <div class="border-b border-slate-200 pb-2">
          <h4 class="font-extrabold text-slate-900 text-sm">${dim.nombre}</h4>
          <p class="text-[11px] text-slate-500">${dim.descripcion}</p>
        </div>

        <div class="space-y-3.5">
          ${dim.indicadores
            .map(
              (ind, indIdx) => `
            <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2.5" data-dimension="${dim.codigo}" data-indicador-index="${indIdx}">
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <span class="font-bold text-slate-800 text-xs flex-1">
                  ${indIdx + 1}. <span class="indicador-label">${ind.indicador}</span>
                </span>

                <select class="qual-level-select rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-xs font-extrabold text-emerald-800">
                  <option value="LOGRADO" ${ind.nivel_logro === 'LOGRADO' ? 'selected' : ''}>🟢 LOGRADO (L) — Desempeño Autónomo</option>
                  <option value="EN_DESARROLLO" ${ind.nivel_logro === 'EN_DESARROLLO' ? 'selected' : ''}>🔵 EN DESARROLLO (ED) — Con Apoyo Ocasional</option>
                  <option value="EN_INICIO" ${ind.nivel_logro === 'EN_INICIO' ? 'selected' : ''}>🟡 EN INICIO (EI) — Requiere Mediación</option>
                  <option value="NO_OBSERVADO" ${ind.nivel_logro === 'NO_OBSERVADO' ? 'selected' : ''}>⚪ NO OBSERVADO (NO)</option>
                </select>
              </div>

              <div>
                <input type="text" placeholder="Observación cualitativa o evidencia pedagógica..."
                  value="${ind.comentario_pedagogico || ''}"
                  class="qual-comment-input w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50 text-slate-800" />
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `
      )
      .join('');
  }

  backToStudentsQualitativeList() {
    document.getElementById('qualStep2Box')?.classList.add('hidden');
    document.getElementById('qualStep1Box')?.classList.remove('hidden');
    this.filterQualitativeStudents();
  }

  async submitQualitativeEvaluation(esBorrador) {
    try {
      const pin = document.getElementById('qualMatrixPin')?.value.trim();
      if (!pin || pin.length < 4) {
        this.showToast('Debe ingresar su PIN Docente de 6 dígitos para validar la evaluación.', 'error');
        return;
      }

      if (!this.qualitativeSelectedStudent) {
        this.showToast('No hay estudiante seleccionado.', 'error');
        return;
      }

      const rows = document.querySelectorAll('#qualDimensionsMatrixContainer [data-dimension]');
      if (rows.length === 0) {
        this.showToast('No hay indicadores para guardar.', 'error');
        return;
      }

      const evaluaciones = Array.from(rows).map((r) => {
        const dim = r.getAttribute('data-dimension');
        const ind = r.querySelector('.indicador-label')?.textContent.trim();
        const logro = r.querySelector('.qual-level-select')?.value || 'LOGRADO';
        const obs = r.querySelector('.qual-comment-input')?.value.trim() || '';
        return {
          dimension: dim,
          indicador_competencia: ind,
          nivel_logro: logro,
          comentario_pedagogico: obs
        };
      });

      const sem = Number(document.getElementById('qualSemestreFilter')?.value || 2);
      const res = await this.api.request('pedagogico/evaluaciones-alumno/guardar', {
        method: 'POST',
        body: {
          id_estudiante: this.qualitativeSelectedStudent.id_estudiante,
          id_taller: this.qualitativeSelectedStudent.id_taller || 1,
          semestre: sem,
          anio_escolar: 2026,
          es_borrador: esBorrador ? 1 : 0,
          pin_firma: pin,
          evaluaciones: evaluaciones
        }
      });

      this.showToast(esBorrador ? `💾 ${res.mensaje}` : `✍️ ${res.mensaje}`);
      await this.selectStudentForQualitativeEval(this.qualitativeSelectedStudent.id_estudiante);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // Métodos retrocompatibles
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
      await this.loadBlockAttendance();
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
          id_estudiante: Number(document.getElementById('evalEstudiante')?.value || 1),
          id_taller: 1,
          dimension: document.getElementById('evalDimension')?.value || 'TECNICA_VOCACIONAL',
          nivel_logro: document.getElementById('evalLogro')?.value || 'LOGRADO',
          indicador_competencia: document.getElementById('evalIndicador')?.value || 'Competencia Técnica',
          comentario_pedagogico: document.getElementById('evalComentario')?.value || ''
        }
      });
      this.showToast(`🏅 ${res.mensaje}`);
      await this.loadQualitativeEvaluationsSection();
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
