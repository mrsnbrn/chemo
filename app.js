/**
 * OncoFlow - Chemotherapy Center Application Core
 * Complete clinical state management, patient CRUD, consultation & treatment loggers
 */

// Authorized Medical Staff & Standard Clinical Roles
const CLINICAL_USERS = [
  {
    username: 'admin',
    password: 'admin123',
    fullName: 'Administrator',
    title: 'System Administrator',
    role: 'director',
    isAuthorized: true,
    badge: 'System Administrator',
    avatar: 'AD'
  },
  {
    username: 'guest',
    password: 'guest123',
    fullName: 'Guest User',
    title: 'Guest / View Only',
    role: 'nurse',
    isAuthorized: false,
    badge: 'Guest Account',
    avatar: 'GU'
  }
];

class ChemoApp {
  constructor() {
    this.storageKey = 'imus_chemo_census_v6';
    this.patients = [];
    this.consultations = [];
    this.treatments = [];
    this.activeView = 'dashboard';
    this.selectedPatientId = null;
    this.pendingDeletePatientId = null;
    this.activeChartTab = 'timeline';
    this.timelineFilter = 'all';

    // Clinical Authentication & Authorization State
    this.currentUser = null;
    this.pendingSupervisorAction = null;

    // Reports & Analytics State
    this.reportPeriod = 'monthly';
    this.reportScope = 'overview';
    this.reportSelectedPatientId = '';
    this.reportDailyDate = '2026-10-27';
    this.reportWeeklyDate = '2026-10-26';
    this.reportMonthYear = '2026-10';
    this.reportYear = '2026';
    this.reportCustomStart = '2026-10-01';
    this.reportCustomEnd = '2026-10-31';

    this.init();
  }

  init() {
    this.initTheme();
    this.loadData();
    this.bindEvents();
    this.initAuth();
    this.render();
  }

  /* ------------------------------------------------------------------
   * Dark / Light Theme Management
   * ------------------------------------------------------------------ */
  initTheme() {
    const savedTheme = localStorage.getItem('imus_chemo_theme') || 
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    this.setTheme(savedTheme);

    // Header theme toggle button
    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      this.setTheme(current === 'dark' ? 'light' : 'dark');
    });

    // Login screen theme toggle button
    document.getElementById('btn-theme-toggle-login')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      this.setTheme(current === 'dark' ? 'light' : 'dark');
    });

    // Settings view theme cards
    document.querySelectorAll('[data-set-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-set-theme');
        if (theme) this.setTheme(theme);
      });
    });
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('imus_chemo_theme', theme);
    } catch (e) {}
    this.updateThemeUI(theme);
  }

  updateThemeUI(theme) {
    const isDark = theme === 'dark';

    // Update Header toggle button
    const headerBtn = document.getElementById('btn-theme-toggle');
    if (headerBtn) {
      const iconSlot = headerBtn.querySelector('.theme-icon-slot');
      const textSlot = headerBtn.querySelector('.theme-text-slot');
      if (iconSlot) {
        iconSlot.innerHTML = isDark
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      }
      if (textSlot) {
        textSlot.textContent = isDark ? 'Light' : 'Dark';
      }
      headerBtn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    }

    // Update Login screen toggle button
    const loginBtn = document.getElementById('btn-theme-toggle-login');
    if (loginBtn) {
      const iconSlot = loginBtn.querySelector('.theme-icon-slot');
      const textSlot = loginBtn.querySelector('.theme-text-slot');
      if (iconSlot) {
        iconSlot.innerHTML = isDark
          ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
          : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      }
      if (textSlot) {
        textSlot.textContent = isDark ? 'Light Mode' : 'Dark Mode';
      }
      loginBtn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    }

    // Update settings cards
    document.querySelectorAll('[data-set-theme]').forEach(card => {
      if (card.getAttribute('data-set-theme') === theme) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  /* ------------------------------------------------------------------
   * Clinical Authentication & Authorization Gateway
   * ------------------------------------------------------------------ */
  initAuth() {
    try {
      const savedUser = sessionStorage.getItem('chemo_active_user') || localStorage.getItem('chemo_active_user');
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
        this.hideLoginGateway();
        this.updateUserSessionUI();
      } else {
        this.currentUser = null;
        this.showLoginGateway();
      }
    } catch (e) {
      this.currentUser = null;
      this.showLoginGateway();
    }
  }

  showLoginGateway() {
    const overlay = document.getElementById('login-gateway');
    if (overlay) overlay.style.display = 'flex';
    const errorEl = document.getElementById('login-error-alert');
    if (errorEl) errorEl.style.display = 'none';
    const userInput = document.getElementById('login-username');
    if (userInput) {
      userInput.value = '';
      setTimeout(() => userInput.focus(), 150);
    }
    const passInput = document.getElementById('login-password');
    if (passInput) passInput.value = '';
  }

  hideLoginGateway() {
    const overlay = document.getElementById('login-gateway');
    if (overlay) overlay.style.display = 'none';
  }

  login(username, password) {
    const u = (username || '').trim().toLowerCase();
    const p = (password || '').trim();
    const match = CLINICAL_USERS.find(usr => usr.username.toLowerCase() === u && usr.password === p);

    if (match) {
      this.currentUser = match;
      sessionStorage.setItem('chemo_active_user', JSON.stringify(match));
      localStorage.setItem('chemo_active_user', JSON.stringify(match));
      this.hideLoginGateway();
      this.updateUserSessionUI();
      this.showToast(`Welcome back, ${match.fullName} (${match.badge})`, 'success');
      this.render();
      return true;
    } else {
      const err = document.getElementById('login-error-alert');
      if (err) {
        err.style.display = 'flex';
        const txt = document.getElementById('login-error-text');
        if (txt) txt.textContent = 'Invalid username or password. Please verify your clinical credentials.';
      }
      return false;
    }
  }

  logout() {
    this.currentUser = null;
    sessionStorage.removeItem('chemo_active_user');
    localStorage.removeItem('chemo_active_user');
    this.showLoginGateway();
    this.showToast('Logged out of Imus Chemotherapy Center.', 'info');
  }

  updateUserSessionUI() {
    if (!this.currentUser) return;
    const { fullName, isAuthorized, badge, avatar } = this.currentUser;

    // Top Header session pill
    const headerAvatar = document.getElementById('user-header-avatar');
    if (headerAvatar) {
      headerAvatar.textContent = avatar || 'MD';
      headerAvatar.className = 'user-avatar-circle' + (!isAuthorized ? ' nurse-avatar' : '');
    }
    const headerName = document.getElementById('user-header-name');
    if (headerName) headerName.textContent = fullName;
    const headerRole = document.getElementById('user-header-role');
    if (headerRole) {
      headerRole.textContent = isAuthorized ? '✓ ' + badge : '🔒 ' + badge;
      headerRole.className = 'user-session-role-badge' + (!isAuthorized ? ' staff' : '');
    }

    // Sidebar user card
    const sideAvatar = document.getElementById('sidebar-user-avatar');
    if (sideAvatar) {
      sideAvatar.textContent = avatar || 'MD';
      sideAvatar.className = 'sidebar-user-avatar' + (!isAuthorized ? ' nurse-avatar' : '');
    }
    const sideName = document.getElementById('sidebar-user-name');
    if (sideName) sideName.textContent = fullName;
    const sideRole = document.getElementById('sidebar-user-role');
    if (sideRole) {
      sideRole.textContent = isAuthorized ? badge : badge + ' (Restricted)';
      sideRole.className = 'sidebar-user-role' + (!isAuthorized ? ' staff' : '');
    }
  }

  isUserAuthorized() {
    return Boolean(this.currentUser && this.currentUser.isAuthorized);
  }

  requireAuthorization(actionDescription, callback) {
    if (this.isUserAuthorized()) {
      callback();
      return;
    }

    // Unauthorized - prompt supervisor / physician override modal
    this.pendingSupervisorAction = { actionDescription, callback };
    const modal = document.getElementById('modal-supervisor-auth');
    const descEl = document.getElementById('supervisor-target-action-desc');
    if (descEl) descEl.textContent = actionDescription;

    const errorEl = document.getElementById('supervisor-auth-error-alert');
    if (errorEl) errorEl.style.display = 'none';

    const uInput = document.getElementById('supervisor-username');
    if (uInput) uInput.value = '';
    const pInput = document.getElementById('supervisor-password');
    if (pInput) pInput.value = '';

    this.openModal(modal);
    setTimeout(() => uInput?.focus(), 150);
  }

  verifySupervisorAuthorization(username, password, reason) {
    const u = (username || '').trim().toLowerCase();
    const p = (password || '').trim();
    const supervisor = CLINICAL_USERS.find(usr => usr.username.toLowerCase() === u && usr.password === p && usr.isAuthorized);

    if (supervisor && this.pendingSupervisorAction) {
      const action = this.pendingSupervisorAction;
      this.pendingSupervisorAction = null;
      this.closeModal(document.getElementById('modal-supervisor-auth'));
      this.showToast(`Supervisor override approved by ${supervisor.fullName}`, 'success');
      action.callback();
      return true;
    } else {
      const errorEl = document.getElementById('supervisor-auth-error-alert');
      if (errorEl) {
        errorEl.style.display = 'block';
        errorEl.textContent = 'Invalid supervisor credentials. Only authorized medical oncologists or directors may approve this action.';
      }
      return false;
    }
  }

  /* ------------------------------------------------------------------
   * Persistence & Data Loading
   * ------------------------------------------------------------------ */
  loadData() {
    try {
      let stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        stored = localStorage.getItem('imus_chemo_census_v5');
      }
      if (stored) {
        const parsed = JSON.parse(stored);
        this.patients = parsed.patients || [];
        this.consultations = parsed.consultations || [];
        this.treatments = parsed.treatments || [];

        // If local storage has older demo dataset, automatically upgrade to full master census
        if (this.patients.length < 50 && typeof DEMO_PATIENTS !== 'undefined' && DEMO_PATIENTS.length >= 200) {
          this.loadDemoDataset(false);
          return;
        }

        // Migrate/upgrade patient records: ensure ICC- prefix on MRN, male/female avatars, clean fields, and standardized statuses
        let migrated = false;
        this.patients.forEach(p => {
          const demoMatch = (typeof DEMO_PATIENTS !== 'undefined') ? DEMO_PATIENTS.find(d => d.id === p.id) : null;
          if (p.mrn && !p.mrn.startsWith('ICC-') && p.mrn.startsWith('P')) {
            p.mrn = `ICC-${p.mrn}`;
            migrated = true;
          }
          if (!p.philhealthNo) {
            p.philhealthNo = demoMatch ? demoMatch.philhealthNo : '';
            migrated = true;
          }
          if (!p.residentialAddress) {
            p.residentialAddress = demoMatch ? demoMatch.residentialAddress : 'Imus City, Cavite';
            migrated = true;
          }
          if (!this.isUploadedPhoto(p.photo)) {
            p.photo = demoMatch && this.isUploadedPhoto(demoMatch.photo) ? demoMatch.photo : this.getPatientAvatar(p.gender);
            migrated = true;
          }
          if (!p.registrationDate) {
            p.registrationDate = demoMatch ? demoMatch.registrationDate : (p.createdAt ? p.createdAt.slice(0, 10) : '2026-10-28');
            migrated = true;
          }
          if (!p.civilStatus) {
            p.civilStatus = p.maritalStatus || (demoMatch ? (demoMatch.civilStatus || demoMatch.maritalStatus) : 'Single');
            p.maritalStatus = p.civilStatus;
            migrated = true;
          }
          if (!p.religion) {
            p.religion = demoMatch ? demoMatch.religion : 'Roman Catholic';
            migrated = true;
          }

          // Normalize status to the 5 official statuses: Active, Not Active, Deceased, Graduated, Under Surveillance
          const rawStatus = (p.status || '').toLowerCase().trim();
          let newStatus = p.status;
          if (rawStatus === 'active treatment' || rawStatus === 'active') {
            newStatus = 'Active';
          } else if (rawStatus === 'in remission' || rawStatus === 'graduated' || rawStatus === 'completed') {
            newStatus = 'Graduated';
          } else if (rawStatus === 'discharged' || rawStatus === 'expired' || rawStatus === 'deceased') {
            newStatus = 'Deceased';
          } else if (rawStatus === 'surveillance' || rawStatus === 'under surveillance') {
            newStatus = 'Under Surveillance';
          } else if (rawStatus === 'holding / paused' || rawStatus === 'paused' || rawStatus === 'new evaluation' || rawStatus === 'not active') {
            newStatus = 'Not Active';
          } else {
            newStatus = 'Active';
          }
          if (p.status !== newStatus) {
            p.status = newStatus;
            migrated = true;
          }
          if (!p.lastName || !p.firstName) {
            if (demoMatch && demoMatch.lastName) {
              p.lastName = demoMatch.lastName;
              p.firstName = demoMatch.firstName;
              p.middleName = demoMatch.middleName || '';
              p.fullName = demoMatch.fullName || `${p.lastName}, ${p.firstName} ${p.middleName}`.trim();
            } else {
              const raw = p.fullName || 'Patient';
              if (raw.includes(',')) {
                const parts = raw.split(',');
                p.lastName = parts[0].trim();
                const rest = (parts[1] || '').trim().split(' ');
                p.firstName = rest[0] || '';
                p.middleName = rest.slice(1).join(' ') || '';
              } else {
                const parts = raw.trim().split(' ');
                if (parts.length > 1) {
                  p.firstName = parts[0];
                  p.lastName = parts.slice(1).join(' ');
                  p.middleName = '';
                } else {
                  p.firstName = parts[0];
                  p.lastName = '';
                  p.middleName = '';
                }
              }
              p.fullName = p.middleName ? `${p.lastName}, ${p.firstName} ${p.middleName}` : (p.lastName ? `${p.lastName}, ${p.firstName}` : p.firstName);
            }
            migrated = true;
          }
        });

        // Purge legacy chairOrBed attributes from treatments
        this.treatments.forEach(t => {
          if ('chairOrBed' in t) {
            delete t.chairOrBed;
            migrated = true;
          }
        });

        if (migrated) {
          this.saveData();
        }
      } else {
        // First run: load initial clinically authentic demo dataset
        this.loadDemoDataset(false);
      }
    } catch (e) {
      console.error('Error loading data from localStorage:', e);
      this.loadDemoDataset(false);
    }
  }

  saveData() {
    try {
      const payload = {
        patients: this.patients,
        consultations: this.consultations,
        treatments: this.treatments,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
      this.updateCounters();
    } catch (e) {
      console.error('Failed to save data:', e);
      this.showToast('Failed to save data to local storage', 'danger');
    }
  }

  loadDemoDataset(notify = true) {
    if (typeof DEMO_PATIENTS !== 'undefined') {
      this.patients = JSON.parse(JSON.stringify(DEMO_PATIENTS));
      this.consultations = JSON.parse(JSON.stringify(DEMO_CONSULTATIONS));
      this.treatments = JSON.parse(JSON.stringify(DEMO_TREATMENTS));
      this.saveData();
      if (notify) {
        this.showToast('Clinical demo cases restored successfully', 'success');
        this.render();
      }
    }
  }

  clearDatabase() {
    if (confirm('Are you sure you want to permanently erase ALL patient records and clinical logs? This cannot be undone.')) {
      this.patients = [];
      this.consultations = [];
      this.treatments = [];
      this.saveData();
      this.showToast('Database wiped clean', 'warning');
      this.navigateTo('patients');
    }
  }

  exportJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
      version: '2.4',
      exportDate: new Date().toISOString(),
      patients: this.patients,
      consultations: this.consultations,
      treatments: this.treatments
    }, null, 2));
    
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `oncoflow_chemo_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    this.showToast('Database backup downloaded', 'success');
  }

  importJson(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (Array.isArray(parsed.patients)) {
          this.patients = parsed.patients;
          this.consultations = parsed.consultations || [];
          this.treatments = parsed.treatments || [];
          this.saveData();
          this.showToast(`Imported ${this.patients.length} patients and logs successfully`, 'success');
          this.render();
        } else {
          this.showToast('Invalid backup file format', 'danger');
        }
      } catch (err) {
        this.showToast('Error parsing JSON backup file', 'danger');
      }
    };
    reader.readAsText(file);
  }

  /* ------------------------------------------------------------------
   * Clinical Calculations & Helpers
   * ------------------------------------------------------------------ */
  // Mosteller formula: BSA (m²) = sqrt( (Height(cm) * Weight(kg)) / 3600 )
  calculateBSA(heightCm, weightKg) {
    if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return 0;
    return Math.round(Math.sqrt((heightCm * weightKg) / 3600) * 100) / 100;
  }

  calculateBMI(heightCm, weightKg) {
    if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return 0;
    const heightM = heightCm / 100;
    return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  }

  calculateAge(dobString) {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  }

  generateMRN() {
    let maxNum = 0;
    this.patients.forEach(p => {
      if (p.mrn) {
        const m = p.mrn.match(/P(\d+)/i);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    return `ICC-P${maxNum + 1}`;
  }

  isUploadedPhoto(photo) {
    if (!photo || typeof photo !== 'string') return false;
    const trimmed = photo.trim();
    if (trimmed === '') return false;
    // Check for user-uploaded base64 pictures or external URLs
    if (trimmed.startsWith('data:image/jpeg') || trimmed.startsWith('data:image/png') || trimmed.startsWith('data:image/webp') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return true;
    }
    return false;
  }

  getPatientAvatar(gender) {
    const isFemale = (gender || '').toLowerCase().startsWith('f');
    if (isFemale) {
      return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23ec4899'/><circle cx='50' cy='38' r='20' fill='%23fed7aa'/><path d='M50 19c-13 0-21 8-21 19 0 6 3 11 8 13-1 2-2 5-2 9h30c0-4-1-7-2-9 5-2 8-7 8-13 0-11-8-19-21-19z' fill='%23831843'/><circle cx='44' cy='37' r='2.5' fill='%231e293b'/><circle cx='56' cy='37' r='2.5' fill='%231e293b'/><path d='M47 45q3 3 6 0' stroke='%23dc2626' stroke-width='1.8' fill='none' stroke-linecap='round'/><path d='M22 88c4-18 16-25 28-25s24 7 28 25' fill='%23fbcfe8'/></svg>";
    } else {
      return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%230284c7'/><circle cx='50' cy='38' r='20' fill='%23fed7aa'/><path d='M50 19c-12 0-19 6-19 14 0 4 2 7 5 9 1-5 4-8 14-8s13 3 14 8c3-2 5-5 5-9 0-8-7-14-19-14z' fill='%231e293b'/><circle cx='44' cy='37' r='2.5' fill='%231e293b'/><circle cx='56' cy='37' r='2.5' fill='%231e293b'/><path d='M47 45q3 3 6 0' stroke='%230369a1' stroke-width='1.8' fill='none' stroke-linecap='round'/><path d='M22 88c4-18 16-25 28-25s24 7 28 25' fill='%23bae6fd'/></svg>";
    }
  }

  getPatientPhotoUrl(patient) {
    if (patient && this.isUploadedPhoto(patient.photo)) {
      return patient.photo;
    }
    return this.getPatientAvatar(patient ? patient.gender : 'Female');
  }

  renderPatientAvatar(patient, cssClass = '') {
    const photoUrl = this.getPatientPhotoUrl(patient);
    const altText = patient ? this.escapeHtml(patient.fullName) : 'Patient';
    return `<img src="${photoUrl}" alt="${altText}" class="${cssClass}">`;
  }

  getPatientById(id) {
    return this.patients.find(p => p.id === id);
  }

  getPatientConsultations(patientId) {
    return this.consultations
      .filter(c => c.patientId === patientId)
      .sort((a, b) => new Date(b.date + ' ' + (b.time || '00:00')) - new Date(a.date + ' ' + (a.time || '00:00')));
  }

  getPatientTreatments(patientId) {
    return this.treatments
      .filter(t => t.patientId === patientId)
      .sort((a, b) => new Date(b.treatmentDate + ' ' + (b.startTime || '00:00')) - new Date(a.treatmentDate + ' ' + (a.startTime || '00:00')));
  }

  /* ------------------------------------------------------------------
   * Navigation & View Rendering
   * ------------------------------------------------------------------ */
  navigateTo(viewId, param = null) {
    this.activeView = viewId;
    if (param && viewId === 'patient-chart') {
      this.selectedPatientId = param;
    }

    // Update sidebar nav items
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update views visibility
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSec = document.getElementById(`view-${viewId}`);
    if (targetSec) {
      targetSec.classList.add('active');
    }

    // Close mobile menu if open
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebar-backdrop')?.classList.remove('active');

    // Trigger specific view renderer
    this.renderCurrentView();
  }

  renderCurrentView() {
    switch (this.activeView) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'patients':
        this.renderPatientsList();
        break;
      case 'patient-chart':
        this.renderPatientChart();
        break;
      case 'consultations':
        this.renderConsultationsList();
        break;
      case 'treatments':
        this.renderTreatmentsList();
        break;
      case 'reports':
        this.renderReports();
        break;
      case 'settings':
        // Static cards with buttons
        break;
    }
  }

  render() {
    this.updateCounters();
    this.renderCurrentView();
    this.populatePatientDropdowns();
  }

  updateCounters() {
    const patCount = this.patients.length;
    const consultCount = this.consultations.length;
    const txCount = this.treatments.length;

    const navPat = document.getElementById('nav-patient-count');
    const navCon = document.getElementById('nav-consult-count');
    const navTx = document.getElementById('nav-tx-count');

    if (navPat) navPat.textContent = patCount;
    if (navCon) navCon.textContent = consultCount;
    if (navTx) navTx.textContent = txCount;

    // Dashboard counters
    const dashPat = document.getElementById('stat-total-patients');
    const dashCon = document.getElementById('stat-total-consults');
    const dashTx = document.getElementById('stat-total-tx');
    const activeChemoCount = this.patients.filter(p => (p.status || '').toLowerCase() === 'active').length;

    if (dashPat) dashPat.textContent = patCount;
    if (dashCon) dashCon.textContent = consultCount;
    if (dashTx) dashTx.textContent = txCount;
    
    const activeSub = document.getElementById('stat-active-chemo-sub');
    if (activeSub) activeSub.textContent = `${activeChemoCount} on active chemotherapy`;
  }

  /* ------------------------------------------------------------------
   * View: Dashboard
   * ------------------------------------------------------------------ */
  renderDashboard() {
    // Recent Treatments Table
    const txTable = document.getElementById('dashboard-recent-tx-table');
    if (txTable) {
      const recentTx = [...this.treatments]
        .sort((a, b) => new Date(b.treatmentDate) - new Date(a.treatmentDate))
        .slice(0, 5);

      if (recentTx.length === 0) {
        txTable.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 2rem; color: var(--text-muted);">No treatments logged yet.</td></tr>`;
      } else {
        txTable.innerHTML = recentTx.map(tx => {
          const patient = this.getPatientById(tx.patientId);
          const initials = patient ? patient.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
          return `
            <tr>
              <td>
                <div style="display: flex; align-items: center; gap: 0.65rem;">
                  <div class="patient-avatar-thumb" style="width: 34px; height: 34px;">
                    ${this.renderPatientAvatar(patient)}
                  </div>
                  <div>
                    <span class="patient-link" onclick="app.navigateTo('patient-chart', '${tx.patientId}')">
                      ${patient ? this.escapeHtml(patient.fullName) : 'Unknown Patient'}
                    </span>
                    <div class="patient-mrn">${patient ? patient.mrn : ''}</div>
                  </div>
                </div>
              </td>
              <td>
                <strong>${this.escapeHtml(tx.regimenName || 'Protocol')}</strong>
                <div style="font-size: 0.78rem; color: var(--text-muted);">Cycle ${tx.cycleNumber} of ${tx.cycleTotal || '?'} (Day ${tx.dayOfCycle || 1})</div>
              </td>
              <td>${tx.treatmentDate}</td>
              <td>${this.renderToleranceBadge(tx.toleranceGrade)}</td>
            </tr>
          `;
        }).join('');
      }
    }

    // Consultations Feed
    const consultFeed = document.getElementById('dashboard-consultations-feed');
    if (consultFeed) {
      const recentConsults = [...this.consultations]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 4);

      if (recentConsults.length === 0) {
        consultFeed.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No consultations logged yet.</div>`;
      } else {
        consultFeed.innerHTML = recentConsults.map(c => {
          const patient = this.getPatientById(c.patientId);
          return `
            <div style="padding: 0.75rem 0.85rem; background: #f0fdf4; border: 1.5px solid #86efac; border-left: 5px solid #16a34a; border-radius: 8px; margin-bottom: 0.65rem; display: flex; flex-direction: column; gap: 0.35rem; box-shadow: 0 1px 3px rgba(22, 163, 74, 0.06);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="patient-link" onclick="app.navigateTo('patient-chart', '${c.patientId}')" style="font-weight: 700; color: #166534;">
                  ${patient ? this.escapeHtml(patient.fullName) : 'Unknown'}
                </span>
                <span style="font-size: 0.75rem; color: #15803d; font-weight: 600;">${c.date}</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 2px;">
                <span style="font-size: 0.8rem; color: #14532d; font-weight: 500;">${this.escapeHtml(c.consultationType)}</span>
                ${this.renderClearanceBadge(c.clearanceStatus || c.decision)}
              </div>
              <div style="font-size: 0.8rem; color: #1e293b; background: #ffffff; padding: 0.45rem 0.65rem; border-radius: 4px; margin-top: 2px; border: 1px solid #bbf7d0; line-height: 1.4;">
                ${this.escapeHtml(c.clinicalNotes ? c.clinicalNotes.slice(0, 110) + '...' : 'No notes')}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Safety & Toxicity Alert Items
    const alertBox = document.getElementById('dashboard-toxicity-alerts');
    if (alertBox) {
      // Find patients with low ANC or active dose reductions
      const doseReducedConsults = this.consultations.filter(c => c.clearanceStatus === 'DOSE_REDUCED' || c.doseAdjustmentPercent < 0);
      const lowAncConsults = this.consultations.filter(c => c.labReview && c.labReview.anc && Number(c.labReview.anc) < 1.5);
      const criticalAllergies = this.patients.filter(p => p.allergies && p.allergies.length > 0 && !p.allergies.join(' ').toLowerCase().includes('nkda'));

      let alertsHtml = '<div style="display: flex; flex-direction: column; gap: 0.65rem;">';

      if (lowAncConsults.length > 0) {
        const pat = this.getPatientById(lowAncConsults[0].patientId);
        alertsHtml += `
          <div style="display: flex; align-items: center; justify-content: space-between; background: #fff; padding: 0.65rem 1rem; border-radius: 6px; border-left: 3px solid var(--danger);">
            <div>
              <strong>Hematology Alert (Neutropenia):</strong> Patient <strong>${pat ? pat.fullName : 'Unknown'}</strong> had ANC of ${lowAncConsults[0].labReview.anc} x10⁹/L (Below threshold 1.5).
            </div>
            <button class="btn btn-sm btn-secondary" onclick="app.navigateTo('patient-chart', '${lowAncConsults[0].patientId}')">Review Chart</button>
          </div>
        `;
      }

      if (doseReducedConsults.length > 0) {
        const c = doseReducedConsults[0];
        const pat = this.getPatientById(c.patientId);
        alertsHtml += `
          <div style="display: flex; align-items: center; justify-content: space-between; background: #fff; padding: 0.65rem 1rem; border-radius: 6px; border-left: 3px solid var(--warning);">
            <div>
              <strong>Dose Modification Flag:</strong> <strong>${pat ? pat.fullName : 'Unknown'}</strong> cleared with ${c.doseAdjustmentPercent}% dose adjustment due to peripheral neuropathy.
            </div>
            <button class="btn btn-sm btn-secondary" onclick="app.navigateTo('patient-chart', '${c.patientId}')">Review</button>
          </div>
        `;
      }

      if (criticalAllergies.length > 0) {
        alertsHtml += `
          <div style="display: flex; align-items: center; justify-content: space-between; background: #fff; padding: 0.65rem 1rem; border-radius: 6px; border-left: 3px solid var(--primary);">
            <div>
              <strong>High-Alert Chemo Sensitivities:</strong> ${criticalAllergies.length} active patients flagged with documented drug allergies (e.g. Taxanes, Penicillin, Contrast).
            </div>
            <button class="btn btn-sm btn-secondary" onclick="app.navigateTo('patients')">View Patients</button>
          </div>
        `;
      }

      alertsHtml += '</div>';
      alertBox.innerHTML = alertsHtml;
    }

    // Update Treatment tolerance stat
    const occStat = document.getElementById('stat-tolerance-rate');
    if (occStat) {
      const wellTolerated = this.treatments.filter(t => (t.toleranceGrade || '').toLowerCase().includes('grade 0') || (t.toleranceGrade || '').toLowerCase().includes('well')).length;
      const pct = this.treatments.length > 0 ? Math.round((wellTolerated / this.treatments.length) * 100) : 100;
      occStat.textContent = `${pct}%`;
    }
  }

  /* ------------------------------------------------------------------
   * View: Patients Directory (CRUD)
   * ------------------------------------------------------------------ */
  renderPatientsList() {
    const tableBody = document.getElementById('patient-table-body');
    if (!tableBody) return;

    const searchTerm = (document.getElementById('patient-search-filter')?.value || '').toLowerCase().trim();
    const cancerFilter = document.getElementById('patient-cancer-filter')?.value || '';
    const statusFilter = document.getElementById('patient-status-filter')?.value || '';

    const filtered = this.patients.filter(p => {
      const matchesSearch = !searchTerm ||
        (p.fullName && p.fullName.toLowerCase().includes(searchTerm)) ||
        (p.lastName && p.lastName.toLowerCase().includes(searchTerm)) ||
        (p.firstName && p.firstName.toLowerCase().includes(searchTerm)) ||
        (p.middleName && p.middleName.toLowerCase().includes(searchTerm)) ||
        (p.registrationDate && p.registrationDate.toLowerCase().includes(searchTerm)) ||
        p.mrn.toLowerCase().includes(searchTerm) ||
        (p.philhealthNo && p.philhealthNo.toLowerCase().includes(searchTerm)) ||
        (p.residentialAddress && p.residentialAddress.toLowerCase().includes(searchTerm)) ||
        (p.civilStatus && p.civilStatus.toLowerCase().includes(searchTerm)) ||
        (p.religion && p.religion.toLowerCase().includes(searchTerm)) ||
        (p.primaryDiagnosis && p.primaryDiagnosis.toLowerCase().includes(searchTerm)) ||
        (p.primaryOncologist && p.primaryOncologist.toLowerCase().includes(searchTerm));

      let matchesCancer = true;
      if (cancerFilter) {
        if (cancerFilter === 'Other') {
          matchesCancer = p.cancerType === 'Oncology Evaluation' || p.cancerType === 'Other';
        } else if (cancerFilter.toLowerCase() === 'not specified') {
          const ct = (p.cancerType || '').toLowerCase().trim();
          matchesCancer = !ct || ct === 'not specified' || ct === 'unspecified' || ct === 'unknown';
        } else {
          matchesCancer = p.cancerType && p.cancerType.toLowerCase().includes(cancerFilter.toLowerCase());
        }
      }

      let matchesStatus = true;
      if (statusFilter) {
        matchesStatus = (p.status || '').toLowerCase() === statusFilter.toLowerCase();
      }

      return matchesSearch && matchesCancer && matchesStatus;
    });

    // Update count label
    const countLabel = document.getElementById('patient-filtered-count');
    if (countLabel) {
      countLabel.textContent = `Showing ${filtered.length} of ${this.patients.length} patients`;
    }

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="14" style="text-align: center; padding: 3rem;">
            <div class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
              <h4>No Patients Found</h4>
              <p>Try adjusting your search filters or register a new patient.</p>
              <button class="btn btn-primary" style="margin-top: 1rem;" onclick="app.openNewPatientModal()">+ Register Patient</button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filtered.map(patient => {
      const regDate = patient.registrationDate || (patient.createdAt ? patient.createdAt.slice(0, 10) : '—');
      const lName = patient.lastName || (patient.fullName.includes(',') ? patient.fullName.split(',')[0].trim() : patient.fullName);
      const fName = patient.firstName || (patient.fullName.includes(',') ? patient.fullName.split(',')[1]?.trim().split(' ')[0] : patient.fullName);
      const mName = patient.middleName || '';
      const initials = ((patient.firstName ? patient.firstName[0] : '') + (patient.lastName ? patient.lastName[0] : '') || patient.fullName.slice(0, 2)).toUpperCase();

      return `
        <tr>
          <td>
            <span style="font-weight: 600; font-size: 0.82rem; color: var(--text-dark);">${regDate}</span>
          </td>
          <td>
            <span class="patient-mrn">${patient.mrn}</span>
            ${patient.philhealthNo ? `
              <div style="font-size: 0.72rem; color: #0284c7; font-weight: 600; margin-top: 2px;" title="PhilHealth Identification Number">
                PIN: ${this.escapeHtml(patient.philhealthNo)}
              </div>
            ` : ''}
          </td>
          <td>
            <div class="patient-table-cell-profile">
              <div class="patient-avatar-thumb">
                ${this.renderPatientAvatar(patient)}
              </div>
              <div>
                <a class="patient-link" onclick="app.navigateTo('patient-chart', '${patient.id}')" style="font-weight: 700;">
                  ${this.escapeHtml(lName)}
                </a>
              </div>
            </div>
          </td>
          <td>
            <a class="patient-link" onclick="app.navigateTo('patient-chart', '${patient.id}')" style="font-weight: 600;">
              ${this.escapeHtml(fName)}
            </a>
          </td>
          <td>
            <span style="font-size: 0.85rem; color: ${mName ? 'var(--text-dark)' : 'var(--text-muted)'};">
              ${this.escapeHtml(mName || '—')}
            </span>
          </td>
          <td>
            <div style="max-width: 200px; font-size: 0.8rem; line-height: 1.35; color: var(--text-dark);" title="${this.escapeHtml(patient.residentialAddress || '')}">
              ${patient.residentialAddress ? this.escapeHtml(patient.residentialAddress) : '<span style="color: var(--text-muted);">—</span>'}
            </div>
          </td>
          <td>
            <span style="white-space: nowrap;">${patient.age || this.calculateAge(patient.dob)} yrs / ${patient.gender || '-'}</span>
          </td>
          <td>
            <span style="font-weight: 600; font-size: 0.82rem; color: var(--text-dark);">${this.escapeHtml(patient.civilStatus || patient.maritalStatus || 'Single')}</span>
          </td>
          <td>
            <span style="font-size: 0.82rem; color: var(--text-dark);">${this.escapeHtml(patient.religion || 'Not specified')}</span>
          </td>
          <td>
            <strong>${this.escapeHtml(patient.cancerType || 'Cancer')}</strong>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${this.escapeHtml(patient.stage || 'Unstaged')}</div>
          </td>
          <td>
            <span style="font-weight: 600; font-size: 0.82rem;">${this.escapeHtml(patient.activeRegimen || 'TBD')}</span>
            <div style="font-size: 0.75rem; color: var(--text-muted);">
              Cycle ${patient.cyclesCompleted || 0} / ${patient.cyclesPlanned || '?'}
            </div>
          </td>
          <td>
            <strong>${patient.bsa || '--'} m²</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${patient.weightKg || '--'} kg</div>
          </td>
          <td>${this.renderStatusBadge(patient.status)}</td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-sm btn-secondary" onclick="app.navigateTo('patient-chart', '${patient.id}')" title="Open Medical Chart">
              View Chart
            </button>
            <button class="btn btn-sm btn-ghost" onclick="app.openEditPatientModal('${patient.id}')" title="Edit Patient Details">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
            <button class="btn btn-sm btn-ghost" style="color: var(--danger);" onclick="app.openDeletePatientModal('${patient.id}')" title="Delete Patient Record">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  /* ------------------------------------------------------------------
   * View: Patient 360° EHR Chart
   * ------------------------------------------------------------------ */
  renderPatientChart() {
    const patient = this.getPatientById(this.selectedPatientId);
    if (!patient) {
      this.navigateTo('patients');
      return;
    }

    const hero = document.getElementById('patient-chart-hero');
    const allergyBanner = document.getElementById('chart-allergy-banner');
    const allergyText = document.getElementById('chart-allergy-text');

    const allergies = Array.isArray(patient.allergies) ? patient.allergies : [patient.allergies || 'NKDA'];
    const hasCriticalAllergy = allergies.some(a => a && !a.toLowerCase().includes('nkda'));

    if (allergyBanner) {
      if (hasCriticalAllergy) {
        allergyBanner.style.display = 'flex';
        allergyText.innerHTML = `<strong>CRITICAL ALLERGY ALERT:</strong> Documented sensitivity to <u>${this.escapeHtml(allergies.join(', '))}</u>. Cross-check all premedications and chemotherapeutic diluents.`;
      } else {
        allergyBanner.style.display = 'none';
      }
    }

    if (hero) {
      const initials = patient.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      hero.innerHTML = `
        <div class="chart-hero">
          <div style="display: flex; gap: 1.25rem; align-items: center;">
            <div class="chart-avatar">
              ${this.renderPatientAvatar(patient)}
            </div>
            <div class="chart-identity">
              <h2>${this.escapeHtml(patient.fullName)}</h2>
              <div class="chart-meta-row">
                <span>MRN: <strong style="color: #38bdf8;">${patient.mrn}</strong></span>
                ${patient.philhealthNo ? `<span>PhilHealth: <strong style="color: #4ade80;">${this.escapeHtml(patient.philhealthNo)}</strong></span>` : ''}
                <span>DOB: ${patient.dob} (${patient.age || this.calculateAge(patient.dob)} yrs, ${patient.gender})</span>
                <span>Civil Status: <strong>${this.escapeHtml(patient.civilStatus || patient.maritalStatus || 'Single')}</strong></span>
                <span>Religion: <strong>${this.escapeHtml(patient.religion || 'Not specified')}</strong></span>
                <span>Blood: <strong>${patient.bloodType || 'Unknown'}</strong></span>
                ${patient.residentialAddress ? `<span>📍 <span style="color: #f1f5f9;">${this.escapeHtml(patient.residentialAddress)}</span></span>` : ''}
                <span>Oncologist: ${this.escapeHtml(patient.primaryOncologist || 'Not assigned')}</span>
              </div>
            </div>
          </div>
          <div>
            ${this.renderStatusBadge(patient.status)}
          </div>
        </div>

        <div class="chart-metrics-strip">
          <div class="chart-metric-item">
            <span class="label">Primary Diagnosis</span>
            <span class="val" style="font-size: 1rem;">${this.escapeHtml(patient.primaryDiagnosis || patient.cancerType)}</span>
          </div>
          <div class="chart-metric-item">
            <span class="label">Staging</span>
            <span class="val">${this.escapeHtml(patient.stage || 'N/A')}</span>
          </div>
          <div class="chart-metric-item">
            <span class="label">Body Surface Area (BSA)</span>
            <span class="val" style="color: #38bdf8;">${patient.bsa || '--'} m²</span>
          </div>
          <div class="chart-metric-item">
            <span class="label">Weight / Height</span>
            <span class="val">${patient.weightKg || '--'} kg / ${patient.heightCm || '--'} cm</span>
          </div>
          <div class="chart-metric-item">
            <span class="label">Chemo Protocol</span>
            <span class="val" style="font-size: 1rem;">${this.escapeHtml(patient.activeRegimen || 'None')}</span>
          </div>
          <div class="chart-metric-item">
            <span class="label">Cycle Progress</span>
            <span class="val">${patient.cyclesCompleted || 0} / ${patient.cyclesPlanned || '?'}</span>
          </div>
        </div>
      `;
    }

    // Set chart quick buttons
    const btnChartConsult = document.getElementById('btn-chart-log-consult');
    const btnChartTx = document.getElementById('btn-chart-log-tx');
    const btnChartEdit = document.getElementById('btn-chart-edit-patient');

    if (btnChartConsult) {
      btnChartConsult.onclick = () => this.openNewConsultModal(patient.id);
    }
    if (btnChartTx) {
      btnChartTx.onclick = () => this.openNewTreatmentModal(patient.id);
    }
    if (btnChartEdit) {
      btnChartEdit.onclick = () => this.openEditPatientModal(patient.id);
    }

    // Update tab badges
    const consults = this.getPatientConsultations(patient.id);
    const treatments = this.getPatientTreatments(patient.id);

    const consultBadge = document.getElementById('chart-tab-consult-count');
    const txBadge = document.getElementById('chart-tab-tx-count');
    if (consultBadge) consultBadge.textContent = consults.length;
    if (txBadge) txBadge.textContent = treatments.length;

    // Render active tab contents
    this.renderChartActiveTab(patient, consults, treatments);
  }

  renderChartActiveTab(patient, consults, treatments) {
    // 1. Full Medical Timeline Tab
    const timelineContainer = document.getElementById('chart-timeline-container');
    if (timelineContainer) {
      // Combine all chronological events
      const allEvents = [
        ...consults.map(c => ({ type: 'consultation', date: c.date, data: c })),
        ...treatments.map(t => ({ type: 'treatment', date: t.treatmentDate, data: t }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      // Update counters in timeline view toolbar
      const countAllEl = document.getElementById('timeline-count-all');
      if (countAllEl) countAllEl.textContent = allEvents.length;
      const countConsultEl = document.getElementById('timeline-count-consult');
      if (countConsultEl) countConsultEl.textContent = consults.length;
      const countTxEl = document.getElementById('timeline-count-tx');
      if (countTxEl) countTxEl.textContent = treatments.length;

      // Filter events based on active timeline filter ('all', 'consultation', or 'treatment')
      const currentFilter = this.timelineFilter || 'all';
      const events = currentFilter === 'all' ? allEvents : allEvents.filter(e => e.type === currentFilter);

      // Sync active state on toolbar buttons
      document.querySelectorAll('.timeline-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-timeline-filter') === currentFilter);
      });

      if (events.length === 0) {
        timelineContainer.innerHTML = `
          <div class="empty-state">
            <h4>No Clinical Events Found</h4>
            <p>${currentFilter === 'all' ? 'Start by recording a pre-chemo consultation or chemotherapy infusion session.' : `No ${currentFilter === 'consultation' ? 'consultations' : 'chemotherapy infusions'} found for this patient.`}</p>
          </div>
        `;
      } else {
        timelineContainer.innerHTML = events.map(evt => {
          if (evt.type === 'consultation') {
            const c = evt.data;
            return `
              <div class="timeline-item timeline-item-consultation">
                <div class="timeline-marker" style="background-color: #16a34a !important; box-shadow: 0 0 0 2px #16a34a !important;"></div>
                <div class="timeline-card timeline-card-consultation" style="background-color: #f0fdf4 !important; border: 1.5px solid #86efac !important; border-left: 6px solid #16a34a !important; border-radius: var(--radius-md); padding: 1.25rem; box-shadow: 0 2px 8px rgba(22, 163, 74, 0.08);">
                  <div class="timeline-card-header">
                    <div>
                      <div class="timeline-title" style="color: #14532d; font-size: 1.05rem; font-weight: 700;">🩺 Consultation: ${this.escapeHtml(c.consultationType)}</div>
                      <div style="font-size: 0.8rem; color: #166534; font-weight: 500; margin-top: 2px;">
                        Attending: <strong>${this.escapeHtml(c.oncologist || 'Dr. Evelyn Reed, MD')}</strong> | Vitals: BP ${c.vitals?.bp || '-'}, Wt: ${c.vitals?.weightKg || '-'}kg, ECOG: ${c.vitals?.ecogScore ?? '-'}
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.45rem;">
                      <div style="text-align: right; margin-right: 0.25rem;">
                        <div class="timeline-date" style="font-weight: 600; color: #15803d;">${c.date} ${c.time || ''}</div>
                        ${this.renderClearanceBadge(c.clearanceStatus || c.decision)}
                      </div>
                      <button class="btn btn-sm btn-view-event" onclick="app.viewTimelineEvent('consultation', '${c.id}')" title="View Full Consultation Details">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"/><circle cx="12" cy="7" r="3"/></svg>
                        <span>View</span>
                      </button>
                      <button class="btn btn-sm btn-outline" onclick="app.requestEditConsultation('${c.id}')" title="Edit Consultation">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        <span>Edit</span>
                      </button>
                      <button class="btn btn-sm btn-ghost" style="color: var(--danger);" onclick="app.requestDeleteConsultation('${c.id}')" title="Delete Consultation">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </div>
                  <div style="font-size: 0.875rem; color: #1e293b; margin-bottom: 0.5rem; line-height: 1.45;">
                    ${this.escapeHtml(c.clinicalNotes || '')}
                  </div>
                  ${c.managementPlan ? `
                    <div style="background-color: #ffffff; border-left: 3.5px solid #16a34a; padding: 0.55rem 0.85rem; font-size: 0.825rem; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                      <strong style="color: #166534;">Management Plan:</strong> ${this.escapeHtml(c.managementPlan)}
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          } else {
            const t = evt.data;
            return `
              <div class="timeline-item timeline-item-treatment">
                <div class="timeline-marker" style="background-color: #eab308 !important; box-shadow: 0 0 0 2px #eab308 !important;"></div>
                <div class="timeline-card timeline-card-treatment" style="background-color: #fefce8 !important; border: 1.5px solid #fde047 !important; border-left: 6px solid #eab308 !important; border-radius: var(--radius-md); padding: 1.25rem; box-shadow: 0 2px 8px rgba(234, 179, 8, 0.12);">
                  <div class="timeline-card-header">
                    <div>
                      <div class="timeline-title" style="color: #713f12; font-size: 1.05rem; font-weight: 700;">💉 Chemotherapy Infusion: ${this.escapeHtml(t.regimenName)} (Cycle ${t.cycleNumber} of ${t.cycleTotal || '?'})</div>
                      <div style="font-size: 0.8rem; color: #854d0e; font-weight: 500; margin-top: 2px;">
                        Nurse: <strong>${this.escapeHtml(t.supervisingNurse || 'Nurse')}</strong> | Oncologist: ${this.escapeHtml(t.attendingOncologist || '')}
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.45rem;">
                      <div style="text-align: right; margin-right: 0.25rem;">
                        <div class="timeline-date" style="font-weight: 600; color: #a16207;">${t.treatmentDate} ${t.startTime ? `${t.startTime} - ${t.endTime || ''}` : ''}</div>
                        ${this.renderToleranceBadge(t.toleranceGrade)}
                      </div>
                      <button class="btn btn-sm btn-view-event" onclick="app.viewTimelineEvent('treatment', '${t.id}')" title="View Full Infusion Details">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"/><circle cx="12" cy="7" r="3"/></svg>
                        <span>View</span>
                      </button>
                      <button class="btn btn-sm btn-outline" onclick="app.requestEditTreatment('${t.id}')" title="Edit Chemo Infusion">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        <span>Edit</span>
                      </button>
                      <button class="btn btn-sm btn-ghost" style="color: var(--danger);" onclick="app.requestDeleteTreatment('${t.id}')" title="Delete Chemo Infusion">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </div>

                  <!-- Administered Drugs Table -->
                  ${Array.isArray(t.drugsAdministered) && t.drugsAdministered.length > 0 ? `
                    <div style="margin: 0.6rem 0; font-size: 0.8rem; background: #ffffff; border: 1px solid #fef08a; border-radius: 6px; padding: 0.55rem 0.85rem; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                      <strong style="color: #854d0e;">Administered Agents:</strong>
                      <ul style="margin-left: 1.25rem; margin-top: 0.25rem;">
                        ${t.drugsAdministered.map(d => `<li><strong>${this.escapeHtml(d.drugName)}</strong>: Actual dose <u>${this.escapeHtml(d.actualDose || d.plannedDose)}</u> via ${this.escapeHtml(d.route || 'IV')}</li>`).join('')}
                      </ul>
                    </div>
                  ` : ''}

                  <div style="font-size: 0.85rem; color: #451a03;">
                    <strong style="color: #713f12;">Tolerance:</strong> ${this.escapeHtml(t.adverseReactions || 'Infusion well tolerated.')}
                  </div>
                </div>
              </div>
            `;
          }
        }).join('');
      }
    }

    // 2. Consultations Tab
    const consultContainer = document.getElementById('chart-consultations-container');
    if (consultContainer) {
      if (consults.length === 0) {
        consultContainer.innerHTML = `<div class="empty-state"><h4>No Consultations Logged</h4><p>Click "+ Log Consultation" to create the first medical evaluation.</p></div>`;
      } else {
        consultContainer.innerHTML = consults.map(c => `
          <div class="panel consultation-panel consultation-card-container" style="margin-bottom: 1.25rem; background-color: #f0fdf4 !important; border: 1.5px solid #86efac !important; border-left: 6px solid #16a34a !important; border-radius: var(--radius-md); box-shadow: 0 2px 8px rgba(22, 163, 74, 0.08);">
            <div class="panel-header" style="background: #dcfce7; border-bottom: 1.5px solid #bbf7d0;">
              <div>
                <div class="panel-title" style="color: #14532d; font-size: 1.05rem; font-weight: 700;">🌿 ${this.escapeHtml(c.consultationType)}</div>
                <div style="font-size: 0.8rem; color: #166534; font-weight: 500;">${c.date} at ${c.time || 'Clinic'} | Attending: <strong>${this.escapeHtml(c.oncologist)}</strong></div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.45rem;">
                ${this.renderClearanceBadge(c.clearanceStatus || c.decision)}
                <button class="btn btn-sm btn-view-event" onclick="app.viewConsultation('${c.id}')" title="View Full Consultation Details">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"/><circle cx="12" cy="7" r="3"/></svg>
                  <span>View</span>
                </button>
                <button class="btn btn-sm btn-outline" onclick="app.requestEditConsultation('${c.id}')" title="Edit Consultation">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  <span>Edit</span>
                </button>
                <button class="btn btn-sm btn-ghost" style="color: var(--danger);" onclick="app.requestDeleteConsultation('${c.id}')" title="Delete Consultation">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
            <div class="panel-body" style="padding: 1.25rem;">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; background: #ffffff; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #bbf7d0;">
                <div><strong>BP:</strong> ${c.vitals?.bp || 'N/A'} mmHg</div>
                <div><strong>Pulse:</strong> ${c.vitals?.pulse || 'N/A'} bpm</div>
                <div><strong>Temp:</strong> ${c.vitals?.tempC || 'N/A'} °C</div>
                <div><strong>Weight:</strong> ${c.vitals?.weightKg || 'N/A'} kg</div>
                <div><strong>ANC:</strong> <span style="font-weight: 700; color: ${c.labReview?.anc < 1.5 ? 'var(--danger)' : '#166534'}">${c.labReview?.anc ?? 'N/A'} x10⁹/L</span></div>
                <div><strong>Platelets:</strong> ${c.labReview?.platelets ?? 'N/A'} x10⁹/L</div>
              </div>
              
              <div style="margin-bottom: 0.75rem;">
                <strong style="color: #14532d;">Clinical Notes:</strong>
                <p style="font-size: 0.9rem; margin-top: 0.25rem; color: #1e293b; line-height: 1.5;">${this.escapeHtml(c.clinicalNotes)}</p>
              </div>

              ${c.toxicityGrading ? `
                <div style="margin-bottom: 0.75rem; font-size: 0.85rem; background: #ffffff; padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid #fed7aa;">
                  <strong style="color: #c2410c;">Documented Toxicities:</strong> ${typeof c.toxicityGrading === 'string' ? this.escapeHtml(c.toxicityGrading) : Object.entries(c.toxicityGrading).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(' | ')}
                </div>
              ` : ''}

              <div style="background-color: #ffffff; border-left: 4px solid #16a34a; padding: 0.85rem 1rem; border-radius: 4px; font-size: 0.875rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                <strong style="color: #166534;">Management & Chemotherapy Orders:</strong>
                <p style="margin-top: 0.25rem; white-space: pre-line; color: #14532d;">${this.escapeHtml(c.managementPlan || 'Proceed as planned.')}</p>
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    // 3. Treatments Tab
    const txContainer = document.getElementById('chart-treatments-container');
    if (txContainer) {
      if (treatments.length === 0) {
        txContainer.innerHTML = `<div class="empty-state"><h4>No Chemotherapy Infusions Logged</h4><p>Click "+ Log Chemo Infusion" to log an administered cycle.</p></div>`;
      } else {
        txContainer.innerHTML = treatments.map(t => `
          <div class="panel treatment-panel treatment-card-container" style="margin-bottom: 1.25rem; background-color: #fefce8 !important; border: 1.5px solid #fde047 !important; border-left: 6px solid #eab308 !important; border-radius: var(--radius-md); box-shadow: 0 2px 8px rgba(234, 179, 8, 0.12);">
            <div class="panel-header" style="background: #fef08a; border-bottom: 1.5px solid #fde047;">
              <div>
                <div class="panel-title" style="color: #713f12; font-size: 1.05rem; font-weight: 700;">
                  🟡 ${this.escapeHtml(t.regimenName)} - Cycle ${t.cycleNumber} of ${t.cycleTotal || '?'} (Day ${t.dayOfCycle || 1})
                </div>
                <div style="font-size: 0.8rem; color: #854d0e; font-weight: 500;">${t.treatmentDate} ${t.startTime ? `(${t.startTime} - ${t.endTime || ''})` : ''} | Nurse: <strong>${this.escapeHtml(t.supervisingNurse || '')}</strong></div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.45rem;">
                ${this.renderToleranceBadge(t.toleranceGrade)}
                <button class="btn btn-sm btn-view-event" onclick="app.viewTreatment('${t.id}')" title="View Full Infusion Details">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"/><circle cx="12" cy="7" r="3"/></svg>
                  <span>View</span>
                </button>
                <button class="btn btn-sm btn-outline" onclick="app.requestEditTreatment('${t.id}')" title="Edit Chemotherapy Treatment">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  <span>Edit</span>
                </button>
                <button class="btn btn-sm btn-ghost" style="color: var(--danger);" onclick="app.requestDeleteTreatment('${t.id}')" title="Delete Chemotherapy Treatment">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
            <div class="panel-body" style="padding: 1.25rem;">
              ${t.premedsGiven ? `
                <div style="margin-bottom: 0.75rem; font-size: 0.85rem; background: #ffffff; padding: 0.65rem 0.85rem; border-radius: 6px; border: 1px solid #fef08a;">
                  <strong style="color: #854d0e;">Pre-Medications Administered:</strong>
                  <div style="color: #475569; margin-top: 0.2rem;">
                    ${Array.isArray(t.premedsGiven) ? t.premedsGiven.map(p => `${p.name} (${p.dose})`).join(', ') : this.escapeHtml(t.premedsGiven)}
                  </div>
                </div>
              ` : ''}

              <!-- Drugs Table -->
              <div class="table-responsive" style="margin-bottom: 1rem; background: #ffffff; border-radius: 6px; border: 1px solid #fef08a;">
                <table class="data-table" style="font-size: 0.8rem; margin: 0;">
                  <thead style="background: #fef9c3;">
                    <tr>
                      <th style="color: #713f12;">Agent / Drug Name</th>
                      <th style="color: #713f12;">Planned Dose</th>
                      <th style="color: #713f12;">Actual Dose</th>
                      <th style="color: #713f12;">Route</th>
                      <th style="color: #713f12;">Dual Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(t.drugsAdministered || []).map(d => `
                      <tr>
                        <td><strong>${this.escapeHtml(d.drugName)}</strong></td>
                        <td>${this.escapeHtml(d.plannedDose || '-')}</td>
                        <td><span style="font-weight: 700; color: #15803d;">${this.escapeHtml(d.actualDose || d.plannedDose || '-')}</span></td>
                        <td>${this.escapeHtml(d.route || 'IV')}</td>
                        <td><span class="badge badge-success">✓ Verified</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #854d0e; border-top: 1px solid #fde047; padding-top: 0.75rem; background: #ffffff; padding: 0.5rem 0.75rem; border-radius: 4px;">
                <div><strong>IV Access:</strong> ${this.escapeHtml(t.ivAccessSite || 'Port-A-Cath')}</div>
                <div><strong>Next Cycle:</strong> ${t.nextCycleDate || 'Scheduled in clinic'}</div>
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    // 4. Clinical Details Tab
    const profileContainer = document.getElementById('chart-profile-details');
    if (profileContainer) {
      profileContainer.innerHTML = `
        <div class="form-grid">
          <div><strong>MRN:</strong> ${patient.mrn}</div>
          <div><strong>PhilHealth PIN:</strong> <span class="badge badge-info">${this.escapeHtml(patient.philhealthNo || 'Not provided')}</span></div>
          <div><strong>Biological Sex:</strong> ${patient.gender}</div>
          <div><strong>Date of Birth:</strong> ${patient.dob} (${patient.age} yrs)</div>
          <div><strong>Civil Status:</strong> ${this.escapeHtml(patient.civilStatus || patient.maritalStatus || 'Single')}</div>
          <div><strong>Religion:</strong> ${this.escapeHtml(patient.religion || 'Not specified')}</div>
          <div><strong>Blood Type:</strong> ${patient.bloodType || 'Unknown'}</div>
          <div><strong>Contact Phone:</strong> ${patient.phone || 'Not recorded'}</div>
          <div><strong>Email Address:</strong> ${patient.email || 'Not recorded'}</div>
          <div class="col-span-2"><strong>Residential Address:</strong> ${this.escapeHtml(patient.residentialAddress || 'Not recorded')}</div>
          <div class="col-span-2"><strong>Emergency Contact:</strong> ${typeof patient.emergencyContact === 'object' ? `${patient.emergencyContact.name} (${patient.emergencyContact.relationship}) - ${patient.emergencyContact.phone}` : (patient.emergencyContact || 'None')}</div>
          
          <div class="form-section-heading">Clinical Oncology Markers</div>
          <div><strong>Primary Malignancy:</strong> ${this.escapeHtml(patient.cancerType)}</div>
          <div><strong>Staging:</strong> ${this.escapeHtml(patient.stage)}</div>
          <div class="col-span-2"><strong>Histology & Molecular Markers:</strong> ${this.escapeHtml(patient.histologyMarkers || 'Not specified')}</div>
          <div><strong>Treatment Intent:</strong> ${this.escapeHtml(patient.treatmentIntent || 'Adjuvant')}</div>
          <div><strong>ECOG Baseline:</strong> ${patient.ecogBaseline ?? 0}</div>

          <div class="form-section-heading">Dosing & Anthropometrics</div>
          <div><strong>Height:</strong> ${patient.heightCm} cm</div>
          <div><strong>Weight:</strong> ${patient.weightKg} kg</div>
          <div><strong>Body Surface Area (BSA):</strong> <strong>${patient.bsa} m²</strong></div>
          <div><strong>Body Mass Index (BMI):</strong> ${patient.bmi || this.calculateBMI(patient.heightCm, patient.weightKg)} kg/m²</div>

          <div class="form-section-heading">Safety & Allergies</div>
          <div class="col-span-2"><strong>Known Allergies:</strong> ${this.escapeHtml(allergies.join(', '))}</div>
          <div class="col-span-2"><strong>Comorbidities:</strong> ${Array.isArray(patient.comorbidities) ? patient.comorbidities.join(', ') : (patient.comorbidities || 'None')}</div>
        </div>
      `;
    }
  }

  /* ------------------------------------------------------------------
   * View: Consultations
   * ------------------------------------------------------------------ */
  renderConsultationsList() {
    const tableBody = document.getElementById('consultations-table-body');
    if (!tableBody) return;

    const searchTerm = (document.getElementById('consult-search-filter')?.value || '').toLowerCase().trim();
    const decisionFilter = document.getElementById('consult-decision-filter')?.value || '';
    const patientFilter = document.getElementById('consult-patient-filter')?.value || '';

    const filtered = this.consultations.filter(c => {
      const patient = this.getPatientById(c.patientId);
      const patName = patient ? patient.fullName.toLowerCase() : '';
      const patMrn = patient ? patient.mrn.toLowerCase() : '';

      const matchesSearch = !searchTerm ||
        patName.includes(searchTerm) ||
        patMrn.includes(searchTerm) ||
        (c.oncologist && c.oncologist.toLowerCase().includes(searchTerm)) ||
        (c.clinicalNotes && c.clinicalNotes.toLowerCase().includes(searchTerm));

      const matchesDecision = !decisionFilter || (c.clearanceStatus === decisionFilter);
      const matchesPatient = !patientFilter || c.patientId === patientFilter;

      return matchesSearch && matchesDecision && matchesPatient;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    const countLabel = document.getElementById('consult-count-label');
    if (countLabel) countLabel.textContent = `${filtered.length} Consultations`;

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2.5rem;">
            <div class="empty-state">
              <h4>No Consultations Found</h4>
              <p>Try adjusting your search criteria or log a new oncological consultation.</p>
              <button class="btn btn-primary" style="margin-top: 1rem;" onclick="app.openNewConsultModal()">+ Log Consultation</button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filtered.map(c => {
      const patient = this.getPatientById(c.patientId);
      return `
        <tr style="border-left: 4px solid #16a34a;">
          <td>
            <strong>${c.date}</strong>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${c.time || 'Clinic'}</div>
          </td>
          <td>
            <span class="patient-link" onclick="app.navigateTo('patient-chart', '${c.patientId}')">
              ${patient ? this.escapeHtml(patient.fullName) : 'Unknown'}
            </span>
            <div class="patient-mrn">${patient ? patient.mrn : ''}</div>
          </td>
          <td>${this.escapeHtml(c.oncologist || '-')}</td>
          <td><span style="font-size: 0.8rem; font-weight: 500;">${this.escapeHtml(c.consultationType)}</span></td>
          <td>
            <div>BP: ${c.vitals?.bp || '-'} | Wt: ${c.vitals?.weightKg || '-'}kg</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">
              ANC: <strong style="color: ${c.labReview?.anc < 1.5 ? 'var(--danger)' : 'inherit'}">${c.labReview?.anc ?? '-'}</strong> | Plt: ${c.labReview?.platelets ?? '-'}
            </div>
          </td>
          <td>${this.renderClearanceBadge(c.clearanceStatus || c.decision)}</td>
          <td style="max-width: 280px; font-size: 0.8rem; color: var(--text-muted);">
            ${this.escapeHtml(c.managementPlan ? c.managementPlan.slice(0, 90) + '...' : (c.clinicalNotes ? c.clinicalNotes.slice(0, 90) + '...' : '-'))}
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-sm btn-view-event" onclick="app.viewConsultation('${c.id}')" title="View Full Consultation Details">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"/><circle cx="12" cy="7" r="3"/></svg>
              <span>View</span>
            </button>
            <button class="btn btn-sm btn-secondary" onclick="app.navigateTo('patient-chart', '${c.patientId}')" title="View Patient Chart">
              Chart
            </button>
            <button class="btn btn-sm btn-outline" onclick="app.requestEditConsultation('${c.id}')" title="Edit Consultation">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              <span>Edit</span>
            </button>
            <button class="btn btn-sm btn-ghost" style="color: var(--danger);" onclick="app.requestDeleteConsultation('${c.id}')" title="Delete Consultation">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  /* ------------------------------------------------------------------
   * View: Chemotherapy Treatments
   * ------------------------------------------------------------------ */
  renderTreatmentsList() {
    const tableBody = document.getElementById('treatments-table-body');
    if (!tableBody) return;

    const searchTerm = (document.getElementById('tx-search-filter')?.value || '').toLowerCase().trim();
    const patientFilter = document.getElementById('tx-patient-filter')?.value || '';
    const regimenFilter = document.getElementById('tx-regimen-filter')?.value || '';

    const filtered = this.treatments.filter(t => {
      const patient = this.getPatientById(t.patientId);
      const patName = patient ? patient.fullName.toLowerCase() : '';
      const patMrn = patient ? patient.mrn.toLowerCase() : '';

      const matchesSearch = !searchTerm ||
        patName.includes(searchTerm) ||
        patMrn.includes(searchTerm) ||
        (t.regimenName && t.regimenName.toLowerCase().includes(searchTerm)) ||
        (t.supervisingNurse && t.supervisingNurse.toLowerCase().includes(searchTerm));

      const matchesPatient = !patientFilter || t.patientId === patientFilter;
      const matchesRegimen = !regimenFilter || (t.regimenId === regimenFilter || (t.regimenName && t.regimenName.toLowerCase().includes(regimenFilter.toLowerCase())));

      return matchesSearch && matchesPatient && matchesRegimen;
    }).sort((a, b) => new Date(b.treatmentDate) - new Date(a.treatmentDate));

    const countLabel = document.getElementById('tx-count-label');
    if (countLabel) countLabel.textContent = `${filtered.length} Treatments`;

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2.5rem;">
            <div class="empty-state">
              <h4>No Chemotherapy Treatments Found</h4>
              <p>Log administered infusions to keep track of cycle completion and premedication safety.</p>
              <button class="btn btn-primary" style="margin-top: 1rem;" onclick="app.openNewTreatmentModal()">+ Log Chemo Treatment</button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filtered.map(t => {
      const patient = this.getPatientById(t.patientId);
      const drugsCount = Array.isArray(t.drugsAdministered) ? t.drugsAdministered.length : 0;
      const drugsNames = Array.isArray(t.drugsAdministered) ? t.drugsAdministered.map(d => d.drugName).join(', ') : '';
      const initials = patient ? patient.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';

      return `
        <tr style="border-left: 4px solid #eab308;">
          <td>
            <strong>${t.treatmentDate}</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${t.startTime || ''} ${t.endTime ? `- ${t.endTime}` : ''}</div>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div class="patient-avatar-thumb" style="width: 34px; height: 34px;">
                ${this.renderPatientAvatar(patient)}
              </div>
              <div>
                <span class="patient-link" onclick="app.navigateTo('patient-chart', '${t.patientId}')">
                  ${patient ? this.escapeHtml(patient.fullName) : 'Unknown'}
                </span>
                <div class="patient-mrn">${patient ? patient.mrn : ''}</div>
              </div>
            </div>
          </td>
          <td>
            <strong>${this.escapeHtml(t.regimenName || 'Protocol')}</strong>
          </td>
          <td>
            <span class="badge badge-warning">Cycle ${t.cycleNumber} of ${t.cycleTotal || '?'}</span>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Day ${t.dayOfCycle || 1}</div>
          </td>
          <td style="max-width: 220px;">
            <div style="font-size: 0.82rem; font-weight: 600;">${drugsCount} agent(s) administered</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(drugsNames)}">${this.escapeHtml(drugsNames)}</div>
          </td>
          <td>
            <div style="font-size: 0.82rem;">${this.escapeHtml(t.supervisingNurse || '-')}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${this.escapeHtml(t.attendingOncologist || '')}</div>
          </td>
          <td>${this.renderToleranceBadge(t.toleranceGrade)}</td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-sm btn-view-event" onclick="app.viewTreatment('${t.id}')" title="View Full Infusion Details">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"/><circle cx="12" cy="7" r="3"/></svg>
              <span>View</span>
            </button>
            <button class="btn btn-sm btn-secondary" onclick="app.navigateTo('patient-chart', '${t.patientId}')" title="View Patient Chart">
              Chart
            </button>
            <button class="btn btn-sm btn-outline" onclick="app.requestEditTreatment('${t.id}')" title="Edit Treatment Record">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              <span>Edit</span>
            </button>
            <button class="btn btn-sm btn-ghost" style="color: var(--danger);" onclick="app.requestDeleteTreatment('${t.id}')" title="Delete Treatment Record">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  /* ------------------------------------------------------------------
   * View: Clinical Reports & Analytics (Daily, Weekly, Monthly, Yearly)
   * ------------------------------------------------------------------ */
  setReportPeriod(period) {
    this.reportPeriod = period;
    document.querySelectorAll('#report-period-pills .period-pill').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-period') === period);
    });
    this.renderReports();
  }

  setReportScope(scope) {
    this.reportScope = scope;
    document.querySelectorAll('#report-scope-tabs .report-scope-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-scope') === scope);
    });
    this.renderReports();
  }

  setReportDailyDate(dateStr) {
    this.reportDailyDate = dateStr;
    this.renderReports();
  }

  setReportWeeklyDate(dateStr) {
    this.reportWeeklyDate = dateStr;
    this.renderReports();
  }

  setReportMonthYear(myStr) {
    this.reportMonthYear = myStr;
    this.renderReports();
  }

  setReportYear(yrStr) {
    this.reportYear = yrStr;
    this.renderReports();
  }

  formatReadableDate(dStr) {
    if (!dStr) return '';
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }
      return dStr;
    } catch(e) {
      return dStr;
    }
  }

  getDateRangeForPeriod() {
    let start = '';
    let end = '';
    let label = '';
    const periodType = this.reportPeriod.toUpperCase();

    if (this.reportPeriod === 'daily') {
      const d = this.reportDailyDate || '2026-10-27';
      start = d;
      end = d;
      label = `Daily Clinical Report — ${this.formatReadableDate(d)}`;
    } else if (this.reportPeriod === 'weekly') {
      const base = new Date(this.reportWeeklyDate || '2026-10-26');
      const day = base.getDay();
      const diffToMonday = base.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(base.setDate(diffToMonday));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      start = monday.toISOString().slice(0, 10);
      end = sunday.toISOString().slice(0, 10);
      label = `Weekly Clinical Report — Week of ${this.formatReadableDate(start)} to ${this.formatReadableDate(end)}`;
    } else if (this.reportPeriod === 'monthly') {
      const ym = this.reportMonthYear || '2026-10';
      const parts = ym.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const lastDay = new Date(y, m, 0).getDate();
      start = `${ym}-01`;
      end = `${ym}-${String(lastDay).padStart(2, '0')}`;
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      label = `Monthly Clinical Operations Report — ${monthNames[m - 1]} ${y}`;
    } else if (this.reportPeriod === 'yearly') {
      const yr = this.reportYear || '2026';
      start = `${yr}-01-01`;
      end = `${yr}-12-31`;
      label = `Annual Clinical Center Report — Calendar Year ${yr}`;
    } else if (this.reportPeriod === 'custom') {
      start = this.reportCustomStart || '2026-10-01';
      end = this.reportCustomEnd || '2026-10-31';
      label = `Custom Period Clinical Report (${this.formatReadableDate(start)} to ${this.formatReadableDate(end)})`;
    } else {
      start = '2000-01-01';
      end = '2099-12-31';
      label = `Cumulative Center-Wide Historical Report (All Records)`;
    }

    return { start, end, label, periodType: this.reportPeriod };
  }

  getFilteredReportData(start, end, patientId = null) {
    const consults = this.consultations.filter(c => {
      const inDate = c.date >= start && c.date <= end;
      const matchPat = !patientId || c.patientId === patientId;
      return inDate && matchPat;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    const treatments = this.treatments.filter(t => {
      const inDate = t.treatmentDate >= start && t.treatmentDate <= end;
      const matchPat = !patientId || t.patientId === patientId;
      return inDate && matchPat;
    }).sort((a, b) => new Date(a.treatmentDate) - new Date(b.treatmentDate));

    let relevantPatients = [];
    if (patientId) {
      const p = this.getPatientById(patientId);
      if (p) relevantPatients = [p];
    } else {
      const patIdSet = new Set([
        ...consults.map(c => c.patientId),
        ...treatments.map(t => t.patientId)
      ]);
      relevantPatients = this.patients.filter(p => patIdSet.has(p.id) || (p.status || '').toLowerCase() === 'active');
      if (relevantPatients.length === 0) {
        relevantPatients = [...this.patients];
      }
    }

    return { consults, treatments, patients: relevantPatients };
  }

  renderReports() {
    this.renderReportDateControls();

    const range = this.getDateRangeForPeriod();
    const data = this.getFilteredReportData(range.start, range.end, this.reportSelectedPatientId);

    // Update tab count badges
    const repPatBadge = document.getElementById('rep-badge-patients');
    const repConBadge = document.getElementById('rep-badge-consults');
    const repTxBadge = document.getElementById('rep-badge-tx');

    if (repPatBadge) repPatBadge.textContent = data.patients.length;
    if (repConBadge) repConBadge.textContent = data.consults.length;
    if (repTxBadge) repTxBadge.textContent = data.treatments.length;

    const container = document.getElementById('report-output-container');
    if (!container) return;

    switch (this.reportScope) {
      case 'overview':
        container.innerHTML = this.renderReportOverview(data, range);
        break;
      case 'patients':
        container.innerHTML = this.renderReportPatients(data, range);
        break;
      case 'consultations':
        container.innerHTML = this.renderReportConsultations(data, range);
        break;
      case 'treatments':
        container.innerHTML = this.renderReportTreatments(data, range);
        break;
    }
  }

  renderReportDateControls() {
    const container = document.getElementById('report-date-controls');
    if (!container) return;

    if (this.reportPeriod === 'daily') {
      container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <label style="font-size: 0.825rem; font-weight: 600; color: var(--secondary);">Report Date:</label>
          <input type="date" id="rep-ctrl-daily" class="input-control" value="${this.reportDailyDate}">
          <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem;">Clinical Demo Shortcuts:</span>
          <button class="btn btn-sm btn-ghost" onclick="app.setReportDailyDate('2026-10-27')">Oct 27 (Eleanor Clearance)</button>
          <button class="btn btn-sm btn-ghost" onclick="app.setReportDailyDate('2026-10-29')">Oct 29 (Marcus Clearance)</button>
          <button class="btn btn-sm btn-ghost" onclick="app.setReportDailyDate('2026-10-16')">Oct 16 (FOLFOX Infusion)</button>
          <button class="btn btn-sm btn-ghost" onclick="app.setReportDailyDate('2026-10-07')">Oct 7 (AC-T Infusion)</button>
          <button class="btn btn-sm btn-secondary" onclick="app.setReportDailyDate('${new Date().toISOString().slice(0, 10)}')">Today</button>
        </div>
      `;
      document.getElementById('rep-ctrl-daily')?.addEventListener('change', (e) => {
        this.reportDailyDate = e.target.value;
        this.renderReports();
      });
    } else if (this.reportPeriod === 'weekly') {
      container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <label style="font-size: 0.825rem; font-weight: 600; color: var(--secondary);">Date within Week:</label>
          <input type="date" id="rep-ctrl-weekly" class="input-control" value="${this.reportWeeklyDate}">
          <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem;">Shortcuts:</span>
          <button class="btn btn-sm btn-ghost" onclick="app.setReportWeeklyDate('2026-10-26')">Week of Oct 26 - Nov 1</button>
          <button class="btn btn-sm btn-ghost" onclick="app.setReportWeeklyDate('2026-10-12')">Week of Oct 12 - Oct 18</button>
          <button class="btn btn-sm btn-ghost" onclick="app.setReportWeeklyDate('2026-10-05')">Week of Oct 5 - Oct 11</button>
        </div>
      `;
      document.getElementById('rep-ctrl-weekly')?.addEventListener('change', (e) => {
        this.reportWeeklyDate = e.target.value;
        this.renderReports();
      });
    } else if (this.reportPeriod === 'monthly') {
      container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <label style="font-size: 0.825rem; font-weight: 600; color: var(--secondary);">Target Month:</label>
          <input type="month" id="rep-ctrl-monthly" class="input-control" value="${this.reportMonthYear}">
          <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem;">Month Shortcuts:</span>
          <button class="btn btn-sm ${this.reportMonthYear === '2026-10' ? 'btn-primary' : 'btn-ghost'}" onclick="app.setReportMonthYear('2026-10')">October 2026 (Active Cases)</button>
          <button class="btn btn-sm ${this.reportMonthYear === '2026-11' ? 'btn-primary' : 'btn-ghost'}" onclick="app.setReportMonthYear('2026-11')">November 2026</button>
          <button class="btn btn-sm ${this.reportMonthYear === '2026-09' ? 'btn-primary' : 'btn-ghost'}" onclick="app.setReportMonthYear('2026-09')">September 2026</button>
        </div>
      `;
      document.getElementById('rep-ctrl-monthly')?.addEventListener('change', (e) => {
        this.reportMonthYear = e.target.value;
        this.renderReports();
      });
    } else if (this.reportPeriod === 'yearly') {
      container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <label style="font-size: 0.825rem; font-weight: 600; color: var(--secondary);">Calendar Year:</label>
          <select id="rep-ctrl-yearly" class="select-control">
            <option value="2026" ${this.reportYear === '2026' ? 'selected' : ''}>2026 (Active Clinic Operations)</option>
            <option value="2025" ${this.reportYear === '2025' ? 'selected' : ''}>2025</option>
            <option value="2027" ${this.reportYear === '2027' ? 'selected' : ''}>2027</option>
          </select>
        </div>
      `;
      document.getElementById('rep-ctrl-yearly')?.addEventListener('change', (e) => {
        this.reportYear = e.target.value;
        this.renderReports();
      });
    } else if (this.reportPeriod === 'custom') {
      container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          <label style="font-size: 0.825rem; font-weight: 600;">From:</label>
          <input type="date" id="rep-ctrl-custom-start" class="input-control" value="${this.reportCustomStart}">
          <label style="font-size: 0.825rem; font-weight: 600;">To:</label>
          <input type="date" id="rep-ctrl-custom-end" class="input-control" value="${this.reportCustomEnd}">
          <button class="btn btn-sm btn-primary" id="btn-apply-custom-dates">Apply Date Range</button>
        </div>
      `;
      document.getElementById('btn-apply-custom-dates')?.addEventListener('click', () => {
        this.reportCustomStart = document.getElementById('rep-ctrl-custom-start')?.value;
        this.reportCustomEnd = document.getElementById('rep-ctrl-custom-end')?.value;
        this.renderReports();
      });
    } else {
      container.innerHTML = `
        <div style="font-size: 0.85rem; color: var(--text-muted);">
          Reporting across all records in center database history.
        </div>
      `;
    }
  }

  renderOfficialReportHeader(range) {
    const patientFilter = this.reportSelectedPatientId ? this.getPatientById(this.reportSelectedPatientId) : null;
    const patientFilterText = patientFilter ? `${patientFilter.fullName} (${patientFilter.mrn})` : 'All Registered Patients';
    const scopeNames = {
      'overview': 'Executive Operations Overview',
      'patients': 'Per-Patient Longitudinal Care Report',
      'consultations': 'Clinical Consultations & Clearance Report',
      'treatments': 'Chemotherapy Infusion Sessions Report'
    };

    return `
      <div class="report-official-header">
        <div style="display: flex; align-items: center; gap: 1.15rem; flex-wrap: wrap;">
          <div style="background: #ffffff; padding: 6px 10px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 6px rgba(0,0,0,0.06); display: flex; align-items: center;">
            <img src="logo.png" alt="Imus Chemotherapy Center" style="height: 48px; object-fit: contain;">
          </div>
          <div>
            <div class="report-brand-title">Imus Chemotherapy Center</div>
            <div class="report-brand-subtitle">Department of Medical Oncology & Clinical Systemic Therapies</div>
            <div style="margin-top: 0.35rem; font-weight: 700; color: var(--primary); font-size: 1.15rem;">
              ${this.escapeHtml(range.label)}
            </div>
          </div>
        </div>
        <div class="report-meta-box">
          <div>Report Scope: <strong>${scopeNames[this.reportScope] || 'Overview'}</strong></div>
          <div>Patient Scope: <strong>${this.escapeHtml(patientFilterText)}</strong></div>
          <div>Date Range: <strong>${range.start}</strong> to <strong>${range.end}</strong></div>
          <div>Generated on: <strong>${new Date().toLocaleString()}</strong></div>
          <div>Facility: <strong>Imus Chemotherapy Center</strong></div>
        </div>
      </div>
    `;
  }

  renderReportSignatureBlock() {
    return `
      <div class="report-signature-block">
        <div>
          <div class="signature-line"></div>
          <div class="signature-label">Attending Medical Oncologist</div>
          <div style="font-size: 0.85rem; font-weight: 600; color: var(--secondary);">Dr. Evelyn Reed, MD / Dr. Julian Ross, MD</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">License: PRC-ONC-048812</div>
        </div>
        <div>
          <div class="signature-line"></div>
          <div class="signature-label">Chemotherapy Unit Nurse Supervisor</div>
          <div style="font-size: 0.85rem; font-weight: 600; color: var(--secondary);">Nurse Brenda Miller, RN, OCN</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Oncology Certified Nurse</div>
        </div>
        <div>
          <div class="signature-line"></div>
          <div class="signature-label">Clinical Oncology Pharmacist</div>
          <div style="font-size: 0.85rem; font-weight: 600; color: var(--secondary);">Imus Branch Infusion Pharmacy</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Chemo Reconstitution & Verification</div>
        </div>
      </div>
    `;
  }

  renderReportOverview(data, range) {
    const totalConsults = data.consults.length;
    const totalTx = data.treatments.length;
    const clearedConsults = data.consults.filter(c => c.clearanceStatus === 'CLEARED').length;
    const reducedConsults = data.consults.filter(c => c.clearanceStatus === 'DOSE_REDUCED').length;
    const delayedConsults = data.consults.filter(c => c.clearanceStatus === 'DELAYED').length;

    // Protocol distribution
    const protoCounts = {};
    data.treatments.forEach(t => {
      const reg = t.regimenName || 'Custom';
      protoCounts[reg] = (protoCounts[reg] || 0) + 1;
    });

    // Cancer category distribution
    const cancerCounts = {};
    data.patients.forEach(p => {
      const c = p.cancerType || 'Other';
      cancerCounts[c] = (cancerCounts[c] || 0) + 1;
    });

    // Total drugs administered count
    let totalAgentsCount = 0;
    data.treatments.forEach(t => {
      if (Array.isArray(t.drugsAdministered)) totalAgentsCount += t.drugsAdministered.length;
    });

    return `
      ${this.renderOfficialReportHeader(range)}

      <!-- Executive KPI Cards -->
      <div class="stats-grid" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
          <div class="stat-info">
            <p>Patients Evaluated</p>
            <h3>${data.patients.length}</h3>
            <div class="stat-subtext">Active oncology census</div>
          </div>
          <div class="stat-icon blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <p>Consultations Conducted</p>
            <h3>${totalConsults}</h3>
            <div class="stat-subtext">${clearedConsults} cleared for chemo</div>
          </div>
          <div class="stat-icon green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path></svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <p>Chemo Infusions Administered</p>
            <h3>${totalTx}</h3>
            <div class="stat-subtext">${totalAgentsCount} drug infusions verified</div>
          </div>
          <div class="stat-icon purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 2 4 4-14 14H4v-4L18 2z"></path></svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <p>Clearance Success Rate</p>
            <h3>${totalConsults > 0 ? Math.round(((clearedConsults + reducedConsults) / totalConsults) * 100) : 100}%</h3>
            <div class="stat-subtext">${delayedConsults} cycle(s) withheld</div>
          </div>
          <div class="stat-icon amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          </div>
        </div>
      </div>

      <!-- Analytical Breakdown 3-Panel Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem;">
        
        <!-- Regimen Distribution -->
        <div class="panel" style="margin-bottom: 0;">
          <div class="panel-header">
            <div class="panel-title" style="font-size: 0.95rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 2 4 4-14 14H4v-4L18 2z"></path></svg>
              <span>Chemo Regimens Administered</span>
            </div>
          </div>
          <div class="panel-body">
            ${Object.keys(protoCounts).length === 0 ? '<div style="color:var(--text-muted); font-size: 0.85rem;">No treatments in this timeframe.</div>' : `
              <div class="dist-bar-container">
                ${Object.entries(protoCounts).map(([reg, cnt]) => {
                  const pct = totalTx > 0 ? Math.round((cnt / totalTx) * 100) : 0;
                  return `
                    <div class="dist-bar-item">
                      <div class="dist-bar-label">
                        <span>${this.escapeHtml(reg)}</span>
                        <span>${cnt} session(s) (${pct}%)</span>
                      </div>
                      <div class="dist-bar-track">
                        <div class="dist-bar-fill purple" style="width: ${pct}%;"></div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>

        <!-- Clearance Decisions -->
        <div class="panel" style="margin-bottom: 0;">
          <div class="panel-header">
            <div class="panel-title" style="font-size: 0.95rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline></svg>
              <span>Oncologist Clearance Decisions</span>
            </div>
          </div>
          <div class="panel-body">
            ${totalConsults === 0 ? '<div style="color:var(--text-muted); font-size: 0.85rem;">No consultations in this timeframe.</div>' : `
              <div class="dist-bar-container">
                <div class="dist-bar-item">
                  <div class="dist-bar-label">
                    <span>Cleared for Chemotherapy</span>
                    <span>${clearedConsults} (${Math.round((clearedConsults / totalConsults) * 100)}%)</span>
                  </div>
                  <div class="dist-bar-track">
                    <div class="dist-bar-fill green" style="width: ${Math.round((clearedConsults / totalConsults) * 100)}%;"></div>
                  </div>
                </div>

                <div class="dist-bar-item">
                  <div class="dist-bar-label">
                    <span>Cleared with Dose Reduction</span>
                    <span>${reducedConsults} (${Math.round((reducedConsults / totalConsults) * 100)}%)</span>
                  </div>
                  <div class="dist-bar-track">
                    <div class="dist-bar-fill amber" style="width: ${Math.round((reducedConsults / totalConsults) * 100)}%;"></div>
                  </div>
                </div>

                <div class="dist-bar-item">
                  <div class="dist-bar-label">
                    <span>Cycle Delayed / Withheld</span>
                    <span>${delayedConsults} (${Math.round((delayedConsults / totalConsults) * 100)}%)</span>
                  </div>
                  <div class="dist-bar-track">
                    <div class="dist-bar-fill danger" style="width: ${Math.round((delayedConsults / totalConsults) * 100)}%;"></div>
                  </div>
                </div>
              </div>
            `}
          </div>
        </div>

        <!-- Cancer Categories -->
        <div class="panel" style="margin-bottom: 0;">
          <div class="panel-header">
            <div class="panel-title" style="font-size: 0.95rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
              <span>Cancer Types Treated</span>
            </div>
          </div>
          <div class="panel-body">
            ${Object.keys(cancerCounts).length === 0 ? '<div style="color:var(--text-muted); font-size: 0.85rem;">No patient census recorded.</div>' : `
              <div class="dist-bar-container">
                ${Object.entries(cancerCounts).map(([cat, cnt]) => {
                  const pct = Math.round((cnt / data.patients.length) * 100);
                  return `
                    <div class="dist-bar-item">
                      <div class="dist-bar-label">
                        <span>${this.escapeHtml(cat)}</span>
                        <span>${cnt} (${pct}%)</span>
                      </div>
                      <div class="dist-bar-track">
                        <div class="dist-bar-fill blue" style="width: ${pct}%;"></div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>

      </div>

      <!-- Recent Activities Table in this Period -->
      <div class="panel" style="margin-bottom: 1.5rem;">
        <div class="panel-header">
          <div class="panel-title" style="font-size: 1rem;">
            <span>Period Patient Care Summary Roster</span>
          </div>
          <button class="btn btn-sm btn-ghost no-print" onclick="app.setReportScope('patients')">View Detailed Patient Care Sheets →</button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>MRN</th>
                <th>Patient Name</th>
                <th>Diagnosis & Stage</th>
                <th>Active Regimen</th>
                <th>BSA</th>
                <th>Consultations in Period</th>
                <th>Infusions in Period</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.patients.map(p => {
                const patConsults = data.consults.filter(c => c.patientId === p.id);
                const patTx = data.treatments.filter(t => t.patientId === p.id);
                return `
                  <tr>
                    <td><span class="patient-mrn">${p.mrn}</span></td>
                    <td>
                      <strong>${this.escapeHtml(p.fullName)}</strong>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${p.gender}, ${p.age} yrs | ${p.bloodType || 'Unknown'}</div>
                    </td>
                    <td>
                      <div><strong>${this.escapeHtml(p.cancerType)}</strong></div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${this.escapeHtml(p.stage || '')}</div>
                    </td>
                    <td>
                      <div>${this.escapeHtml(p.activeRegimen || '-')}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">Cycle ${p.cyclesCompleted || 0} / ${p.cyclesPlanned || '?'}</div>
                    </td>
                    <td>${p.bsa || '--'} m²</td>
                    <td>
                      <span class="badge ${patConsults.length > 0 ? 'badge-info' : 'badge-secondary'}">
                        ${patConsults.length} visit(s)
                      </span>
                    </td>
                    <td>
                      <span class="badge ${patTx.length > 0 ? 'badge-purple' : 'badge-secondary'}">
                        ${patTx.length} session(s)
                      </span>
                    </td>
                    <td>${this.renderStatusBadge(p.status)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${this.renderReportSignatureBlock()}
    `;
  }

  renderReportPatients(data, range) {
    return `
      ${this.renderOfficialReportHeader(range)}

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;" class="no-print">
        <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--secondary);">
          Per-Patient Longitudinal Clinical Care Sheets (${data.patients.length} Patient${data.patients.length === 1 ? '' : 's'})
        </h3>
        <button class="btn btn-sm btn-secondary" onclick="window.print()">Print Care Sheets</button>
      </div>

      ${data.patients.length === 0 ? `
        <div class="empty-state">
          <h4>No Patients Active in this Period</h4>
          <p>Select another date range or view All Records.</p>
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          ${data.patients.map(p => {
            const patConsults = data.consults.filter(c => c.patientId === p.id);
            const patTx = data.treatments.filter(t => t.patientId === p.id);
            const allergies = Array.isArray(p.allergies) ? p.allergies.join(', ') : (p.allergies || 'NKDA');

            return `
              <div class="panel" style="margin-bottom: 0;">
                <div class="panel-header" style="background: linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%);">
                  <div style="display: flex; align-items: center; gap: 0.85rem;">
                    <div class="patient-avatar-thumb" style="width: 44px; height: 44px;">
                      ${this.renderPatientAvatar(p)}
                    </div>
                    <div>
                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 1.2rem; font-weight: 800; color: var(--secondary);">${this.escapeHtml(p.fullName)}</span>
                        <span class="patient-mrn" style="font-size: 0.9rem; font-weight: 700; color: #0284c7;">${p.mrn}</span>
                        ${p.philhealthNo ? `<span style="font-size: 0.75rem; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 9999px; font-weight: 600;">PIN: ${this.escapeHtml(p.philhealthNo)}</span>` : ''}
                        ${this.renderStatusBadge(p.status)}
                      </div>
                      <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                        DOB: ${p.dob} (${p.age} yrs, ${p.gender}) | Blood: <strong>${p.bloodType || 'Unknown'}</strong> | BSA: <strong>${p.bsa || '--'} m²</strong> (${p.weightKg || '--'} kg) | Oncologist: ${this.escapeHtml(p.primaryOncologist || '-')}
                        ${p.residentialAddress ? ` | 📍 <em>${this.escapeHtml(p.residentialAddress)}</em>` : ''}
                      </div>
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 0.85rem; font-weight: 700; color: var(--primary);">${this.escapeHtml(p.activeRegimen || 'Protocol TBD')}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Cycle Progress: ${p.cyclesCompleted || 0} / ${p.cyclesPlanned || '?'}</div>
                  </div>
                </div>

                <div class="panel-body">
                  <!-- Patient Clinical Profile Bar -->
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; background: #f8fafc; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.825rem;">
                    <div><strong>Diagnosis:</strong> ${this.escapeHtml(p.primaryDiagnosis || p.cancerType)}</div>
                    <div><strong>Staging:</strong> ${this.escapeHtml(p.stage || 'N/A')}</div>
                    <div><strong>Intent:</strong> ${this.escapeHtml(p.treatmentIntent || 'Adjuvant')}</div>
                    <div><strong>Allergies:</strong> <span style="color: ${allergies.toLowerCase().includes('nkda') ? 'inherit' : 'var(--danger); font-weight: 700;'}">${this.escapeHtml(allergies)}</span></div>
                  </div>

                  <!-- Consultations Section -->
                  <div style="margin-bottom: 1rem;">
                    <div style="font-size: 0.9rem; font-weight: 700; color: var(--secondary); margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
                      <span>🩺 Consultations in Period (${patConsults.length})</span>
                    </div>
                    ${patConsults.length === 0 ? '<div style="font-size: 0.8rem; color: var(--text-muted); padding: 0.5rem; background: #fafafa; border-radius: 4px;">No consultations conducted in this period.</div>' : `
                      <div class="table-responsive">
                        <table class="data-table" style="font-size: 0.8rem;">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Type</th>
                              <th>Vitals & ANC</th>
                              <th>Clearance Decision</th>
                              <th>Management Plan / Orders</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${patConsults.map(c => `
                              <tr>
                                <td><strong>${c.date}</strong> ${c.time || ''}</td>
                                <td>${this.escapeHtml(c.consultationType)}</td>
                                <td>
                                  BP: ${c.vitals?.bp || '-'}, Wt: ${c.vitals?.weightKg || '-'}kg<br>
                                  ANC: <strong>${c.labReview?.anc ?? '-'}</strong> | Plt: ${c.labReview?.platelets ?? '-'}
                                </td>
                                <td>${this.renderClearanceBadge(c.clearanceStatus || c.decision)}</td>
                                <td style="max-width: 250px;">${this.escapeHtml(c.managementPlan || c.clinicalNotes || '-')}</td>
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                      </div>
                    `}
                  </div>

                  <!-- Chemotherapy Treatments Section -->
                  <div>
                    <div style="font-size: 0.9rem; font-weight: 700; color: var(--purple); margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
                      <span>💉 Chemotherapy Infusions in Period (${patTx.length})</span>
                    </div>
                    ${patTx.length === 0 ? '<div style="font-size: 0.8rem; color: var(--text-muted); padding: 0.5rem; background: #fafafa; border-radius: 4px;">No chemotherapy infusions administered in this period.</div>' : `
                      <div class="table-responsive">
                        <table class="data-table" style="font-size: 0.8rem;">
                          <thead>
                            <tr>
                              <th>Date & Time</th>
                              <th>Regimen & Cycle</th>
                              <th>Administered Agents</th>
                              <th>Supervising Staff</th>
                              <th>Tolerability</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${patTx.map(t => {
                              const drugsStr = (t.drugsAdministered || []).map(d => `${d.drugName} (${d.actualDose || d.plannedDose})`).join(', ');
                              return `
                                <tr>
                                  <td><strong>${t.treatmentDate}</strong><div style="font-size: 0.75rem; color: var(--text-muted);">${t.startTime || ''} ${t.endTime ? `- ${t.endTime}` : ''}</div></td>
                                  <td><strong>${this.escapeHtml(t.regimenName)}</strong> (Cycle ${t.cycleNumber})</td>
                                  <td style="max-width: 240px; font-size: 0.78rem;">${this.escapeHtml(drugsStr || '-')}</td>
                                  <td>
                                    <div>${this.escapeHtml(t.supervisingNurse || '-')}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);">${this.escapeHtml(t.attendingOncologist || '')}</div>
                                  </td>
                                  <td>${this.renderToleranceBadge(t.toleranceGrade)}</td>
                                </tr>
                              `;
                            }).join('')}
                          </tbody>
                        </table>
                      </div>
                    `}
                  </div>

                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}

      ${this.renderReportSignatureBlock()}
    `;
  }

  renderReportConsultations(data, range) {
    const total = data.consults.length;
    const cleared = data.consults.filter(c => c.clearanceStatus === 'CLEARED').length;
    const reduced = data.consults.filter(c => c.clearanceStatus === 'DOSE_REDUCED').length;
    const delayed = data.consults.filter(c => c.clearanceStatus === 'DELAYED').length;
    const lowAncCount = data.consults.filter(c => c.labReview && Number(c.labReview.anc) < 1.5).length;

    return `
      ${this.renderOfficialReportHeader(range)}

      <!-- Consultations Summary Metrics -->
      <div class="stats-grid" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
          <div class="stat-info">
            <p>Total Consultations</p>
            <h3>${total}</h3>
            <div class="stat-subtext">Conducted in selected period</div>
          </div>
          <div class="stat-icon blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path></svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <p>Cleared for Chemo</p>
            <h3 style="color: var(--success);">${cleared}</h3>
            <div class="stat-subtext">${total > 0 ? Math.round((cleared / total) * 100) : 0}% of evaluations</div>
          </div>
          <div class="stat-icon green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline></svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <p>Dose Reductions</p>
            <h3 style="color: var(--warning);">${reduced}</h3>
            <div class="stat-subtext">Due to toxicity / labs</div>
          </div>
          <div class="stat-icon amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <p>Cycles Withheld / Delayed</p>
            <h3 style="color: var(--danger);">${delayed}</h3>
            <div class="stat-subtext">${lowAncCount} neutropenic alert(s)</div>
          </div>
          <div class="stat-icon" style="background: var(--danger-bg); color: var(--danger);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </div>
        </div>
      </div>

      <!-- Itemized Table -->
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <span>Itemized Consultations Log (${total} Records)</span>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Patient</th>
                <th>Consulting Oncologist</th>
                <th>Consultation Type</th>
                <th>Vitals & ANC</th>
                <th>Clearance Decision</th>
                <th>Management Plan & Orders</th>
              </tr>
            </thead>
            <tbody>
              ${total === 0 ? '<tr><td colspan="7" style="text-align:center; padding: 2.5rem; color: var(--text-muted);">No consultations found in this period.</td></tr>' : data.consults.map(c => {
                const patient = this.getPatientById(c.patientId);
                const isNeutropenic = c.labReview && Number(c.labReview.anc) < 1.5;
                return `
                  <tr>
                    <td>
                      <strong>${c.date}</strong>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${c.time || 'Clinic'}</div>
                    </td>
                    <td>
                      <strong>${patient ? this.escapeHtml(patient.fullName) : 'Unknown'}</strong>
                      <div class="patient-mrn">${patient ? patient.mrn : ''}</div>
                    </td>
                    <td>${this.escapeHtml(c.oncologist)}</td>
                    <td><span style="font-size: 0.8rem; font-weight: 500;">${this.escapeHtml(c.consultationType)}</span></td>
                    <td>
                      <div>BP: ${c.vitals?.bp || '-'} | Wt: ${c.vitals?.weightKg || '-'}kg</div>
                      <div style="font-size: 0.75rem;">
                        ANC: <strong style="color: ${isNeutropenic ? 'var(--danger)' : 'inherit'};">${c.labReview?.anc ?? '-'}</strong> | Plt: ${c.labReview?.platelets ?? '-'}
                      </div>
                    </td>
                    <td>${this.renderClearanceBadge(c.clearanceStatus || c.decision)}</td>
                    <td style="max-width: 280px; font-size: 0.8rem; color: var(--text-muted);">${this.escapeHtml(c.managementPlan || c.clinicalNotes || '-')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${this.renderReportSignatureBlock()}
    `;
  }

  renderReportTreatments(data, range) {
    const total = data.treatments.length;
    const toleranceCounts = { grade0: 0, grade1: 0, grade2: 0, grade3: 0 };

    data.treatments.forEach(t => {
      const tol = (t.toleranceGrade || '').toLowerCase();
      if (tol.includes('grade 0') || tol.includes('well tolerated')) toleranceCounts.grade0++;
      else if (tol.includes('grade 1')) toleranceCounts.grade1++;
      else if (tol.includes('grade 2')) toleranceCounts.grade2++;
      else toleranceCounts.grade3++;
    });

    return `
      ${this.renderOfficialReportHeader(range)}

      <!-- Treatments Summary Metrics -->
      <div class="stats-grid" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
          <div class="stat-info">
            <p>Infusion Sessions</p>
            <h3>${total}</h3>
            <div class="stat-subtext">Administered in period</div>
          </div>
          <div class="stat-icon purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 2 4 4-14 14H4v-4L18 2z"></path></svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <p>Well Tolerated (Grade 0)</p>
            <h3 style="color: var(--success);">${toleranceCounts.grade0}</h3>
            <div class="stat-subtext">${total > 0 ? Math.round((toleranceCounts.grade0 / total) * 100) : 0}% uneventful</div>
          </div>
          <div class="stat-icon green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <p>Mild Reactions (Grade 1)</p>
            <h3 style="color: var(--primary);">${toleranceCounts.grade1}</h3>
            <div class="stat-subtext">e.g. Cold sensitivity, transient flushing</div>
          </div>
          <div class="stat-icon blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-info">
            <p>Moderate / Severe Events</p>
            <h3 style="color: ${toleranceCounts.grade2 + toleranceCounts.grade3 > 0 ? 'var(--danger)' : 'var(--text-muted)'};">${toleranceCounts.grade2 + toleranceCounts.grade3}</h3>
            <div class="stat-subtext">Grade 2+ acute toxicities</div>
          </div>
          <div class="stat-icon amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
          </div>
        </div>
      </div>

      <!-- Itemized Table -->
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <span>Itemized Chemotherapy Infusions Log (${total} Records)</span>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Regimen & Cycle</th>
                <th>Administered Drugs & Dosages</th>
                <th>Supervising Staff</th>
                <th>Tolerability & Adverse Reactions</th>
              </tr>
            </thead>
            <tbody>
              ${total === 0 ? '<tr><td colspan="6" style="text-align:center; padding: 2.5rem; color: var(--text-muted);">No chemotherapy treatments found in this period.</td></tr>' : data.treatments.map(t => {
                const patient = this.getPatientById(t.patientId);
                const drugsList = (t.drugsAdministered || []).map(d => `<strong>${this.escapeHtml(d.drugName)}</strong>: ${this.escapeHtml(d.actualDose || d.plannedDose)}`).join('<br>');
                return `
                  <tr>
                    <td>
                      <strong>${t.treatmentDate}</strong>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${t.startTime || ''} ${t.endTime ? `- ${t.endTime}` : ''}</div>
                    </td>
                    <td>
                      <strong>${patient ? this.escapeHtml(patient.fullName) : 'Unknown'}</strong>
                      <div class="patient-mrn">${patient ? patient.mrn : ''}</div>
                    </td>
                    <td>
                      <strong>${this.escapeHtml(t.regimenName)}</strong>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">Cycle ${t.cycleNumber} of ${t.cycleTotal || '?'} (Day ${t.dayOfCycle || 1})</div>
                    </td>
                    <td style="font-size: 0.8rem; line-height: 1.4;">${drugsList || '-'}</td>
                    <td>
                      <div>${this.escapeHtml(t.supervisingNurse || '-')}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${this.escapeHtml(t.attendingOncologist || '')}</div>
                    </td>
                    <td>
                      <div>${this.renderToleranceBadge(t.toleranceGrade)}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${this.escapeHtml(t.adverseReactions ? t.adverseReactions.slice(0, 60) + '...' : 'None')}</div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${this.renderReportSignatureBlock()}
    `;
  }

  exportReportToCsv() {
    const range = this.getDateRangeForPeriod();
    const data = this.getFilteredReportData(range.start, range.end, this.reportSelectedPatientId);
    let csvRows = [];

    if (this.reportScope === 'consultations') {
      csvRows.push(['Date', 'Time', 'MRN', 'Patient Name', 'Consultation Type', 'Oncologist', 'BP', 'Pulse', 'Weight (kg)', 'ANC (x10^9/L)', 'Platelets', 'Clearance Decision', 'Dose Adj %', 'Management Plan']);
      data.consults.forEach(c => {
        const p = this.getPatientById(c.patientId);
        csvRows.push([
          c.date,
          c.time || '',
          p ? p.mrn : '',
          p ? p.fullName : 'Unknown',
          c.consultationType,
          c.oncologist,
          c.vitals?.bp || '',
          c.vitals?.pulse || '',
          c.vitals?.weightKg || '',
          c.labReview?.anc || '',
          c.labReview?.platelets || '',
          c.clearanceStatus || c.decision,
          c.doseAdjustmentPercent || 0,
          (c.managementPlan || '').replace(/"/g, '""')
        ]);
      });
    } else if (this.reportScope === 'treatments') {
      csvRows.push(['Date', 'Time', 'MRN', 'Patient Name', 'Regimen', 'Cycle Number', 'Total Cycles', 'Supervising Nurse', 'Oncologist', 'Drugs Administered', 'Tolerance Grade', 'Adverse Events']);
      data.treatments.forEach(t => {
        const p = this.getPatientById(t.patientId);
        const drugsStr = Array.isArray(t.drugsAdministered) ? t.drugsAdministered.map(d => `${d.drugName} (${d.actualDose || d.plannedDose})`).join('; ') : '';
        csvRows.push([
          t.treatmentDate,
          t.startTime || '',
          p ? p.mrn : '',
          p ? p.fullName : 'Unknown',
          t.regimenName,
          t.cycleNumber,
          t.cycleTotal || '',
          t.supervisingNurse || '',
          t.attendingOncologist || '',
          drugsStr.replace(/"/g, '""'),
          t.toleranceGrade || '',
          (t.adverseReactions || '').replace(/"/g, '""')
        ]);
      });
    } else { // 'overview' or 'patients'
      csvRows.push(['Registration Date', 'MRN', 'PhilHealth PIN', 'Last Name', 'First Name', 'Middle Name', 'Address', 'Full Name', 'Gender', 'Age', 'Civil Status', 'Religion', 'Cancer Category', 'Diagnosis', 'Stage', 'BSA (m2)', 'Regimen', 'Consultations in Period', 'Treatments in Period', 'Allergies', 'Status']);
      data.patients.forEach(p => {
        const pConsults = data.consults.filter(c => c.patientId === p.id).length;
        const pTx = data.treatments.filter(t => t.patientId === p.id).length;
        csvRows.push([
          p.registrationDate || (p.createdAt ? p.createdAt.slice(0, 10) : ''),
          p.mrn,
          p.philhealthNo || '',
          p.lastName || '',
          p.firstName || '',
          p.middleName || '',
          (p.residentialAddress || '').replace(/"/g, '""'),
          p.fullName,
          p.gender,
          p.age,
          p.civilStatus || p.maritalStatus || 'Single',
          p.religion || '',
          p.cancerType,
          (p.primaryDiagnosis || '').replace(/"/g, '""'),
          p.stage || '',
          p.bsa || '',
          p.activeRegimen || '',
          pConsults,
          pTx,
          Array.isArray(p.allergies) ? p.allergies.join(', ') : (p.allergies || ''),
          p.status
        ]);
      });
    }

    const csvContent = '\uFEFF' + csvRows.map(r => r.map(f => `"${String(f ?? '')}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `imus_branch_${this.reportScope}_report_${range.periodType.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    this.showToast('Report CSV exported successfully', 'success');
  }

  /* ------------------------------------------------------------------
   * View: Regimens & Protocol Library
   * ------------------------------------------------------------------ */
  renderProtocolsLibrary() {
    const container = document.getElementById('protocols-library-container');
    if (!container || typeof CHEMO_PROTOCOLS === 'undefined') return;

    container.innerHTML = CHEMO_PROTOCOLS.map(proto => {
      return `
        <div class="panel" style="margin-bottom: 0;">
          <div class="panel-header" style="background: #f8fafc;">
            <div>
              <div class="panel-title" style="font-size: 1rem; color: var(--primary);">
                ${this.escapeHtml(proto.name)}
              </div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${proto.cancerType} | Cycle interval: every ${proto.cycleDurationDays} days</div>
            </div>
            <span class="badge badge-purple">${proto.emetogenicRisk} emetogenicity</span>
          </div>
          <div class="panel-body" style="font-size: 0.85rem;">
            <div style="margin-bottom: 0.75rem;">
              <strong>Pre-medications Protocol:</strong>
              <ul style="margin-left: 1.25rem; margin-top: 0.25rem; color: var(--text-muted);">
                ${proto.premeds.map(pm => `<li>${this.escapeHtml(pm)}</li>`).join('')}
              </ul>
            </div>

            <div style="margin-bottom: 0.75rem;">
              <strong>Drugs & Standard Dosages:</strong>
              <div style="margin-top: 0.25rem; display: flex; flex-direction: column; gap: 0.35rem;">
                ${proto.drugs.map(d => `
                  <div style="background: #f1f5f9; padding: 0.4rem 0.6rem; border-radius: 4px;">
                    <strong>${this.escapeHtml(d.name)}</strong>: ${this.escapeHtml(d.standardDose)} - <em>${this.escapeHtml(d.route)}</em>
                  </div>
                `).join('')}
              </div>
            </div>

            <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 0.75rem;">
              <span style="font-size: 0.75rem; color: var(--danger);">Watch: ${proto.toxicityChecks.join(', ')}</span>
              <button class="btn btn-sm btn-primary" onclick="app.openNewTreatmentWithProtocol('${proto.id}')">
                Use in Treatment Log
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ------------------------------------------------------------------
   * Modal Form Controls: Patient Registration / Edit & Photo Handling
   * ------------------------------------------------------------------ */
  setPatientModalPhoto(dataUrl, gender = null) {
    const hiddenData = document.getElementById('patient-photo-data');
    const previewImg = document.getElementById('patient-photo-preview-img');
    const placeholder = document.getElementById('patient-photo-placeholder');
    const removeBtn = document.getElementById('btn-remove-patient-photo');
    const fileInput = document.getElementById('patient-photo-input');

    const effectiveGender = gender || document.getElementById('patient-gender')?.value || 'Female';

    if (this.isUploadedPhoto(dataUrl)) {
      if (hiddenData) hiddenData.value = dataUrl;
      if (previewImg) {
        previewImg.src = dataUrl;
        previewImg.style.display = 'block';
      }
      if (placeholder) placeholder.style.display = 'none';
      if (removeBtn) removeBtn.style.display = 'inline-flex';
    } else {
      if (hiddenData) hiddenData.value = '';
      if (previewImg) {
        previewImg.src = this.getPatientAvatar(effectiveGender);
        previewImg.style.display = 'block';
      }
      if (placeholder) placeholder.style.display = 'none';
      if (removeBtn) removeBtn.style.display = 'none';
      if (fileInput) fileInput.value = '';
    }
  }

  handlePhotoFileSelection(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.showToast('Please select a valid image file (PNG, JPG, WebP)', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // High quality downscaling to max 360x360 for fast loading and low storage footprint
        const maxDim = 360;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        this.setPatientModalPhoto(dataUrl);
        this.showToast('Patient photo attached successfully', 'success');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  openNewPatientModal() {
    const modal = document.getElementById('modal-patient');
    const form = document.getElementById('form-patient');
    form.reset();
    document.getElementById('patient-id').value = '';
    document.getElementById('modal-patient-title').textContent = 'Register New Oncology Patient';
    document.getElementById('patient-reg-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('patient-mrn').value = this.generateMRN();
    document.getElementById('patient-lastname').value = '';
    document.getElementById('patient-firstname').value = '';
    document.getElementById('patient-middlename').value = '';
    document.getElementById('patient-philhealth').value = '';
    document.getElementById('patient-address').value = '';
    const civilSelectNew = document.getElementById('patient-civil-status');
    if (civilSelectNew) civilSelectNew.value = 'Single';
    const relInputNew = document.getElementById('patient-religion');
    if (relInputNew) relInputNew.value = 'Roman Catholic';
    document.getElementById('form-calculated-bsa').textContent = '--';
    document.getElementById('form-calculated-bmi').textContent = '--';
    this.setPatientModalPhoto(null, 'Female');
    this.openModal(modal);
  }

  openEditPatientModal(patientId) {
    const patient = this.getPatientById(patientId);
    if (!patient) return;

    const modal = document.getElementById('modal-patient');
    document.getElementById('modal-patient-title').textContent = `Edit Patient: ${patient.fullName}`;
    document.getElementById('patient-id').value = patient.id;
    document.getElementById('patient-reg-date').value = patient.registrationDate || (patient.createdAt ? patient.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
    document.getElementById('patient-mrn').value = patient.mrn;
    document.getElementById('patient-lastname').value = patient.lastName || (patient.fullName.includes(',') ? patient.fullName.split(',')[0].trim() : patient.fullName);
    document.getElementById('patient-firstname').value = patient.firstName || (patient.fullName.includes(',') ? patient.fullName.split(',')[1]?.trim().split(' ')[0] : patient.fullName);
    document.getElementById('patient-middlename').value = patient.middleName || '';
    document.getElementById('patient-philhealth').value = patient.philhealthNo || '';
    document.getElementById('patient-address').value = patient.residentialAddress || '';
    document.getElementById('patient-dob').value = patient.dob;
    document.getElementById('patient-gender').value = patient.gender || 'Female';
    document.getElementById('patient-bloodtype').value = patient.bloodType || 'Unknown';
    const civilSelectEdit = document.getElementById('patient-civil-status');
    if (civilSelectEdit) {
      civilSelectEdit.value = patient.civilStatus || patient.maritalStatus || 'Single';
      if (!civilSelectEdit.value) {
        const cs = (patient.civilStatus || patient.maritalStatus || '').toLowerCase();
        for (let opt of civilSelectEdit.options) {
          if (opt.value.toLowerCase() === cs) {
            civilSelectEdit.value = opt.value;
            break;
          }
        }
      }
    }
    const relInputEdit = document.getElementById('patient-religion');
    if (relInputEdit) {
      relInputEdit.value = patient.religion || '';
    }
    document.getElementById('patient-phone').value = patient.phone || '';
    document.getElementById('patient-email').value = patient.email || '';
    document.getElementById('patient-emergency-contact').value = typeof patient.emergencyContact === 'object' ? `${patient.emergencyContact.name || ''} - ${patient.emergencyContact.phone || ''}` : (patient.emergencyContact || '');

    const cancerSelect = document.getElementById('patient-cancer-type');
    if (cancerSelect) {
      cancerSelect.value = patient.cancerType || 'Not specified';
      if (!cancerSelect.value) {
        const ct = (patient.cancerType || '').toLowerCase().trim();
        let found = false;
        for (let opt of cancerSelect.options) {
          if (opt.value.toLowerCase() === ct || opt.text.toLowerCase().includes(ct)) {
            cancerSelect.value = opt.value;
            found = true;
            break;
          }
        }
        if (!found) cancerSelect.value = 'Not specified';
      }
    }

    const stageSelect = document.getElementById('patient-stage');
    if (stageSelect) {
      stageSelect.value = patient.stage || 'Not specified';
      if (!stageSelect.value) {
        const st = (patient.stage || '').toLowerCase().trim();
        let found = false;
        for (let opt of stageSelect.options) {
          if (opt.value.toLowerCase() === st || opt.text.toLowerCase().includes(st)) {
            stageSelect.value = opt.value;
            found = true;
            break;
          }
        }
        if (!found) stageSelect.value = 'Not specified';
      }
    }
    document.getElementById('patient-diagnosis').value = patient.primaryDiagnosis || '';
    document.getElementById('patient-markers').value = patient.histologyMarkers || '';
    document.getElementById('patient-intent').value = patient.treatmentIntent || 'Adjuvant';
    document.getElementById('patient-regimen').value = patient.activeRegimen || '';
    document.getElementById('patient-oncologist').value = patient.primaryOncologist || '';
    document.getElementById('patient-nurse').value = patient.primaryNurse || '';

    document.getElementById('patient-height').value = patient.heightCm || '';
    document.getElementById('patient-weight').value = patient.weightKg || '';
    document.getElementById('form-calculated-bsa').textContent = patient.bsa || '--';
    document.getElementById('form-calculated-bmi').textContent = patient.bmi || '--';

    const allergies = Array.isArray(patient.allergies) ? patient.allergies.join(', ') : (patient.allergies || '');
    document.getElementById('patient-allergies').value = allergies;
    document.getElementById('patient-ecog').value = patient.ecogBaseline ?? 0;
    document.getElementById('patient-status').value = patient.status || 'Active';
    document.getElementById('patient-comorbidities').value = Array.isArray(patient.comorbidities) ? patient.comorbidities.join(', ') : (patient.comorbidities || '');

    this.setPatientModalPhoto(patient.photo || null, patient.gender);
    this.openModal(modal);
  }

  savePatient(formData) {
    const rawId = formData.get('patient-id') || document.getElementById('patient-id')?.value;
    const id = rawId || ('pat-' + Date.now());
    const isNew = !rawId;
    const heightCm = parseFloat(formData.get('patient-height') || document.getElementById('patient-height')?.value) || 0;
    const weightKg = parseFloat(formData.get('patient-weight') || document.getElementById('patient-weight')?.value) || 0;
    const bsa = this.calculateBSA(heightCm, weightKg);
    const bmi = this.calculateBMI(heightCm, weightKg);
    const dob = formData.get('patient-dob') || document.getElementById('patient-dob')?.value;
    const age = this.calculateAge(dob);

    const allergiesRaw = formData.get('patient-allergies') || document.getElementById('patient-allergies')?.value || 'NKDA';
    const allergies = allergiesRaw.split(',').map(s => s.trim()).filter(Boolean);

    const photoData = document.getElementById('patient-photo-data')?.value || '';
    const philhealthNo = (formData.get('patient-philhealth') || document.getElementById('patient-philhealth')?.value || '').trim();
    const residentialAddress = (formData.get('patient-address') || document.getElementById('patient-address')?.value || '').trim();
    const registrationDate = formData.get('patient-reg-date') || document.getElementById('patient-reg-date')?.value || new Date().toISOString().slice(0, 10);
    const lastName = (formData.get('patient-lastname') || document.getElementById('patient-lastname')?.value || '').trim();
    const firstName = (formData.get('patient-firstname') || document.getElementById('patient-firstname')?.value || '').trim();
    const middleName = (formData.get('patient-middlename') || document.getElementById('patient-middlename')?.value || '').trim();

    let fullName = '';
    if (middleName) {
      fullName = `${lastName}, ${firstName} ${middleName}`.trim();
    } else if (lastName) {
      fullName = `${lastName}, ${firstName}`.trim();
    } else {
      fullName = firstName;
    }

    const patientData = {
      id,
      registrationDate,
      lastName,
      firstName,
      middleName,
      fullName,
      mrn: formData.get('patient-mrn') || document.getElementById('patient-mrn')?.value,
      philhealthNo,
      residentialAddress,
      photo: this.isUploadedPhoto(photoData) ? photoData : this.getPatientAvatar(formData.get('patient-gender') || document.getElementById('patient-gender')?.value),
      dob,
      age,
      gender: formData.get('patient-gender') || document.getElementById('patient-gender')?.value,
      bloodType: formData.get('patient-bloodtype') || document.getElementById('patient-bloodtype')?.value,
      civilStatus: formData.get('patient-civil-status') || document.getElementById('patient-civil-status')?.value || 'Single',
      maritalStatus: formData.get('patient-civil-status') || document.getElementById('patient-civil-status')?.value || 'Single',
      religion: (formData.get('patient-religion') || document.getElementById('patient-religion')?.value || '').trim() || 'Roman Catholic',
      phone: formData.get('patient-phone') || document.getElementById('patient-phone')?.value,
      email: formData.get('patient-email') || document.getElementById('patient-email')?.value,
      emergencyContact: formData.get('patient-emergency-contact') || document.getElementById('patient-emergency-contact')?.value,
      primaryDiagnosis: formData.get('patient-diagnosis') || document.getElementById('patient-diagnosis')?.value,
      cancerType: formData.get('patient-cancer-type') || document.getElementById('patient-cancer-type')?.value || 'Not specified',
      stage: formData.get('patient-stage') || document.getElementById('patient-stage')?.value || 'Not specified',
      histologyMarkers: formData.get('patient-markers') || document.getElementById('patient-markers')?.value,
      heightCm,
      weightKg,
      bsa,
      bmi,
      allergies,
      primaryOncologist: formData.get('patient-oncologist') || document.getElementById('patient-oncologist')?.value,
      primaryNurse: formData.get('patient-nurse') || document.getElementById('patient-nurse')?.value,
      treatmentIntent: formData.get('patient-intent') || document.getElementById('patient-intent')?.value,
      activeRegimen: formData.get('patient-regimen') || document.getElementById('patient-regimen')?.value,
      status: formData.get('patient-status') || document.getElementById('patient-status')?.value,
      ecogBaseline: parseInt(formData.get('patient-ecog') || document.getElementById('patient-ecog')?.value || '0', 10),
      comorbidities: formData.get('patient-comorbidities') || document.getElementById('patient-comorbidities')?.value,
      updatedAt: new Date().toISOString()
    };

    if (isNew) {
      patientData.createdAt = new Date().toISOString();
      patientData.cyclesCompleted = 0;
      patientData.cyclesPlanned = 6;
      this.patients.unshift(patientData);
      this.showToast(`Patient ${patientData.fullName} registered successfully!`, 'success');
    } else {
      const idx = this.patients.findIndex(p => p.id === id);
      if (idx !== -1) {
        this.patients[idx] = { ...this.patients[idx], ...patientData };
        this.showToast(`Patient ${patientData.fullName} updated successfully!`, 'success');
      }
    }

    this.saveData();
    this.closeModal(document.getElementById('modal-patient'));
    this.render();
    if (this.activeView === 'patient-chart' && this.selectedPatientId === id) {
      this.renderPatientChart();
    }
  }

  /* ------------------------------------------------------------------
   * Delete Patient
   * ------------------------------------------------------------------ */
  openDeletePatientModal(patientId) {
    const patient = this.getPatientById(patientId);
    if (!patient) return;

    this.pendingDeletePatientId = patientId;
    const nameText = document.getElementById('delete-patient-name-text');
    const warnText = document.getElementById('delete-patient-warning-text');

    const consultsCount = this.getPatientConsultations(patientId).length;
    const txCount = this.getPatientTreatments(patientId).length;

    nameText.textContent = `Are you sure you want to permanently delete patient "${patient.fullName}" (${patient.mrn})?`;
    warnText.textContent = `This patient has ${consultsCount} recorded consultation(s) and ${txCount} chemotherapy treatment session(s). All linked medical records will be deleted.`;

    this.openModal(document.getElementById('modal-delete-confirm'));
  }

  confirmDeletePatient() {
    if (!this.pendingDeletePatientId) return;
    const id = this.pendingDeletePatientId;
    const patient = this.getPatientById(id);
    const patName = patient ? patient.fullName : 'Patient';

    // Remove patient
    this.patients = this.patients.filter(p => p.id !== id);
    // Remove linked consultations and treatments
    this.consultations = this.consultations.filter(c => c.patientId !== id);
    this.treatments = this.treatments.filter(t => t.patientId !== id);

    this.saveData();
    this.closeModal(document.getElementById('modal-delete-confirm'));
    this.pendingDeletePatientId = null;
    this.showToast(`Patient ${patName} and all associated records deleted`, 'warning');

    if (this.selectedPatientId === id) {
      this.navigateTo('patients');
    } else {
      this.render();
    }
  }

  /* ------------------------------------------------------------------
   * Modal Form Controls: Consultations & Treatments Patient Search (No Dropdowns)
   * ------------------------------------------------------------------ */
  searchPatients(query = '') {
    const q = (query || '').toLowerCase().trim();
    if (!q) return this.patients;

    const cleanQ = q.replace(/[^a-z0-9]/g, '');

    return this.patients.filter(p => {
      // 1. Name matching
      const fullName = (p.fullName || '').toLowerCase();
      const lastName = (p.lastName || '').toLowerCase();
      const firstName = (p.firstName || '').toLowerCase();
      const middleName = (p.middleName || '').toLowerCase();
      const nameMatch = fullName.includes(q) || lastName.includes(q) || firstName.includes(q) || middleName.includes(q);

      // 2. Number matching (MRN, PhilHealth, Phone)
      const mrn = (p.mrn || '').toLowerCase();
      const mrnClean = mrn.replace(/[^a-z0-9]/g, '');
      const philhealth = (p.philhealthNo || '').toLowerCase();
      const philhealthClean = philhealth.replace(/[^a-z0-9]/g, '');
      const phone = (p.phone || '').toLowerCase();
      const phoneClean = phone.replace(/[^a-z0-9]/g, '');
      const numberMatch = mrn.includes(q) || (cleanQ && mrnClean.includes(cleanQ)) ||
                          philhealth.includes(q) || (cleanQ && philhealthClean.includes(cleanQ)) ||
                          phone.includes(q) || (cleanQ && phoneClean.includes(cleanQ));

      // 3. Diagnosis matching
      const cancerType = (p.cancerType || '').toLowerCase();
      const diagnosis = (p.primaryDiagnosis || '').toLowerCase();
      const stage = (p.stage || '').toLowerCase();
      const markers = (p.histologyMarkers || '').toLowerCase();
      const regimen = (p.activeRegimen || '').toLowerCase();
      const diagnosisMatch = cancerType.includes(q) || diagnosis.includes(q) || stage.includes(q) || markers.includes(q) || regimen.includes(q);

      // 4. Demographics matching (Civil Status, Religion)
      const civilStatus = (p.civilStatus || p.maritalStatus || '').toLowerCase();
      const religion = (p.religion || '').toLowerCase();
      const demoMatch = civilStatus.includes(q) || religion.includes(q);

      return nameMatch || numberMatch || diagnosisMatch || demoMatch;
    });
  }

  selectConsultPatient(patientId) {
    const hiddenInput = document.getElementById('consult-patient-select');
    if (hiddenInput) hiddenInput.value = patientId;

    const resultsEl = document.getElementById('consult-search-results');
    if (resultsEl) resultsEl.style.display = 'none';

    this.updateConsultPatientPreview(patientId);
  }

  performConsultPatientSearch(query = '') {
    const resultsEl = document.getElementById('consult-search-results');
    const q = (query || '').trim();
    if (!q) {
      if (resultsEl) resultsEl.style.display = 'none';
      return;
    }

    const matches = this.searchPatients(q);
    if (!resultsEl) return;
    resultsEl.style.display = 'block';

    if (matches.length === 0) {
      resultsEl.innerHTML = `
        <div style="padding: 0.65rem 0.85rem; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; color: #be123c; font-size: 0.825rem;">
          ⚠️ No patient found matching "<strong>${this.escapeHtml(q)}</strong>".
          <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">
            Search by Name (e.g. Vance), Number (MRN / PhilHealth PIN), or Cancer Diagnosis.
          </div>
        </div>
      `;
      return;
    }

    if (matches.length === 1) {
      this.selectConsultPatient(matches[0].id);
      resultsEl.innerHTML = `
        <div style="padding: 0.45rem 0.75rem; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; color: #047857; font-size: 0.8rem; display: flex; align-items: center; justify-content: space-between;">
          <span>✓ Selected: <strong>${this.escapeHtml(matches[0].fullName)}</strong> (${matches[0].mrn})</span>
          <button type="button" class="btn btn-sm btn-ghost" onclick="document.getElementById('consult-search-results').style.display='none'" style="font-size: 0.75rem; padding: 2px 6px;">✕</button>
        </div>
      `;
      return;
    }

    // Multiple matches
    resultsEl.innerHTML = `
      <div style="background: #fff; border: 1.5px solid #0284c7; border-radius: 6px; padding: 0.5rem; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
        <div style="font-size: 0.78rem; font-weight: 700; color: #0369a1; margin-bottom: 0.4rem; display: flex; justify-content: space-between; align-items: center;">
          <span>${matches.length} matches found — Click to select:</span>
          <button type="button" class="btn btn-sm btn-ghost" onclick="document.getElementById('consult-search-results').style.display='none'" style="font-size: 0.75rem; padding: 2px 6px;">✕</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.35rem; max-height: 190px; overflow-y: auto;">
          ${matches.map(p => `
            <div onclick="app.selectConsultPatient('${p.id}')"
                 style="cursor: pointer; padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: 5px; background: #fafafa; display: flex; align-items: center; justify-content: space-between; transition: all 0.15s;"
                 onmouseover="this.style.background='#e0f2fe'; this.style.borderColor='#0284c7';"
                 onmouseout="this.style.background='#fafafa'; this.style.borderColor='var(--border)';">
              <div>
                <strong style="color: var(--primary); font-size: 0.85rem;">${this.escapeHtml(p.fullName)}</strong>
                <span style="font-size: 0.72rem; background: #e2e8f0; padding: 1px 5px; border-radius: 3px; margin-left: 5px; font-family: monospace;">${p.mrn}</span>
                ${p.philhealthNo ? `<span style="font-size: 0.72rem; background: #dbeafe; color: #1e40af; padding: 1px 5px; border-radius: 3px; margin-left: 4px;">PIN: ${this.escapeHtml(p.philhealthNo)}</span>` : ''}
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 1px;">
                  <strong>${this.escapeHtml(p.cancerType)}</strong> (${this.escapeHtml(p.stage || 'Unstaged')}) — ${this.escapeHtml(p.primaryDiagnosis || '')}
                </div>
              </div>
              <button type="button" class="btn btn-sm btn-primary" style="pointer-events: none; font-size: 0.75rem; padding: 0.25rem 0.6rem;">Select</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  populateConsultPatientDropdown(query = '') {
    this.performConsultPatientSearch(query);
  }

  selectTxPatient(patientId) {
    const hiddenInput = document.getElementById('tx-patient-select');
    if (hiddenInput) hiddenInput.value = patientId;

    const resultsEl = document.getElementById('tx-search-results');
    if (resultsEl) resultsEl.style.display = 'none';

    this.updateTxPatientPreview(patientId);
  }

  performTxPatientSearch(query = '') {
    const resultsEl = document.getElementById('tx-search-results');
    const q = (query || '').trim();
    if (!q) {
      if (resultsEl) resultsEl.style.display = 'none';
      return;
    }

    const matches = this.searchPatients(q);
    if (!resultsEl) return;
    resultsEl.style.display = 'block';

    if (matches.length === 0) {
      resultsEl.innerHTML = `
        <div style="padding: 0.65rem 0.85rem; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; color: #be123c; font-size: 0.825rem;">
          ⚠️ No patient found matching "<strong>${this.escapeHtml(q)}</strong>".
          <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">
            Search by Name (e.g. Vance), Number (MRN / PhilHealth PIN), or Cancer Diagnosis.
          </div>
        </div>
      `;
      return;
    }

    if (matches.length === 1) {
      this.selectTxPatient(matches[0].id);
      resultsEl.innerHTML = `
        <div style="padding: 0.45rem 0.75rem; background: #faf5ff; border: 1px solid #ddd6fe; border-radius: 6px; color: #6b21a8; font-size: 0.8rem; display: flex; align-items: center; justify-content: space-between;">
          <span>✓ Selected: <strong>${this.escapeHtml(matches[0].fullName)}</strong> (${matches[0].mrn})</span>
          <button type="button" class="btn btn-sm btn-ghost" onclick="document.getElementById('tx-search-results').style.display='none'" style="font-size: 0.75rem; padding: 2px 6px;">✕</button>
        </div>
      `;
      return;
    }

    // Multiple matches
    resultsEl.innerHTML = `
      <div style="background: #fff; border: 1.5px solid #7c3aed; border-radius: 6px; padding: 0.5rem; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
        <div style="font-size: 0.78rem; font-weight: 700; color: #6b21a8; margin-bottom: 0.4rem; display: flex; justify-content: space-between; align-items: center;">
          <span>${matches.length} matches found — Click to select:</span>
          <button type="button" class="btn btn-sm btn-ghost" onclick="document.getElementById('tx-search-results').style.display='none'" style="font-size: 0.75rem; padding: 2px 6px;">✕</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.35rem; max-height: 190px; overflow-y: auto;">
          ${matches.map(p => `
            <div onclick="app.selectTxPatient('${p.id}')"
                 style="cursor: pointer; padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: 5px; background: #fafafa; display: flex; align-items: center; justify-content: space-between; transition: all 0.15s;"
                 onmouseover="this.style.background='#f3e8ff'; this.style.borderColor='#7c3aed';"
                 onmouseout="this.style.background='#fafafa'; this.style.borderColor='var(--border)';">
              <div>
                <strong style="color: #6b21a8; font-size: 0.85rem;">${this.escapeHtml(p.fullName)}</strong>
                <span style="font-size: 0.72rem; background: #e2e8f0; padding: 1px 5px; border-radius: 3px; margin-left: 5px; font-family: monospace;">${p.mrn}</span>
                ${p.philhealthNo ? `<span style="font-size: 0.72rem; background: #f3e8ff; color: #6b21a8; padding: 1px 5px; border-radius: 3px; margin-left: 4px;">PIN: ${this.escapeHtml(p.philhealthNo)}</span>` : ''}
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 1px;">
                  Protocol: <strong>${this.escapeHtml(p.activeRegimen || 'TBD')}</strong> | ${this.escapeHtml(p.cancerType)} (${this.escapeHtml(p.stage || 'Unstaged')})
                </div>
              </div>
              <button type="button" class="btn btn-sm btn-secondary" style="pointer-events: none; font-size: 0.75rem; padding: 0.25rem 0.6rem;">Select</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  populateTxPatientDropdown(query = '') {
    this.performTxPatientSearch(query);
  }

  clearConsultPatient() {
    const hiddenInput = document.getElementById('consult-patient-select');
    if (hiddenInput) hiddenInput.value = '';
    const searchInput = document.getElementById('consult-patient-search');
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    const preview = document.getElementById('consult-selected-patient-preview');
    if (preview) preview.style.display = 'none';
    const results = document.getElementById('consult-search-results');
    if (results) results.style.display = 'none';
    const oncField = document.getElementById('consult-oncologist');
    if (oncField) oncField.value = '';
    const wtField = document.getElementById('consult-weight');
    if (wtField) wtField.value = '';
  }

  clearTxPatient() {
    const hiddenInput = document.getElementById('tx-patient-select');
    if (hiddenInput) hiddenInput.value = '';
    const searchInput = document.getElementById('tx-patient-search');
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    const preview = document.getElementById('tx-selected-patient-preview');
    if (preview) preview.style.display = 'none';
    const results = document.getElementById('tx-search-results');
    if (results) results.style.display = 'none';
    const oncField = document.getElementById('tx-oncologist');
    if (oncField) oncField.value = '';
    const nurseField = document.getElementById('tx-nurse');
    if (nurseField) nurseField.value = '';
  }

  updateConsultPatientPreview(patientId) {
    const preview = document.getElementById('consult-selected-patient-preview');
    if (!preview) return;

    const patient = this.getPatientById(patientId);
    if (!patient) {
      preview.style.display = 'none';
      return;
    }

    const allergies = Array.isArray(patient.allergies) ? patient.allergies : [patient.allergies || 'NKDA'];
    const hasAllergies = allergies.some(a => a && !a.toLowerCase().includes('nkda'));
    const initials = patient.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    preview.style.display = 'block';
    preview.innerHTML = `
      <div class="preview-patient-card-body">
        <div class="preview-patient-avatar" style="background: linear-gradient(135deg, #15803d, #16a34a); border: 2px solid #86efac; overflow: hidden;">
          ${this.renderPatientAvatar(patient)}
        </div>
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
            <div style="font-weight: 700; color: #14532d; font-size: 0.95rem;">
              🌿 ${this.escapeHtml(patient.fullName)} <span style="font-family: monospace; color: #15803d;">(${patient.mrn})</span>
              ${patient.philhealthNo ? `<span style="font-size: 0.75rem; background: #dcfce7; color: #166534; padding: 2px 7px; border-radius: 4px; margin-left: 4px; font-weight: 600;">PIN: ${this.escapeHtml(patient.philhealthNo)}</span>` : ''}
            </div>
            <div style="display: flex; align-items: center; gap: 0.45rem;">
              ${this.renderStatusBadge(patient.status)}
              <button type="button" class="btn btn-sm btn-ghost" onclick="app.clearConsultPatient()" style="font-size: 0.72rem; padding: 2px 8px; border: 1px solid #86efac; background: #fff; border-radius: 4px; color: #15803d;" title="Clear patient and search another">
                ✕ Switch
              </button>
            </div>
          </div>
          ${patient.residentialAddress ? `
            <div style="font-size: 0.78rem; color: #166534; margin-top: 0.2rem;">
              📍 <em>${this.escapeHtml(patient.residentialAddress)}</em>
            </div>
          ` : ''}
          <div style="color: #334155; font-size: 0.8rem; margin-top: 0.15rem;">
            ${patient.age} yrs, ${patient.gender} | Civil Status: <strong>${this.escapeHtml(patient.civilStatus || patient.maritalStatus || 'Single')}</strong> | Religion: <strong>${this.escapeHtml(patient.religion || 'Not specified')}</strong> | Blood: <strong>${patient.bloodType || 'Unknown'}</strong> | <strong>${this.escapeHtml(patient.cancerType)}</strong> (${this.escapeHtml(patient.stage || 'Unstaged')})
          </div>
          <div style="color: #475569; font-size: 0.78rem; margin-top: 0.15rem;">
            Current Weight: <strong>${patient.weightKg || '--'} kg</strong> | Baseline BSA: <strong>${patient.bsa || '--'} m²</strong> | Oncologist: ${this.escapeHtml(patient.primaryOncologist || 'Not assigned')}
          </div>
          ${hasAllergies ? `
            <div style="margin-top: 0.35rem; color: var(--danger); font-weight: 700; font-size: 0.8rem;">
              ⚠️ Known Allergies: ${this.escapeHtml(allergies.join(', '))}
            </div>
          ` : ''}
        </div>
      </div>
    `;

    if (patient.primaryOncologist) {
      const oncField = document.getElementById('consult-oncologist');
      if (oncField) oncField.value = patient.primaryOncologist;
    }
    if (patient.weightKg) {
      const wtField = document.getElementById('consult-weight');
      if (wtField) wtField.value = patient.weightKg;
    }
  }

  updateTxPatientPreview(patientId) {
    const preview = document.getElementById('tx-selected-patient-preview');
    if (!preview) return;

    const patient = this.getPatientById(patientId);
    if (!patient) {
      preview.style.display = 'none';
      return;
    }

    const allergies = Array.isArray(patient.allergies) ? patient.allergies : [patient.allergies || 'NKDA'];
    const hasAllergies = allergies.some(a => a && !a.toLowerCase().includes('nkda'));
    const initials = patient.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    preview.style.display = 'block';
    preview.innerHTML = `
      <div class="preview-patient-card-body">
        <div class="preview-patient-avatar" style="background: linear-gradient(135deg, #ca8a04, #eab308); border: 2px solid #fde047; color: #713f12; overflow: hidden;">
          ${this.renderPatientAvatar(patient)}
        </div>
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
            <div style="font-weight: 700; color: #713f12; font-size: 0.95rem;">
              🟡 ${this.escapeHtml(patient.fullName)} <span style="font-family: monospace; color: #a16207;">(${patient.mrn})</span>
              ${patient.philhealthNo ? `<span style="font-size: 0.75rem; background: #fef08a; color: #713f12; padding: 2px 7px; border-radius: 4px; margin-left: 4px; font-weight: 600;">PIN: ${this.escapeHtml(patient.philhealthNo)}</span>` : ''}
            </div>
            <div style="display: flex; align-items: center; gap: 0.45rem;">
              ${this.renderStatusBadge(patient.status)}
              <button type="button" class="btn btn-sm btn-ghost" onclick="app.clearTxPatient()" style="font-size: 0.72rem; padding: 2px 8px; border: 1px solid #fde047; background: #fff; border-radius: 4px; color: #854d0e;" title="Clear patient and search another">
                ✕ Switch
              </button>
            </div>
          </div>
          ${patient.residentialAddress ? `
            <div style="font-size: 0.78rem; color: #854d0e; margin-top: 0.2rem;">
              📍 <em>${this.escapeHtml(patient.residentialAddress)}</em>
            </div>
          ` : ''}
          <div style="color: #475569; margin-top: 0.15rem; font-size: 0.8rem;">
            ${patient.age} yrs, ${patient.gender} | Civil Status: <strong>${this.escapeHtml(patient.civilStatus || patient.maritalStatus || 'Single')}</strong> | Religion: <strong>${this.escapeHtml(patient.religion || 'Not specified')}</strong> | Protocol: <strong style="color: #a16207;">${this.escapeHtml(patient.activeRegimen || 'Custom Protocol')}</strong> | Next Cycle: <strong>${(patient.cyclesCompleted || 0) + 1}</strong> of ${patient.cyclesPlanned || '?'}
          </div>
          <div style="color: #64748b; font-size: 0.78rem; margin-top: 0.15rem;">
            BSA: <strong>${patient.bsa || '--'} m²</strong> (${patient.weightKg || '--'} kg) | Nurse: ${this.escapeHtml(patient.primaryNurse || 'OCN')} | Oncologist: ${this.escapeHtml(patient.primaryOncologist || '-')}
          </div>
          ${hasAllergies ? `
            <div style="margin-top: 0.35rem; color: var(--danger); font-weight: 700; font-size: 0.8rem;">
              ⚠️ Critical Allergy Alert: ${this.escapeHtml(allergies.join(', '))} (Verify premeds!)
            </div>
          ` : ''}
        </div>
      </div>
    `;

    if (patient.primaryOncologist) {
      const oncField = document.getElementById('tx-oncologist');
      if (oncField) oncField.value = patient.primaryOncologist;
    }
    if (patient.primaryNurse) {
      const nurseField = document.getElementById('tx-nurse');
      if (nurseField) nurseField.value = patient.primaryNurse;
    }
    const cycleNumField = document.getElementById('tx-cycle-num');
    if (cycleNumField) cycleNumField.value = (patient.cyclesCompleted || 0) + 1;
    const cycleTotalField = document.getElementById('tx-cycle-total');
    if (cycleTotalField) cycleTotalField.value = patient.cyclesPlanned || 8;
  }

  populatePatientDropdowns() {
    this.populateConsultPatientDropdown('');
    this.populateTxPatientDropdown('');

    const consultFilter = document.getElementById('consult-patient-filter');
    const txFilter = document.getElementById('tx-patient-filter');
    const reportPatFilter = document.getElementById('report-patient-filter');

    const options = this.patients.map(p => `<option value="${p.id}">${this.escapeHtml(p.fullName)} (${p.mrn}) - ${p.cancerType}</option>`).join('');

    const filterOptions = '<option value="">All Patients</option>' + options;
    if (consultFilter) consultFilter.innerHTML = filterOptions;
    if (txFilter) txFilter.innerHTML = filterOptions;

    if (reportPatFilter) {
      reportPatFilter.innerHTML = '<option value="">All Patients (Center Summary)</option>' + options;
      reportPatFilter.value = this.reportSelectedPatientId || '';
    }

    // Regimens select in tx modal
    const regimenSelect = document.getElementById('tx-regimen-select');
    if (regimenSelect && typeof CHEMO_PROTOCOLS !== 'undefined') {
      regimenSelect.innerHTML = CHEMO_PROTOCOLS.map(pr => `<option value="${pr.id}">${pr.name} (${pr.cancerType})</option>`).join('') + '<option value="custom">Other / Custom Protocol</option>';
    }
  }

  openNewConsultModal(preselectedPatientId = null) {
    const modal = document.getElementById('modal-consultation');
    const form = document.getElementById('form-consultation');
    form.reset();
    document.getElementById('consult-id').value = '';

    const titleEl = document.getElementById('modal-consult-title');
    if (titleEl) titleEl.textContent = 'Log Oncologic Consultation & Clearance';
    const btnSave = document.getElementById('btn-save-consult');
    if (btnSave) btnSave.textContent = 'Log Consultation';

    document.getElementById('consult-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('consult-time').value = new Date().toTimeString().slice(0, 5);

    const searchInput = document.getElementById('consult-patient-search');
    if (searchInput) searchInput.value = '';

    const resultsEl = document.getElementById('consult-search-results');
    if (resultsEl) {
      resultsEl.innerHTML = '';
      resultsEl.style.display = 'none';
    }

    const preview = document.getElementById('consult-selected-patient-preview');
    const hiddenInput = document.getElementById('consult-patient-select');

    if (preselectedPatientId) {
      this.selectConsultPatient(preselectedPatientId);
    } else {
      // Upon opening: do not display patient details, just search bar
      if (preview) preview.style.display = 'none';
      if (hiddenInput) hiddenInput.value = '';
      const oncField = document.getElementById('consult-oncologist');
      if (oncField) oncField.value = '';
      const wtField = document.getElementById('consult-weight');
      if (wtField) wtField.value = '';
    }

    this.openModal(modal);
    setTimeout(() => searchInput?.focus(), 150);
  }

  requestEditConsultation(id) {
    const consult = this.consultations.find(c => c.id === id);
    if (!consult) return;
    const patient = this.getPatientById(consult.patientId);
    const patName = patient ? patient.fullName : 'Patient';

    this.requireAuthorization(
      `Edit Consultation & Clearance: ${patName} (${consult.date})`,
      () => this.openEditConsultModal(id)
    );
  }

  editConsultation(id) {
    this.requestEditConsultation(id);
  }

  openEditConsultModal(id) {
    const consult = this.consultations.find(c => c.id === id);
    if (!consult) return;

    const modal = document.getElementById('modal-consultation');
    const form = document.getElementById('form-consultation');
    form.reset();

    // Set editing state
    document.getElementById('consult-id').value = consult.id;
    const titleEl = document.getElementById('modal-consult-title');
    if (titleEl) titleEl.textContent = 'Edit Oncologic Consultation & Clearance';
    const btnSave = document.getElementById('btn-save-consult');
    if (btnSave) btnSave.textContent = 'Update Consultation Record';

    // Select patient
    this.selectConsultPatient(consult.patientId);

    const setVal = (fieldId, val) => {
      const el = document.getElementById(fieldId);
      if (el && val !== undefined && val !== null) el.value = val;
    };

    setVal('consult-type', consult.consultationType || 'Pre-Chemotherapy Clearance');
    setVal('consult-date', consult.date);
    setVal('consult-time', consult.time);
    setVal('consult-oncologist', consult.oncologist);
    setVal('consult-reason', consult.reasonForVisit);

    if (consult.vitals) {
      setVal('consult-bp', consult.vitals.bp);
      setVal('consult-pulse', consult.vitals.pulse);
      setVal('consult-temp', consult.vitals.tempC);
      setVal('consult-weight', consult.vitals.weightKg);
      setVal('consult-ecog', consult.vitals.ecogScore);
      setVal('consult-pain', consult.vitals.painScore);
    }

    if (consult.labReview) {
      setVal('consult-anc', consult.labReview.anc);
      setVal('consult-platelets', consult.labReview.platelets);
      setVal('consult-hb', consult.labReview.hemoglobin);
      setVal('consult-creatinine', consult.labReview.creatinine);
    }

    const tox = typeof consult.toxicityGrading === 'string'
      ? consult.toxicityGrading
      : (consult.toxicityGrading ? Object.entries(consult.toxicityGrading).map(([k, v]) => `${k}: ${v}`).join(', ') : '');
    setVal('consult-toxicity-notes', tox);
    setVal('consult-clinical-notes', consult.clinicalNotes);
    setVal('consult-clearance-decision', consult.clearanceStatus || consult.decision || 'CLEARED');
    setVal('consult-dose-adj', consult.doseAdjustmentPercent ?? 0);
    setVal('consult-plan', consult.managementPlan);
    setVal('consult-next-date', consult.nextAppointmentDate);

    this.openModal(modal);
  }

  saveConsultation(formData) {
    const id = formData.get('consult-id') || document.getElementById('consult-id')?.value || ('con-' + Date.now());
    const patientId = formData.get('consult-patient-select') || document.getElementById('consult-patient-select')?.value;
    if (!patientId) {
      this.showToast('Please search and select a patient first.', 'warning');
      return;
    }
    const weightKg = parseFloat(formData.get('consult-weight')) || 0;

    const consultData = {
      id,
      patientId,
      date: formData.get('consult-date'),
      time: formData.get('consult-time'),
      oncologist: formData.get('consult-oncologist'),
      consultationType: formData.get('consult-type'),
      reasonForVisit: formData.get('consult-reason'),
      vitals: {
        bp: formData.get('consult-bp'),
        pulse: parseInt(formData.get('consult-pulse') || '0', 10),
        tempC: parseFloat(formData.get('consult-temp')) || 0,
        weightKg,
        ecogScore: parseInt(formData.get('consult-ecog') || '0', 10),
        painScore: parseInt(formData.get('consult-pain') || '0', 10)
      },
      labReview: {
        anc: parseFloat(formData.get('consult-anc')) || null,
        platelets: parseFloat(formData.get('consult-platelets')) || null,
        hemoglobin: parseFloat(formData.get('consult-hb')) || null,
        creatinine: parseFloat(formData.get('consult-creatinine')) || null
      },
      toxicityGrading: formData.get('consult-toxicity-notes'),
      clinicalNotes: formData.get('consult-clinical-notes'),
      clearanceStatus: formData.get('consult-clearance-decision'),
      decision: formData.get('consult-clearance-decision'),
      doseAdjustmentPercent: parseInt(formData.get('consult-dose-adj') || '0', 10),
      managementPlan: formData.get('consult-plan'),
      nextAppointmentDate: formData.get('consult-next-date'),
      createdAt: new Date().toISOString()
    };

    // Update patient current weight & BSA if valid
    const patient = this.getPatientById(patientId);
    if (patient && weightKg > 0) {
      patient.weightKg = weightKg;
      if (patient.heightCm) {
        patient.bsa = this.calculateBSA(patient.heightCm, weightKg);
        patient.bmi = this.calculateBMI(patient.heightCm, weightKg);
      }
    }

    const existingIdx = this.consultations.findIndex(c => c.id === id);
    if (existingIdx !== -1) {
      this.consultations[existingIdx] = {
        ...this.consultations[existingIdx],
        ...consultData,
        updatedAt: new Date().toISOString()
      };
      this.saveData();
      this.closeModal(document.getElementById('modal-consultation'));
      this.showToast('Consultation record updated successfully!', 'success');
      this.render();
    } else {
      this.consultations.unshift(consultData);
      this.saveData();
      this.closeModal(document.getElementById('modal-consultation'));
      this.showToast('Consultation and clearance record logged successfully!', 'success');
      this.render();
    }
  }

  requestDeleteConsultation(id) {
    const consult = this.consultations.find(c => c.id === id);
    if (!consult) return;
    const patient = this.getPatientById(consult.patientId);
    const patName = patient ? patient.fullName : 'Patient';

    this.requireAuthorization(
      `Delete Consultation Record: ${patName} (${consult.date})`,
      () => {
        if (confirm(`Permanently delete consultation record for ${patName} on ${consult.date}? This action cannot be undone.`)) {
          this.consultations = this.consultations.filter(c => c.id !== id);
          this.saveData();
          this.showToast(`Consultation record for ${patName} deleted.`, 'info');
          this.render();
        }
      }
    );
  }

  deleteConsultation(id) {
    this.requestDeleteConsultation(id);
  }

  /* ------------------------------------------------------------------
   * Modal Form Controls: Chemotherapy Treatments
   * ------------------------------------------------------------------ */
  openNewTreatmentModal(preselectedPatientId = null) {
    const modal = document.getElementById('modal-treatment');
    const form = document.getElementById('form-treatment');
    form.reset();
    document.getElementById('tx-id').value = '';

    const titleEl = document.getElementById('modal-tx-title');
    if (titleEl) titleEl.textContent = 'Log Chemotherapy Infusion Session';
    const btnSave = document.getElementById('btn-save-tx');
    if (btnSave) btnSave.textContent = 'Save Treatment Infusion Log';

    document.getElementById('tx-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('tx-start-time').value = new Date().toTimeString().slice(0, 5);

    const searchInput = document.getElementById('tx-patient-search');
    if (searchInput) searchInput.value = '';

    const resultsEl = document.getElementById('tx-search-results');
    if (resultsEl) {
      resultsEl.innerHTML = '';
      resultsEl.style.display = 'none';
    }

    const preview = document.getElementById('tx-selected-patient-preview');
    const hiddenInput = document.getElementById('tx-patient-select');

    if (preselectedPatientId) {
      this.selectTxPatient(preselectedPatientId);
    } else {
      // Upon opening: do not display patient details, just search bar
      if (preview) preview.style.display = 'none';
      if (hiddenInput) hiddenInput.value = '';
      const oncField = document.getElementById('tx-oncologist');
      if (oncField) oncField.value = '';
      const nurseField = document.getElementById('tx-nurse');
      if (nurseField) nurseField.value = '';
      const cycleNumField = document.getElementById('tx-cycle-num');
      if (cycleNumField) cycleNumField.value = '1';
    }

    // Initialize drug table with first regimen
    this.onRegimenSelectChanged();

    this.openModal(modal);
    setTimeout(() => searchInput?.focus(), 150);
  }

  requestEditTreatment(id) {
    const tx = this.treatments.find(t => t.id === id);
    if (!tx) return;
    const patient = this.getPatientById(tx.patientId);
    const patName = patient ? patient.fullName : 'Patient';

    this.requireAuthorization(
      `Edit Chemo Infusion: ${patName} (Cycle ${tx.cycleNumber} - ${tx.regimenName})`,
      () => this.openEditTreatmentModal(id)
    );
  }

  editTreatment(id) {
    this.requestEditTreatment(id);
  }

  openEditTreatmentModal(id) {
    const tx = this.treatments.find(t => t.id === id);
    if (!tx) return;

    const modal = document.getElementById('modal-treatment');
    const form = document.getElementById('form-treatment');
    form.reset();

    // Set editing state
    document.getElementById('tx-id').value = tx.id;
    const titleEl = document.getElementById('modal-tx-title');
    if (titleEl) titleEl.textContent = 'Edit Chemotherapy Infusion Session';
    const btnSave = document.getElementById('btn-save-tx');
    if (btnSave) btnSave.textContent = 'Update Treatment Infusion Log';

    // Select patient
    this.selectTxPatient(tx.patientId);

    const setVal = (fieldId, val) => {
      const el = document.getElementById(fieldId);
      if (el && val !== undefined && val !== null) el.value = val;
    };

    setVal('tx-regimen-select', tx.regimenId || 'custom');
    setVal('tx-cycle-num', tx.cycleNumber || 1);
    setVal('tx-cycle-total', tx.cycleTotal || 8);
    setVal('tx-date', tx.treatmentDate);
    setVal('tx-start-time', tx.startTime);
    setVal('tx-end-time', tx.endTime);
    setVal('tx-oncologist', tx.attendingOncologist);
    setVal('tx-nurse', tx.supervisingNurse);

    const premedsText = Array.isArray(tx.premedsGiven)
      ? tx.premedsGiven.map(p => typeof p === 'object' ? `${p.name} ${p.dose || ''} ${p.status || ''}`.trim() : p).join('\n')
      : (tx.premedsGiven || '');
    setVal('tx-premeds', premedsText);

    if (Array.isArray(tx.vitalsLog) && tx.vitalsLog.length > 0) {
      if (tx.vitalsLog[0]) setVal('tx-vitals-pre', `BP ${tx.vitalsLog[0].bp || ''}, HR ${tx.vitalsLog[0].pulse || ''}`);
      if (tx.vitalsLog[1]) setVal('tx-vitals-mid', `BP ${tx.vitalsLog[1].bp || ''}, HR ${tx.vitalsLog[1].pulse || ''}`);
      if (tx.vitalsLog[2]) setVal('tx-vitals-post', `BP ${tx.vitalsLog[2].bp || ''}, HR ${tx.vitalsLog[2].pulse || ''}`);
    }

    setVal('tx-iv-access', tx.ivAccessSite);
    setVal('tx-tolerance', tx.toleranceGrade || 'Grade 0 (Well tolerated, no reaction)');
    setVal('tx-next-cycle', tx.nextCycleDate);
    setVal('tx-adverse-notes', tx.adverseReactions);

    // Populate drugs table
    const container = document.getElementById('tx-drugs-table-container');
    const drugs = Array.isArray(tx.drugsAdministered) && tx.drugsAdministered.length > 0 ? tx.drugsAdministered : [];
    if (container) {
      container.innerHTML = `
        <table class="data-table" style="font-size: 0.8rem;">
          <thead>
            <tr>
              <th>Drug Name</th>
              <th>Planned Dose</th>
              <th>Actual Admin Dose</th>
              <th>Route</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="tx-drugs-tbody">
            ${drugs.length > 0 ? drugs.map(d => `
              <tr>
                <td><input type="text" class="form-control form-control-sm drug-name-input" value="${this.escapeHtml(d.drugName || '')}" required></td>
                <td><input type="text" class="form-control form-control-sm drug-plan-input" value="${this.escapeHtml(d.plannedDose || '')}"></td>
                <td><input type="text" class="form-control form-control-sm drug-actual-input" value="${this.escapeHtml(d.actualDose || d.plannedDose || '')}" required></td>
                <td><input type="text" class="form-control form-control-sm drug-route-input" value="${this.escapeHtml(d.route || 'IV')}"></td>
                <td><button type="button" class="btn btn-sm btn-ghost" style="color:var(--danger);" onclick="this.closest('tr').remove()">×</button></td>
              </tr>
            `).join('') : `
              <tr>
                <td><input type="text" class="form-control form-control-sm drug-name-input" placeholder="e.g. Paclitaxel" required></td>
                <td><input type="text" class="form-control form-control-sm drug-plan-input" placeholder="175 mg/m²"></td>
                <td><input type="text" class="form-control form-control-sm drug-actual-input" placeholder="300 mg" required></td>
                <td><input type="text" class="form-control form-control-sm drug-route-input" placeholder="IV Infusion 3 hrs"></td>
                <td><button type="button" class="btn btn-sm btn-ghost" style="color:var(--danger);" onclick="this.closest('tr').remove()">×</button></td>
              </tr>
            `}
          </tbody>
        </table>
      `;
    }

    this.openModal(modal);
  }

  openNewTreatmentWithProtocol(protoId) {
    this.openNewTreatmentModal();
    const select = document.getElementById('tx-regimen-select');
    if (select) {
      select.value = protoId;
      this.onRegimenSelectChanged();
    }
  }

  onRegimenSelectChanged() {
    const regId = document.getElementById('tx-regimen-select')?.value;
    const proto = typeof CHEMO_PROTOCOLS !== 'undefined' ? CHEMO_PROTOCOLS.find(p => p.id === regId) : null;
    const container = document.getElementById('tx-drugs-table-container');
    const premedsInput = document.getElementById('tx-premeds');

    if (proto) {
      if (premedsInput) {
        premedsInput.value = proto.premeds.join('\n');
      }
      if (container) {
        container.innerHTML = `
          <table class="data-table" style="font-size: 0.8rem;">
            <thead>
              <tr>
                <th>Drug Name</th>
                <th>Planned Dose</th>
                <th>Actual Admin Dose</th>
                <th>Route</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="tx-drugs-tbody">
              ${proto.drugs.map((d, i) => `
                <tr>
                  <td><input type="text" class="form-control form-control-sm drug-name-input" value="${this.escapeHtml(d.name)}" required></td>
                  <td><input type="text" class="form-control form-control-sm drug-plan-input" value="${this.escapeHtml(d.standardDose)}"></td>
                  <td><input type="text" class="form-control form-control-sm drug-actual-input" placeholder="e.g. 150 mg" value="${this.escapeHtml(d.standardDose)}" required></td>
                  <td><input type="text" class="form-control form-control-sm drug-route-input" value="${this.escapeHtml(d.route)}"></td>
                  <td><button type="button" class="btn btn-sm btn-ghost" style="color:var(--danger);" onclick="this.closest('tr').remove()">×</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    } else {
      if (container) {
        container.innerHTML = `
          <table class="data-table" style="font-size: 0.8rem;">
            <thead>
              <tr>
                <th>Drug Name</th>
                <th>Planned Dose</th>
                <th>Actual Admin Dose</th>
                <th>Route</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="tx-drugs-tbody">
              <tr>
                <td><input type="text" class="form-control form-control-sm drug-name-input" placeholder="e.g. Paclitaxel" required></td>
                <td><input type="text" class="form-control form-control-sm drug-plan-input" placeholder="175 mg/m²"></td>
                <td><input type="text" class="form-control form-control-sm drug-actual-input" placeholder="300 mg" required></td>
                <td><input type="text" class="form-control form-control-sm drug-route-input" placeholder="IV Infusion 3 hrs"></td>
                <td><button type="button" class="btn btn-sm btn-ghost" style="color:var(--danger);" onclick="this.closest('tr').remove()">×</button></td>
              </tr>
            </tbody>
          </table>
        `;
      }
    }
  }

  addDrugRow() {
    const tbody = document.getElementById('tx-drugs-tbody');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="form-control form-control-sm drug-name-input" placeholder="Drug Name" required></td>
      <td><input type="text" class="form-control form-control-sm drug-plan-input" placeholder="Planned Dose"></td>
      <td><input type="text" class="form-control form-control-sm drug-actual-input" placeholder="Actual Dose" required></td>
      <td><input type="text" class="form-control form-control-sm drug-route-input" placeholder="Route / Duration"></td>
      <td><button type="button" class="btn btn-sm btn-ghost" style="color:var(--danger);" onclick="this.closest('tr').remove()">×</button></td>
    `;
    tbody.appendChild(tr);
  }

  saveTreatment(formData) {
    const id = formData.get('tx-id') || document.getElementById('tx-id')?.value || ('tx-' + Date.now());
    const patientId = formData.get('tx-patient-select') || document.getElementById('tx-patient-select')?.value;
    if (!patientId) {
      this.showToast('Please search and select a patient first.', 'warning');
      return;
    }
    const regimenSelect = document.getElementById('tx-regimen-select');
    const regimenId = regimenSelect ? regimenSelect.value : 'custom';
    const regimenName = regimenSelect && regimenSelect.selectedOptions[0] ? regimenSelect.selectedOptions[0].text : 'Chemotherapy';

    const cycleNumber = parseInt(formData.get('tx-cycle-num') || '1', 10);
    const cycleTotal = parseInt(formData.get('tx-cycle-total') || '8', 10);

    // Extract drugs table
    const drugs = [];
    const rows = document.querySelectorAll('#tx-drugs-tbody tr');
    rows.forEach(r => {
      const name = r.querySelector('.drug-name-input')?.value;
      const plan = r.querySelector('.drug-plan-input')?.value;
      const actual = r.querySelector('.drug-actual-input')?.value;
      const route = r.querySelector('.drug-route-input')?.value;
      if (name) {
        drugs.push({
          drugName: name,
          plannedDose: plan,
          actualDose: actual,
          route: route,
          dualVerification: true
        });
      }
    });

    const txData = {
      id,
      patientId,
      regimenId,
      regimenName,
      cycleNumber,
      cycleTotal,
      treatmentDate: formData.get('tx-date') || document.getElementById('tx-date')?.value,
      startTime: formData.get('tx-start-time') || document.getElementById('tx-start-time')?.value,
      endTime: formData.get('tx-end-time') || document.getElementById('tx-end-time')?.value,
      attendingOncologist: formData.get('tx-oncologist') || document.getElementById('tx-oncologist')?.value,
      supervisingNurse: formData.get('tx-nurse') || document.getElementById('tx-nurse')?.value,
      premedsGiven: formData.get('tx-premeds') || document.getElementById('tx-premeds')?.value,
      drugsAdministered: drugs,
      ivAccessSite: formData.get('tx-iv-access') || document.getElementById('tx-iv-access')?.value,
      toleranceGrade: formData.get('tx-tolerance') || document.getElementById('tx-tolerance')?.value,
      adverseReactions: formData.get('tx-adverse-notes') || document.getElementById('tx-adverse-notes')?.value,
      nextCycleDate: formData.get('tx-next-cycle') || document.getElementById('tx-next-cycle')?.value,
      createdAt: new Date().toISOString()
    };

    // Update patient's completed cycles count if this is the newest cycle
    const patient = this.getPatientById(patientId);
    if (patient && cycleNumber > (patient.cyclesCompleted || 0)) {
      patient.cyclesCompleted = cycleNumber;
    }

    const existingIdx = this.treatments.findIndex(t => t.id === id);
    if (existingIdx !== -1) {
      this.treatments[existingIdx] = {
        ...this.treatments[existingIdx],
        ...txData,
        updatedAt: new Date().toISOString()
      };
      this.saveData();
      this.closeModal(document.getElementById('modal-treatment'));
      this.showToast('Chemotherapy infusion record updated successfully!', 'success');
      this.render();
    } else {
      this.treatments.unshift(txData);
      this.saveData();
      this.closeModal(document.getElementById('modal-treatment'));
      this.showToast(`Chemotherapy infusion session logged for ${patient ? patient.fullName : 'patient'}!`, 'success');
      this.render();
    }
  }

  requestDeleteTreatment(id) {
    const tx = this.treatments.find(t => t.id === id);
    if (!tx) return;
    const patient = this.getPatientById(tx.patientId);
    const patName = patient ? patient.fullName : 'Patient';

    this.requireAuthorization(
      `Delete Chemo Infusion Record: ${patName} (Cycle ${tx.cycleNumber} - ${tx.regimenName}) on ${tx.treatmentDate}`,
      () => {
        if (confirm(`Permanently delete chemotherapy infusion record for ${patName} (Cycle ${tx.cycleNumber} - ${tx.regimenName}) on ${tx.treatmentDate}? This action cannot be undone.`)) {
          this.treatments = this.treatments.filter(t => t.id !== id);
          this.saveData();
          this.showToast(`Chemotherapy treatment record for ${patName} deleted.`, 'info');
          this.render();
        }
      }
    );
  }

  deleteTreatment(id) {
    this.requestDeleteTreatment(id);
  }

  /* ------------------------------------------------------------------
   * Badge Formatters & Utilities
   * ------------------------------------------------------------------ */
  renderStatusBadge(status) {
    const s = (status || '').toLowerCase().trim();
    if (s === 'active' || s === 'active treatment') {
      return `<span class="badge badge-success" style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-weight: 700;">● Active</span>`;
    } else if (s === 'not active' || s === 'paused' || s === 'holding / paused' || s === 'new evaluation') {
      return `<span class="badge badge-warning" style="background: #fffbeb; color: #b45309; border: 1px solid #fde68a; font-weight: 700;">⏸ Not Active</span>`;
    } else if (s === 'deceased' || s === 'discharged' || s === 'expired') {
      return `<span class="badge badge-danger" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; font-weight: 700;">✝ Deceased</span>`;
    } else if (s === 'graduated' || s === 'in remission') {
      return `<span class="badge badge-purple" style="background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; font-weight: 700;">🎓 Graduated</span>`;
    } else if (s === 'under surveillance' || s === 'surveillance') {
      return `<span class="badge badge-info" style="background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; font-weight: 700;">👁 Under Surveillance</span>`;
    } else {
      return `<span class="badge badge-secondary" style="font-weight: 600;">${this.escapeHtml(status || 'Active')}</span>`;
    }
  }

  renderClearanceBadge(decision) {
    if (!decision) return `<span class="badge badge-secondary">Pending</span>`;
    const d = decision.toUpperCase();
    if (d.includes('CLEARED') && !d.includes('REDUC')) {
      return `<span class="badge badge-success">✓ Cleared for Chemo</span>`;
    } else if (d.includes('REDUC') || d.includes('DOSE')) {
      return `<span class="badge badge-warning">⚠ Cleared w/ Dose Reduction</span>`;
    } else if (d.includes('DELAY') || d.includes('WITHHELD')) {
      return `<span class="badge badge-danger">✕ Cycle Delayed</span>`;
    } else {
      return `<span class="badge badge-purple">${this.escapeHtml(decision)}</span>`;
    }
  }

  renderToleranceBadge(grade) {
    if (!grade) return `<span class="badge badge-secondary">Tolerated</span>`;
    if (grade.includes('Grade 0') || grade.includes('Well tolerated')) {
      return `<span class="badge badge-success">Grade 0 (Good)</span>`;
    } else if (grade.includes('Grade 1')) {
      return `<span class="badge badge-info">Grade 1 (Mild)</span>`;
    } else if (grade.includes('Grade 2')) {
      return `<span class="badge badge-warning">Grade 2 (Moderate)</span>`;
    } else {
      return `<span class="badge badge-danger">Grade 3+ (Reaction)</span>`;
    }
  }

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  openModal(modalEl) {
    if (modalEl) modalEl.classList.add('open');
  }

  closeModal(modalEl) {
    if (modalEl) modalEl.classList.remove('open');
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  /* ------------------------------------------------------------------
   * Full Medical Timeline Filter & Detail View Handlers
   * ------------------------------------------------------------------ */
  setTimelineFilter(filter) {
    this.timelineFilter = filter || 'all';
    document.querySelectorAll('.timeline-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-timeline-filter') === this.timelineFilter);
    });
    if (this.selectedPatientId) {
      const p = this.getPatientById(this.selectedPatientId);
      if (p) {
        this.renderChartActiveTab(p, this.getPatientConsultations(p.id), this.getPatientTreatments(p.id));
      }
    }
  }

  viewTimelineEvent(type, id) {
    if (type === 'consultation') {
      this.viewConsultation(id);
    } else if (type === 'treatment') {
      this.viewTreatment(id);
    }
  }

  viewConsultation(id) {
    const consult = this.consultations.find(c => c.id === id);
    if (!consult) {
      this.showToast('Consultation record not found.', 'danger');
      return;
    }
    const patient = this.getPatientById(consult.patientId);

    const titleEl = document.getElementById('modal-view-record-title');
    const headerEl = document.getElementById('modal-view-record-header');
    const bodyEl = document.getElementById('modal-view-record-body');
    const editBtn = document.getElementById('modal-view-edit-btn');

    if (titleEl) {
      titleEl.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -3px;"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
        <span>Consultation & Pre-Chemo Clearance Details</span>
      `;
    }
    if (headerEl) {
      headerEl.style.background = 'linear-gradient(135deg, #15803d, #16a34a)';
      headerEl.style.color = '#ffffff';
    }

    const anc = consult.labReview?.anc;
    const platelets = consult.labReview?.platelets;
    const isAncLow = (anc !== undefined && anc !== null && anc !== '') && Number(anc) < 1.5;
    const isPltLow = (platelets !== undefined && platelets !== null && platelets !== '') && Number(platelets) < 100;

    let toxicitiesHtml = '';
    if (consult.toxicityGrading) {
      if (typeof consult.toxicityGrading === 'string') {
        toxicitiesHtml = `<div style="font-size: 0.88rem; color: #1e293b;">${this.escapeHtml(consult.toxicityGrading)}</div>`;
      } else if (typeof consult.toxicityGrading === 'object') {
        const entries = Object.entries(consult.toxicityGrading);
        if (entries.length > 0) {
          toxicitiesHtml = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem; font-size: 0.85rem;">
              ${entries.map(([k, v]) => `
                <div style="background: #ffffff; padding: 0.45rem 0.65rem; border-radius: 6px; border: 1px solid #fed7aa;">
                  <strong style="text-transform: capitalize; color: #c2410c;">${this.escapeHtml(k)}:</strong>
                  <span style="color: #334155; margin-left: 0.25rem;">${this.escapeHtml(String(v))}</span>
                </div>
              `).join('')}
            </div>
          `;
        }
      }
    }

    if (bodyEl) {
      bodyEl.innerHTML = `
        <!-- Patient Banner -->
        <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <div class="patient-avatar-thumb" style="width: 48px; height: 48px; border: 2px solid #16a34a; font-size: 1rem; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #e2e8f0;">
              ${patient && patient.photo ? `<img src="${patient.photo}" alt="" style="width: 100%; height: 100%; object-fit: cover;">` : (patient ? patient.fullName.slice(0, 2).toUpperCase() : 'PT')}
            </div>
            <div>
              <div style="font-size: 1.15rem; font-weight: 700; color: #14532d;">${patient ? this.escapeHtml(patient.fullName) : 'Unknown Patient'}</div>
              <div style="font-size: 0.82rem; color: #166534; display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 2px;">
                <span><strong>MRN:</strong> ${patient ? patient.mrn : 'N/A'}</span>
                <span>|</span>
                <span><strong>PhilHealth:</strong> ${patient?.philhealthNo || 'N/A'}</span>
                <span>|</span>
                <span><strong>Age/Sex:</strong> ${patient ? `${patient.age}y / ${patient.gender}` : 'N/A'}</span>
              </div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.82rem; color: #166534; font-weight: 600;">Date of Evaluation:</div>
            <div style="font-size: 1rem; font-weight: 700; color: #14532d;">${consult.date} ${consult.time ? `at ${consult.time}` : ''}</div>
            <div style="margin-top: 4px;">${this.renderClearanceBadge(consult.clearanceStatus || consult.decision)}</div>
          </div>
        </div>

        <!-- Clinical Meta Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem;">
          <div style="background: #ffffff; border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Evaluation Type</div>
            <div style="font-weight: 600; color: var(--secondary); margin-top: 2px;">${this.escapeHtml(consult.consultationType || 'Pre-Chemo Clearance')}</div>
          </div>
          <div style="background: #ffffff; border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Attending Oncologist</div>
            <div style="font-weight: 600; color: var(--secondary); margin-top: 2px;">${this.escapeHtml(consult.oncologist || 'Oncologist')}</div>
          </div>
          <div style="background: #ffffff; border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Primary Diagnosis</div>
            <div style="font-weight: 600; color: var(--secondary); margin-top: 2px;">${this.escapeHtml(patient?.primaryDiagnosis || 'N/A')}</div>
          </div>
          <div style="background: #ffffff; border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Reason for Visit</div>
            <div style="font-weight: 600; color: var(--secondary); margin-top: 2px;">${this.escapeHtml(consult.reasonForVisit || 'Routine Pre-Chemo Assessment')}</div>
          </div>
        </div>

        <!-- Vital Signs & Performance Status -->
        <div class="panel" style="margin-bottom: 1.25rem; border: 1px solid #e2e8f0;">
          <div class="panel-header" style="background: #f8fafc; padding: 0.65rem 1rem;">
            <div class="panel-title" style="font-size: 0.9rem; color: #1e293b;">Vital Signs & ECOG Performance Status</div>
          </div>
          <div class="panel-body" style="padding: 0.85rem 1rem;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem; text-align: center;">
              <div style="background: #f1f5f9; padding: 0.5rem; border-radius: 6px;">
                <div style="font-size: 0.72rem; color: #64748b; font-weight: 600;">Blood Pressure</div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #0f172a; margin-top: 2px;">${consult.vitals?.bp || '-'} <span style="font-size: 0.72rem; font-weight: 400; color: #64748b;">mmHg</span></div>
              </div>
              <div style="background: #f1f5f9; padding: 0.5rem; border-radius: 6px;">
                <div style="font-size: 0.72rem; color: #64748b; font-weight: 600;">Heart Rate</div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #0f172a; margin-top: 2px;">${consult.vitals?.pulse || '-'} <span style="font-size: 0.72rem; font-weight: 400; color: #64748b;">bpm</span></div>
              </div>
              <div style="background: #f1f5f9; padding: 0.5rem; border-radius: 6px;">
                <div style="font-size: 0.72rem; color: #64748b; font-weight: 600;">Temperature</div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #0f172a; margin-top: 2px;">${consult.vitals?.tempC || '-'} <span style="font-size: 0.72rem; font-weight: 400; color: #64748b;">°C</span></div>
              </div>
              <div style="background: #f1f5f9; padding: 0.5rem; border-radius: 6px;">
                <div style="font-size: 0.72rem; color: #64748b; font-weight: 600;">Resp Rate</div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #0f172a; margin-top: 2px;">${consult.vitals?.respRate || '-'} <span style="font-size: 0.72rem; font-weight: 400; color: #64748b;">/min</span></div>
              </div>
              <div style="background: #f1f5f9; padding: 0.5rem; border-radius: 6px;">
                <div style="font-size: 0.72rem; color: #64748b; font-weight: 600;">SpO2</div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #0f172a; margin-top: 2px;">${consult.vitals?.spO2 || '-'} <span style="font-size: 0.72rem; font-weight: 400; color: #64748b;">%</span></div>
              </div>
              <div style="background: #f1f5f9; padding: 0.5rem; border-radius: 6px;">
                <div style="font-size: 0.72rem; color: #64748b; font-weight: 600;">Weight</div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #0f172a; margin-top: 2px;">${consult.vitals?.weightKg || '-'} <span style="font-size: 0.72rem; font-weight: 400; color: #64748b;">kg</span></div>
              </div>
              <div style="background: #f1f5f9; padding: 0.5rem; border-radius: 6px;">
                <div style="font-size: 0.72rem; color: #64748b; font-weight: 600;">ECOG Score</div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #0f172a; margin-top: 2px;">ECOG ${consult.vitals?.ecogScore ?? '-'}</div>
              </div>
              <div style="background: #f1f5f9; padding: 0.5rem; border-radius: 6px;">
                <div style="font-size: 0.72rem; color: #64748b; font-weight: 600;">Pain Score</div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #0f172a; margin-top: 2px;">${consult.vitals?.painScore ?? '-'}/10</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Laboratory Safety Review -->
        <div class="panel" style="margin-bottom: 1.25rem; border: 1.5px solid ${isAncLow || isPltLow ? '#f87171' : '#cbd5e1'};">
          <div class="panel-header" style="background: ${isAncLow || isPltLow ? '#fef2f2' : '#f8fafc'}; padding: 0.65rem 1rem; display: flex; justify-content: space-between; align-items: center;">
            <div class="panel-title" style="font-size: 0.9rem; color: ${isAncLow || isPltLow ? '#991b1b' : '#1e293b'};">
              Laboratory Safety Parameters & Blood Counts
            </div>
            ${isAncLow || isPltLow ? `<span class="badge badge-danger">Safety Alert: Low Counts</span>` : `<span class="badge badge-success">Counts Within Safety Threshold</span>`}
          </div>
          <div class="panel-body" style="padding: 0.85rem 1rem;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem; text-align: center;">
              <div style="background: ${isAncLow ? '#fee2e2' : '#f1f5f9'}; border: 1px solid ${isAncLow ? '#fca5a5' : 'transparent'}; padding: 0.5rem; border-radius: 6px;">
                <div style="font-size: 0.72rem; color: ${isAncLow ? '#991b1b' : '#64748b'}; font-weight: 600;">ANC (Neutrophils)</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: ${isAncLow ? '#b91c1c' : '#0f172a'}; margin-top: 2px;">
                  ${anc ?? '-'} <span style="font-size: 0.7rem; font-weight: 400;">x10⁹/L</span>
                </div>
                <div style="font-size: 0.68rem; color: ${isAncLow ? '#b91c1c' : '#64748b'}; margin-top: 2px;">Ref: ≥ 1.5</div>
              </div>
              <div style="background: ${isPltLow ? '#fee2e2' : '#f1f5f9'}; border: 1px solid ${isPltLow ? '#fca5a5' : 'transparent'}; padding: 0.5rem; border-radius: 6px;">
                <div style="font-size: 0.72rem; color: ${isPltLow ? '#991b1b' : '#64748b'}; font-weight: 600;">Platelets</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: ${isPltLow ? '#b91c1c' : '#0f172a'}; margin-top: 2px;">
                  ${platelets ?? '-'} <span style="font-size: 0.7rem; font-weight: 400;">x10⁹/L</span>
                </div>
                <div style="font-size: 0.68rem; color: ${isPltLow ? '#b91c1c' : '#64748b'}; margin-top: 2px;">Ref: ≥ 100</div>
              </div>
              <div style="background: #f1f5f9; padding: 0.5rem; border-radius: 6px;">
                <div style="font-size: 0.72rem; color: #64748b; font-weight: 600;">Hemoglobin</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-top: 2px;">
                  ${consult.labReview?.hemoglobin ?? '-'} <span style="font-size: 0.7rem; font-weight: 400;">g/dL</span>
                </div>
                <div style="font-size: 0.68rem; color: #64748b; margin-top: 2px;">Ref: ≥ 10.0</div>
              </div>
              <div style="background: #f1f5f9; padding: 0.5rem; border-radius: 6px;">
                <div style="font-size: 0.72rem; color: #64748b; font-weight: 600;">Serum Creatinine</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-top: 2px;">
                  ${consult.labReview?.creatinine ?? '-'} <span style="font-size: 0.7rem; font-weight: 400;">mg/dL</span>
                </div>
                <div style="font-size: 0.68rem; color: #64748b; margin-top: 2px;">Ref: 0.6-1.2</div>
              </div>
              <div style="background: #f1f5f9; padding: 0.5rem; border-radius: 6px;">
                <div style="font-size: 0.72rem; color: #64748b; font-weight: 600;">ALT / AST</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-top: 2px;">
                  ${consult.labReview?.altAst || consult.labReview?.sgpt || '-'}
                </div>
                <div style="font-size: 0.68rem; color: #64748b; margin-top: 2px;">Hepatic panel</div>
              </div>
              <div style="background: #f1f5f9; padding: 0.5rem; border-radius: 6px;">
                <div style="font-size: 0.72rem; color: #64748b; font-weight: 600;">Total Bilirubin</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-top: 2px;">
                  ${consult.labReview?.bilirubin ?? '-'} <span style="font-size: 0.7rem; font-weight: 400;">mg/dL</span>
                </div>
                <div style="font-size: 0.68rem; color: #64748b; margin-top: 2px;">Ref: 0.2-1.2</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Prior Toxicities -->
        ${toxicitiesHtml ? `
          <div style="margin-bottom: 1.25rem; background: #fff7ed; border: 1.5px solid #ffedd5; border-radius: 8px; padding: 0.85rem 1rem;">
            <strong style="color: #c2410c; display: block; margin-bottom: 0.4rem; font-size: 0.88rem;">Documented Toxicities & Symptoms (CTCAE v5.0):</strong>
            ${toxicitiesHtml}
          </div>
        ` : ''}

        <!-- Clinical Evaluation & Notes -->
        <div style="margin-bottom: 1.25rem;">
          <strong style="color: #0f172a; font-size: 0.9rem; display: block; margin-bottom: 0.35rem;">Oncological Evaluation & Clinical Assessment:</strong>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.85rem 1rem; font-size: 0.88rem; line-height: 1.55; color: #1e293b; white-space: pre-line;">
            ${this.escapeHtml(consult.clinicalNotes || 'No subjective evaluation notes recorded.')}
          </div>
        </div>

        <!-- Management Orders & Clearance Decision -->
        <div style="background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 0 8px 8px 0; padding: 1rem 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <strong style="color: #166534; font-size: 0.92rem; display: block; margin-bottom: 0.35rem;">Physician Clearance Decision & Management Orders:</strong>
          <div style="font-size: 0.88rem; color: #14532d; line-height: 1.55; white-space: pre-line;">
            ${this.escapeHtml(consult.managementPlan || 'Cleared to proceed with chemotherapy protocol.')}
          </div>
        </div>
      `;
    }

    if (editBtn) {
      editBtn.onclick = () => {
        this.closeModal(document.getElementById('modal-view-record'));
        this.requestEditConsultation(consult.id);
      };
    }

    this.openModal(document.getElementById('modal-view-record'));
  }

  viewTreatment(id) {
    const tx = this.treatments.find(t => t.id === id);
    if (!tx) {
      this.showToast('Treatment record not found.', 'danger');
      return;
    }
    const patient = this.getPatientById(tx.patientId);

    const titleEl = document.getElementById('modal-view-record-title');
    const headerEl = document.getElementById('modal-view-record-header');
    const bodyEl = document.getElementById('modal-view-record-body');
    const editBtn = document.getElementById('modal-view-edit-btn');

    if (titleEl) {
      titleEl.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -3px;"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
        <span>Chemotherapy Infusion Record: ${this.escapeHtml(tx.regimenName || 'Infusion')}</span>
      `;
    }
    if (headerEl) {
      headerEl.style.background = 'linear-gradient(135deg, #a16207, #ca8a04)';
      headerEl.style.color = '#ffffff';
    }

    const drugs = Array.isArray(tx.drugsAdministered) ? tx.drugsAdministered : [];
    const premeds = Array.isArray(tx.premedsGiven) ? tx.premedsGiven : (tx.premedsGiven ? [{ name: tx.premedsGiven, dose: '', status: 'Administered' }] : []);

    if (bodyEl) {
      bodyEl.innerHTML = `
        <!-- Patient Banner -->
        <div style="background: #fefce8; border: 1.5px solid #fde047; border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <div class="patient-avatar-thumb" style="width: 48px; height: 48px; border: 2px solid #eab308; font-size: 1rem; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #e2e8f0;">
              ${patient && patient.photo ? `<img src="${patient.photo}" alt="" style="width: 100%; height: 100%; object-fit: cover;">` : (patient ? patient.fullName.slice(0, 2).toUpperCase() : 'PT')}
            </div>
            <div>
              <div style="font-size: 1.15rem; font-weight: 700; color: #713f12;">${patient ? this.escapeHtml(patient.fullName) : 'Unknown Patient'}</div>
              <div style="font-size: 0.82rem; color: #854d0e; display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 2px;">
                <span><strong>MRN:</strong> ${patient ? patient.mrn : 'N/A'}</span>
                <span>|</span>
                <span><strong>PhilHealth:</strong> ${patient?.philhealthNo || 'N/A'}</span>
                <span>|</span>
                <span><strong>Age/Sex:</strong> ${patient ? `${patient.age}y / ${patient.gender}` : 'N/A'}</span>
              </div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.82rem; color: #854d0e; font-weight: 600;">Infusion Date & Session:</div>
            <div style="font-size: 1rem; font-weight: 700; color: #713f12;">${tx.treatmentDate} ${tx.startTime ? `${tx.startTime} - ${tx.endTime || ''}` : ''}</div>
            <div style="margin-top: 4px;">${this.renderToleranceBadge(tx.toleranceGrade)}</div>
          </div>
        </div>

        <!-- Protocol & Cycle Meta -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem;">
          <div style="background: #ffffff; border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Chemotherapy Regimen</div>
            <div style="font-weight: 700; color: var(--secondary); font-size: 0.95rem; margin-top: 2px;">${this.escapeHtml(tx.regimenName || 'Protocol')}</div>
          </div>
          <div style="background: #ffffff; border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Cycle & Schedule</div>
            <div style="font-weight: 700; color: var(--secondary); font-size: 0.95rem; margin-top: 2px;">
              Cycle ${tx.cycleNumber} of ${tx.cycleTotal || '?'} (Day ${tx.dayOfCycle || 1})
            </div>
          </div>
          <div style="background: #ffffff; border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Supervising Nurse</div>
            <div style="font-weight: 600; color: var(--secondary); margin-top: 2px;">${this.escapeHtml(tx.supervisingNurse || 'Oncology Nurse')}</div>
          </div>
          <div style="background: #ffffff; border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Attending Oncologist</div>
            <div style="font-weight: 600; color: var(--secondary); margin-top: 2px;">${this.escapeHtml(tx.attendingOncologist || 'Oncologist')}</div>
          </div>
        </div>

        <!-- Administered Antineoplastic Drugs & Verification Table -->
        <div class="panel" style="margin-bottom: 1.25rem; border: 1.5px solid #fde047;">
          <div class="panel-header" style="background: #fef9c3; padding: 0.65rem 1rem; display: flex; justify-content: space-between; align-items: center;">
            <div class="panel-title" style="font-size: 0.9rem; color: #854d0e;">
              Administered Antineoplastic Agents & Dual Independent Verification
            </div>
            <span class="badge badge-warning">${drugs.length} Agent(s) Administered</span>
          </div>
          <div class="panel-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="data-table" style="font-size: 0.825rem; margin: 0;">
                <thead style="background: #fffbeb;">
                  <tr>
                    <th>Chemotherapy Agent</th>
                    <th>Planned Dose</th>
                    <th>Actual Administered Dose</th>
                    <th>Route / Access</th>
                    <th>Duration</th>
                    <th>Dual Independent Verification</th>
                  </tr>
                </thead>
                <tbody>
                  ${drugs.length === 0 ? `
                    <tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No antineoplastic agent rows recorded.</td></tr>
                  ` : drugs.map(d => `
                    <tr>
                      <td><strong style="color: #0f172a;">${this.escapeHtml(d.drugName)}</strong></td>
                      <td>${this.escapeHtml(d.plannedDose || '-')}</td>
                      <td><strong style="color: #15803d;">${this.escapeHtml(d.actualDose || d.plannedDose || '-')}</strong></td>
                      <td>${this.escapeHtml(d.route || 'IV Infusion')}</td>
                      <td>${d.durationMinutes ? `${d.durationMinutes} mins` : '-'}</td>
                      <td>
                        <span class="badge badge-success" style="font-size: 0.72rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          ${d.dualVerification ? 'Dual Verified (2 RNs)' : 'Nurse Verified'}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Pre-Medications Given -->
        ${premeds.length > 0 ? `
          <div class="panel" style="margin-bottom: 1.25rem; border: 1px solid #e2e8f0;">
            <div class="panel-header" style="background: #f8fafc; padding: 0.65rem 1rem;">
              <div class="panel-title" style="font-size: 0.9rem; color: #1e293b;">Pre-Medication Protocol & Anti-Emetics</div>
            </div>
            <div class="panel-body" style="padding: 0.75rem 1rem;">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem; font-size: 0.825rem;">
                ${premeds.map(p => `
                  <div style="background: #f1f5f9; padding: 0.5rem 0.75rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <strong>${this.escapeHtml(p.name)}</strong>
                      ${p.dose ? `<div style="font-size: 0.75rem; color: #64748b;">${this.escapeHtml(p.dose)}</div>` : ''}
                    </div>
                    <span class="badge badge-secondary" style="font-size: 0.7rem;">${this.escapeHtml(p.status || 'Given')}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Infusion Monitoring & Nursing Notes -->
        <div style="margin-bottom: 1.25rem;">
          <strong style="color: #0f172a; font-size: 0.9rem; display: block; margin-bottom: 0.35rem;">Infusion Monitoring & Nursing Observations:</strong>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.85rem 1rem; font-size: 0.88rem; line-height: 1.55; color: #1e293b; white-space: pre-line;">
            ${this.escapeHtml(tx.nursingNotes || tx.clinicalNotes || 'Patient tolerated the chemotherapy session well without acute infusion-related reactions or hypersensitivity events.')}
          </div>
        </div>

        <!-- Adverse Events / Reactions -->
        ${tx.adverseReactions ? `
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 0.85rem 1rem; margin-bottom: 1.25rem;">
            <strong style="color: #b91c1c; font-size: 0.88rem; display: block; margin-bottom: 0.25rem;">Documented Acute Reactions / Events:</strong>
            <div style="color: #991b1b; font-size: 0.85rem;">${this.escapeHtml(tx.adverseReactions)}</div>
          </div>
        ` : ''}
      `;
    }

    if (editBtn) {
      editBtn.onclick = () => {
        this.closeModal(document.getElementById('modal-view-record'));
        this.requestEditTreatment(tx.id);
      };
    }

    this.openModal(document.getElementById('modal-view-record'));
  }

  /* ------------------------------------------------------------------
   * Global Event Listeners Binding
   * ------------------------------------------------------------------ */
  bindEvents() {
    // Navigation clicks
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        if (view) this.navigateTo(view);
      });
    });

    // Mobile menu toggle & backdrop handlers
    const toggleSidebar = (open) => {
      const sidebar = document.getElementById('sidebar');
      const backdrop = document.getElementById('sidebar-backdrop');
      if (!sidebar) return;
      const isOpen = open !== undefined ? open : !sidebar.classList.contains('mobile-open');
      if (isOpen) {
        sidebar.classList.add('mobile-open');
        backdrop?.classList.add('active');
      } else {
        sidebar.classList.remove('mobile-open');
        backdrop?.classList.remove('active');
      }
    };

    document.getElementById('mobile-menu-toggle')?.addEventListener('click', () => toggleSidebar());
    document.getElementById('btn-sidebar-close')?.addEventListener('click', () => toggleSidebar(false));
    document.getElementById('sidebar-backdrop')?.addEventListener('click', () => toggleSidebar(false));

    // Header Quick Buttons
    document.getElementById('btn-quick-new-patient')?.addEventListener('click', () => this.openNewPatientModal());
    document.getElementById('btn-quick-new-consult')?.addEventListener('click', () => this.openNewConsultModal());
    document.getElementById('btn-quick-new-tx')?.addEventListener('click', () => this.openNewTreatmentModal());

    document.getElementById('btn-add-patient-main')?.addEventListener('click', () => this.openNewPatientModal());
    document.getElementById('btn-add-consult-main')?.addEventListener('click', () => this.openNewConsultModal());
    document.getElementById('btn-add-tx-main')?.addEventListener('click', () => this.openNewTreatmentModal());

    // Modal Close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = btn.getAttribute('data-close-modal');
        this.closeModal(document.getElementById(modalId));
      });
    });

    // Close modal on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.closeModal(backdrop);
      });
    });

    // Escape key closes modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.open').forEach(m => this.closeModal(m));
      }
    });

    // Global Search Header
    const globalSearch = document.getElementById('global-search-input');
    if (globalSearch) {
      globalSearch.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        if (q.length > 0 && this.activeView !== 'patients') {
          this.navigateTo('patients');
        }
        const patSearchInput = document.getElementById('patient-search-filter');
        if (patSearchInput) {
          patSearchInput.value = q;
          this.renderPatientsList();
        }
      });
    }

    // Patient Directory Filters
    document.getElementById('patient-search-filter')?.addEventListener('input', () => this.renderPatientsList());
    document.getElementById('patient-cancer-filter')?.addEventListener('change', () => this.renderPatientsList());
    document.getElementById('patient-status-filter')?.addEventListener('change', () => this.renderPatientsList());

    // Live BSA Calculator in Patient Modal
    const hInput = document.getElementById('patient-height');
    const wInput = document.getElementById('patient-weight');
    const updateBsaCalc = () => {
      const h = parseFloat(hInput.value) || 0;
      const w = parseFloat(wInput.value) || 0;
      const bsa = this.calculateBSA(h, w);
      const bmi = this.calculateBMI(h, w);
      document.getElementById('form-calculated-bsa').textContent = bsa > 0 ? bsa : '--';
      document.getElementById('form-calculated-bmi').textContent = bmi > 0 ? bmi : '--';
    };
    hInput?.addEventListener('input', updateBsaCalc);
    wInput?.addEventListener('input', updateBsaCalc);

    // Patient Photo Upload Handlers
    document.getElementById('btn-upload-patient-photo')?.addEventListener('click', () => {
      document.getElementById('patient-photo-input')?.click();
    });

    document.getElementById('patient-photo-input')?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handlePhotoFileSelection(e.target.files[0]);
      }
    });

    document.getElementById('btn-remove-patient-photo')?.addEventListener('click', () => {
      this.setPatientModalPhoto(null);
    });

    // Update gender avatar logo in real-time when gender dropdown changes
    document.getElementById('patient-gender')?.addEventListener('change', (e) => {
      const customPhoto = document.getElementById('patient-photo-data')?.value;
      if (!customPhoto) {
        this.setPatientModalPhoto(null, e.target.value);
      }
    });

    // Form Submissions
    document.getElementById('form-patient')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.savePatient(new FormData(e.target));
    });

    document.getElementById('form-consultation')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveConsultation(new FormData(e.target));
    });

    document.getElementById('form-treatment')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTreatment(new FormData(e.target));
    });

    // Delete Patient Confirmation
    document.getElementById('btn-confirm-delete-patient')?.addEventListener('click', () => {
      this.confirmDeletePatient();
    });

    // Regimen selection change in Treatment Modal
    document.getElementById('tx-regimen-select')?.addEventListener('change', () => {
      this.onRegimenSelectChanged();
    });

    document.getElementById('btn-add-drug-row')?.addEventListener('click', () => {
      this.addDrugRow();
    });

    // Chart Tabs
    document.querySelectorAll('.tab-btn[data-chart-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn[data-chart-tab]').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const targetPane = document.getElementById(`chart-pane-${tab.getAttribute('data-chart-tab')}`);
        if (targetPane) targetPane.classList.add('active');
      });
    });

    // Timeline View Filter Buttons
    document.querySelectorAll('.timeline-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.currentTarget.getAttribute('data-timeline-filter');
        if (filter) this.setTimelineFilter(filter);
      });
    });

    // Consultations & Treatments Filters
    document.getElementById('consult-search-filter')?.addEventListener('input', () => this.renderConsultationsList());
    document.getElementById('consult-decision-filter')?.addEventListener('change', () => this.renderConsultationsList());
    document.getElementById('consult-patient-filter')?.addEventListener('change', () => this.renderConsultationsList());

    document.getElementById('tx-search-filter')?.addEventListener('input', () => this.renderTreatmentsList());
    document.getElementById('tx-patient-filter')?.addEventListener('change', () => this.renderTreatmentsList());
    document.getElementById('tx-regimen-filter')?.addEventListener('change', () => this.renderTreatmentsList());

    // Log Consult Searchable Patient Selection (Search-only, no dropdown)
    const triggerConsultSearch = () => {
      const q = document.getElementById('consult-patient-search')?.value || '';
      this.performConsultPatientSearch(q);
    };
    document.getElementById('btn-search-consult-patient')?.addEventListener('click', triggerConsultSearch);
    document.getElementById('consult-patient-search')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerConsultSearch();
      }
    });
    document.getElementById('consult-patient-search')?.addEventListener('input', (e) => {
      this.performConsultPatientSearch(e.target.value);
    });

    // Log Chemo Searchable Patient Selection (Search-only, no dropdown)
    const triggerTxSearch = () => {
      const q = document.getElementById('tx-patient-search')?.value || '';
      this.performTxPatientSearch(q);
    };
    document.getElementById('btn-search-tx-patient')?.addEventListener('click', triggerTxSearch);
    document.getElementById('tx-patient-search')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerTxSearch();
      }
    });
    document.getElementById('tx-patient-search')?.addEventListener('input', (e) => {
      this.performTxPatientSearch(e.target.value);
    });

    // Settings / Backup Actions
    document.getElementById('btn-export-json')?.addEventListener('click', () => this.exportJson());
    document.getElementById('import-json-input')?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.importJson(e.target.files[0]);
      }
    });
    document.getElementById('btn-load-demo-data')?.addEventListener('click', () => this.loadDemoDataset(true));
    document.getElementById('btn-clear-database')?.addEventListener('click', () => this.clearDatabase());

    // Reports & Analytics Event Listeners
    document.querySelectorAll('#report-period-pills .period-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        const period = e.currentTarget.getAttribute('data-period');
        if (period) this.setReportPeriod(period);
      });
    });

    document.querySelectorAll('#report-scope-tabs .report-scope-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const scope = e.currentTarget.getAttribute('data-scope');
        if (scope) this.setReportScope(scope);
      });
    });

    document.getElementById('report-patient-filter')?.addEventListener('change', (e) => {
      this.reportSelectedPatientId = e.target.value;
      this.renderReports();
    });

    document.getElementById('btn-export-report-csv')?.addEventListener('click', () => {
      this.exportReportToCsv();
    });

    // Authentication Gateway & Log In / Out Events
    document.getElementById('form-login')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = document.getElementById('login-username')?.value;
      const p = document.getElementById('login-password')?.value;
      this.login(u, p);
    });

    document.getElementById('btn-toggle-password')?.addEventListener('click', () => {
      const pass = document.getElementById('login-password');
      if (pass) {
        pass.type = pass.type === 'password' ? 'text' : 'password';
      }
    });

    document.getElementById('btn-quick-admin')?.addEventListener('click', () => {
      const u = document.getElementById('login-username');
      const p = document.getElementById('login-password');
      if (u) u.value = 'admin';
      if (p) p.value = 'admin123';
      this.login('admin', 'admin123');
    });

    document.getElementById('btn-quick-nurse')?.addEventListener('click', () => {
      const u = document.getElementById('login-username');
      const p = document.getElementById('login-password');
      if (u) u.value = 'guest';
      if (p) p.value = 'guest123';
      this.login('guest', 'guest123');
    });

    document.getElementById('btn-logout-header')?.addEventListener('click', () => this.logout());
    document.getElementById('btn-logout-sidebar')?.addEventListener('click', () => this.logout());

    // Supervisor Authorization Form & Quick Fill
    document.getElementById('form-supervisor-auth')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = document.getElementById('supervisor-username')?.value;
      const p = document.getElementById('supervisor-password')?.value;
      const r = document.getElementById('supervisor-reason')?.value;
      this.verifySupervisorAuthorization(u, p, r);
    });

    document.getElementById('btn-quick-fill-supervisor')?.addEventListener('click', () => {
      const u = document.getElementById('supervisor-username');
      const p = document.getElementById('supervisor-password');
      if (u) u.value = 'admin';
      if (p) p.value = 'admin123';
      const err = document.getElementById('supervisor-auth-error-alert');
      if (err) err.style.display = 'none';
    });
  }
}

// Instantiate globally
let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new ChemoApp();
});
