/**
 * =============================================================================
 * CONTROLADOR PRINCIPAL FRONTEND - SGI APANDI (JavaScript Puro + Dark Mode)
 * =============================================================================
 * Gestion integral estudiantil APANDI con control de acceso por perfil,
 * modo oscuro institucional persistente y firma electronica con PIN.
 * =============================================================================
 */

const ROLE_CONFIG = {
  SOSTENEDOR: {
    label: 'Sostenedor / Representante Legal',
    defaultTab: 'tab-sostenedor',
    allowedTabs: [
      'tab-sostenedor',
      'tab-dashboard',
      'tab-estudiantes',
      'tab-documentos',
      'tab-apoderados',
      'tab-auditoria',
      'tab-configuracion'
    ],
    canManageStudents: false,
    canEditDocuments: false,
    canAccessClinical: false,
    canWriteClinical: false,
    canWritePid: false,
    canWriteEval: false,
    canMarkAttendance: false,
    canTriggerSos: false,
    canWriteConvivencia: false,
    canManageUsers: false,
    canUseStaffClock: false,
    hasPin: false
  },
  DIRECTOR_UTP: {
    label: 'Directora / Jefa UTP',
    defaultTab: 'tab-dashboard',
    allowedTabs: [
      'tab-sostenedor',
      'tab-dashboard',
      'tab-estudiantes',
      'tab-buscar-rut',
      'tab-documentos',
      'tab-libro',
      'tab-clinico',
      'tab-paec',
      'tab-apoderados',
      'tab-auditoria',
      'tab-configuracion'
    ],
    canManageStudents: true,
    canEditDocuments: true,
    canAccessClinical: true,
    canWriteClinical: false,
    canWritePid: true,
    canWriteEval: true,
    canMarkAttendance: true,
    canTriggerSos: true,
    canWriteConvivencia: true,
    canManageUsers: true,
    canUseStaffClock: true,
    hasPin: true
  },
  ADMIN: {
    label: 'Administrador TI / Seguridad',
    defaultTab: 'tab-auditoria',
    allowedTabs: [
      'tab-dashboard',
      'tab-estudiantes',
      'tab-buscar-rut',
      'tab-auditoria',
      'tab-configuracion'
    ],
    canManageStudents: true,
    canEditDocuments: false,
    canAccessClinical: false,
    canWriteClinical: false,
    canWritePid: false,
    canWriteEval: false,
    canMarkAttendance: false,
    canTriggerSos: false,
    canWriteConvivencia: false,
    canManageUsers: true,
    canUseStaffClock: true,
    hasPin: false
  },
  DOCENTE: {
    label: 'Profesor Educacion Diferencial',
    defaultTab: 'tab-dashboard',
    allowedTabs: [
      'tab-dashboard',
      'tab-estudiantes',
      'tab-buscar-rut',
      'tab-documentos',
      'tab-libro',
      'tab-paec',
      'tab-apoderados',
      'tab-configuracion'
    ],
    canManageStudents: false,
    canEditDocuments: true,
    canAccessClinical: false,
    canWriteClinical: false,
    canWritePid: true,
    canWriteEval: true,
    canMarkAttendance: true,
    canTriggerSos: true,
    canWriteConvivencia: false,
    canManageUsers: false,
    canUseStaffClock: true,
    hasPin: true
  },
  MONITOR: {
    label: 'Monitor de Oficio / Taller Laboral',
    defaultTab: 'tab-libro',
    allowedTabs: [
      'tab-dashboard',
      'tab-estudiantes',
      'tab-buscar-rut',
      'tab-libro',
      'tab-paec',
      'tab-configuracion'
    ],
    canManageStudents: false,
    canEditDocuments: false,
    canAccessClinical: false,
    canWriteClinical: false,
    canWritePid: false,
    canWriteEval: false,
    canMarkAttendance: true,
    canTriggerSos: true,
    canWriteConvivencia: false,
    canManageUsers: false,
    canUseStaffClock: true,
    hasPin: true
  },
  ESPECIALISTA_PIE: {
    label: 'Especialista Clinico PIE',
    defaultTab: 'tab-clinico',
    allowedTabs: [
      'tab-dashboard',
      'tab-estudiantes',
      'tab-buscar-rut',
      'tab-documentos',
      'tab-clinico',
      'tab-paec',
      'tab-apoderados',
      'tab-configuracion'
    ],
    canManageStudents: false,
    canEditDocuments: true,
    canAccessClinical: true,
    canWriteClinical: true,
    canWritePid: false,
    canWriteEval: false,
    canMarkAttendance: false,
    canTriggerSos: true,
    canWriteConvivencia: true,
    canManageUsers: false,
    canUseStaffClock: true,
    hasPin: true
  },
  CONVIVENCIA: {
    label: 'Encargada de Convivencia Escolar',
    defaultTab: 'tab-paec',
    allowedTabs: [
      'tab-dashboard',
      'tab-estudiantes',
      'tab-buscar-rut',
      'tab-documentos',
      'tab-paec',
      'tab-apoderados',
      'tab-configuracion'
    ],
    canManageStudents: false,
    canEditDocuments: true,
    canAccessClinical: false,
    canWriteClinical: false,
    canWritePid: false,
    canWriteEval: false,
    canMarkAttendance: false,
    canTriggerSos: true,
    canWriteConvivencia: true,
    canManageUsers: false,
    canUseStaffClock: true,
    hasPin: false
  },
  APODERADO: {
    label: 'Familia / Apoderado',
    defaultTab: 'tab-apoderados',
    allowedTabs: [
      'tab-apoderados',
      'tab-configuracion'
    ],
    canManageStudents: false,
    canEditDocuments: false,
    canAccessClinical: false,
    canWriteClinical: false,
    canWritePid: false,
    canWriteEval: false,
    canMarkAttendance: false,
    canTriggerSos: false,
    canWriteConvivencia: false,
    canManageUsers: false,
    canUseStaffClock: false,
    hasPin: false
  }
};

const SVG_ICONS = {
  check: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline-block shrink-0"><path d="M20 6 9 17l-5-5"/></svg>',
  alert: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="inline-block shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  shield: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="inline-block shrink-0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  lock: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="inline-block shrink-0"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  edit: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block shrink-0"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block shrink-0"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  close: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline-block shrink-0"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  clock: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="inline-block shrink-0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  file: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  heart: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block shrink-0"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
  dotGreen: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8" class="inline-block shrink-0 fill-emerald-600"><circle cx="4" cy="4" r="4"/></svg>',
  dotAmber: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8" class="inline-block shrink-0 fill-amber-500"><circle cx="4" cy="4" r="4"/></svg>'
};

class SgiApandiApplication {
  constructor() {
    this.api = new window.ApandiAPIClient();
    this.students = [];
    this.workshops = [];
    this.documents = [];
    this.users = [];
    this.templates = window.APANDI_TEMPLATES || [];
    this.currentFamilySummary = null;
    this.paecProtocols = [];
    this.chartDimInstance = null;
    this.chartDoughnutInstance = null;
    this.activeEditorDocId = null;

    this.initTheme();
    this.initEventListeners();
    this.startChileClock();
    this.api.onSosAlert((alerta) => this.showSosBanner(alerta));
  }

  // ===========================================================================
  // 0. MODO OSCURO INSTITUCIONAL (PERSISTENTE EN LOCALSTORAGE)
  // ===========================================================================

  initTheme() {
    const saved = localStorage.getItem('apandi_theme') || 'light';
    this.applyThemeDom(saved === 'dark' ? 'dark' : 'light');
  }

  applyThemeDom(mode) {
    const isDark = mode === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('apandi_theme', isDark ? 'dark' : 'light');

    document.querySelectorAll('.dark-icon-sun').forEach((el) => el.classList.toggle('hidden', !isDark));
    document.querySelectorAll('.dark-icon-moon').forEach((el) => el.classList.toggle('hidden', isDark));
    document.querySelectorAll('.dark-mode-label').forEach((el) => {
      el.textContent = isDark ? 'Modo Claro' : 'Modo Oscuro';
    });

    const sunIcon = document.getElementById('darkModeIconSun');
    const moonIcon = document.getElementById('darkModeIconMoon');
    const label = document.getElementById('darkModeLabel');

    if (sunIcon && moonIcon) {
      sunIcon.classList.toggle('hidden', !isDark);
      moonIcon.classList.toggle('hidden', isDark);
    }
    if (label) {
      label.textContent = isDark ? 'Claro' : 'Oscuro';
    }

    const btnLight = document.getElementById('settingsThemeLightBtn');
    const btnDark = document.getElementById('settingsThemeDarkBtn');
    if (btnLight && btnDark) {
      if (isDark) {
        btnDark.className = 'px-3.5 py-2 rounded-xl border border-teal-500 bg-teal-950/60 text-teal-200 text-xs font-bold flex items-center gap-1.5 transition';
        btnLight.className = 'px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition';
      } else {
        btnLight.className = 'px-3.5 py-2 rounded-xl border border-teal-500 bg-teal-50 text-teal-900 text-xs font-bold flex items-center gap-1.5 transition';
        btnDark.className = 'px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold flex items-center gap-1.5 transition';
      }
    }

    if (this.chartDimInstance || this.chartDoughnutInstance) {
      this.renderDashboardCharts();
    }
  }

  toggleDarkMode() {
    const isDark = document.documentElement.classList.contains('dark');
    this.applyThemeDom(isDark ? 'light' : 'dark');
  }

  setTheme(mode) {
    this.applyThemeDom(mode === 'dark' ? 'dark' : 'light');
  }

  // ===========================================================================
  // CONFIGURACION DE PERMISOS RBAC POR ROL
  // ===========================================================================

  getRoleConfig() {
    const roleCode = this.api.user?.rol_codigo || 'DOCENTE';
    return ROLE_CONFIG[roleCode] || ROLE_CONFIG.DOCENTE;
  }

  canAccessTab(tabId) {
    const cfg = this.getRoleConfig();
    return cfg.allowedTabs.includes(tabId);
  }

  applyRolePermissionsUI() {
    const cfg = this.getRoleConfig();

    // 1. Filtrar botones de navegacion lateral
    document.querySelectorAll('.nav-tab').forEach((btn) => {
      const target = btn.dataset.target;
      const allowed = cfg.allowedTabs.includes(target);
      btn.classList.toggle('hidden', !allowed);
    });

    // 2. Ocultar grupos vacios del menu lateral
    document.querySelectorAll('[data-nav-group]').forEach((groupEl) => {
      const visibleBtns = Array.from(groupEl.querySelectorAll('.nav-tab')).filter(
        (b) => !b.classList.contains('hidden')
      );
      groupEl.classList.toggle('hidden', visibleBtns.length === 0);
    });

    // 3. Filtrar barra inferior movil
    document.querySelectorAll('#mobileNavStrip button[data-target]').forEach((btn) => {
      const target = btn.dataset.target;
      const allowed = cfg.allowedTabs.includes(target);
      btn.classList.toggle('hidden', !allowed);
    });

    // 4. Buscador global y boton SOS en cabecera
    document
      .getElementById('globalSearchContainer')
      ?.classList.toggle('hidden', !cfg.allowedTabs.includes('tab-estudiantes'));
    document.getElementById('headerSosBtn')?.classList.toggle('hidden', !cfg.canTriggerSos);

    // 5. Botones de accion en Panel General (Dashboard)
    document
      .getElementById('dashBtnLibro')
      ?.classList.toggle('hidden', !cfg.allowedTabs.includes('tab-libro'));
    document.getElementById('dashBtnNewStudent')?.classList.toggle('hidden', !cfg.canManageStudents);
    document
      .getElementById('dashQuickRut')
      ?.classList.toggle('hidden', !cfg.allowedTabs.includes('tab-buscar-rut'));
    document
      .getElementById('dashQuickDoc')
      ?.classList.toggle('hidden', !cfg.canEditDocuments);
    document
      .getElementById('dashQuickExcel')
      ?.classList.toggle('hidden', !cfg.allowedTabs.includes('tab-estudiantes'));
    document.getElementById('rrhhStaffSection')?.classList.toggle('hidden', !cfg.canUseStaffClock);

    // 6. Botones en modulo Estudiantes
    document
      .getElementById('btnExportExcel')
      ?.classList.toggle('hidden', !cfg.allowedTabs.includes('tab-estudiantes'));
    document.getElementById('btnImportExcel')?.classList.toggle('hidden', !cfg.canManageStudents);
    document.getElementById('btnNewStudentMain')?.classList.toggle('hidden', !cfg.canManageStudents);

    // 7. Formularios de Libro Digital (PID y Evaluaciones)
    const pidFormPanel = document.getElementById('pidFormPanel');
    const pidListPanel = document.getElementById('pidListPanel');
    if (pidFormPanel && pidListPanel) {
      pidFormPanel.classList.toggle('hidden', !cfg.canWritePid);
      pidListPanel.className = cfg.canWritePid ? 'lg:col-span-7 space-y-4' : 'lg:col-span-12 space-y-4';
    }
    document.getElementById('evalForm')?.classList.toggle('hidden', !cfg.canWriteEval);

    // 8. Panel de intervencion en Convivencia Escolar
    document
      .getElementById('convivenciaInterventionPanel')
      ?.classList.toggle('hidden', !cfg.canWriteConvivencia);

    // 9. Creacion de cuentas de usuario y tarjeta PIN
    document
      .getElementById('btnOpenCreateUserModal')
      ?.classList.toggle('hidden', !cfg.canManageUsers);
    document.getElementById('settingsPinCard')?.classList.toggle('hidden', !cfg.hasPin);
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

    document.getElementById('convivenciaForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitConvivenciaRecord();
    });

    document.getElementById('newStudentForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitNewStudent();
    });

    document.getElementById('documentEditorForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitDocumentEditor();
    });

    document.getElementById('createUserForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitCreateUser();
    });

    document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitChangePassword();
    });

    document.getElementById('changePinForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitChangePin();
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
    const iconSvg =
      type === 'error'
        ? SVG_ICONS.alert
        : type === 'warning'
        ? SVG_ICONS.alert
        : SVG_ICONS.check;

    const toast = document.createElement('div');
    toast.className = `p-4 rounded-2xl shadow-2xl border-l-4 ${colors[type] || colors.success} text-xs font-semibold flex items-center justify-between gap-3 transition-all`;
    toast.innerHTML = `
      <div class="flex items-center gap-2.5">
        ${iconSvg}
        <span>${message}</span>
      </div>
      <button type="button" onclick="this.parentElement.remove()" class="opacity-70 hover:opacity-100 p-1">
        ${SVG_ICONS.close}
      </button>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5500);
  }

  formatRutInput(val) {
    return window.ApandiCrypto.formatRut(val);
  }

  toggleMobileSidebar(force) {
    const sidebar = document.getElementById('appSidebar');
    const backdrop = document.getElementById('mobileMenuOverlay');
    if (!sidebar || !backdrop) return;

    const isHidden = sidebar.classList.contains('hidden');
    const show = typeof force === 'boolean' ? force : isHidden;

    if (show) {
      sidebar.classList.remove('hidden');
      sidebar.classList.add('fixed', 'inset-y-0', 'left-0', 'z-50', 'flex');
      backdrop.classList.remove('hidden');
    } else {
      sidebar.classList.add('hidden');
      sidebar.classList.remove('fixed', 'inset-y-0', 'left-0', 'z-50', 'flex');
      backdrop.classList.add('hidden');
    }
  }

  // ===========================================================================
  // NORMALIZADOR UNIFICADO DE FICHA ESTUDIANTIL (MariaDB + Figma Schema)
  // ===========================================================================

  normalizeStudent(raw) {
    if (!raw) return null;
    let meta = {};
    if (
      raw.observaciones_ingreso &&
      typeof raw.observaciones_ingreso === 'string' &&
      raw.observaciones_ingreso.trim().startsWith('{')
    ) {
      try {
        meta = JSON.parse(raw.observaciones_ingreso);
      } catch {
        meta = {};
      }
    }

    const id_estudiante = Number(raw.id_estudiante || raw.id || 1);
    const nombres = raw.nombres || raw.names || 'Estudiante';
    const apellidos =
      raw.apellidos || [raw.paternalSurname, raw.maternalSurname].filter(Boolean).join(' ') || '';
    const surnameParts = apellidos.trim().split(/\s+/);
    const paternalSurname = raw.paternalSurname || meta.paternalSurname || surnameParts[0] || '';
    const maternalSurname =
      raw.maternalSurname || meta.maternalSurname || surnameParts.slice(1).join(' ') || '';
    const fullName = raw.fullName || `${nombres} ${apellidos}`.trim();
    const registrationNumber =
      raw.registrationNumber || raw.numero_matricula || `MAT-2026-00${id_estudiante}`;
    const rut = window.ApandiCrypto.formatRut(raw.rut || '');

    const defaultCourses = [
      'Nivel Laboral 2A',
      'Nivel Laboral 1B',
      'Nivel Laboral 2B',
      'Nivel Laboral 3A',
      'Nivel Laboral 1A'
    ];
    const cleanText = (val) =>
      String(val || '')
        .replace(/\s*\((?:Decreto|Datos protegidos|Ley)[^)]*\)/gi, '')
        .replace(/\bDecreto(?:\s+Exento)?\s*(?:N°?\s*)?\d+\b/gi, '')
        .replace(/\bLey(?:\s+N°?)?\s*19\.628\b/gi, '')
        .trim();

    const course = raw.course || meta.course || defaultCourses[(id_estudiante - 1) % defaultCourses.length];
    const level = cleanText(raw.level || meta.level) || 'Nivel Laboral 2';
    const workshop = raw.workshop || raw.taller_nombre || 'Taller de Corte y Confección Textil';

    const rawStatus = String(raw.status || raw.estado_matricula || 'ACTIVO').toLowerCase();
    const status = rawStatus.includes('retir')
      ? 'retirado'
      : rawStatus.includes('egres') || rawStatus.includes('prac')
      ? 'egresado'
      : 'activo';

    const contact = {
      address: raw.contact?.address || meta.contact?.address || raw.direccion || 'Av. Los Pajaritos 3450',
      commune: raw.contact?.commune || meta.contact?.commune || raw.comuna || 'Maipú',
      phone: raw.contact?.phone || meta.contact?.phone || raw.apoderado_telefono || '+56 9 8666 7788',
      email: raw.contact?.email || meta.contact?.email || '',
      guardianName:
        raw.contact?.guardianName ||
        meta.contact?.guardianName ||
        raw.apoderado_nombre ||
        'Patricia Elena Gómez Díaz',
      guardianRut: raw.contact?.guardianRut || meta.contact?.guardianRut || '12.345.678-5',
      guardianPhone:
        raw.contact?.guardianPhone ||
        meta.contact?.guardianPhone ||
        raw.apoderado_telefono ||
        '+56 9 8666 7788',
      guardianEmail:
        raw.contact?.guardianEmail ||
        meta.contact?.guardianEmail ||
        raw.apoderado_email ||
        'familia@apandi.cl',
      emergencyContact:
        raw.contact?.emergencyContact ||
        meta.contact?.emergencyContact ||
        raw.apoderado_nombre ||
        'Patricia Gómez',
      emergencyPhone:
        raw.contact?.emergencyPhone ||
        meta.contact?.emergencyPhone ||
        raw.apoderado_telefono ||
        '+56 9 8666 7788'
    };

    const educational = {
      primaryDiagnosis:
        cleanText(
          raw.educational?.primaryDiagnosis ||
            meta.educational?.primaryDiagnosis ||
            raw.diagnostico_principal ||
            raw.diagnostico_resumen
        ) || 'Discapacidad Intelectual Leve a Moderada / TEA Nivel 1',
      secondaryDiagnosis: raw.educational?.secondaryDiagnosis || meta.educational?.secondaryDiagnosis || '',
      entryTest:
        raw.educational?.entryTest ||
        meta.educational?.entryTest ||
        'WAIS-IV / ICAP / Evaluación Ecológica Funcional',
      evaluationDate:
        raw.educational?.evaluationDate ||
        meta.educational?.evaluationDate ||
        raw.fecha_ingreso ||
        '2026-03-10',
      reevaluationDate:
        raw.reevaluationDate ||
        raw.educational?.reevaluationDate ||
        meta.reevaluationDate ||
        meta.educational?.reevaluationDate ||
        '2026-11-25',
      supportNeeds:
        raw.educational?.supportNeeds ||
        meta.educational?.supportNeeds ||
        'Anticipación visual con pictogramas ARASAAC, modelado práctico y apoyos pedagógicos en taller.',
      strengths:
        raw.educational?.strengths ||
        meta.educational?.strengths ||
        raw.fortalezas_intereses ||
        'Alta motivación por el trabajo práctico en taller, colaboración con pares y respeto de normas.',
      pedagogicalObservations:
        cleanText(
          raw.educational?.pedagogicalObservations ||
            meta.educational?.pedagogicalObservations ||
            (typeof raw.observaciones_ingreso === 'string' && !raw.observaciones_ingreso.trim().startsWith('{')
              ? raw.observaciones_ingreso
              : 'Participa activamente en su grupo funcional.')
        ),
      medicalHistory:
        cleanText(
          raw.educational?.medicalHistory ||
            meta.educational?.medicalHistory ||
            'Evaluación diagnóstica integral vigente y controles de salud al día.'
        )
    };

    return {
      ...raw,
      id: String(id_estudiante),
      id_estudiante,
      registrationNumber,
      numero_matricula: registrationNumber,
      rut,
      fullName,
      names: nombres,
      nombres,
      apellidos,
      paternalSurname,
      maternalSurname,
      socialName: raw.socialName || meta.socialName || '',
      birthDate: raw.birthDate || raw.fecha_nacimiento || '2007-05-14',
      fecha_nacimiento: raw.fecha_nacimiento || raw.birthDate || '2007-05-14',
      gender: raw.gender || raw.genero || 'No especificado',
      nationality: raw.nationality || meta.nationality || 'Chilena',
      course,
      level,
      workshop,
      taller_nombre: workshop,
      id_taller: Number(raw.id_taller || 1),
      grupo_funcionalidad: raw.grupo_funcionalidad || 'GRUPO_A',
      porcentaje_discapacidad: Number(raw.porcentaje_discapacidad || 50),
      enrollmentYear: Number(raw.enrollmentYear || meta.enrollmentYear || 2026),
      status,
      reevaluationDate: educational.reevaluationDate,
      comuna: contact.commune,
      apoderado_nombre: contact.guardianName,
      apoderado_telefono: contact.guardianPhone,
      contact,
      educational
    };
  }

  calculateAge(birthDate) {
    if (!birthDate) return null;
    const date = new Date(birthDate);
    if (Number.isNaN(date.getTime())) return null;
    const diff = Date.now() - date.getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  }

  formatDateCL(dateStr) {
    if (!dateStr) return 'No registrada';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-CL', { timeZone: 'UTC' });
  }

  getInitials(name) {
    if (!name) return 'AP';
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  // ===========================================================================
  // 1. AUTENTICACION Y MODAL DE ACCESO RAPIDO (DESARROLLO)
  // ===========================================================================

  openDevLoginModal() {
    this.renderDevAccountsModal();
    document.getElementById('devQuickLoginModal')?.classList.remove('hidden');
  }

  closeDevLoginModal() {
    document.getElementById('devQuickLoginModal')?.classList.add('hidden');
  }

  fillLoginCredentials(identifier) {
    const emailInput = document.getElementById('loginEmail');
    const passInput = document.getElementById('loginPassword');
    if (emailInput) emailInput.value = identifier;
    if (passInput) passInput.value = 'Ap4nd1#S3cV4ult!2026_Cl';
    this.closeDevLoginModal();
    this.showToast(`Credenciales de ${identifier} cargadas en el formulario.`);
  }

  renderDevAccountsModal() {
    const grid = document.getElementById('devAccountsModalGrid');
    if (!grid) return;

    const accounts = window.APANDI_DEV_ACCOUNTS || [
      { nombre_completo: 'Carolina Andrea Muñoz Tapia', rol_codigo: 'DOCENTE', rol_nombre: 'Docente Titular Educación Diferencial', username: 'cmunoz', email: 'cmunoz@apandi.cl', rut: '17.654.321-8', especialidad: 'Educadora Diferencial' },
      { nombre_completo: 'Camila Ignacia Vargas Herrera', rol_codigo: 'ESPECIALISTA_PIE', rol_nombre: 'Especialista PIE', username: 'cvargas.pie', email: 'cvargas.pie@apandi.cl', rut: '18.234.567-1', especialidad: 'Psicóloga Educacional / Coordinadora PIE' },
      { nombre_completo: 'Marcela Paz Rojas Contreras', rol_codigo: 'DIRECTOR_UTP', rol_nombre: 'Directora / Jefa UTP', username: 'utp', email: 'utp@apandi.cl', rut: '13.876.543-2', especialidad: 'Directora / Jefa Unidad Técnico-Pedagógica' },
      { nombre_completo: 'Hernán Patricio Valdivia Montes', rol_codigo: 'SOSTENEDOR', rol_nombre: 'Sostenedor Institucional', username: 'sostenedor', email: 'sostenedor@apandi.cl', rut: '10.234.567-8', especialidad: 'Representante Legal / Sostenedor' },
      { nombre_completo: 'Javiera Paz Morales Araya', rol_codigo: 'CONVIVENCIA', rol_nombre: 'Encargada de Convivencia Escolar', username: 'convivencia', email: 'convivencia@apandi.cl', rut: '16.890.123-4', especialidad: 'Trabajadora Social / Convivencia Escolar' },
      { nombre_completo: 'Jorge Eduardo Fuentes Bravo', rol_codigo: 'MONITOR', rol_nombre: 'Monitor Vocacional de Taller', username: 'jfuentes', email: 'jfuentes@apandi.cl', rut: '16.543.210-9', especialidad: 'Monitor Vocacional Taller Textil' },
      { nombre_completo: 'Patricia Elena Gómez Díaz', rol_codigo: 'APODERADO', rol_nombre: 'Apoderado / Familia', username: 'pgomez.familia', email: 'pgomez.familia@gmail.com', rut: '12.345.678-5', especialidad: 'Apoderada Titular' },
      { nombre_completo: 'Roberto Andrés Soto Valdés', rol_codigo: 'ADMIN', rol_nombre: 'Administrador Institucional', username: 'admin', email: 'admin@apandi.cl', rut: '15.432.198-K', especialidad: 'Administrador de Plataforma' }
    ];

    const currentEmail = this.api.user?.email || '';

    grid.innerHTML = accounts
      .map((acc) => {
        const isCurrent = currentEmail && currentEmail.toLowerCase() === String(acc.email).toLowerCase();
        return `
          <div class="flex flex-col justify-between rounded-2xl border ${
            isCurrent ? 'border-teal-500 bg-teal-50/50' : 'border-slate-200 bg-slate-50/70'
          } p-4 transition hover:border-teal-400">
            <div>
              <div class="flex items-center justify-between gap-2">
                <span class="rounded-lg bg-teal-100 px-2.5 py-0.5 text-[11px] font-extrabold text-teal-900 uppercase">
                  ${acc.rol_codigo}
                </span>
                ${
                  isCurrent
                    ? `<span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">Sesión actual</span>`
                    : `<span class="font-mono text-[11px] text-slate-500">RUT ${acc.rut}</span>`
                }
              </div>
              <h4 class="mt-2 font-bold text-slate-900 text-sm">${acc.nombre_completo}</h4>
              <p class="text-xs text-slate-500">${acc.rol_nombre || acc.especialidad}</p>
              <div class="mt-2.5 rounded-xl bg-white p-2.5 border border-slate-200/80 text-[11px] font-mono text-slate-700 space-y-0.5">
                <div><strong>Usuario:</strong> ${acc.username}</div>
                <div><strong>Correo:</strong> ${acc.email}</div>
              </div>
            </div>
            <div class="mt-3 flex items-center gap-2 pt-2">
              <button type="button" onclick="window.app.quickLogin('${acc.email}')"
                class="flex-1 rounded-xl bg-[#087c78] hover:bg-[#066a67] px-3 py-2 text-xs font-semibold text-white shadow-xs transition">
                Iniciar sesión rápido
              </button>
              <button type="button" onclick="window.app.fillLoginCredentials('${acc.email}')"
                class="rounded-xl border border-slate-200 bg-white hover:bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition">
                Rellenar
              </button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  async quickLogin(email) {
    if (!email) return;
    this.closeDevLoginModal();
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
      btnSubmit.innerHTML = '<span>Verificando credenciales...</span>';
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
      this.showToast(`Bienvenido/a, ${res.user.nombre_completo}`);
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
        btnSubmit.innerHTML = `
          <span>Ingresar al sistema</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        `;
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
    const cfg = this.getRoleConfig();

    const roleBadge = document.getElementById('headerRoleBadge');
    if (roleBadge) roleBadge.textContent = u.rol_codigo;

    const sbName = document.getElementById('sidebarUserName');
    if (sbName) sbName.textContent = u.nombre_completo;

    const sbRole = document.getElementById('sidebarUserRole');
    if (sbRole) sbRole.textContent = `${u.rol_codigo} | ${u.rol_nombre || u.especialidad || cfg.label}`;

    const sbInitials = document.getElementById('sidebarUserInitials');
    if (sbInitials) sbInitials.textContent = this.getInitials(u.nombre_completo);

    const welcomeTitle = document.getElementById('welcomeBannerTitle');
    if (welcomeTitle) welcomeTitle.textContent = `Bienvenido/a, ${u.nombre_completo}`;

    const settingsSummary = document.getElementById('settingsUserSummary');
    if (settingsSummary) {
      settingsSummary.textContent = `Sesión iniciada como ${u.nombre_completo} (${u.email || u.username}) con perfil ${u.rol_codigo} (${cfg.label}). Sesión activa por 8 horas con bloqueo automático ante intentos fallidos.`;
    }

    this.applyRolePermissionsUI();

    await this.loadStudentsAndWorkshops();

    if (cfg.allowedTabs.includes('tab-sostenedor')) {
      await this.loadSostenedorDashboard();
    }
    if (cfg.allowedTabs.includes('tab-documentos')) {
      await this.loadDocuments();
    }
    if (cfg.allowedTabs.includes('tab-auditoria')) {
      await this.loadUsers();
      await this.loadAuditLogs();
    }
    if (cfg.allowedTabs.includes('tab-dashboard')) {
      await this.loadDashboardRRHH();
    }
    if (cfg.allowedTabs.includes('tab-libro')) {
      await this.loadPedagogicalBook();
    }
    if (cfg.allowedTabs.includes('tab-paec')) {
      await this.loadBitacora();
    }

    if (this.students.length > 0) {
      if (cfg.canAccessClinical) {
        await this.loadClinicalRecord(this.students[0].id_estudiante);
      }
      if (cfg.allowedTabs.includes('tab-apoderados')) {
        await this.loadGuardianPortal(this.students[0].id_estudiante);
      }
    }

    this.renderDashboardFigmaWidgets();
    this.switchTab(cfg.defaultTab);
  }

  // ===========================================================================
  // 2. NAVEGACION UNIFICADA Y CONTROL DE ACCESO A VISTAS (RBAC)
  // ===========================================================================

  switchTab(tabId) {
    const cfg = this.getRoleConfig();
    if (!this.canAccessTab(tabId)) {
      this.showToast(
        `Acceso restringido: su perfil (${this.api.user?.rol_codigo || 'ACTUAL'}) no tiene permisos para acceder a esta vista.`,
        'warning'
      );
      tabId = cfg.defaultTab;
    }

    document.querySelectorAll('.tab-section').forEach((sec) => sec.classList.add('hidden'));
    document.getElementById(tabId)?.classList.remove('hidden');

    const pageTitles = {
      'tab-sostenedor': 'Resumen Ejecutivo Sostenedor y Subvenciones',
      'tab-dashboard': 'Panel General',
      'tab-estudiantes': 'Estudiantes',
      'tab-buscar-rut': 'Buscar por RUT',
      'tab-documentos': 'Documentación Institucional',
      'tab-libro': 'Libro de Clases Digital (PID)',
      'tab-clinico': 'Expediente Clínico y PIE',
      'tab-paec': 'Convivencia Escolar (PAEC y SOS)',
      'tab-apoderados': 'Portal Familia e Informes PDF',
      'tab-auditoria': 'Administración y Cuentas del Equipo',
      'tab-configuracion': 'Configuración'
    };

    const titleEl = document.getElementById('headerPageTitle');
    if (titleEl && pageTitles[tabId]) {
      titleEl.textContent = pageTitles[tabId];
    }

    document.querySelectorAll('.nav-tab').forEach((btn) => {
      const isHidden = btn.classList.contains('hidden');
      if (btn.dataset.target === tabId) {
        btn.className = `nav-tab ${isHidden ? 'hidden ' : ''}flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition bg-teal-50 text-teal-800 shadow-xs`;
      } else {
        btn.className = `nav-tab ${isHidden ? 'hidden ' : ''}flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition text-slate-600 hover:bg-slate-50 hover:text-slate-900`;
      }
    });

    this.toggleMobileSidebar(false);

    if (tabId === 'tab-sostenedor') {
      this.loadSostenedorDashboard();
    } else if (tabId === 'tab-dashboard') {
      this.renderDashboardFigmaWidgets();
    } else if (tabId === 'tab-estudiantes') {
      this.renderStudentsModule();
    } else if (tabId === 'tab-documentos') {
      this.renderDocumentsModule();
    } else if (tabId === 'tab-auditoria') {
      this.loadUsers();
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
        btn.className = 'book-subtab bg-white text-teal-900 shadow-sm px-3.5 py-2 rounded-lg transition font-extrabold';
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

    const qCleanRut = window.ApandiCrypto.normalizeRut(query).toLowerCase();

    const matches = this.students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        (s.rut || '').toLowerCase().includes(q) ||
        window.ApandiCrypto.normalizeRut(s.rut || '').toLowerCase().includes(qCleanRut) ||
        (s.registrationNumber || '').toLowerCase().includes(q) ||
        (s.course || '').toLowerCase().includes(q) ||
        (s.workshop || '').toLowerCase().includes(q)
    );

    if (matches.length === 0) {
      resultsBox.innerHTML = `<div class="p-3.5 text-xs text-slate-500">No se encontraron estudiantes para "${query}"</div>`;
    } else {
      resultsBox.innerHTML = matches
        .slice(0, 6)
        .map(
          (s) => `
          <button type="button"
            class="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-teal-50/70 transition"
            onclick="window.app.viewStudentProfile(${s.id_estudiante}); document.getElementById('globalSearchResults').classList.add('hidden');">
            <div>
              <p class="font-semibold text-slate-800">${s.fullName}</p>
              <p class="text-xs text-slate-500">RUT ${s.rut} | ${s.course} | ${s.workshop}</p>
            </div>
            <span class="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
              ${s.registrationNumber}
            </span>
          </button>
        `
        )
        .join('');
    }
    resultsBox.classList.remove('hidden');
  }

  // ===========================================================================
  // 2.5. MODULO EJECUTIVO SOSTENEDOR (MATRICULA, SUBVENCION PIE Y DOTACION)
  // ===========================================================================

  async loadSostenedorDashboard() {
    try {
      const data = await this.api.request('sostenedor/resumen');
      const kpi = data.kpis || data.metricas || {};
      const talleresList = data.talleres || data.talleres_capacidad || [];

      const kpiGrid = document.getElementById('sostenedorKpiGrid');
      if (kpiGrid) {
        const matActiva = kpi.matricula_activa ?? kpi.matricula_regular ?? this.students.length;
        const matTotal = kpi.matricula_total ?? this.students.length;
        const asistPct = kpi.asistencia_promedio ?? kpi.asistencia_media_pct ?? 95;
        const pidFirmadas = kpi.clases_pid_firmadas ?? 1;
        const dotActiva = kpi.dotacion_activa ?? 7;
        const docsEmitidos = kpi.documentos_emitidos ?? kpi.documentos_oficiales ?? this.documents.length;

        kpiGrid.innerHTML = `
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Matrícula Oficial Vigente</p>
            <p class="mt-2 text-3xl font-extrabold text-slate-900">${matActiva} / ${matTotal}</p>
            <p class="mt-1 text-xs text-emerald-700 font-semibold">Capacidad autorizada: ${kpi.capacidad_autorizada || 41} cupos</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Asistencia Promedio</p>
            <p class="mt-2 text-3xl font-extrabold text-teal-700">${asistPct}%</p>
            <p class="mt-1 text-xs text-slate-500">Base de cálculo subvención mensual</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Cobertura PIE</p>
            <p class="mt-2 text-3xl font-extrabold text-slate-900">${kpi.cobertura_pie_pct || 100}%</p>
            <p class="mt-1 text-xs text-teal-700 font-semibold">${pidFirmadas} clases PID con firma electrónica PIN</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Dotación Multidisciplinaria</p>
            <p class="mt-2 text-3xl font-extrabold text-slate-900">${dotActiva}</p>
            <p class="mt-1 text-xs text-slate-500">${docsEmitidos} informes institucionales emitidos</p>
          </div>
        `;
      }

      const workshopsList = document.getElementById('sostenedorWorkshopsList');
      if (workshopsList && talleresList.length) {
        workshopsList.innerHTML = talleresList
          .map((t) => {
            const cap = Number(t.capacidad_maxima || 15);
            const inscr = Number(t.inscritos ?? t.matriculados ?? 0);
            const pct = Math.min(100, Math.round((inscr / Math.max(cap, 1)) * 100));
            const cleanNivel = String(t.nivel_decreto || '').replace(/\s*\(Decreto[^)]*\)/gi, '');
            return `
              <div class="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                <div class="flex items-center justify-between">
                  <div>
                    <span class="font-mono text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded">${t.codigo_mineduc}</span>
                    <h4 class="font-bold text-slate-900 text-sm mt-1">${t.nombre}</h4>
                    <p class="text-xs text-slate-500">${cleanNivel} | ${t.sala_ubicacion}</p>
                  </div>
                  <div class="text-right">
                    <span class="text-lg font-extrabold text-teal-800">${inscr} / ${cap}</span>
                    <span class="block text-[11px] text-slate-500">${pct}% ocupación</span>
                  </div>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div class="h-full rounded-full bg-[#087c78]" style="width: ${pct}%"></div>
                </div>
              </div>
            `;
          })
          .join('');
      }

      const staffTable = document.getElementById('sostenedorStaffTable');
      if (staffTable && data.dotacion) {
        staffTable.innerHTML = data.dotacion
          .map(
            (d) => `
            <div class="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 text-xs">
              <div>
                <div class="font-bold text-slate-900">${d.nombre_completo}</div>
                <div class="text-[11px] text-slate-500">${d.especialidad || d.rol_nombre || ''} ${d.rut ? `• RUT ${d.rut}` : ''}</div>
              </div>
              <div class="flex items-center gap-2">
                <span class="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-800">${d.rol_codigo}</span>
                <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  Number(d.activo ?? 1) === 1
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }">
                  ${Number(d.activo ?? 1) === 1 ? 'ACTIVO' : 'SUSPENDIDO'}
                </span>
              </div>
            </div>
          `
          )
          .join('');
      }
    } catch (err) {
      console.warn('Error cargando resumen de sostenedor:', err.message);
    }
  }

  // ===========================================================================
  // 3. MODULO 1: DASHBOARD INSTITUCIONAL (KPIS + DISTRIBUCION + RRHH)
  // ===========================================================================

  renderDashboardFigmaWidgets() {
    const dateEl = document.getElementById('dashboardFullDate');
    if (dateEl) {
      dateEl.textContent = new Intl.DateTimeFormat('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(new Date());
    }

    const total = this.students.length;
    const active = this.students.filter((s) => s.status === 'activo').length;
    const retired = this.students.filter((s) => s.status === 'retirado').length;
    const totalDocs = this.documents.length;

    const kpiTotal = document.getElementById('kpiTotalStudents');
    if (kpiTotal) kpiTotal.textContent = String(total);

    const kpiActive = document.getElementById('kpiActiveStudents');
    if (kpiActive) kpiActive.textContent = String(active);

    const kpiRetired = document.getElementById('kpiRetiredStudents');
    if (kpiRetired) kpiRetired.textContent = String(retired);

    const kpiDocs = document.getElementById('kpiTotalDocs');
    if (kpiDocs) kpiDocs.textContent = String(totalDocs);

    const navStu = document.getElementById('navStudentsCount');
    if (navStu) navStu.textContent = String(total);

    const navDocs = document.getElementById('navDocsCount');
    if (navDocs) navDocs.textContent = String(totalDocs);

    const distBox = document.getElementById('dashboardCourseDistribution');
    if (distBox) {
      const byCourseMap = new Map();
      this.students.forEach((s) => {
        const key = `${s.course} - ${s.workshop}`;
        byCourseMap.set(key, (byCourseMap.get(key) || 0) + 1);
      });
      const byCourse = Array.from(byCourseMap.entries()).sort((a, b) => b[1] - a[1]);

      if (byCourse.length === 0) {
        distBox.innerHTML = `<div class="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Aún no hay estudiantes registrados.</div>`;
      } else {
        distBox.innerHTML = byCourse
          .map(([courseLabel, count]) => {
            const pct = Math.min(100, Math.round((count / Math.max(total, 1)) * 100));
            return `
              <div>
                <div class="mb-1.5 flex justify-between text-sm">
                  <span class="font-medium text-slate-700">${courseLabel}</span>
                  <span class="font-semibold text-slate-900">${count} estudiante${count === 1 ? '' : 's'} (${pct}%)</span>
                </div>
                <div class="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div class="h-full rounded-full bg-[#15928d] transition-all duration-500" style="width: ${pct}%"></div>
                </div>
              </div>
            `;
          })
          .join('');
      }
    }

    const reevalBox = document.getElementById('dashboardUpcomingReevaluations');
    if (reevalBox) {
      const upcoming = this.students
        .filter((s) => s.reevaluationDate)
        .slice()
        .sort((a, b) => String(a.reevaluationDate).localeCompare(String(b.reevaluationDate)))
        .slice(0, 5);

      if (upcoming.length === 0) {
        reevalBox.innerHTML = `<p class="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Sin reevaluaciones próximas registradas.</p>`;
      } else {
        reevalBox.innerHTML = upcoming
          .map(
            (s) => `
            <button type="button"
              onclick="window.app.viewStudentProfile(${s.id_estudiante})"
              class="flex w-full items-center justify-between rounded-xl border border-slate-100 p-3.5 text-left transition hover:border-teal-200 hover:bg-teal-50/40">
              <div>
                <p class="text-sm font-semibold text-slate-900">${s.fullName}</p>
                <p class="text-xs text-slate-500">${s.course} | RUT ${s.rut}</p>
              </div>
              <span class="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                ${this.formatDateCL(s.reevaluationDate)}
              </span>
            </button>
          `
          )
          .join('');
      }
    }
  }

  async loadDashboardRRHH() {
    try {
      const data = await this.api.request('rrhh/dashboard');

      const statusText = document.getElementById('clockStatusText');
      const inTime = document.getElementById('clockInTime');
      const outTime = document.getElementById('clockOutTime');

      if (data.reloj_hoy) {
        if (statusText) {
          statusText.textContent = `${data.reloj_hoy.estado} (${data.reloj_hoy.metodo_marcaje})`;
          statusText.className = 'font-bold text-emerald-300';
        }
        if (inTime) inTime.textContent = data.reloj_hoy.hora_entrada || '--:--:--';
        if (outTime) outTime.textContent = data.reloj_hoy.hora_salida || '--:--:--';
      } else {
        if (statusText) {
          statusText.textContent = 'SIN MARCAJE REGISTRADO HOY';
          statusText.className = 'font-bold text-amber-300';
        }
        if (inTime) inTime.textContent = '--:--:--';
        if (outTime) outTime.textContent = '--:--:--';
      }

      const histBox = document.getElementById('staffAttendanceHistoryList');
      if (histBox && data.historial_reloj) {
        histBox.innerHTML = data.historial_reloj
          .map(
            (r) => `
            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div class="font-bold text-slate-900">${r.funcionario_nombre}</div>
                <div class="text-[11px] text-slate-500">${r.especialidad || r.rol_codigo} | ${r.metodo_marcaje}</div>
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
                  <span class="font-extrabold text-teal-900">${dias[h.dia_semana]}</span>
                  <span class="font-mono text-[11px] bg-teal-100 text-teal-900 px-2 py-0.5 rounded font-bold">${h.hora_inicio.slice(0, 5)} - ${h.hora_fin.slice(0, 5)}</span>
                </div>
                <p class="font-semibold text-slate-800 mt-1.5">${h.bloque_nombre}</p>
                <span class="text-[11px] text-slate-500 mt-1">${h.taller_nombre} | ${h.sala_ubicacion || 'Sala T1'}</span>
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
              : 'bg-teal-50/70 border-teal-200 text-slate-800';
            return `
              <div class="p-3.5 rounded-xl border ${style} text-xs space-y-1">
                <div class="flex items-center justify-between font-extrabold">
                  <span class="inline-flex items-center gap-1.5">${isSOS || isAbsence ? SVG_ICONS.alert : SVG_ICONS.shield} ${n.titulo}</span>
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
        // Coordenadas institucionales APANDI por defecto
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
      this.showToast(res.mensaje);
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

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#cbd5e1' : '#334155';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(148, 163, 184, 0.25)';

    this.chartDimInstance = new Chart(ctxDim, {
      type: 'bar',
      data: {
        labels: ['Competencia Técnica Vocacional', 'Autonomía Personal y EPP', 'Habilidades Sociolaborales'],
        datasets: [
          { label: 'Logrado (L)', data: [72, 85, 78], backgroundColor: '#087c78', borderRadius: 6 },
          { label: 'En Desarrollo (ED)', data: [22, 12, 18], backgroundColor: '#15928d', borderRadius: 6 },
          { label: 'En Inicio (EI)', data: [6, 3, 4], backgroundColor: '#d97706', borderRadius: 6 }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top', labels: { color: textColor, boxWidth: 12, font: { size: 11 } } }
        },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: { beginAtZero: true, max: 100, ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });

    this.chartDoughnutInstance = new Chart(ctxDoughnut, {
      type: 'doughnut',
      data: {
        labels: ['LOGRADO (L)', 'EN DESARROLLO (ED)', 'EN INICIO (EI)', 'NO OBSERVADO (NO)'],
        datasets: [
          {
            data: [68, 24, 6, 2],
            backgroundColor: ['#087c78', '#15928d', '#d97706', '#94a3b8']
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, boxWidth: 12, font: { size: 10 } } }
        }
      }
    });
  }

  // ===========================================================================
  // 4. MODULO 2: GESTION DE ESTUDIANTES (TABLA + EXCEL + MODAL)
  // ===========================================================================

  async loadStudentsAndWorkshops() {
    try {
      const data = await this.api.request('estudiantes');
      this.workshops = data.talleres || [];
      this.students = (data.estudiantes || []).map((s) => this.normalizeStudent(s));

      this.populateCourseFilter();
      this.renderStudentsModule();
      this.populateStudentSelects();
      this.renderDashboardFigmaWidgets();
    } catch (err) {
      console.warn('Error cargando estudiantes:', err.message);
    }
  }

  populateCourseFilter() {
    const courseSel = document.getElementById('filterCourseSelect');
    if (!courseSel) return;
    const currentVal = courseSel.value || 'ALL';
    const courses = Array.from(new Set(this.students.map((s) => s.course).filter(Boolean))).sort();
    courseSel.innerHTML =
      `<option value="ALL">Todos los cursos</option>` +
      courses.map((c) => `<option value="${c}">${c}</option>`).join('');
    if (courses.includes(currentVal)) {
      courseSel.value = currentVal;
    }
  }

  populateStudentSelects() {
    const ids = [
      'evalEstudiante',
      'clinicalStudentSelect',
      'guardianStudentSelect',
      'sosStudentSelect',
      'docEditorStudentSelect',
      'paecStudentSelect',
      'convivenciaStudentSelect',
      'convStudentSelect'
    ];
    ids.forEach((id) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const prev = sel.value;
      sel.innerHTML = this.students
        .map(
          (s) =>
            `<option value="${s.id_estudiante}">${s.fullName} - RUT ${s.rut} (${
              s.grupo_funcionalidad === 'GRUPO_A' ? 'Grupo A' : 'Grupo B'
            })</option>`
        )
        .join('');
      if (prev && this.students.some((st) => String(st.id_estudiante) === String(prev))) {
        sel.value = prev;
      }
    });
  }

  renderStudentsModule() {
    const cfg = this.getRoleConfig();
    const searchQuery = (document.getElementById('studentSearchQuery')?.value || '').trim().toLowerCase();
    const courseFilter = document.getElementById('filterCourseSelect')?.value || 'ALL';
    const workshopFilter = document.getElementById('filterWorkshopSelect')?.value || 'ALL';
    const groupFilter = document.getElementById('filterGroupSelect')?.value || 'ALL';
    const statusFilter = document.getElementById('filterStatusSelect')?.value || 'ALL';

    const subtitle = document.getElementById('studentsCountSubtitle');
    if (subtitle) {
      subtitle.textContent = `${this.students.length} fichas registradas en la base de datos institucional`;
    }

    const cardsBox = document.getElementById('workshopsSummaryCards');
    if (cardsBox) {
      cardsBox.innerHTML = this.workshops
        .map((t) => {
          const enrolled = this.students.filter((s) => Number(s.id_taller) === Number(t.id_taller));
          const countA = enrolled.filter((s) => s.grupo_funcionalidad === 'GRUPO_A').length;
          const countB = enrolled.filter((s) => s.grupo_funcionalidad === 'GRUPO_B').length;
          const cleanNivel = String(t.nivel_decreto || '').replace(/\s*\(Decreto[^)]*\)/gi, '');
          return `
            <div class="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between">
                  <span class="font-mono text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded">${t.codigo_mineduc}</span>
                  <span class="text-[11px] text-slate-500 font-semibold">${t.sala_ubicacion}</span>
                </div>
                <h4 class="font-semibold text-slate-900 text-sm mt-2">${t.nombre}</h4>
                <p class="text-[11px] text-slate-500 mt-0.5">${cleanNivel}</p>
              </div>
              <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                <span class="text-slate-700">Matrícula: ${enrolled.length}/${t.capacidad_maxima}</span>
                <div class="space-x-1.5">
                  <span class="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">Grupo A: ${countA}</span>
                  <span class="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded">Grupo B: ${countB}</span>
                </div>
              </div>
            </div>
          `;
        })
        .join('');
    }

    const cleanSearchRut = window.ApandiCrypto.normalizeRut(searchQuery).toLowerCase();

    const filtered = this.students.filter((s) => {
      const okQuery =
        !searchQuery ||
        s.fullName.toLowerCase().includes(searchQuery) ||
        (s.rut || '').toLowerCase().includes(searchQuery) ||
        window.ApandiCrypto.normalizeRut(s.rut || '').toLowerCase().includes(cleanSearchRut) ||
        (s.registrationNumber || '').toLowerCase().includes(searchQuery) ||
        (s.course || '').toLowerCase().includes(searchQuery) ||
        (s.workshop || '').toLowerCase().includes(searchQuery);

      const okCourse = courseFilter === 'ALL' || s.course === courseFilter;
      const okWorkshop = workshopFilter === 'ALL' || String(s.id_taller) === String(workshopFilter);
      const okGroup = groupFilter === 'ALL' || s.grupo_funcionalidad === groupFilter;
      const okStatus = statusFilter === 'ALL' || s.status === statusFilter;

      return okQuery && okCourse && okWorkshop && okGroup && okStatus;
    });

    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-12 text-center text-sm text-slate-500">
            No se encontraron estudiantes con los criterios seleccionados.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((s) => {
        const isGrupoA = s.grupo_funcionalidad === 'GRUPO_A';
        const badgeGrupo = isGrupoA
          ? `<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">${SVG_ICONS.dotGreen} Grupo A | Funcional</span>`
          : `<span class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900">${SVG_ICONS.dotAmber} Grupo B | Mayor Apoyo</span>`;

        const statusClasses =
          s.status === 'activo'
            ? 'bg-emerald-50 text-emerald-700'
            : s.status === 'retirado'
            ? 'bg-rose-50 text-rose-700'
            : 'bg-amber-50 text-amber-700';

        return `
          <tr class="transition hover:bg-slate-50/80">
            <td class="px-5 py-4">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 font-bold text-teal-800">
                  ${(s.names || s.fullName || 'E')[0]}
                </div>
                <div>
                  <button type="button" onclick="window.app.viewStudentProfile(${s.id_estudiante})"
                    class="font-semibold text-slate-900 hover:text-teal-700 text-left">
                    ${s.fullName}
                  </button>
                  <p class="text-xs text-slate-500">
                    Registro N ${s.registrationNumber} | Matrícula ${s.enrollmentYear}
                  </p>
                </div>
              </div>
            </td>
            <td class="px-4 py-4 font-mono text-xs font-semibold text-slate-700">${s.rut}</td>
            <td class="px-4 py-4">
              <div class="flex items-center gap-2">
                <p class="font-medium text-slate-800">${s.course}</p>
                ${badgeGrupo}
              </div>
              <p class="text-xs text-slate-500 mt-0.5">${s.workshop}</p>
            </td>
            <td class="px-4 py-4">
              <p class="text-slate-700 line-clamp-1 max-w-xs text-xs font-medium">${s.educational?.primaryDiagnosis || 'Por completar'}</p>
              <p class="text-[11px] text-slate-500 mt-0.5">Apoderado: ${s.contact?.guardianName || 'Sin registro'} | SOS: ${s.profesional_sos_nombre || 'Camila Vargas (PIE)'}</p>
            </td>
            <td class="px-4 py-4">
              <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses}">
                ${s.status}
              </span>
            </td>
            <td class="px-5 py-4">
              <div class="flex justify-end gap-1.5">
                <button type="button" onclick="window.app.viewStudentProfile(${s.id_estudiante})"
                  class="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                  Ver ficha
                </button>
                ${
                  cfg.canEditDocuments
                    ? `<button type="button" onclick="window.app.openDocumentEditor('pai', ${s.id_estudiante})"
                        class="rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100">
                        Documento
                      </button>`
                    : ''
                }
                ${
                  cfg.canAccessClinical
                    ? `<button type="button" onclick="window.app.openStudentClinical(${s.id_estudiante})"
                        class="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800" title="Expediente Clínico PIE">
                        PIE
                      </button>`
                    : ''
                }
                ${
                  cfg.canManageStudents
                    ? `<button type="button" onclick="window.app.openEditStudentModal(${s.id_estudiante})"
                        class="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100" title="Editar ficha">
                        ${SVG_ICONS.edit}
                      </button>
                      <button type="button" onclick="window.app.deleteStudent(${s.id_estudiante})"
                        class="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50" title="Eliminar ficha">
                        ${SVG_ICONS.trash}
                      </button>`
                    : ''
                }
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  exportStudentsExcel() {
    if (typeof window.XLSX === 'undefined') {
      this.showToast('La librería SheetJS (XLSX) no está disponible.', 'error');
      return;
    }

    const rows = this.students.map((s) => ({
      N_Registro: s.registrationNumber,
      RUT: s.rut,
      Nombres: s.names,
      Apellido_Paterno: s.paternalSurname,
      Apellido_Materno: s.maternalSurname,
      Fecha_Nacimiento: s.birthDate ? String(s.birthDate).slice(0, 10) : '',
      Genero: s.gender || '',
      Curso: s.course,
      Nivel: s.level || '',
      Taller: s.workshop || '',
      Grupo_Funcional: s.grupo_funcionalidad,
      Estado: s.status,
      Anio_Matricula: s.enrollmentYear,
      Domicilio: s.contact?.address || '',
      Comuna: s.contact?.commune || '',
      Telefono: s.contact?.phone || '',
      Apoderado: s.contact?.guardianName || '',
      RUT_Apoderado: s.contact?.guardianRut || '',
      Telefono_Apoderado: s.contact?.guardianPhone || '',
      Diagnostico_Principal: s.educational?.primaryDiagnosis || '',
      Diagnostico_Secundario: s.educational?.secondaryDiagnosis || '',
      Necesidades_Apoyo: s.educational?.supportNeeds || '',
      Fortalezas: s.educational?.strengths || '',
      Observaciones: s.educational?.pedagogicalObservations || ''
    }));

    const worksheet = window.XLSX.utils.json_to_sheet(rows);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Estudiantes APANDI');
    window.XLSX.writeFile(workbook, `nomina-apandi-${new Date().toISOString().slice(0, 10)}.xlsx`);
    this.showToast('Planilla Excel (.xlsx) exportada correctamente.');
  }

  async importStudentsExcel(file) {
    if (!file) return;
    const msgBox = document.getElementById('studentsActionMessage');
    if (typeof window.XLSX === 'undefined') {
      this.showToast('La librería SheetJS (XLSX) no está disponible.', 'error');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = window.XLSX.utils.sheet_to_json(sheet);

      const res = await this.api.request('estudiantes/importar', {
        method: 'POST',
        body: { rows }
      });

      await this.loadStudentsAndWorkshops();

      const info = `Importación completada: ${res.created || 0} nuevos, ${res.updated || 0} actualizados${
        res.skipped?.length ? ` (${res.skipped.length} omitidos)` : ''
      }.`;
      if (msgBox) {
        msgBox.textContent = info;
        msgBox.classList.remove('hidden');
      }
      this.showToast(info);
    } catch (err) {
      this.showToast(err.message || 'Error al importar archivo Excel', 'error');
    }
  }

  openNewStudentModal() {
    document.getElementById('studentModalError')?.classList.add('hidden');
    const title = document.getElementById('studentModalTitle');
    if (title) title.textContent = 'Registrar estudiante';

    document.getElementById('editEstId').value = '';
    const nextNum = String(this.students.length + 1).padStart(3, '0');
    document.getElementById('newEstRegistro').value = `MAT-2026-${nextNum}`;
    document.getElementById('newEstRut').value = '';
    document.getElementById('newEstNombres').value = '';
    document.getElementById('newEstApellidoPaterno').value = '';
    document.getElementById('newEstApellidoMaterno').value = '';
    document.getElementById('newEstNombreSocial').value = '';
    document.getElementById('newEstNacimiento').value = '2007-08-15';
    document.getElementById('newEstGenero').value = 'Masculino';
    document.getElementById('newEstNacionalidad').value = 'Chilena';
    document.getElementById('newEstCurso').value = 'Nivel Laboral 2A';
    document.getElementById('newEstNivel').value = 'Nivel Laboral 2';
    document.getElementById('newEstTaller').value = '1';
    document.getElementById('newEstGrupo').value = 'GRUPO_A';
    document.getElementById('newEstPct').value = '55';
    document.getElementById('newEstAnioMatricula').value = '2026';
    document.getElementById('newEstEstado').value = 'activo';
    document.getElementById('newEstFechaEval').value = '2026-03-15';
    document.getElementById('newEstFechaReeval').value = '2026-11-30';
    document.getElementById('newEstDireccion').value = '';
    document.getElementById('newEstComuna').value = 'Maipú';
    document.getElementById('newEstTelefono').value = '';
    document.getElementById('newEstApoderadoNombre').value = '';
    document.getElementById('newEstApoderadoRut').value = '';
    document.getElementById('newEstApoderadoTel').value = '';
    document.getElementById('newEstApoderadoEmail').value = '';
    document.getElementById('newEstDiagPrincipal').value = '';
    document.getElementById('newEstDiagSecundario').value = '';

    document.getElementById('newStudentModal')?.classList.remove('hidden');
  }

  openEditStudentModal(idEstudiante) {
    const s = this.students.find((item) => Number(item.id_estudiante) === Number(idEstudiante));
    if (!s) return;

    document.getElementById('studentModalError')?.classList.add('hidden');
    const title = document.getElementById('studentModalTitle');
    if (title) title.textContent = `Editar ficha de ${s.fullName}`;

    document.getElementById('editEstId').value = String(s.id_estudiante);
    document.getElementById('newEstRegistro').value = s.registrationNumber || '';
    document.getElementById('newEstRut').value = s.rut || '';
    document.getElementById('newEstNombres').value = s.names || '';
    document.getElementById('newEstApellidoPaterno').value = s.paternalSurname || '';
    document.getElementById('newEstApellidoMaterno').value = s.maternalSurname || '';
    document.getElementById('newEstNombreSocial').value = s.socialName || '';
    document.getElementById('newEstNacimiento').value = String(s.birthDate || '').slice(0, 10);
    document.getElementById('newEstGenero').value = s.gender || 'Masculino';
    document.getElementById('newEstNacionalidad').value = s.nationality || 'Chilena';
    document.getElementById('newEstCurso').value = s.course || 'Nivel Laboral 2A';
    document.getElementById('newEstNivel').value = s.level || 'Nivel Laboral 2';
    document.getElementById('newEstTaller').value = String(s.id_taller || 1);
    document.getElementById('newEstGrupo').value = s.grupo_funcionalidad || 'GRUPO_A';
    document.getElementById('newEstPct').value = String(s.porcentaje_discapacidad || 50);
    document.getElementById('newEstAnioMatricula').value = String(s.enrollmentYear || 2026);
    document.getElementById('newEstEstado').value = s.status || 'activo';
    document.getElementById('newEstFechaEval').value = String(
      s.educational?.evaluationDate || '2026-03-10'
    ).slice(0, 10);
    document.getElementById('newEstFechaReeval').value = String(
      s.reevaluationDate || '2026-11-25'
    ).slice(0, 10);
    document.getElementById('newEstDireccion').value = s.contact?.address || '';
    document.getElementById('newEstComuna').value = s.contact?.commune || 'Maipú';
    document.getElementById('newEstTelefono').value = s.contact?.phone || '';
    document.getElementById('newEstApoderadoNombre').value = s.contact?.guardianName || '';
    document.getElementById('newEstApoderadoRut').value = s.contact?.guardianRut || '';
    document.getElementById('newEstApoderadoTel').value = s.contact?.guardianPhone || '';
    document.getElementById('newEstApoderadoEmail').value = s.contact?.guardianEmail || '';
    document.getElementById('newEstDiagPrincipal').value = s.educational?.primaryDiagnosis || '';
    document.getElementById('newEstDiagSecundario').value = s.educational?.secondaryDiagnosis || '';
    document.getElementById('newEstApoyos').value = s.educational?.supportNeeds || '';
    document.getElementById('newEstFortalezas').value = s.educational?.strengths || '';
    document.getElementById('newEstObs').value = s.educational?.pedagogicalObservations || '';
    document.getElementById('newEstAntecedentes').value = s.educational?.medicalHistory || '';

    document.getElementById('newStudentModal')?.classList.remove('hidden');
  }

  closeStudentModal() {
    document.getElementById('newStudentModal')?.classList.add('hidden');
  }

  async submitNewStudent() {
    const errBox = document.getElementById('studentModalError');
    errBox?.classList.add('hidden');

    const editId = document.getElementById('editEstId').value.trim();
    const rut = document.getElementById('newEstRut').value.trim();

    if (!window.ApandiCrypto.isValidRut(rut)) {
      if (errBox) {
        errBox.textContent = 'El RUT ingresado no es válido. Verifique el dígito verificador.';
        errBox.classList.remove('hidden');
      }
      return;
    }

    const idTaller = Number(document.getElementById('newEstTaller').value || 1);
    const workshopObj = this.workshops.find((w) => Number(w.id_taller) === idTaller);
    const names = document.getElementById('newEstNombres').value.trim();
    const paternalSurname = document.getElementById('newEstApellidoPaterno').value.trim();
    const maternalSurname = document.getElementById('newEstApellidoMaterno').value.trim();

    const payload = {
      registrationNumber: document.getElementById('newEstRegistro').value.trim(),
      numero_matricula: document.getElementById('newEstRegistro').value.trim(),
      rut: window.ApandiCrypto.formatRut(rut),
      names,
      nombres: names,
      paternalSurname,
      maternalSurname,
      apellidos: `${paternalSurname} ${maternalSurname}`.trim(),
      socialName: document.getElementById('newEstNombreSocial').value.trim(),
      birthDate: document.getElementById('newEstNacimiento').value,
      fecha_nacimiento: document.getElementById('newEstNacimiento').value,
      gender: document.getElementById('newEstGenero').value,
      nationality: document.getElementById('newEstNacionalidad').value.trim(),
      course: document.getElementById('newEstCurso').value.trim(),
      level: document.getElementById('newEstNivel').value.trim(),
      id_taller: idTaller,
      workshop: workshopObj?.nombre || 'Taller Laboral de Corte y Confección Textil',
      grupo_funcionalidad: document.getElementById('newEstGrupo').value,
      porcentaje_discapacidad: Number(document.getElementById('newEstPct').value || 50),
      enrollmentYear: Number(document.getElementById('newEstAnioMatricula').value || 2026),
      status: document.getElementById('newEstEstado').value,
      reevaluationDate: document.getElementById('newEstFechaReeval').value,
      comuna: document.getElementById('newEstComuna').value.trim(),
      direccion: document.getElementById('newEstDireccion').value.trim(),
      contact: {
        address: document.getElementById('newEstDireccion').value.trim(),
        commune: document.getElementById('newEstComuna').value.trim(),
        phone: document.getElementById('newEstTelefono').value.trim(),
        guardianName: document.getElementById('newEstApoderadoNombre').value.trim(),
        guardianRut: document.getElementById('newEstApoderadoRut').value.trim(),
        guardianPhone: document.getElementById('newEstApoderadoTel').value.trim(),
        guardianEmail: document.getElementById('newEstApoderadoEmail').value.trim()
      },
      educational: {
        primaryDiagnosis: document.getElementById('newEstDiagPrincipal').value.trim(),
        secondaryDiagnosis: document.getElementById('newEstDiagSecundario').value.trim(),
        evaluationDate: document.getElementById('newEstFechaEval').value,
        reevaluationDate: document.getElementById('newEstFechaReeval').value,
        supportNeeds: document.getElementById('newEstApoyos').value.trim(),
        strengths: document.getElementById('newEstFortalezas').value.trim(),
        pedagogicalObservations: document.getElementById('newEstObs').value.trim(),
        medicalHistory: document.getElementById('newEstAntecedentes').value.trim()
      }
    };

    try {
      if (editId) {
        await this.api.request(`estudiantes/${editId}`, {
          method: 'PUT',
          body: payload
        });
        this.showToast(`Ficha de ${names} ${paternalSurname} actualizada correctamente.`);
      } else {
        const res = await this.api.request('estudiantes', {
          method: 'POST',
          body: payload
        });
        this.showToast(
          `Estudiante matriculado con código oficial ${res.numero_matricula || payload.registrationNumber}`
        );
      }
      this.closeStudentModal();
      await this.loadStudentsAndWorkshops();
    } catch (err) {
      if (errBox) {
        errBox.textContent = err.message;
        errBox.classList.remove('hidden');
      } else {
        this.showToast(err.message, 'error');
      }
    }
  }

  async deleteStudent(idEstudiante) {
    const s = this.students.find((item) => Number(item.id_estudiante) === Number(idEstudiante));
    if (!s) return;
    if (!window.confirm(`¿Eliminar la ficha de ${s.fullName}? Esta acción quedará registrada en auditoría.`)) {
      return;
    }

    try {
      await this.api.request(`estudiantes/${idEstudiante}`, { method: 'DELETE' });
      this.showToast(`Ficha de ${s.fullName} eliminada.`);
      this.closeStudentProfileModal();
      await this.loadStudentsAndWorkshops();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  viewStudentProfile(idEstudiante) {
    const s = this.students.find((item) => Number(item.id_estudiante) === Number(idEstudiante));
    if (!s) return;

    const cfg = this.getRoleConfig();
    const subtitle = document.getElementById('profileModalSubtitle');
    if (subtitle) subtitle.textContent = `Registro ${s.registrationNumber}`;

    const age = this.calculateAge(s.birthDate);
    const relatedDocs = this.documents.filter((d) => String(d.studentId) === String(s.id_estudiante));

    const infoItem = (label, val) => `
      <div class="rounded-xl bg-slate-50 px-3.5 py-2.5">
        <p class="text-xs font-medium text-slate-400">${label}</p>
        <p class="mt-0.5 text-sm font-medium text-slate-800">${val || 'No registrado'}</p>
      </div>
    `;

    const body = document.getElementById('studentProfileModalBody');
    if (body) {
      body.innerHTML = `
        <div class="space-y-6">
          <div class="flex flex-col justify-between gap-4 rounded-2xl bg-[#073b3a] p-6 text-white md:flex-row md:items-center">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
                  N ${s.registrationNumber}
                </span>
                <span class="rounded-lg bg-teal-400/20 px-2.5 py-1 text-xs font-semibold capitalize text-teal-200">
                  ${s.status}
                </span>
                <span class="rounded-lg bg-emerald-400/20 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                  ${s.grupo_funcionalidad === 'GRUPO_A' ? 'Grupo A (Mayor Funcionalidad)' : 'Grupo B (Mayor Apoyo)'}
                </span>
              </div>
              <h3 class="mt-3 text-2xl font-semibold">${s.fullName}</h3>
              <p class="mt-1 text-sm text-teal-100/80">
                RUT ${s.rut} | ${s.course} ${s.workshop ? `| ${s.workshop}` : ''} ${age !== null ? `| ${age} años` : ''}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              ${
                cfg.canEditDocuments
                  ? `<button type="button"
                      onclick="window.app.closeStudentProfileModal(); window.app.openDocumentEditor('pai', ${s.id_estudiante});"
                      class="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-900 hover:bg-teal-50">
                      Crear documento
                    </button>`
                  : ''
              }
              ${
                cfg.canAccessClinical
                  ? `<button type="button"
                      onclick="window.app.closeStudentProfileModal(); window.app.openStudentClinical(${s.id_estudiante});"
                      class="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-500">
                      ${SVG_ICONS.heart}
                      <span>Expediente PIE</span>
                    </button>`
                  : ''
              }
              ${
                cfg.canManageStudents
                  ? `<button type="button"
                      onclick="window.app.closeStudentProfileModal(); window.app.openEditStudentModal(${s.id_estudiante});"
                      class="rounded-xl border border-white/20 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10">
                      Editar ficha
                    </button>`
                  : ''
              }
              <button type="button"
                onclick="window.print()"
                class="rounded-xl border border-white/20 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10">
                Imprimir
              </button>
            </div>
          </div>

          <div class="grid gap-5 lg:grid-cols-3">
            <div class="rounded-2xl border border-slate-200 p-5">
              <h4 class="font-semibold text-slate-900">1. Datos personales</h4>
              <div class="mt-4 space-y-2.5">
                ${infoItem('Nombre completo', s.fullName)}
                ${infoItem('RUT', s.rut)}
                ${infoItem('Fecha de nacimiento', this.formatDateCL(s.birthDate))}
                ${infoItem('Género', s.gender)}
                ${infoItem('Nacionalidad', s.nationality || 'Chilena')}
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 p-5">
              <h4 class="font-semibold text-slate-900">2. Escolaridad y taller</h4>
              <div class="mt-4 space-y-2.5">
                ${infoItem('Curso', s.course)}
                ${infoItem('Nivel', s.level)}
                ${infoItem('Taller laboral', s.workshop)}
                ${infoItem('Año matrícula', String(s.enrollmentYear || 2026))}
                ${infoItem('Próxima reevaluación', this.formatDateCL(s.reevaluationDate))}
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 p-5">
              <h4 class="font-semibold text-slate-900">3. Familia y contacto</h4>
              <div class="mt-4 space-y-2.5">
                ${infoItem('Domicilio', `${s.contact?.address || ''} ${s.contact?.commune ? `, ${s.contact.commune}` : ''}`)}
                ${infoItem('Apoderado titular', s.contact?.guardianName)}
                ${infoItem('RUT apoderado', s.contact?.guardianRut)}
                ${infoItem('Teléfono apoderado', s.contact?.guardianPhone || s.contact?.phone)}
                ${infoItem('Correo apoderado', s.contact?.guardianEmail)}
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 p-5">
            <h4 class="font-semibold text-slate-900">4. Antecedentes diagnósticos y apoyos</h4>
            <div class="mt-4 grid gap-4 md:grid-cols-2">
              ${infoItem('Diagnóstico principal', s.educational?.primaryDiagnosis)}
              ${infoItem('Diagnóstico secundario', s.educational?.secondaryDiagnosis)}
              ${infoItem('Necesidades de apoyo', s.educational?.supportNeeds)}
              ${infoItem('Fortalezas e intereses', s.educational?.strengths)}
              ${infoItem('Observaciones pedagógicas', s.educational?.pedagogicalObservations)}
              ${infoItem('Antecedentes relevantes / salud', s.educational?.medicalHistory)}
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 p-5">
            <div class="flex items-center justify-between">
              <h4 class="font-semibold text-slate-900">5. Documentos emitidos (${relatedDocs.length})</h4>
              ${
                cfg.canEditDocuments
                  ? `<button type="button"
                      onclick="window.app.closeStudentProfileModal(); window.app.openDocumentEditor('pai', ${s.id_estudiante});"
                      class="text-xs font-semibold text-teal-700 hover:underline">
                      + Nuevo documento institucional
                    </button>`
                  : ''
              }
            </div>
            ${
              relatedDocs.length === 0
                ? `<p class="mt-3 text-sm text-slate-500">Aún no se han generado documentos para este estudiante.</p>`
                : `<div class="mt-3 grid gap-2.5 md:grid-cols-2">
                    ${relatedDocs
                      .map(
                        (doc) => `
                        <div class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm border border-slate-200/70">
                          <div>
                            <p class="font-semibold text-slate-800">${doc.title}</p>
                            <p class="text-xs text-slate-500">Profesional: ${doc.responsible || 'Equipo APANDI'} | ${this.formatDateCL(doc.date)}</p>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="rounded-full bg-white px-2.5 py-1 text-xs font-semibold capitalize text-slate-600 border border-slate-200">
                              ${doc.status}
                            </span>
                            ${
                              cfg.allowedTabs.includes('tab-documentos')
                                ? `<button type="button"
                                    onclick="window.app.closeStudentProfileModal(); window.app.openDocumentEditor('${doc.templateId}', ${s.id_estudiante}, '${doc.id}');"
                                    class="text-xs font-semibold text-teal-700 hover:underline">
                                    Abrir
                                  </button>`
                                : ''
                            }
                          </div>
                        </div>
                      `
                      )
                      .join('')}
                  </div>`
            }
          </div>
        </div>
      `;
    }

    document.getElementById('studentProfileModal')?.classList.remove('hidden');
  }

  closeStudentProfileModal() {
    document.getElementById('studentProfileModal')?.classList.add('hidden');
  }

  openStudentClinical(idEstudiante) {
    if (!this.canAccessTab('tab-clinico')) {
      this.showToast('Su perfil no cuenta con autorización para abrir el Expediente Clínico PIE.', 'warning');
      return;
    }
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
  // 5. MODULO 3: BUSQUEDA INSTANTANEA POR RUT
  // ===========================================================================

  setRutSearchExample(rut) {
    const input = document.getElementById('rutSearchInput');
    if (!input) return;
    input.value = window.ApandiCrypto.formatRut(rut);
    this.handleRutViewSearch(input.value);
  }

  handleRutViewSearch(query) {
    const cfg = this.getRoleConfig();
    const clean = window.ApandiCrypto.normalizeRut(query);
    const validHint = document.getElementById('rutValidationError');
    const resultsContainer = document.getElementById('rutSearchResultsList');
    if (!resultsContainer) return;

    if (validHint) {
      if (clean.length > 7) {
        const isValid = window.ApandiCrypto.isValidRut(query);
        validHint.innerHTML = isValid
          ? `<span class="inline-flex items-center gap-1.5">${SVG_ICONS.check} Formato de RUT válido</span>`
          : `<span class="inline-flex items-center gap-1.5">${SVG_ICONS.alert} El dígito verificador no coincide; mostrando coincidencias parciales.</span>`;
        validHint.className = `mt-4 text-center text-sm font-medium ${isValid ? 'text-teal-700' : 'text-amber-600'}`;
        validHint.classList.remove('hidden');
      } else {
        validHint.classList.add('hidden');
      }
    }

    if (clean.length < 2) {
      resultsContainer.innerHTML = '';
      return;
    }

    const matches = this.students.filter((s) =>
      window.ApandiCrypto.normalizeRut(s.rut || '').includes(clean)
    );

    if (matches.length === 0) {
      resultsContainer.innerHTML = `
        <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No se encontró ningún estudiante con el RUT consultado.
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = matches
      .map(
        (s) => `
        <div class="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:flex-row md:items-center">
          <div>
            <div class="flex items-center gap-2">
              <span class="rounded-lg bg-teal-50 px-2.5 py-1 font-mono text-xs font-semibold text-teal-800">
                ${s.rut}
              </span>
              <span class="text-xs text-slate-400">Registro ${s.registrationNumber}</span>
              <span class="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                ${s.grupo_funcionalidad === 'GRUPO_A' ? 'Grupo A' : 'Grupo B'}
              </span>
            </div>
            <h3 class="mt-2 text-lg font-semibold text-slate-900">${s.fullName}</h3>
            <p class="text-sm text-slate-500">
              ${s.course} | ${s.workshop} | Diagnóstico: ${s.educational?.primaryDiagnosis || 'Por completar'}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" onclick="window.app.viewStudentProfile(${s.id_estudiante})"
              class="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              Abrir ficha
            </button>
            ${
              cfg.canEditDocuments
                ? `<button type="button" onclick="window.app.openDocumentEditor('pai', ${s.id_estudiante})"
                    class="rounded-xl bg-[#087c78] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#066a67]">
                    Generar documento
                  </button>`
                : ''
            }
            ${
              cfg.canAccessClinical
                ? `<button type="button" onclick="window.app.openStudentClinical(${s.id_estudiante})"
                    class="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800">
                    ${SVG_ICONS.heart}
                    <span>Ficha PIE</span>
                  </button>`
                : ''
            }
          </div>
        </div>
      `
      )
      .join('');
  }

  // ===========================================================================
  // 6. MODULO 4: DOCUMENTACION INSTITUCIONAL (7 FORMATOS + PDF/WORD)
  // ===========================================================================

  async loadDocuments() {
    try {
      const data = await this.api.request('documentos');
      this.documents = data.documentos || [];
      if (data.plantillas && data.plantillas.length > 0) {
        this.templates = data.plantillas;
      }
      this.renderDocumentsModule();
      this.renderDashboardFigmaWidgets();
    } catch (err) {
      console.warn('Error cargando documentos:', err.message);
    }
  }

  renderDocumentsModule() {
    const cfg = this.getRoleConfig();
    const grid = document.getElementById('documentTemplatesGrid');
    if (grid) {
      grid.innerHTML = this.templates
        .map(
          (tpl) => `
          <div class="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-teal-300">
            <div>
              <div class="flex items-center justify-between">
                <span class="rounded-xl bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800">
                  ${tpl.short}
                </span>
                <span class="text-xs font-medium text-slate-400">
                  ${(tpl.sections || []).length} apartados
                </span>
              </div>
              <h3 class="mt-4 text-lg font-semibold text-slate-900">${tpl.name}</h3>
              <p class="mt-1.5 text-sm leading-6 text-slate-500">${tpl.description}</p>
            </div>
            <button type="button"
              onclick="window.app.openDocumentEditor('${tpl.id}')"
              class="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-teal-800">
              <span>${cfg.canEditDocuments ? 'Completar formato' : 'Ver estructura'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        `
        )
        .join('');
    }

    const recentBox = document.getElementById('recentDocumentsList');
    if (recentBox) {
      if (this.documents.length === 0) {
        recentBox.innerHTML = `<p class="p-8 text-center text-sm text-slate-500">Aún no se han guardado documentos institucionales.</p>`;
      } else {
        recentBox.innerHTML = `
          <div class="divide-y divide-slate-100">
            ${this.documents
              .map(
                (doc) => `
                <div class="flex flex-col justify-between gap-3 px-6 py-4 md:flex-row md:items-center hover:bg-slate-50/70 transition">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-bold uppercase text-teal-800">${doc.templateId}</span>
                      <p class="font-semibold text-slate-900">${doc.title}</p>
                    </div>
                    <p class="text-xs text-slate-500 mt-0.5">
                      Estudiante: <strong>${doc.studentName}</strong> (RUT ${doc.studentRut || 'S/R'}) | Responsable: ${doc.responsible || 'Equipo APANDI'}
                    </p>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                      ${doc.status}
                    </span>
                    <span class="text-xs text-slate-400">
                      ${this.formatDateCL(doc.date)}
                    </span>
                    <button type="button"
                      onclick="window.app.openDocumentEditor('${doc.templateId}', ${doc.studentId}, '${doc.id}')"
                      class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50">
                      ${cfg.canEditDocuments ? 'Editar / Exportar' : 'Revisar / Exportar'}
                    </button>
                  </div>
                </div>
              `
              )
              .join('')}
          </div>
        `;
      }
    }
  }

  openDocumentEditor(templateId = 'pai', studentId = null, existingDocId = null) {
    this.switchTab('tab-documentos');

    const tpl = this.templates.find((t) => t.id === templateId) || this.templates[0];
    if (!tpl) return;

    document.getElementById('documentsCatalogView')?.classList.add('hidden');
    document.getElementById('documentEditorView')?.classList.remove('hidden');
    document.getElementById('docEditorMessage')?.classList.add('hidden');

    document.getElementById('docEditorTemplateId').value = tpl.id;
    document.getElementById('docEditorShort').textContent = tpl.short;
    document.getElementById('docEditorTitle').textContent = tpl.name;

    this.populateStudentSelects();
    const sel = document.getElementById('docEditorStudentSelect');
    const chosenStudentId = studentId || (this.students[0] ? this.students[0].id_estudiante : '');
    if (sel && chosenStudentId) {
      sel.value = String(chosenStudentId);
    }

    const existingDoc = existingDocId
      ? this.documents.find((d) => String(d.id) === String(existingDocId))
      : null;
    this.activeEditorDocId = existingDoc ? existingDoc.id : null;

    document.getElementById('docEditorDate').value = existingDoc?.date
      ? String(existingDoc.date).slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    document.getElementById('docEditorResponsible').value =
      existingDoc?.responsible || this.api.user?.nombre_completo || 'Equipo Multiprofesional APANDI';

    document.getElementById('docEditorObservations').value = existingDoc?.observations || '';
    document.getElementById('docEditorStatus').value = existingDoc?.status || 'borrador';

    this.renderDocEditorSections(tpl, chosenStudentId, existingDoc);
    this.updateDocEditorStudentSummary(chosenStudentId);
  }

  closeDocumentEditor() {
    document.getElementById('documentEditorView')?.classList.add('hidden');
    document.getElementById('documentsCatalogView')?.classList.remove('hidden');
  }

  onDocEditorStudentChange(studentId) {
    const tplId = document.getElementById('docEditorTemplateId').value;
    const tpl = this.templates.find((t) => t.id === tplId) || this.templates[0];
    this.updateDocEditorStudentSummary(studentId);
    if (tpl) {
      this.renderDocEditorSections(tpl, studentId, null);
    }
  }

  updateDocEditorStudentSummary(studentId) {
    const box = document.getElementById('docEditorStudentSummary');
    if (!box) return;
    const s = this.students.find((item) => Number(item.id_estudiante) === Number(studentId));
    if (!s) {
      box.innerHTML = `<div class="col-span-3 text-slate-500">Seleccione un estudiante para autocompletar su información.</div>`;
      return;
    }

    box.innerHTML = `
      <div>
        <p class="text-xs text-slate-400">Nombre completo</p>
        <p class="font-semibold text-slate-900">${s.fullName}</p>
      </div>
      <div>
        <p class="text-xs text-slate-400">RUT / N Registro</p>
        <p class="font-semibold text-slate-900">${s.rut} | ${s.registrationNumber}</p>
      </div>
      <div>
        <p class="text-xs text-slate-400">Curso / Diagnóstico principal</p>
        <p class="font-semibold text-slate-900">${s.course} | ${s.educational?.primaryDiagnosis || 'Por completar'}</p>
      </div>
    `;
  }

  renderDocEditorSections(tpl, studentId, existingDoc = null) {
    const container = document.getElementById('docEditorSectionsContainer');
    if (!container) return;

    const s = this.students.find((item) => Number(item.id_estudiante) === Number(studentId));

    container.innerHTML = (tpl.sections || [])
      .map((sec, idx) => {
        const secKey = typeof sec === 'string' ? sec : sec.key;
        const secLabel = typeof sec === 'string' ? sec : sec.label;
        const secPlaceholder = typeof sec === 'string' ? `Complete el apartado: ${sec}` : sec.placeholder || '';

        let prefill = '';
        if (existingDoc && existingDoc.content && existingDoc.content[secKey]) {
          prefill = existingDoc.content[secKey];
        } else if (s) {
          const lowerKey = String(secKey).toLowerCase();
          if (idx === 0) {
            prefill = `${s.fullName} (RUT ${s.rut}), curso ${s.course}, taller ${s.workshop}. Diagnóstico: ${
              s.educational?.primaryDiagnosis || 'En evaluación'
            }. Fortalezas: ${s.educational?.strengths || 'Participación activa'}.`;
          } else if (
            lowerKey.includes('apoyo') ||
            lowerKey.includes('adecuacion') ||
            lowerKey.includes('estrategia') ||
            lowerKey.includes('support')
          ) {
            prefill = s.educational?.supportNeeds || '';
          } else if (lowerKey.includes('familia') || lowerKey.includes('acuerdo') || lowerKey.includes('family')) {
            prefill = `Apoderado titular: ${s.contact?.guardianName || 'Familiar'} (${
              s.contact?.guardianPhone || ''
            }). Comunicación permanente con equipo APANDI.`;
          }
        }

        return `
          <label class="block text-sm font-medium text-slate-800">
            ${secLabel}
            <textarea
              data-section-key="${secKey}"
              rows="4"
              placeholder="${secPlaceholder}"
              class="doc-section-textarea mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition resize-y focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
            >${prefill}</textarea>
          </label>
        `;
      })
      .join('');
  }

  collectCurrentDocumentData() {
    const tplId = document.getElementById('docEditorTemplateId').value;
    const tpl = this.templates.find((t) => t.id === tplId) || this.templates[0];
    const studentId = document.getElementById('docEditorStudentSelect').value;
    const student = this.students.find((s) => Number(s.id_estudiante) === Number(studentId));
    const date = document.getElementById('docEditorDate').value;
    const responsible = document.getElementById('docEditorResponsible').value.trim();
    const observations = document.getElementById('docEditorObservations').value.trim();
    const status = document.getElementById('docEditorStatus').value;

    const content = {};
    document.querySelectorAll('.doc-section-textarea').forEach((ta) => {
      content[ta.dataset.sectionKey] = ta.value;
    });

    return {
      template: tpl,
      templateId: tpl.id,
      title: `${tpl.name} - ${student?.fullName || 'Estudiante'}`,
      student,
      studentId: student?.id_estudiante || studentId,
      date,
      responsible,
      observations,
      status,
      content
    };
  }

  async submitDocumentEditor() {
    const docData = this.collectCurrentDocumentData();
    const msgBox = document.getElementById('docEditorMessage');

    try {
      await this.api.request('documentos', {
        method: 'POST',
        body: {
          title: docData.title,
          templateId: docData.templateId,
          studentId: docData.studentId,
          date: docData.date,
          responsible: docData.responsible,
          status: docData.status,
          content: docData.content,
          observations: docData.observations
        }
      });

      if (msgBox) {
        msgBox.textContent = 'Documento guardado correctamente en la base de datos y registrado en auditoría.';
        msgBox.classList.remove('hidden');
      }
      this.showToast(`${docData.title} guardado exitosamente.`);
      await this.loadDocuments();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  exportCurrentDocument(kind) {
    const data = this.collectCurrentDocumentData();
    const s = data.student;
    const tpl = data.template;

    if (kind === 'pdf') {
      if (!window.jspdf) {
        this.showToast('La librería jsPDF no está disponible.', 'error');
        return;
      }
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });

      pdf.setFillColor(7, 59, 58);
      pdf.rect(0, 0, 210, 30, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(`APANDI - ${tpl.name.toUpperCase()}`, 15, 14);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(`Documento Institucional (${tpl.short}) | Fecha: ${data.date}`, 15, 22);

      let y = 40;
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10.5);
      pdf.text('IDENTIFICACION DEL ESTUDIANTE', 15, y);
      y += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      pdf.text(
        `Nombre: ${s?.fullName || 'No especificado'}   |   RUT: ${s?.rut || '-'}   |   Matrícula: ${s?.registrationNumber || '-'}`,
        15,
        y
      );
      y += 5.5;
      pdf.text(`Curso: ${s?.course || '-'}   |   Taller: ${s?.workshop || '-'}`, 15, y);
      y += 5.5;
      pdf.text(`Diagnóstico Principal: ${s?.educational?.primaryDiagnosis || 'Por completar'}`, 15, y);
      y += 9;

      (tpl.sections || []).forEach((sec) => {
        const secKey = typeof sec === 'string' ? sec : sec.key;
        const secLabel = typeof sec === 'string' ? sec : sec.label;

        if (y > 255) {
          pdf.addPage();
          y = 20;
        }
        pdf.setTextColor(8, 124, 120);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text(String(secLabel).toUpperCase(), 15, y);
        y += 5;

        pdf.setTextColor(30, 41, 59);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.5);
        const bodyText = data.content[secKey] || 'Sin observaciones registradas.';
        const lines = pdf.splitTextToSize(bodyText, 180);
        pdf.text(lines, 15, y);
        y += lines.length * 4.8 + 5;
      });

      if (data.observations) {
        if (y > 250) {
          pdf.addPage();
          y = 20;
        }
        pdf.setTextColor(8, 124, 120);
        pdf.setFont('helvetica', 'bold');
        pdf.text('OBSERVACIONES ADICIONALES', 15, y);
        y += 5;
        pdf.setTextColor(30, 41, 59);
        pdf.setFont('helvetica', 'normal');
        const obsLines = pdf.splitTextToSize(data.observations, 180);
        pdf.text(obsLines, 15, y);
        y += obsLines.length * 4.8 + 6;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.text(`Profesional Responsable: ${data.responsible || 'Equipo APANDI'}`, 15, Math.min(y + 8, 278));
      pdf.save(`${tpl.short}_${s?.rut || 'APANDI'}_${data.date}.pdf`);
      this.showToast(`Documento ${tpl.short} exportado en formato PDF.`);
      return;
    }

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>${tpl.name}</title></head>
      <body style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
        <h1 style="color: #073b3a; margin-bottom: 4px;">${tpl.name} (${tpl.short})</h1>
        <p style="color: #475569; margin-top: 0;">Centro de Capacitación Laboral APANDI | Fecha: ${data.date}</p>
        <hr/>
        <h3>Identificación del Estudiante</h3>
        <p>
          <strong>Estudiante:</strong> ${s?.fullName || ''}<br/>
          <strong>RUT:</strong> ${s?.rut || ''} &nbsp;|&nbsp; <strong>Matrícula:</strong> ${s?.registrationNumber || ''}<br/>
          <strong>Curso / Taller:</strong> ${s?.course || ''} - ${s?.workshop || ''}<br/>
          <strong>Diagnóstico:</strong> ${s?.educational?.primaryDiagnosis || ''}
        </p>
        ${(tpl.sections || [])
          .map((sec) => {
            const secKey = typeof sec === 'string' ? sec : sec.key;
            const secLabel = typeof sec === 'string' ? sec : sec.label;
            return `
              <h3 style="color: #087c78;">${secLabel}</h3>
              <p>${(data.content[secKey] || 'Sin observaciones registradas.').replace(/\n/g, '<br/>')}</p>
            `;
          })
          .join('')}
        <h3>Observaciones Adicionales</h3>
        <p>${(data.observations || 'Sin observaciones adicionales.').replace(/\n/g, '<br/>')}</p>
        <br/><hr/>
        <p><strong>Profesional Responsable / Firma:</strong> ${data.responsible || 'Equipo Multiprofesional APANDI'}</p>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tpl.id}-${s?.rut || 'estudiante'}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast(`Documento ${tpl.short} descargado en formato Word (.doc).`);
  }

  // ===========================================================================
  // 7. MODULO 5: LIBRO DE CLASES DIGITAL (PID, ASISTENCIA Y FIRMA PIN)
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
                  <span class="text-[10px] font-bold uppercase text-teal-700">${c.taller_nombre} | ${c.fecha_clase}</span>
                  <h4 class="font-extrabold text-slate-900 text-sm">${c.unidad_tematica}</h4>
                </div>
                <span class="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-900 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-emerald-300">
                  ${SVG_ICONS.check}
                  <span>${c.estado_firma || 'Firmado electrónicamente con PIN'}</span>
                </span>
              </div>
              <p class="text-slate-700 font-semibold">${c.objetivo_aprendizaje}</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                  <strong class="flex items-center gap-1.5 mb-1">${SVG_ICONS.dotGreen} Estrategia Diversificada GRUPO A (Más Funcional):</strong>
                  <p>${c.actividad_grupo_a}</p>
                </div>
                <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
                  <strong class="flex items-center gap-1.5 mb-1">${SVG_ICONS.dotAmber} Estrategia Diversificada GRUPO B (Mayor Apoyo):</strong>
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
            const reg = (data.asistencias || []).find(
              (a) => Number(a.id_estudiante) === Number(s.id_estudiante)
            );
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
                    <div class="font-extrabold text-slate-900 text-sm">${s.fullName}</div>
                    <div class="text-[11px] text-slate-500">${s.workshop} | <strong>${
              s.grupo_funcionalidad === 'GRUPO_A' ? 'Grupo A (Más Funcional)' : 'Grupo B (Mayor Apoyo)'
            }</strong></div>
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-1.5 text-xs">
                  <button onclick="window.app.saveStudentAttendance(${s.id_estudiante}, ${s.id_taller || 1}, 'PRESENTE')"
                    class="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg transition">
                    ${SVG_ICONS.check}
                    <span>Presente</span>
                  </button>
                  <button onclick="window.app.saveStudentAttendance(${s.id_estudiante}, ${s.id_taller || 1}, 'AUSENTE')"
                    class="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg transition">
                    ${SVG_ICONS.close}
                    <span>Ausente (Alerta UTP)</span>
                  </button>
                  <button onclick="window.app.saveStudentAttendance(${s.id_estudiante}, ${s.id_taller || 1}, 'ATRASO')"
                    class="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg transition">
                    ${SVG_ICONS.clock}
                    <span>Atraso</span>
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
                ? 'bg-teal-100 text-teal-900 border-teal-300'
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
      this.showToast(res.mensaje || 'Clase PID registrada (Firmado electrónicamente con PIN)');
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
          ? 'Ausencia registrada. Se disparó Alerta Automática de Inasistencia a UTP.'
          : res.mensaje,
        estado === 'AUSENTE' ? 'warning' : 'success'
      );
      await this.loadPedagogicalBook();
      if (this.canAccessTab('tab-dashboard')) {
        await this.loadDashboardRRHH();
      }
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
      this.showToast(res.mensaje);
      await this.loadPedagogicalBook();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // ===========================================================================
  // 8. MODULO 6: EXPEDIENTE CLINICO Y PIE
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
        if (permBadge) {
          permBadge.textContent = `LECTURA Y ESCRITURA HABILITADA (${data.rol_acceso})`;
          permBadge.className =
            'bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold';
        }
        btnSave?.classList.remove('hidden');
        if (diagInput) diagInput.disabled = false;
        if (anamInput) anamInput.disabled = false;
      } else {
        if (permBadge) {
          permBadge.textContent = `MODO SOLO LECTURA (${data.rol_acceso})`;
          permBadge.className =
            'bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold';
        }
        btnSave?.classList.add('hidden');
        if (diagInput) diagInput.disabled = true;
        if (anamInput) anamInput.disabled = true;
      }

      if (diagInput) {
        diagInput.value =
          String(data.ficha?.diagnostico_principal || 'Diagnóstico en proceso de evaluación multiprofesional.')
            .replace(/\s*\(Decreto[^)]*\)/gi, '')
            .trim();
      }
      if (anamInput) {
        anamInput.value = data.ficha?.anamnesis || 'Anamnesis clínica en registro.';
      }

      const med = data.ficha?.datos_medicos || { medicamentos: [], alergias: [] };
      const medBox = document.getElementById('clinMedicamentosBox');
      if (medBox) {
        medBox.innerHTML = `
          <div><strong>Esquema Farmacológico:</strong> ${
            (med.medicamentos || [])
              .map(
                (m) =>
                  `<span class="inline-block bg-teal-50 text-teal-900 border border-teal-200 px-2 py-0.5 rounded mr-1">${m.nombre} (${m.dosis} | ${m.horario})</span>`
              )
              .join('') || 'Sin medicación activa'
          }</div>
          <div><strong>Alergias Críticas:</strong> ${(med.alergias || []).join(', ') || 'Ninguna reportada'}</div>
          <div><strong>Perfil Sensorial:</strong> ${med.perfil_sensorial || 'Adecuado al entorno de taller'}</div>
          <div><strong>Red de Salud / Derivación:</strong> ${data.ficha?.sistema_salud || 'FONASA'} - ${
          data.ficha?.centro_salud_derivacion || 'CRS Maipú / COSAM'
        }</div>
        `;
      }

      const paiBox = document.getElementById('paiContentBox');
      if (paiBox) {
        if (data.pai) {
          const dua =
            typeof data.pai.estrategias_dua_json === 'string'
              ? JSON.parse(data.pai.estrategias_dua_json)
              : data.pai.estrategias_dua_json;
          const apoyos =
            typeof data.pai.apoyos_especialistas_json === 'string'
              ? JSON.parse(data.pai.apoyos_especialistas_json)
              : data.pai.apoyos_especialistas_json;

          paiBox.innerHTML = `
            <div class="p-3 bg-white rounded-xl border border-teal-200">
              <strong class="text-teal-950 block">Fortalezas e Intereses Vocacionales:</strong>
              <p class="mt-0.5">${data.pai.fortalezas_intereses}</p>
            </div>
            <div class="p-3 bg-white rounded-xl border border-teal-200 space-y-1.5">
              <strong class="text-teal-950 block">Estrategias Pedagógicas Aplicadas en Taller:</strong>
              <div><strong>I. Implicación y Motivación:</strong> ${dua.implicacion}</div>
              <div><strong>II. Representación Visual/Auditiva:</strong> ${dua.representacion}</div>
              <div><strong>III. Acción y Expresión Práctica:</strong> ${dua.accion_expresion}</div>
            </div>
            <div class="p-3 bg-white rounded-xl border border-teal-200 space-y-1.5">
              <strong class="text-teal-950 block">Intervención del Equipo Multidisciplinario PIE:</strong>
              <div><strong>Psicología:</strong> ${apoyos.psicologia}</div>
              <div><strong>Terapia Ocupacional:</strong> ${apoyos.terapia_ocupacional}</div>
              <div><strong>Fonoaudiología:</strong> ${apoyos.fonoaudiologia}</div>
            </div>
          `;
        } else {
          paiBox.innerHTML = `<div class="p-3 bg-white rounded-xl">PAI en actualización semestral para este alumno.</div>`;
        }
      }

      const paciBox = document.getElementById('paciContentBox');
      if (paciBox) {
        if (data.paci) {
          const crit =
            typeof data.paci.criterios_adecuacion_json === 'string'
              ? JSON.parse(data.paci.criterios_adecuacion_json)
              : data.paci.criterios_adecuacion_json;
          paciBox.innerHTML = `
            <div class="p-3 bg-white rounded-xl border border-sky-200 space-y-1.5">
              <div><strong>Tipo de Adecuación Curricular:</strong> <span class="font-bold text-sky-900">${data.paci.tipo_adecuacion}</span></div>
              <div><strong>Adecuación de Acceso:</strong> ${crit.acceso}</div>
              <div><strong>Adecuación a Objetivos (OA Laborales):</strong> ${crit.objetivos_aprendizaje}</div>
              <div><strong>Estrategia de Evaluación Diferenciada:</strong> ${String(data.paci.estrategias_evaluacion_diferenciada || '').replace(/\bDecreto\s*83\b/gi, '').trim()}</div>
            </div>
          `;
        } else {
          paciBox.innerHTML = `<div class="p-3 bg-white rounded-xl">El estudiante trabaja con adecuaciones pedagógicas en su grupo funcional.</div>`;
        }
      }

      if (data.paec) {
        this.renderPaecDetailCard(data.paec);
      }
    } catch (err) {
      deniedBox?.classList.remove('hidden');
      contentBox?.classList.add('hidden');
      const txt = document.getElementById('clinicalDeniedText');
      if (txt) txt.textContent = err.message;
      if (permBadge) {
        permBadge.textContent = 'ACCESO RESTRINGIDO';
        permBadge.className =
          'bg-red-100 text-red-900 border border-red-300 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold';
      }
    }
  }

  renderPaecDetailCard(paec) {
    const paecCard = document.getElementById('paecDetailCard');
    if (!paecCard || !paec) return;
    paecCard.innerHTML = `
      <div class="p-4 rounded-xl bg-red-50 border border-red-200 space-y-1">
        <div class="flex items-center justify-between gap-2">
          <div class="font-extrabold text-red-900 text-sm">Profesional SOS Titular: ${paec.profesional_sos_nombre}</div>
          <span class="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-teal-800 border border-teal-200">
            ${SVG_ICONS.lock}
            <span>Protocolo PAEC Activo</span>
          </span>
        </div>
        <div class="text-red-800 font-semibold">${paec.profesional_sos_especialidad} | Contacto Directo: ${paec.profesional_sos_telefono}</div>
      </div>
      <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
        <strong class="text-slate-900 block">Gatillantes Identificados:</strong>
        <p class="mt-1 text-slate-700 leading-relaxed">${paec.gatillantes_dec}</p>
      </div>
      <div class="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
        <strong class="text-amber-950 block">Señales Previas / Conductas Precursoras:</strong>
        <p class="mt-1 text-amber-900 leading-relaxed">${paec.senales_previas}</p>
      </div>
      <div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
        <strong class="text-emerald-950 block">Protocolo de Contención por Etapas (1, 2 y 3):</strong>
        <p class="mt-1 text-emerald-900 leading-relaxed">${paec.estrategias_contencion}</p>
      </div>
      <div class="p-3.5 rounded-xl bg-teal-50 border border-teal-200">
        <strong class="text-teal-950 block">Acuerdos de Co-responsabilidad con la Familia:</strong>
        <p class="mt-1 text-teal-900 leading-relaxed">${paec.acuerdos_familia}</p>
      </div>
    `;
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
      this.showToast(res.mensaje);
      await this.loadClinicalRecord(idEst);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // ===========================================================================
  // 9. MODULO 7: CONVIVENCIA PAEC Y BOTON SOS EN AULA
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
        <strong>Alumno:</strong> ${alerta.estudiante} |
        <strong>Ubicación:</strong> ${alerta.ubicacion} |
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
      this.showToast(res.mensaje, 'error');
      await this.loadBitacora();
      if (this.canAccessTab('tab-dashboard')) {
        await this.loadDashboardRRHH();
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  onPaecStudentSelectChange(idEstudiante) {
    const proto = (this.paecProtocols || []).find(
      (p) => Number(p.id_estudiante) === Number(idEstudiante)
    );
    if (proto) {
      this.renderPaecDetailCard(proto);
    }
  }

  async submitConvivenciaRecord() {
    try {
      const stuEl = document.getElementById('convivenciaStudentSelect') || document.getElementById('convStudentSelect');
      const tipoEl = document.getElementById('convivenciaTipo') || document.getElementById('convTipoSelect');
      const estadoEl = document.getElementById('convivenciaEstado');
      const descEl = document.getElementById('convivenciaDescripcion') || document.getElementById('convDescripcion');
      const accEl = document.getElementById('convivenciaAcciones') || document.getElementById('convAcciones');

      const id_estudiante = Number(stuEl?.value || 1);
      const tipo_incidencia = tipoEl?.value || 'SEGUIMIENTO_CONVIVENCIA';
      const estado_alerta = estadoEl?.value || 'CONTENIDA_RESUELTA';
      const descripcion_suceso = (descEl?.value || '').trim();
      const acciones_aplicadas_paec = (accEl?.value || '').trim();

      const res = await this.api.request('paec/convivencia', {
        method: 'POST',
        body: {
          id_estudiante,
          tipo_incidencia,
          estado_alerta,
          descripcion_suceso,
          acciones_aplicadas_paec
        }
      });

      if (descEl) descEl.value = '';
      this.showToast(res.mensaje || 'Intervención registrada correctamente en la bitácora.');
      await this.loadBitacora();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async loadBitacora() {
    try {
      const data = await this.api.request('paec/bitacora');
      this.paecProtocols = data.protocolos_paec || [];

      if (this.paecProtocols.length > 0) {
        const paecSel = document.getElementById('paecStudentSelect');
        const selectedId = paecSel?.value || this.paecProtocols[0].id_estudiante;
        const chosen =
          this.paecProtocols.find((p) => Number(p.id_estudiante) === Number(selectedId)) ||
          this.paecProtocols[0];
        this.renderPaecDetailCard(chosen);
      }

      const box = document.getElementById('bitacoraList');
      if (!box) return;

      if (!data.bitacora || data.bitacora.length === 0) {
        box.innerHTML = `
          <div class="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
            <div class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mx-auto">
              ${SVG_ICONS.check}
            </div>
            <div class="font-bold text-slate-800">Sin episodios de desregulación severa activos en este momento</div>
            <p class="text-slate-500">Puede activar el protocolo de emergencia en tiempo real presionando el botón <strong>SOS AULA</strong> en la barra superior.</p>
          </div>
        `;
        return;
      }

      box.innerHTML = data.bitacora
        .map(
          (b) => `
          <div class="p-4 rounded-2xl bg-red-50/70 border border-red-200 space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="inline-flex items-center gap-1.5 font-extrabold text-red-950 text-sm">
                ${SVG_ICONS.alert}
                <span>${b.tipo_incidencia.replace(/_/g, ' ')} - ${b.estudiante_nombre}</span>
              </span>
              <div class="flex items-center gap-1.5">
                <span class="inline-flex items-center gap-1 bg-white text-teal-800 border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  ${SVG_ICONS.lock}
                  <span>Registro Oficial</span>
                </span>
                <span class="bg-red-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">${b.estado_alerta}</span>
              </div>
            </div>
            <p class="text-slate-800"><strong>Suceso registrado:</strong> ${b.descripcion_suceso}</p>
            <p class="text-emerald-950 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              <strong>Protocolo PAEC Activado:</strong> ${b.acciones_aplicadas_paec}
            </p>
            <div class="text-[11px] text-slate-500 flex items-center justify-between pt-1">
              <span>Reportado por: <strong>${b.reportante_nombre}</strong></span>
              <span>Profesional SOS: <strong>${b.profesional_nombre || 'Equipo PIE'}</strong> | ${b.fecha_hora_suceso}</span>
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
  // 10. MODULO 8: PORTAL APODERADOS Y GENERADOR AUTOMATICO DE PDF (jsPDF)
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
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b-2 border-[#073b3a]">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-widest text-teal-700">Educación Especial y Formación Laboral</span>
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
            <div class="font-extrabold text-teal-900 uppercase text-[11px]">1. Identificación del Estudiante y Taller</div>
            <div><strong>Estudiante:</strong> ${est.nombres} ${est.apellidos} (RUT: ${est.rut})</div>
            <div><strong>Taller Laboral:</strong> ${est.taller_nombre || 'Taller de Corte y Confección Textil'}</div>
            <div><strong>Modalidad de Apoyo Curricular:</strong> ${
              est.grupo_funcionalidad === 'GRUPO_A'
                ? 'Grupo A (Mayor Funcionalidad / Autonomía)'
                : 'Grupo B (Mayor Apoyo y Mediación)'
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
          <div class="font-extrabold text-teal-900 uppercase text-[11px]">2. Evaluación Cualitativa de Aprendizajes Laborales (PID)</div>
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
                    .join('') ||
                  '<tr><td colspan="3" class="p-3 text-slate-500">Evaluaciones en proceso de cierre semestral.</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-1.5">
            <div class="font-extrabold text-teal-950 uppercase text-[11px]">3. Avances del Plan de Apoyo Individual (PAI)</div>
            <p><strong>Fortalezas Destacadas:</strong> ${est.fortalezas_intereses || 'Participación activa y respeto por normas de taller.'}</p>
            <p><strong>Proyección Sociolaboral:</strong> ${est.objetivos_transicion_vida_adulta || 'Fomento de autonomía personal y trabajo colaborativo.'}</p>
          </div>
          <div class="p-4 rounded-xl bg-sky-50/70 border border-sky-200 space-y-1.5">
            <div class="font-extrabold text-sky-950 uppercase text-[11px]">4. Acuerdos de Convivencia y Familia (PAEC)</div>
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
      // Continua generacion PDF en cliente
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    doc.setFillColor(7, 59, 58);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('CENTRO DE CAPACITACION LABORAL APANDI', 15, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Educación Especial y Formación Laboral | APANDI Chile', 15, 20);
    doc.text('INFORME OFICIAL DE AVANCES PEDAGOGICOS Y APOYOS PIE PARA LA FAMILIA', 15, 26);

    let y = 42;
    doc.setTextColor(8, 124, 120);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('1. IDENTIFICACION DEL ESTUDIANTE Y TALLER LABORAL', 15, y);
    y += 6;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Estudiante: ${est.nombres} ${est.apellidos}   |   RUT: ${est.rut}   |   Matrícula: ${est.numero_matricula || 'MAT-2026'}`,
      15,
      y
    );
    y += 5.5;
    doc.text(`Taller Asignado: ${est.taller_nombre || 'Taller de Corte y Confección Textil'}`, 15, y);
    y += 5.5;
    doc.text(
      `Nivel de Funcionalidad: ${
        est.grupo_funcionalidad === 'GRUPO_A' ? 'Grupo A (Mayor Funcionalidad)' : 'Grupo B (Mayor Apoyo)'
      }   |   Asistencia: ${pct}%`,
      15,
      y
    );
    y += 5.5;
    doc.text(`Apoderado Titular: ${est.apoderado_nombre || 'Patricia Gómez Díaz'}`, 15, y);

    y += 10;
    doc.setTextColor(8, 124, 120);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('2. EVALUACION CUALITATIVA DE COMPETENCIAS LABORALES (PID)', 15, y);
    y += 5;
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Escala Cualitativa MINEDUC: LOGRADO (L) | EN DESARROLLO (ED) | EN INICIO (EI) | NO OBSERVADO (NO)',
      15,
      y
    );
    y += 6;

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    (evals || []).forEach((ev, idx) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}. [${ev.nivel_logro.replace(/_/g, ' ')}] (${ev.dimension.replace(/_/g, ' ')})`, 15, y);
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(
        `Indicador: ${ev.indicador_competencia}. Obs: ${ev.comentario_pedagogico || ''}`,
        180
      );
      doc.text(lines, 18, y);
      y += lines.length * 4.5 + 2;
    });

    y += 5;
    doc.setTextColor(8, 124, 120);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('3. SINTESIS DEL PLAN DE APOYO INDIVIDUAL (PAI) Y ACUERDOS PAEC', 15, y);
    y += 6;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const paiText = doc.splitTextToSize(
      `Fortalezas e Intereses (PAI): ${est.fortalezas_intereses || 'Participación positiva en taller laboral.'}`,
      180
    );
    doc.text(paiText, 15, y);
    y += paiText.length * 4.8 + 2;

    const vidaAdulta = doc.splitTextToSize(
      `Proyección Transición Vida Adulta: ${
        est.objetivos_transicion_vida_adulta || 'Desarrollo de hábitos sociolaborales y seguridad.'
      }`,
      180
    );
    doc.text(vidaAdulta, 15, y);
    y += vidaAdulta.length * 4.8 + 2;

    const paecText = doc.splitTextToSize(
      `Acuerdos con la Familia (PAEC): ${
        est.acuerdos_familia || 'Comunicación permanente con el equipo multidisciplinario PIE.'
      }`,
      180
    );
    doc.text(paecText, 15, y);

    doc.setDrawColor(203, 213, 225);
    doc.line(25, 255, 95, 255);
    doc.line(115, 255, 185, 255);
    doc.setFontSize(8.5);
    doc.text('Firma Docente Titular / Coordinación PIE', 32, 260);
    doc.text('Firma Dirección / Unidad Técnico-Pedagógica', 120, 260);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Documento oficial generado por SGI APANDI el ${new Date().toLocaleDateString('es-CL')}.`,
      25,
      278
    );

    doc.save(`Informe_Familia_${est.rut}_APANDI_2026.pdf`);
    this.showToast('PDF Oficial "Informe para la Familia" descargado correctamente.');
  }

  // ===========================================================================
  // 11. MODULO 9: CUENTAS DEL EQUIPO, CONFIGURACION Y AUDITORIA
  // ===========================================================================

  async loadUsers() {
    try {
      const data = await this.api.request('usuarios');
      this.users = data.usuarios || [];
      this.renderTeamUsersList();
    } catch (err) {
      console.warn('Error cargando cuentas del equipo:', err.message);
    }
  }

  renderTeamUsersList() {
    const box = document.getElementById('teamUsersList');
    if (!box) return;

    const cfg = this.getRoleConfig();

    if (this.users.length === 0) {
      box.innerHTML = `<div class="p-6 text-center text-sm text-slate-500">Sin cuentas registradas.</div>`;
      return;
    }

    box.innerHTML = this.users
      .map(
        (user) => `
        <div class="flex flex-col justify-between gap-2 px-6 py-4 md:flex-row md:items-center hover:bg-slate-50/70 transition">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-xs font-bold text-teal-800">
              ${this.getInitials(user.name)}
            </div>
            <div>
              <p class="font-semibold text-slate-900">${user.name}</p>
              <p class="text-xs text-slate-500">
                @${user.username} | ${user.email} ${user.rut ? `| RUT ${user.rut}` : ''}
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${user.specialty ? `<span class="text-xs text-slate-500">${user.specialty}</span>` : ''}
            <span class="w-fit rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase text-teal-800">
              ${user.rol_codigo || user.role}
            </span>
            <span class="w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              user.activo !== false
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }">
              ${user.activo !== false ? 'Activa' : 'Suspendida'}
            </span>
            ${
              cfg.canManageUsers
                ? `<button type="button" onclick="window.app.toggleUserStatus(${user.id})"
                    class="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                    ${user.activo !== false ? 'Suspender' : 'Activar'}
                  </button>`
                : ''
            }
          </div>
        </div>
      `
      )
      .join('');
  }

  async toggleUserStatus(userId) {
    try {
      const res = await this.api.request(`usuarios/${userId}/toggle`, { method: 'PUT' });
      this.showToast(res.mensaje || 'Estado de cuenta actualizado.');
      await this.loadUsers();
      await this.loadAuditLogs();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  openCreateUserModal() {
    document.getElementById('createUserModal')?.classList.remove('hidden');
  }

  async submitCreateUser() {
    const msgBox = document.getElementById('usersViewMessage');
    try {
      const payload = {
        name: document.getElementById('newUserName').value.trim(),
        username: document.getElementById('newUserUsername').value.trim(),
        email: document.getElementById('newUserEmail').value.trim(),
        rut: document.getElementById('newUserRut').value.trim(),
        password: document.getElementById('newUserPassword').value,
        role: document.getElementById('newUserRole').value
      };

      const res = await this.api.request('usuarios', {
        method: 'POST',
        body: payload
      });

      document.getElementById('createUserModal')?.classList.add('hidden');
      if (msgBox) {
        msgBox.textContent = `Cuenta creada para ${payload.name} (@${payload.username}).`;
        msgBox.classList.remove('hidden');
      }
      this.showToast(res.mensaje || 'Cuenta de usuario creada exitosamente.');
      await this.loadUsers();
      await this.loadAuditLogs();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async submitChangePassword() {
    try {
      const current_password = document.getElementById('cfgCurrentPassword')?.value || '';
      const new_password = document.getElementById('cfgNewPassword')?.value || '';
      const confirmEl = document.getElementById('cfgConfirmPassword');
      if (confirmEl && new_password !== confirmEl.value) {
        this.showToast('La nueva contraseña y su confirmación no coinciden.', 'error');
        return;
      }

      const res = await this.api.request('auth/change-password', {
        method: 'POST',
        body: {
          currentPassword: current_password,
          newPassword: new_password,
          current_password,
          new_password
        }
      });

      if (document.getElementById('cfgCurrentPassword')) document.getElementById('cfgCurrentPassword').value = '';
      if (document.getElementById('cfgNewPassword')) document.getElementById('cfgNewPassword').value = '';
      if (confirmEl) confirmEl.value = '';
      this.showToast(res.mensaje || 'Contraseña actualizada correctamente.');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async submitChangePin() {
    try {
      const current_password = document.getElementById('cfgPinCurrentPassword')?.value || '';
      const new_pin = (document.getElementById('cfgNewPin')?.value || '').trim();

      const res = await this.api.request('auth/change-pin', {
        method: 'POST',
        body: {
          currentPassword: current_password,
          newPin: new_pin,
          current_password,
          new_pin
        }
      });

      if (document.getElementById('cfgPinCurrentPassword')) document.getElementById('cfgPinCurrentPassword').value = '';
      if (document.getElementById('cfgNewPin')) document.getElementById('cfgNewPin').value = '';
      this.showToast(res.mensaje || 'PIN de firma electrónica actualizado correctamente.');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

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
                <span class="font-mono font-extrabold text-teal-800">${r.codigo}</span>
                <span class="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-bold">Rol Oficial</span>
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
              <td class="p-3 font-mono text-[11px] text-slate-600">#${l.id_log} | ${l.fecha_hora}</td>
              <td class="p-3 font-bold text-slate-900">
                ${l.usuario_nombre}
                <span class="ml-1 text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-mono">${l.rol_codigo}</span>
              </td>
              <td class="p-3 font-mono font-bold text-teal-800">${l.modulo}</td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  l.accion === 'ALERTA_SOS'
                    ? 'bg-red-100 text-red-800'
                    : l.accion === 'ACTUALIZACION' || l.accion === 'ALTA_ESTUDIANTE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-teal-100 text-teal-800'
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
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-red-700 font-bold">${err.message}</td></tr>`;
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new SgiApandiApplication();
  window.app.bootAuthenticatedSession();
});
