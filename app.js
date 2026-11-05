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

/* ------------------------------------------------------------------
 * Clinical Document Storage Engine (IndexedDB + In-Memory Fallback)
 * ------------------------------------------------------------------ */
class ChemoDocStore {
  constructor() {
    this.dbName = 'ICC_EHR_DocStore';
    this.storeName = 'documents';
    this.version = 1;
    this.cache = new Map();
    this.db = null;
    this.initPromise = this.init();
  }

  async init() {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB unavailable, using in-memory document store.');
      return null;
    }
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(this.dbName, this.version);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'id' });
          }
        };
        req.onsuccess = (e) => {
          this.db = e.target.result;
          resolve(this.db);
        };
        req.onerror = () => {
          console.warn('IndexedDB access blocked, continuing in-memory.');
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB initialization failed:', err);
        resolve(null);
      }
    });
  }

  async saveDocument(doc) {
    if (!doc || !doc.id) return;
    if (doc.data) {
      this.cache.set(doc.id, doc.data);
    }
    await this.initPromise;
    if (!this.db) return;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.put({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          size: doc.size,
          data: doc.data,
          uploadedAt: doc.uploadedAt
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  async getDocumentData(doc) {
    if (!doc) return null;
    if (doc.data) return doc.data;
    if (this.cache.has(doc.id)) return this.cache.get(doc.id);
    await this.initPromise;
    if (!this.db) return null;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get(doc.id);
        req.onsuccess = () => {
          const res = req.result;
          if (res && res.data) {
            this.cache.set(doc.id, res.data);
            resolve(res.data);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  async deleteDocument(docId) {
    this.cache.delete(docId);
    await this.initPromise;
    if (!this.db) return;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.delete(docId);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }
}

function generateSamplePdfDataUrl(title, subtitle, bodyLines) {
  const textStream = `BT /F1 16 Tf 50 720 Td (${title}) Tj ET\n` +
    `BT /F1 11 Tf 50 695 Td (${subtitle}) Tj ET\n` +
    `BT /F1 10 Tf 50 660 Td (--------------------------------------------------------------------------) Tj ET\n` +
    bodyLines.map((line, idx) => `BT /F1 10 Tf 50 ${630 - (idx * 20)} Td (${line.replace(/[()]/g, '')}) Tj ET`).join('\n');

  const streamLen = textStream.length;
  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${streamLen} >>
stream
${textStream}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000224 00000 n 
0000000295 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${360 + streamLen}
%%EOF`;

  try {
    return 'data:application/pdf;base64,' + btoa(unescape(encodeURIComponent(pdfString)));
  } catch (e) {
    return 'data:application/pdf;base64,' + btoa(pdfString);
  }
}

function generateSampleSvgDataUrl(title, category, items) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="800" height="600" fill="#f8fafc" rx="8"/>
    <rect x="20" y="20" width="760" height="80" rx="6" fill="#096ca7"/>
    <text x="40" y="55" fill="#ffffff" font-family="Arial, sans-serif" font-size="20" font-weight="bold">IMUS CHEMOTHERAPY CENTER</text>
    <text x="40" y="80" fill="#e0f2fe" font-family="Arial, sans-serif" font-size="13">Electronic Oncology Medical Record System • Malagasang I-G Imus City</text>
    <rect x="20" y="115" width="760" height="40" fill="#e2e8f0" rx="4"/>
    <text x="35" y="140" fill="#0f172a" font-family="Arial, sans-serif" font-size="14" font-weight="bold">${title.replace(/[<>&]/g, '')} [${category.replace(/[<>&]/g, '')}]</text>
    <rect x="20" y="170" width="760" height="350" fill="#ffffff" stroke="#cbd5e1" rx="6"/>
    ${items.map((item, idx) => `<text x="40" y="${210 + (idx * 28)}" fill="#334155" font-family="Arial, sans-serif" font-size="13">${item.replace(/[<>&]/g, '')}</text>`).join('')}
    <line x1="40" y1="460" x2="320" y2="460" stroke="#096ca7" stroke-width="1.5"/>
    <text x="40" y="480" fill="#096ca7" font-family="Arial, sans-serif" font-size="12" font-weight="bold">Verified by Medical Oncology &amp; Clinical Laboratory</text>
    <rect x="20" y="540" width="760" height="40" fill="#f1f5f9" rx="4"/>
    <text x="35" y="565" fill="#64748b" font-family="Arial, sans-serif" font-size="11">CONFIDENTIAL MEDICAL DOCUMENT • FOR CLINICAL USE ONLY</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

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

    // Document Storage Engine & Pending Attachments State
    this.docStore = new ChemoDocStore();
    this.modalPendingDocs = {
      patient: [],
      consultation: [],
      treatment: [],
      laboratory: []
    };
    this.currentViewerDoc = null;

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

    // Schedule & Clinical Appointments State
    this.schedules = [];
    this.scheduleLayout = 'list';
    this.scheduleDateFrom = '';
    this.scheduleDateTo = '';
    this.scheduleFilterApplied = false;
    this.scheduleTypeFilter = 'all';
    this.scheduleStatusFilter = 'all';
    this.scheduleSearchQuery = '';
    this.editingScheduleId = null;

    // Laboratory & Diagnostic Results State
    this.laboratory = [];
    this.labSearchQuery = '';
    this.labCategoryFilter = 'all';
    this.labStatusFilter = 'all';
    this.labPatientFilter = '';
    this.editingLabId = null;

    this.init();
  }

  init() {
    this.initTheme();
    this.loadData();
    this.bindEvents();
    this.initAuth();
    this.render();
    setTimeout(() => {
      this.checkAndShowTomorrowReminder(false);
    }, 800);
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
      setTimeout(() => {
        this.checkAndShowTomorrowReminder(false);
      }, 500);
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

        // Ensure documents arrays exist
        this.patients.forEach(p => { p.documents = p.documents || []; });
        this.consultations.forEach(c => { c.documents = c.documents || []; });
        this.treatments.forEach(t => { t.documents = t.documents || []; });
        this.ensureInitialSampleDocuments();

        // Load schedules
        try {
          const rawSch = localStorage.getItem('ICC_EHR_schedules_v1');
          this.schedules = rawSch ? JSON.parse(rawSch) : (data.schedules || []);
        } catch (_) {
          this.schedules = data.schedules || [];
        }
        this.ensureInitialSampleSchedules();

        // Load laboratory
        try {
          const rawLab = localStorage.getItem('ICC_EHR_laboratory_v1');
          this.laboratory = rawLab ? JSON.parse(rawLab) : [];
        } catch (_) {
          this.laboratory = [];
        }
        this.ensureInitialSampleLaboratory();

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
      // Keep localStorage lean so large uploads never cause QuotaExceededError
      const cleanDocs = (docs) => {
        if (!Array.isArray(docs)) return [];
        return docs.map(d => {
          if (d.data && d.data.length > 200000) {
            const { data, ...meta } = d;
            return meta;
          }
          return d;
        });
      };

      const payload = {
        patients: this.patients.map(p => ({
          ...p,
          documents: cleanDocs(p.documents)
        })),
        consultations: this.consultations.map(c => ({
          ...c,
          documents: cleanDocs(c.documents)
        })),
        treatments: this.treatments.map(t => ({
          ...t,
          documents: cleanDocs(t.documents)
        })),
        schedules: this.schedules || [],
        laboratory: (this.laboratory || []).map(l => ({
          ...l,
          documents: cleanDocs(l.documents)
        })),
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
      localStorage.setItem('ICC_EHR_schedules_v1', JSON.stringify(this.schedules || []));
      localStorage.setItem('ICC_EHR_laboratory_v1', JSON.stringify(this.laboratory || []));
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
      this.patients.forEach(p => { p.documents = p.documents || []; });
      this.consultations.forEach(c => { c.documents = c.documents || []; });
      this.treatments.forEach(t => { t.documents = t.documents || []; });
      this.ensureInitialSampleDocuments();
      this.schedules = [];
      this.ensureInitialSampleSchedules();
      this.laboratory = [];
      this.ensureInitialSampleLaboratory();
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
      this.schedules = [];
      this.laboratory = [];
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
   * Clinical Document Management & File Engine (Patients, Consultations, Treatments)
   * ------------------------------------------------------------------ */
  async ensureInitialSampleDocuments() {
    // 1. Patient Sample Documents (ICC-P001)
    if (this.patients.length > 0 && (!this.patients[0].documents || this.patients[0].documents.length === 0)) {
      const p = this.patients[0];
      const doc1 = {
        id: 'doc_sample_p1',
        name: `${p.mrn}_Histopathology_Biopsy_Report.pdf`,
        size: 184320,
        sizeFormatted: '180 KB',
        type: 'application/pdf',
        category: 'Pathology & Biopsy',
        uploadedAt: '2026-10-15T09:30:00.000Z',
        uploadedBy: 'Dr. Evelyn Reed, MD',
        data: generateSamplePdfDataUrl(
          'IMUS CHEMOTHERAPY CENTER - HISTOPATHOLOGY REPORT',
          `Patient: ${p.fullName} | MRN: ${p.mrn} | Specimen: Core Needle Biopsy`,
          [
            'CLINICAL DIAGNOSIS: Invasive Ductal Carcinoma, Grade 2',
            'RECEPTOR STATUS: ER Positive (85%), PR Positive (70%), HER2 Neu Negative (Score 1+)',
            'KI-67 PROLIFERATION INDEX: 22%',
            'SURGICAL MARGINS: Cleared of invasive malignant components',
            'PATHOLOGIST: Dr. Julian Santos, MD, FPSP (License #089421)'
          ]
        )
      };

      const doc2 = {
        id: 'doc_sample_p2',
        name: `${p.mrn}_Baseline_Contrast_CT_Scan.png`,
        size: 245760,
        sizeFormatted: '240 KB',
        type: 'image/svg+xml',
        category: 'Radiology & Scans',
        uploadedAt: '2026-10-18T14:15:00.000Z',
        uploadedBy: 'Dr. Evelyn Reed, MD',
        data: generateSampleSvgDataUrl(
          `Radiological CT Scan - ${p.fullName} (${p.mrn})`,
          'Chest & Abdomen Contrast Computed Tomography',
          [
            'INDICATION: Baseline clinical staging for adjuvant antineoplastic protocol.',
            'FINDINGS: No evidence of pleural effusion or focal consolidation.',
            'MEDIASTINUM: No pathologic lymphadenopathy identified.',
            'LIVER: Normal parenchymal attenuation. No discrete focal metastatic lesions.',
            'IMPRESSION: No distant metastatic disease observed. Stage IIA confirmed.'
          ]
        )
      };

      const doc3 = {
        id: 'doc_sample_p3',
        name: `${p.mrn}_Informed_Chemo_Consent_Signed.pdf`,
        size: 122880,
        sizeFormatted: '120 KB',
        type: 'application/pdf',
        category: 'Consent & Legal',
        uploadedAt: '2026-10-22T10:00:00.000Z',
        uploadedBy: 'Nurse Supervisor',
        data: generateSamplePdfDataUrl(
          'IMUS CHEMOTHERAPY CENTER - INFORMED CHEMO CONSENT',
          `Patient: ${p.fullName} | MRN: ${p.mrn} | Date: October 22, 2026`,
          [
            'DOCUMENT: Voluntary Patient Informed Consent for Systemic Chemotherapy',
            'PROTOCOL EXPLAINED: Doxorubicin + Cyclophosphamide (AC) followed by Paclitaxel',
            'RISKS DISCUSSED: Neutropenia, alopecia, nausea, extravasation precautions',
            'PATIENT ATTESTATION: Fully explained in English and Filipino, questions answered',
            'SIGNATURE STATUS: Executed and countersigned by Attending Oncologist'
          ]
        )
      };

      p.documents = [doc1, doc2, doc3];
      await this.docStore.saveDocument(doc1);
      await this.docStore.saveDocument(doc2);
      await this.docStore.saveDocument(doc3);
    }

    // 2. Consultation Sample Documents
    if (this.consultations.length > 0 && (!this.consultations[0].documents || this.consultations[0].documents.length === 0)) {
      const c = this.consultations[0];
      const p = this.getPatientById(c.patientId);
      const patName = p ? p.fullName : 'Patient';
      const patMrn = p ? p.mrn : 'ICC-P001';

      const conDoc1 = {
        id: 'doc_sample_c1',
        name: `CBC_Platelet_Differential_Panel_${c.date}.pdf`,
        size: 143360,
        sizeFormatted: '140 KB',
        type: 'application/pdf',
        category: 'Laboratory & Blood Tests',
        uploadedAt: `${c.date}T08:30:00.000Z`,
        uploadedBy: c.oncologist || 'Dr. Evelyn Reed, MD',
        data: generateSamplePdfDataUrl(
          'IMUS CLINICAL LABORATORY - COMPLETE BLOOD COUNT',
          `Patient: ${patName} | MRN: ${patMrn} | Collection Date: ${c.date}`,
          [
            'HEMOGLOBIN: 12.4 g/dL (Normal Range: 12.0 - 15.5)',
            'WHITE BLOOD CELLS (WBC): 6.8 x 10^9/L (Normal Range: 4.5 - 11.0)',
            'ABSOLUTE NEUTROPHIL COUNT (ANC): 3.8 x 10^9/L [CLEARED: > 1.5 required]',
            'PLATELETS: 245 x 10^9/L [CLEARED: > 100 required]',
            'CREATININE: 0.82 mg/dL | SGPT/ALT: 24 U/L | SGOT/AST: 21 U/L'
          ]
        )
      };

      const conDoc2 = {
        id: 'doc_sample_c2',
        name: `Oncologist_PreChemo_Clearance_Prescription.png`,
        size: 194560,
        sizeFormatted: '190 KB',
        type: 'image/svg+xml',
        category: 'Orders & Prescriptions',
        uploadedAt: `${c.date}T09:15:00.000Z`,
        uploadedBy: c.oncologist || 'Dr. Evelyn Reed, MD',
        data: generateSampleSvgDataUrl(
          `Oncology Pre-Chemotherapy Clearance Order`,
          `Prescription & Infusion Authorization - ${patName}`,
          [
            `PATIENT: ${patName} (${patMrn}) | EVALUATION DATE: ${c.date}`,
            `DECISION: 🟢 CLEARED FOR CHEMOTHERAPY AT 100% STANDARD DOSE`,
            'PRE-MEDICATIONS: Dexamethasone 20mg IV, Ondansetron 8mg IV, Diphenhydramine 50mg IV',
            'CHEMO REGIMEN: Doxorubicin 60 mg/m2 IV push + Cyclophosphamide 600 mg/m2 IV infusion',
            'MONITORING: Vital signs q15m during initial 30 min, then q30m until discharge.'
          ]
        )
      };

      c.documents = [conDoc1, conDoc2];
      await this.docStore.saveDocument(conDoc1);
      await this.docStore.saveDocument(conDoc2);
    }

    // 3. Treatment Sample Documents
    if (this.treatments.length > 0 && (!this.treatments[0].documents || this.treatments[0].documents.length === 0)) {
      const t = this.treatments[0];
      const p = this.getPatientById(t.patientId);
      const patName = p ? p.fullName : 'Patient';
      const patMrn = p ? p.mrn : 'ICC-P001';

      const txDoc1 = {
        id: 'doc_sample_t1',
        name: `Chemotherapy_Dual_Verification_Flowsheet_Cycle${t.cycleNumber}.pdf`,
        size: 215040,
        sizeFormatted: '210 KB',
        type: 'application/pdf',
        category: 'Infusion Flowsheet',
        uploadedAt: `${t.treatmentDate}T10:00:00.000Z`,
        uploadedBy: t.supervisingNurse || 'Nurse Supervisor',
        data: generateSamplePdfDataUrl(
          'CHEMOTHERAPY DUAL INDEPENDENT NURSE VERIFICATION FLOWSHEET',
          `Patient: ${patName} | MRN: ${patMrn} | Protocol: ${t.regimenName} Cycle ${t.cycleNumber}`,
          [
            'STEP 1: Patient identity verified via 2 unique identifiers (Full Name + DOB)',
            'STEP 2: Regimen, protocol cycle, dosing calculations, and diluent double-checked',
            'STEP 3: Primary Nurse (RN 1) and Verifying Oncology Nurse (RN 2) independent check: VERIFIED',
            'IV ACCESS: Verified blood return on Port-A-Cath. No resistance or swelling.',
            'DISPOSITION: Ambulatory discharge, premedication post-care instructions delivered.'
          ]
        )
      };

      const txDoc2 = {
        id: 'doc_sample_t2',
        name: `Premedication_Infusion_Monitoring_Log.png`,
        size: 163840,
        sizeFormatted: '160 KB',
        type: 'image/svg+xml',
        category: 'Infusion Flowsheet',
        uploadedAt: `${t.treatmentDate}T10:45:00.000Z`,
        uploadedBy: t.supervisingNurse || 'Nurse Supervisor',
        data: generateSampleSvgDataUrl(
          `Infusion Administration & Monitoring Log - Cycle ${t.cycleNumber}`,
          `Vital Signs & Acute Toxicity Observations - ${patName}`,
          [
            `PATIENT: ${patName} (${patMrn}) | TREATMENT DATE: ${t.treatmentDate}`,
            'TIME 09:30 - Premeds started: Dexamethasone + Ondansetron IV piggyback (BP 120/80)',
            'TIME 10:00 - Chemo infusion started. Drip rate calibrated via smart infusion pump.',
            'TIME 10:30 - Infusion midpoint check: Patient resting comfortably, no nausea, BP 122/78.',
            'TIME 11:30 - Infusion completed. Saline flush 100mL administered. Line locked.'
          ]
        )
      };

      t.documents = [txDoc1, txDoc2];
      await this.docStore.saveDocument(txDoc1);
      await this.docStore.saveDocument(txDoc2);
    }
  }

  formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIdx = 0;
    while (size >= 1024 && unitIdx < units.length - 1) {
      size /= 1024;
      unitIdx++;
    }
    return `${size.toFixed(unitIdx === 0 ? 0 : 1)} ${units[unitIdx]}`;
  }

  getDocumentIconInfo(doc) {
    if (!doc) return { icon: '📎', class: 'text' };
    const name = (doc.name || '').toLowerCase();
    const type = (doc.type || '').toLowerCase();

    if (type.includes('pdf') || name.endsWith('.pdf')) {
      return { icon: '📄', class: 'pdf' };
    }
    if (type.startsWith('image/') || Boolean(name.match(/\.(png|jpe?g|webp|gif|svg)$/))) {
      return { icon: '🖼️', class: 'image' };
    }
    if (type.startsWith('text/') || Boolean(name.match(/\.(txt|csv|log|doc|docx)$/))) {
      return { icon: '📝', class: 'text' };
    }
    return { icon: '📎', class: 'text' };
  }

  isPdf(doc) {
    if (!doc) return false;
    const name = (doc.name || '').toLowerCase();
    const type = (doc.type || '').toLowerCase();
    return type.includes('pdf') || name.endsWith('.pdf');
  }

  isImage(doc) {
    if (!doc) return false;
    const name = (doc.name || '').toLowerCase();
    const type = (doc.type || '').toLowerCase();
    return type.startsWith('image/') || Boolean(name.match(/\.(png|jpe?g|webp|gif|svg)$/));
  }

  findDocumentById(docId) {
    // Check pending modal documents
    for (const list of Object.values(this.modalPendingDocs)) {
      const match = list.find(d => d.id === docId);
      if (match) return match;
    }
    // Check in patients
    for (const p of this.patients) {
      if (Array.isArray(p.documents)) {
        const match = p.documents.find(d => d.id === docId);
        if (match) return match;
      }
    }
    // Check in consultations
    for (const c of this.consultations) {
      if (Array.isArray(c.documents)) {
        const match = c.documents.find(d => d.id === docId);
        if (match) return match;
      }
    }
    // Check in treatments
    for (const t of this.treatments) {
      if (Array.isArray(t.documents)) {
        const match = t.documents.find(d => d.id === docId);
        if (match) return match;
      }
    }
    // Check in laboratory
    for (const l of (this.laboratory || [])) {
      if (Array.isArray(l.documents)) {
        const match = l.documents.find(d => d.id === docId);
        if (match) return match;
      }
    }
    return null;
  }

  readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async uploadFilesToEntity(fileList, entityType, entityId, category) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) {
        this.showToast(`File "${file.name}" exceeds the 25MB maximum limit.`, 'danger');
        continue;
      }

      try {
        const dataUrl = await this.readFileAsDataUrl(file);
        const doc = {
          id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          name: file.name,
          size: file.size,
          sizeFormatted: this.formatFileSize(file.size),
          type: file.type || 'application/octet-stream',
          category: category || 'General Document',
          uploadedAt: new Date().toISOString(),
          uploadedBy: this.currentUser ? this.currentUser.fullName : 'Clinical Staff',
          data: dataUrl
        };

        await this.docStore.saveDocument(doc);

        if (entityId) {
          if (entityType === 'patient') {
            const patient = this.getPatientById(entityId);
            if (patient) {
              patient.documents = patient.documents || [];
              patient.documents.unshift(doc);
            }
          } else if (entityType === 'consultation') {
            const consult = this.consultations.find(c => c.id === entityId);
            if (consult) {
              consult.documents = consult.documents || [];
              consult.documents.unshift(doc);
            }
          } else if (entityType === 'treatment') {
            const tx = this.treatments.find(t => t.id === entityId);
            if (tx) {
              tx.documents = tx.documents || [];
              tx.documents.unshift(doc);
            }
          } else if (entityType === 'laboratory') {
            const lab = (this.laboratory || []).find(l => l.id === entityId);
            if (lab) {
              lab.documents = lab.documents || [];
              lab.documents.unshift(doc);
            }
          }
        } else if (entityType && this.modalPendingDocs[entityType]) {
          this.modalPendingDocs[entityType].unshift(doc);
          this.renderModalDocsList(entityType);
        }

        this.showToast(`Attached "${doc.name}" successfully!`, 'success');
      } catch (err) {
        console.error('Error uploading file:', err);
        this.showToast(`Failed to upload "${file.name}".`, 'danger');
      }
    }

    this.saveData();

    // Refresh active view
    if (entityType === 'patient' && this.activeView === 'patient-chart' && this.selectedPatientId === entityId) {
      const patient = this.getPatientById(entityId);
      if (patient) {
        this.renderPatientDocuments(patient);
        const docBadge = document.getElementById('chart-tab-doc-count');
        if (docBadge) docBadge.textContent = (patient.documents || []).length;
      }
    } else if (entityType === 'consultation') {
      this.renderConsultationsList();
      const openModal = document.getElementById('modal-view-record');
      if (openModal && openModal.classList.contains('open')) {
        this.viewConsultation(entityId);
      }
    } else if (entityType === 'treatment') {
      this.renderTreatmentsList();
      const openModal = document.getElementById('modal-view-record');
      if (openModal && openModal.classList.contains('open')) {
        this.viewTreatment(entityId);
      }
    } else if (entityType === 'laboratory') {
      this.renderLaboratory();
      const openModal = document.getElementById('modal-view-record');
      if (openModal && openModal.classList.contains('open')) {
        this.viewLaboratory(entityId);
      }
    }
  }

  renderPatientDocuments(patient) {
    const container = document.getElementById('patient-chart-docs-container');
    const summaryEl = document.getElementById('chart-doc-summary-text');
    if (!container) return;

    const docs = patient.documents || [];
    const totalBytes = docs.reduce((acc, d) => acc + (d.size || 0), 0);

    if (summaryEl) {
      summaryEl.textContent = `${docs.length} Document(s) Attached (${this.formatFileSize(totalBytes)})`;
    }

    if (docs.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 2.5rem 1rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📎</div>
          <h4>No Clinical Documents Attached</h4>
          <p>Upload biopsy pathology reports, CBC lab results, CT scans, or chemo consent forms using the dropzone above.</p>
          <button type="button" class="btn btn-primary" style="margin-top: 1rem;" onclick="document.getElementById('patient-chart-file-input').click()">
            Upload First Document
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="doc-grid">
        ${docs.map(d => {
          const iconInfo = this.getDocumentIconInfo(d);
          const dateStr = d.uploadedAt ? d.uploadedAt.slice(0, 10) : 'Recent';
          return `
            <div class="doc-card">
              <div class="doc-card-top">
                <div class="doc-card-icon ${iconInfo.class}">${iconInfo.icon}</div>
                <div class="doc-card-info">
                  <span class="doc-category-badge">${this.escapeHtml(d.category || 'Clinical Document')}</span>
                  <div class="doc-card-name" title="${this.escapeHtml(d.name)}">${this.escapeHtml(d.name)}</div>
                  <div class="doc-card-meta">
                    <span>${d.sizeFormatted || this.formatFileSize(d.size)}</span>
                    <span>&bull;</span>
                    <span>${dateStr}</span>
                  </div>
                </div>
              </div>
              <div class="doc-card-actions">
                <button type="button" class="btn btn-sm btn-outline" onclick="app.viewDocument('${d.id}', 'patient', '${patient.id}')" title="Preview document">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"/><circle cx="12" cy="7" r="3"/></svg>
                  <span>View</span>
                </button>
                <button type="button" class="btn btn-sm btn-ghost" onclick="app.downloadDocument('${d.id}', '${this.escapeHtml(d.name)}')" title="Download file to device">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Download</span>
                </button>
                <button type="button" class="btn btn-sm btn-ghost" style="color: var(--danger);" onclick="app.deleteDocument('${d.id}', 'patient', '${patient.id}')" title="Permanently delete document">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  <span>Delete</span>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderModalDocsList(modalType) {
    const listEl = document.getElementById(`modal-${modalType === 'treatment' ? 'tx' : modalType === 'consultation' ? 'consult' : modalType === 'laboratory' ? 'lab' : 'patient'}-docs-list`);
    if (!listEl) return;

    const docs = this.modalPendingDocs[modalType] || [];
    if (docs.length === 0) {
      listEl.innerHTML = `<div style="font-size: 0.78rem; color: var(--text-muted); font-style: italic; padding: 0.25rem 0;">No documents attached yet. Click "+ Attach File" above.</div>`;
      return;
    }

    listEl.innerHTML = docs.map(d => {
      const iconInfo = this.getDocumentIconInfo(d);
      return `
        <div class="doc-attachment-item">
          <div class="doc-attachment-info">
            <span style="font-size: 1rem;">${iconInfo.icon}</span>
            <span class="doc-category-badge" style="margin-bottom: 0;">${this.escapeHtml(d.category || 'Doc')}</span>
            <span class="doc-attachment-name" title="${this.escapeHtml(d.name)}">${this.escapeHtml(d.name)}</span>
            <span style="font-size: 0.72rem; color: var(--text-muted);">${d.sizeFormatted || this.formatFileSize(d.size)}</span>
          </div>
          <div style="display: flex; gap: 0.35rem; align-items: center;">
            <button type="button" class="btn btn-xs btn-outline" onclick="app.viewDocument('${d.id}', '${modalType}', 'modal')" title="Preview document">View</button>
            <button type="button" class="btn btn-xs btn-ghost" onclick="app.downloadDocument('${d.id}', '${this.escapeHtml(d.name)}')" title="Download file">⬇</button>
            <button type="button" class="btn btn-xs btn-ghost" style="color: var(--danger);" onclick="app.removeModalPendingDoc('${modalType}', '${d.id}')" title="Remove attachment">&times;</button>
          </div>
        </div>
      `;
    }).join('');
  }

  removeModalPendingDoc(modalType, docId) {
    if (this.modalPendingDocs[modalType]) {
      this.modalPendingDocs[modalType] = this.modalPendingDocs[modalType].filter(d => d.id !== docId);
      this.renderModalDocsList(modalType);
    }
  }

  renderDocumentCardsHtml(docs, entityType, entityId) {
    if (!docs || docs.length === 0) {
      return `<div style="font-size: 0.825rem; color: var(--text-muted); font-style: italic; padding: 0.5rem 0;">No documents attached to this clinical record yet. Click "+ Attach Document" to upload.</div>`;
    }
    return `
      <div class="doc-grid" style="margin-top: 0.5rem;">
        ${docs.map(d => {
          const iconInfo = this.getDocumentIconInfo(d);
          const uploadedDate = d.uploadedAt ? d.uploadedAt.slice(0, 10) : '';
          return `
            <div class="doc-card">
              <div class="doc-card-top">
                <div class="doc-card-icon ${iconInfo.class}">${iconInfo.icon}</div>
                <div class="doc-card-info">
                  <span class="doc-category-badge">${this.escapeHtml(d.category || 'Document')}</span>
                  <div class="doc-card-name" title="${this.escapeHtml(d.name)}">${this.escapeHtml(d.name)}</div>
                  <div class="doc-card-meta">
                    <span>${d.sizeFormatted || this.formatFileSize(d.size)}</span>
                    <span>&bull;</span>
                    <span>${uploadedDate}</span>
                  </div>
                </div>
              </div>
              <div class="doc-card-actions">
                <button type="button" class="btn btn-sm btn-outline" onclick="app.viewDocument('${d.id}', '${entityType}', '${entityId}')" title="Preview document">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"/><circle cx="12" cy="7" r="3"/></svg>
                  <span>View</span>
                </button>
                <button type="button" class="btn btn-sm btn-ghost" onclick="app.downloadDocument('${d.id}', '${this.escapeHtml(d.name)}')" title="Download document to device">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Download</span>
                </button>
                <button type="button" class="btn btn-sm btn-ghost" style="color: var(--danger);" onclick="app.deleteDocument('${d.id}', '${entityType}', '${entityId}')" title="Permanently delete document">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  <span>Delete</span>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  async viewDocument(docId, entityType, entityId) {
    const doc = this.findDocumentById(docId);
    if (!doc) {
      this.showToast('Document record could not be found.', 'danger');
      return;
    }

    const data = doc.data || await this.docStore.getDocumentData(doc);
    if (!data) {
      this.showToast('Unable to load document preview data.', 'danger');
      return;
    }

    this.currentViewerDoc = doc;

    const titleEl = document.getElementById('modal-view-doc-title');
    const subEl = document.getElementById('modal-view-doc-sub');
    const iconEl = document.getElementById('modal-view-doc-icon');
    const bodyEl = document.getElementById('modal-view-doc-body');
    const downloadBtn = document.getElementById('modal-view-doc-download-btn');
    const deleteBtn = document.getElementById('modal-view-doc-delete-btn');

    const iconInfo = this.getDocumentIconInfo(doc);

    if (titleEl) titleEl.textContent = doc.name;
    if (iconEl) iconEl.textContent = iconInfo.icon;
    if (subEl) {
      const dateStr = doc.uploadedAt ? doc.uploadedAt.slice(0, 10) : 'Today';
      subEl.textContent = `${doc.category || 'Clinical Document'} • ${doc.sizeFormatted || this.formatFileSize(doc.size)} • Uploaded: ${dateStr} by ${doc.uploadedBy || 'Staff'}`;
    }

    if (downloadBtn) {
      downloadBtn.onclick = () => this.downloadDocument(doc.id, doc.name);
    }
    if (deleteBtn) {
      deleteBtn.onclick = () => this.deleteDocument(doc.id, entityType, entityId, true);
    }

    if (bodyEl) {
      bodyEl.innerHTML = '';
      const isImage = this.isImage(doc);
      const isPdf = this.isPdf(doc);
      const isText = doc.type && doc.type.startsWith('text/');

      if (isImage) {
        bodyEl.innerHTML = `
          <div style="background: rgba(0,0,0,0.5); padding: 0.5rem 1rem; display: flex; justify-content: space-between; align-items: center; color: #e2e8f0; font-size: 0.8rem; flex-shrink: 0;">
            <span>High-Resolution Image / Medical Scan Preview</span>
            <div style="display: flex; gap: 0.5rem;">
              <button type="button" class="btn btn-sm btn-ghost" style="color: #38bdf8;" onclick="app.zoomDocImage(1.25)">🔍 Zoom In</button>
              <button type="button" class="btn btn-sm btn-ghost" style="color: #38bdf8;" onclick="app.zoomDocImage(0.8)">🔍 Zoom Out</button>
              <button type="button" class="btn btn-sm btn-ghost" style="color: #cbd5e1;" onclick="app.resetDocImage()">Reset</button>
            </div>
          </div>
          <div class="doc-viewer-container" style="flex: 1; padding: 1rem;">
            <img src="${data}" class="doc-viewer-img" id="doc-active-image" alt="${this.escapeHtml(doc.name)}">
          </div>
        `;
      } else if (isPdf) {
        bodyEl.innerHTML = `
          <div style="background: rgba(0,0,0,0.5); padding: 0.5rem 1rem; display: flex; justify-content: space-between; align-items: center; color: #e2e8f0; font-size: 0.8rem; flex-shrink: 0;">
            <span>PDF Clinical Document Viewer</span>
            <button type="button" class="btn btn-sm btn-ghost" style="color: #38bdf8;" onclick="window.open('${data}', '_blank')">
              ⇱ Open in Separate Browser Tab
            </button>
          </div>
          <div style="flex: 1; width: 100%; height: 100%;">
            <iframe src="${data}" class="doc-viewer-frame" title="${this.escapeHtml(doc.name)}"></iframe>
          </div>
        `;
      } else if (isText) {
        let textContent = '';
        try {
          if (data.startsWith('data:text/')) {
            const parts = data.split(',');
            textContent = parts[0].includes('base64') ? atob(parts[1]) : decodeURIComponent(parts[1]);
          } else {
            textContent = atob(data.split(',')[1]);
          }
        } catch (e) {
          textContent = 'Text preview could not be decoded.';
        }
        bodyEl.innerHTML = `
          <div class="doc-viewer-text">${this.escapeHtml(textContent)}</div>
        `;
      } else {
        bodyEl.innerHTML = `
          <div class="doc-viewer-container" style="flex-direction: column; gap: 1rem; color: #f8fafc; text-align: center; padding: 2rem;">
            <div style="font-size: 3rem;">${iconInfo.icon}</div>
            <div style="font-weight: 700; font-size: 1.15rem;">${this.escapeHtml(doc.name)}</div>
            <div style="color: #94a3b8; font-size: 0.88rem;">${this.escapeHtml(doc.category || 'Clinical Document')} &bull; ${doc.sizeFormatted || this.formatFileSize(doc.size)}</div>
            <p style="color: #cbd5e1; max-width: 440px; font-size: 0.85rem; line-height: 1.5;">
              Direct inline rendering is not supported for this binary format in the embedded viewer. Click the button below to download the original document to your device.
            </p>
            <button type="button" class="btn btn-primary" onclick="app.downloadDocument('${doc.id}', '${this.escapeHtml(doc.name)}')">
              Download "${this.escapeHtml(doc.name)}"
            </button>
          </div>
        `;
      }
    }

    this.openModal(document.getElementById('modal-view-document'));
  }

  zoomDocImage(factor) {
    const img = document.getElementById('doc-active-image');
    if (!img) return;
    const currentScale = parseFloat(img.getAttribute('data-scale') || '1');
    const newScale = Math.max(0.4, Math.min(4, currentScale * factor));
    img.setAttribute('data-scale', newScale);
    img.style.transform = `scale(${newScale})`;
  }

  resetDocImage() {
    const img = document.getElementById('doc-active-image');
    if (!img) return;
    img.setAttribute('data-scale', '1');
    img.style.transform = 'scale(1)';
  }

  downloadDocument(docId, filename) {
    const doc = this.findDocumentById(docId);
    if (!doc) {
      this.showToast('Document not found for download.', 'danger');
      return;
    }
    const data = doc.data || this.docStore.cache.get(docId);
    if (!data) {
      this.showToast('Document data could not be retrieved.', 'danger');
      return;
    }
    const a = document.createElement('a');
    a.href = data;
    a.download = filename || doc.name || 'document';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.showToast(`Downloaded "${doc.name}"`, 'success');
  }

  async deleteDocument(docId, entityType, entityId, closeViewer = false) {
    const doc = this.findDocumentById(docId);
    const docName = doc ? doc.name : 'this document';

    const performDelete = async () => {
      if (!confirm(`Are you sure you want to permanently delete document "${docName}"? This action cannot be undone.`)) {
        return;
      }

      // Remove from target entity
      if (entityType === 'patient') {
        const patient = this.getPatientById(entityId);
        if (patient && Array.isArray(patient.documents)) {
          patient.documents = patient.documents.filter(d => d.id !== docId);
        }
      } else if (entityType === 'consultation') {
        const consult = this.consultations.find(c => c.id === entityId);
        if (consult && Array.isArray(consult.documents)) {
          consult.documents = consult.documents.filter(d => d.id !== docId);
        }
      } else if (entityType === 'treatment') {
        const tx = this.treatments.find(t => t.id === entityId);
        if (tx && Array.isArray(tx.documents)) {
          tx.documents = tx.documents.filter(d => d.id !== docId);
        }
      } else if (entityType === 'laboratory') {
        const lab = (this.laboratory || []).find(l => l.id === entityId);
        if (lab && Array.isArray(lab.documents)) {
          lab.documents = lab.documents.filter(d => d.id !== docId);
        }
      } else if (entityType && this.modalPendingDocs[entityType]) {
        this.modalPendingDocs[entityType] = this.modalPendingDocs[entityType].filter(d => d.id !== docId);
        this.renderModalDocsList(entityType);
      }

      await this.docStore.deleteDocument(docId);
      this.saveData();

      if (closeViewer) {
        this.closeModal(document.getElementById('modal-view-document'));
      }

      // Re-render relevant view
      if (this.activeView === 'patient-chart' && this.selectedPatientId === entityId) {
        const patient = this.getPatientById(entityId);
        if (patient) {
          this.renderPatientDocuments(patient);
          const docBadge = document.getElementById('chart-tab-doc-count');
          if (docBadge) docBadge.textContent = (patient.documents || []).length;
        }
      } else if (entityType === 'consultation') {
        this.renderConsultationsList();
        const openModal = document.getElementById('modal-view-record');
        if (openModal && openModal.classList.contains('open')) {
          this.viewConsultation(entityId);
        }
      } else if (entityType === 'treatment') {
        this.renderTreatmentsList();
        const openModal = document.getElementById('modal-view-record');
        if (openModal && openModal.classList.contains('open')) {
          this.viewTreatment(entityId);
        }
      } else if (entityType === 'laboratory') {
        this.renderLaboratory();
        const openModal = document.getElementById('modal-view-record');
        if (openModal && openModal.classList.contains('open')) {
          this.viewLaboratory(entityId);
        }
      }

      this.showToast(`Document "${docName}" permanently deleted.`, 'info');
    };

    if (!this.isUserAuthorized()) {
      this.requireAuthorization(`Delete Document: ${docName}`, performDelete);
    } else {
      performDelete();
    }
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
      case 'schedule':
        this.renderSchedule();
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
      case 'laboratory':
        this.renderLaboratory();
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
    const navSch = document.getElementById('nav-schedule-count');
    const navLab = document.getElementById('nav-lab-count');

    if (navPat) navPat.textContent = patCount;
    if (navCon) navCon.textContent = consultCount;
    if (navTx) navTx.textContent = txCount;
    if (navSch) {
      const activeSchedulesCount = (this.schedules || []).filter(s => s.status !== 'Cancelled').length;
      navSch.textContent = activeSchedulesCount;
    }
    if (navLab) {
      navLab.textContent = (this.laboratory || []).length;
    }

    this.updateTomorrowReminderBadge();

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
                <div style="font-size: 0.78rem; color: var(--text-muted);">Cycle ${this.escapeHtml(String(tx.cycleNumber))} of ${this.escapeHtml(String(tx.cycleTotal || '?'))} (Day ${tx.dayOfCycle || 1})</div>
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
   * View: Clinical Schedule & Appointments
   * ------------------------------------------------------------------ */
  getTodayDateStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  getTomorrowDateStr() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  getTomorrowAppointments() {
    const tomorrowStr = this.getTomorrowDateStr();
    return (this.schedules || []).filter(s => s.scheduledDate === tomorrowStr && s.status !== 'Cancelled');
  }

  updateTomorrowReminderBadge() {
    const appts = this.getTomorrowAppointments();
    const count = appts.length;
    const badge = document.getElementById('header-reminder-count');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  ensureInitialSampleSchedules() {
    const todayStr = this.getTodayDateStr();
    const tomorrowStr = this.getTomorrowDateStr();

    if (this.schedules && this.schedules.length > 0) {
      // Ensure sample items track current today & tomorrow dates
      const hasToday = this.schedules.some(s => s.scheduledDate === todayStr && s.status !== 'Cancelled');
      const hasTomorrow = this.schedules.some(s => s.scheduledDate === tomorrowStr && s.status !== 'Cancelled');
      if (!hasToday || !hasTomorrow) {
        this.schedules.forEach(s => {
          if (['sch-101', 'sch-102', 'sch-103', 'sch-104', 'sch-105', 'sch-105-lab'].includes(s.id)) s.scheduledDate = todayStr;
          if (['sch-106', 'sch-107', 'sch-108', 'sch-108-lab'].includes(s.id)) s.scheduledDate = tomorrowStr;
        });
      }

      // If no laboratory appointments exist in schedule, inject sample lab appointments
      const hasLab = this.schedules.some(s => s.type === 'laboratory');
      if (!hasLab && this.patients && this.patients.length > 0) {
        const pLab1 = this.patients[2] || this.patients[0];
        const pLab2 = this.patients[1] || this.patients[0];
        this.schedules.push(
          {
            id: 'sch-105-lab',
            patientId: pLab1.id,
            patientName: pLab1.fullName,
            mrn: pLab1.mrn,
            type: 'laboratory',
            scheduledDate: todayStr,
            scheduledTime: '08:00',
            durationMinutes: 30,
            station: 'Laboratory Phlebotomy Station 1',
            status: 'Scheduled',
            oncologist: pLab1.primaryOncologist || 'Dr. Evelyn Reed, MD',
            nurse: 'Phlebotomist Mark Ramos, RMT',
            regimenName: '',
            cycleNumber: '',
            cycleTotal: '',
            reason: 'STAT CBC with ANC & Platelets Extraction',
            notes: 'Fasting specimen. Priority turnaround required for oncology clearance.'
          },
          {
            id: 'sch-108-lab',
            patientId: pLab2.id,
            patientName: pLab2.fullName,
            mrn: pLab2.mrn,
            type: 'laboratory',
            scheduledDate: tomorrowStr,
            scheduledTime: '07:30',
            durationMinutes: 30,
            station: 'Laboratory Phlebotomy Station 1',
            status: 'Scheduled',
            oncologist: pLab2.primaryOncologist || 'Dr. Julian Santos, MD',
            nurse: 'Phlebotomist Mark Ramos, RMT',
            regimenName: '',
            cycleNumber: '',
            cycleTotal: '',
            reason: 'Comprehensive Metabolic Panel & Hepatorenal Screening',
            notes: 'Screen serum creatinine and ALT/AST before Cycle 4 infusion.'
          }
        );
      }
      this.saveData();
      return;
    }

    const p1 = this.patients[0] || { id: 'ICC-P001', fullName: 'Reyes, Elena Cruz', mrn: 'ICC-P001' };
    const p2 = this.patients[1] || { id: 'ICC-P002', fullName: 'Gomez, Ramon Bautista', mrn: 'ICC-P002' };
    const p3 = this.patients[2] || { id: 'ICC-P003', fullName: 'Santos, Carmen Valenzuela', mrn: 'ICC-P003' };
    const p4 = this.patients[3] || { id: 'ICC-P004', fullName: 'Cruz, Antonio Morales', mrn: 'ICC-P004' };
    const p5 = this.patients[4] || { id: 'ICC-P005', fullName: 'Diaz, Luzviminda Flores', mrn: 'ICC-P005' };
    const p6 = this.patients[5] || { id: 'ICC-P006', fullName: 'Bautista, Eduardo Mendoza', mrn: 'ICC-P006' };
    const p7 = this.patients[6] || { id: 'ICC-P007', fullName: 'Mendoza, Teresa Aquino', mrn: 'ICC-P007' };

    this.schedules = [
      // Today
      {
        id: 'sch-101',
        patientId: p1.id,
        patientName: p1.fullName,
        mrn: p1.mrn,
        type: 'consultation',
        scheduledDate: todayStr,
        scheduledTime: '08:30',
        durationMinutes: 45,
        station: 'Consultation Exam Room 1',
        status: 'Checked-In',
        oncologist: 'Dr. Evelyn Reed, MD',
        nurse: 'Nurse Sarah Jenkins, RN',
        regimenName: '',
        cycleNumber: '',
        cycleTotal: '',
        reason: 'Pre-Chemotherapy Clearance & CBC Review (Cycle 4 Preparation)',
        notes: 'Check ANC (>1.5) and Platelets (>100) before clearance.'
      },
      {
        id: 'sch-102',
        patientId: p2.id,
        patientName: p2.fullName,
        mrn: p2.mrn,
        type: 'treatment',
        scheduledDate: todayStr,
        scheduledTime: '09:30',
        durationMinutes: 180,
        station: 'Infusion Chair #1',
        status: 'Scheduled',
        oncologist: 'Dr. Evelyn Reed, MD',
        nurse: 'Nurse Sarah Jenkins, RN',
        regimenName: 'mFOLFOX6',
        cycleNumber: '4',
        cycleTotal: '12',
        reason: 'mFOLFOX6 Cycle 4 Infusion (Oxaliplatin + Leucovorin + 5-FU)',
        notes: 'Cold sensitivity precautions. Dual independent verification required.'
      },
      {
        id: 'sch-103',
        patientId: p3.id,
        patientName: p3.fullName,
        mrn: p3.mrn,
        type: 'consultation',
        scheduledDate: todayStr,
        scheduledTime: '10:45',
        durationMinutes: 30,
        station: 'Consultation Exam Room 2',
        status: 'Scheduled',
        oncologist: 'Dr. Julian Santos, MD',
        nurse: 'Nurse Michael Chang, RN',
        regimenName: '',
        cycleNumber: '',
        cycleTotal: '',
        reason: 'Mid-treatment Clinical Re-assessment & Neuropathy Check',
        notes: 'Assess sensory neuropathy CTCAE grade from prior Paclitaxel.'
      },
      {
        id: 'sch-104',
        patientId: p4.id,
        patientName: p4.fullName,
        mrn: p4.mrn,
        type: 'treatment',
        scheduledDate: todayStr,
        scheduledTime: '13:00',
        durationMinutes: 60,
        station: 'Infusion Chair #3',
        status: 'Scheduled',
        oncologist: 'Dr. Evelyn Reed, MD',
        nurse: 'Nurse Sarah Jenkins, RN',
        regimenName: 'Pembrolizumab (Keytruda)',
        cycleNumber: '6',
        cycleTotal: '18',
        reason: 'Pembrolizumab 200mg IV Infusion over 30 mins',
        notes: 'Pre-infusion vitals check. Screen for immune-related adverse events.'
      },
      {
        id: 'sch-105',
        patientId: p5.id,
        patientName: p5.fullName,
        mrn: p5.mrn,
        type: 'treatment',
        scheduledDate: todayStr,
        scheduledTime: '14:15',
        durationMinutes: 240,
        station: 'Infusion Bed #1 (Private)',
        status: 'Scheduled',
        oncologist: 'Dr. Julian Santos, MD',
        nurse: 'Nurse Michael Chang, RN',
        regimenName: 'Carboplatin + Paclitaxel',
        cycleNumber: '2',
        cycleTotal: '6',
        reason: 'Carbo/Pacli Infusion Session with full premeds',
        notes: 'Dexamethasone 20mg IV, Diphenhydramine 50mg IV, Ranitidine 50mg IV given 30m prior.'
      },
      {
        id: 'sch-105-lab',
        patientId: p3.id,
        patientName: p3.fullName,
        mrn: p3.mrn,
        type: 'laboratory',
        scheduledDate: todayStr,
        scheduledTime: '08:00',
        durationMinutes: 30,
        station: 'Laboratory Phlebotomy Station 1',
        status: 'Scheduled',
        oncologist: p3.primaryOncologist || 'Dr. Evelyn Reed, MD',
        nurse: 'Phlebotomist Mark Ramos, RMT',
        regimenName: '',
        cycleNumber: '',
        cycleTotal: '',
        reason: 'STAT CBC with ANC & Platelets Extraction',
        notes: 'Fasting specimen. Priority turnaround required for oncology clearance.'
      },
      // Tomorrow
      {
        id: 'sch-106',
        patientId: p1.id,
        patientName: p1.fullName,
        mrn: p1.mrn,
        type: 'treatment',
        scheduledDate: tomorrowStr,
        scheduledTime: '09:00',
        durationMinutes: 120,
        station: 'Infusion Chair #2',
        status: 'Scheduled',
        oncologist: 'Dr. Evelyn Reed, MD',
        nurse: 'Nurse Sarah Jenkins, RN',
        regimenName: 'AC (Doxorubicin + Cyclophosphamide)',
        cycleNumber: '4',
        cycleTotal: '8',
        reason: 'AC Protocol Cycle 4 - Final anthracycline cycle before taxane',
        notes: 'Vesicant alert: Doxorubicin push over 15 mins via Port-A-Cath.'
      },
      {
        id: 'sch-107',
        patientId: p6.id,
        patientName: p6.fullName,
        mrn: p6.mrn,
        type: 'consultation',
        scheduledDate: tomorrowStr,
        scheduledTime: '10:30',
        durationMinutes: 45,
        station: 'Consultation Exam Room 1',
        status: 'Scheduled',
        oncologist: 'Dr. Evelyn Reed, MD',
        nurse: 'Nurse Sarah Jenkins, RN',
        regimenName: '',
        cycleNumber: '',
        cycleTotal: '',
        reason: 'Pre-chemo Baseline Cardiac & Echo Clearance for R-CHOP',
        notes: 'LVEF report from cardiologist required.'
      },
      {
        id: 'sch-108',
        patientId: p7.id,
        patientName: p7.fullName,
        mrn: p7.mrn,
        type: 'treatment',
        scheduledDate: tomorrowStr,
        scheduledTime: '13:30',
        durationMinutes: 210,
        station: 'Infusion Chair #4',
        status: 'Scheduled',
        oncologist: 'Dr. Julian Santos, MD',
        nurse: 'Nurse Michael Chang, RN',
        regimenName: 'R-CHOP',
        cycleNumber: '5',
        cycleTotal: '6',
        reason: 'Rituximab IV slow titration followed by CHOP',
        notes: 'Pre-medicate: Paracetamol 1000mg + Diphenhydramine 50mg.'
      },
      {
        id: 'sch-108-lab',
        patientId: p2.id,
        patientName: p2.fullName,
        mrn: p2.mrn,
        type: 'laboratory',
        scheduledDate: tomorrowStr,
        scheduledTime: '07:30',
        durationMinutes: 30,
        station: 'Laboratory Phlebotomy Station 1',
        status: 'Scheduled',
        oncologist: p2.primaryOncologist || 'Dr. Julian Santos, MD',
        nurse: 'Phlebotomist Mark Ramos, RMT',
        regimenName: '',
        cycleNumber: '',
        cycleTotal: '',
        reason: 'Comprehensive Metabolic Panel & Hepatorenal Screening',
        notes: 'Screen serum creatinine and ALT/AST before Cycle 4 infusion.'
      },
      // Upcoming days
      {
        id: 'sch-109',
        patientId: p2.id,
        patientName: p2.fullName,
        mrn: p2.mrn,
        type: 'consultation',
        scheduledDate: '2026-11-09',
        scheduledTime: '09:00',
        durationMinutes: 30,
        station: 'Consultation Exam Room 1',
        status: 'Scheduled',
        oncologist: 'Dr. Evelyn Reed, MD',
        nurse: 'Nurse Sarah Jenkins, RN',
        regimenName: '',
        cycleNumber: '',
        cycleTotal: '',
        reason: 'Post-chemo Nadir CBC Check & Toxicity Scoring',
        notes: 'Evaluate neutropenia & diarrhea severity.'
      },
      {
        id: 'sch-110',
        patientId: p3.id,
        patientName: p3.fullName,
        mrn: p3.mrn,
        type: 'treatment',
        scheduledDate: '2026-11-10',
        scheduledTime: '09:30',
        durationMinutes: 180,
        station: 'Infusion Chair #1',
        status: 'Scheduled',
        oncologist: 'Dr. Julian Santos, MD',
        nurse: 'Nurse Michael Chang, RN',
        regimenName: 'Paclitaxel Weekly',
        cycleNumber: '7',
        cycleTotal: '12',
        reason: 'Weekly Paclitaxel 80 mg/m² Infusion',
        notes: 'Check absolute neutrophil count before starting infusion.'
      },
      {
        id: 'sch-111',
        patientId: p5.id,
        patientName: p5.fullName,
        mrn: p5.mrn,
        type: 'consultation',
        scheduledDate: '2026-11-12',
        scheduledTime: '11:00',
        durationMinutes: 45,
        station: 'Consultation Exam Room 2',
        status: 'Scheduled',
        oncologist: 'Dr. Julian Santos, MD',
        nurse: 'Nurse Michael Chang, RN',
        regimenName: '',
        cycleNumber: '',
        cycleTotal: '',
        reason: 'Cycle 3 Clearance & Renal Function Review',
        notes: 'Serum creatinine and creatinine clearance verification.'
      }
    ];

    this.saveData();
  }

  /* ------------------------------------------------------------------
   * Tomorrow's Schedule Reminder Pop-Up & Roster
   * ------------------------------------------------------------------ */
  checkAndShowTomorrowReminder(force = false) {
    const tomorrowStr = this.getTomorrowDateStr();
    const todayStr = this.getTodayDateStr();
    const tomorrowAppts = this.getTomorrowAppointments();

    this.updateTomorrowReminderBadge();

    if (!force) {
      // Check if user dismissed for today or if already shown in this session
      const dismissed = localStorage.getItem('ICC_dismiss_tomorrow_reminder_' + todayStr);
      const shownSession = sessionStorage.getItem('ICC_shown_tomorrow_reminder_' + todayStr);
      if (dismissed || shownSession) return;
      if (tomorrowAppts.length === 0) return;
    }

    sessionStorage.setItem('ICC_shown_tomorrow_reminder_' + todayStr, 'true');
    this.renderTomorrowReminderModal(tomorrowAppts, tomorrowStr);
    const modal = document.getElementById('modal-tomorrow-reminder');
    if (modal) this.openModal(modal);
  }

  renderTomorrowReminderModal(appts, tomorrowStr) {
    const listContainer = document.getElementById('reminder-modal-patient-list');
    const dateLabel = document.getElementById('reminder-modal-date-label');
    const countSummary = document.getElementById('reminder-modal-count-summary');
    const consultBadge = document.getElementById('reminder-modal-consult-count');
    const txBadge = document.getElementById('reminder-modal-tx-count');

    const formattedDate = new Date(tomorrowStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    if (dateLabel) {
      dateLabel.textContent = `${formattedDate} • Patient call sheet & clinical preparation checklist`;
    }

    const consults = appts.filter(s => s.type === 'consultation');
    const txs = appts.filter(s => s.type === 'treatment');
    const labs = appts.filter(s => s.type === 'laboratory');

    if (countSummary) countSummary.textContent = `${appts.length} Patient${appts.length === 1 ? '' : 's'} Scheduled Tomorrow`;
    if (consultBadge) consultBadge.textContent = `🌿 ${consults.length} Consultation${consults.length === 1 ? '' : 's'}`;
    if (txBadge) txBadge.textContent = `🟡 ${txs.length} Treatment${txs.length === 1 ? '' : 's'}`;
    const labBadge = document.getElementById('reminder-modal-lab-count');
    if (labBadge) labBadge.textContent = `🧪 ${labs.length} Laboratory`;

    if (!listContainer) return;

    if (appts.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📅</div>
          <h4 style="color: var(--text-dark); margin-bottom: 0.35rem;">No Appointments Scheduled for Tomorrow</h4>
          <p style="font-size: 0.88rem; max-width: 420px; margin: 0 auto 1rem auto;">
            There are currently no patient consultations, chemotherapy infusions, or laboratory tests booked for ${formattedDate}.
          </p>
          <button type="button" class="btn btn-primary" onclick="app.closeModal(document.getElementById('modal-tomorrow-reminder')); app.openNewScheduleModal('consultation');">
            + Schedule Tomorrow's Appointment
          </button>
        </div>
      `;
      return;
    }

    // Sort by scheduled time
    const sorted = [...appts].sort((a, b) => (a.scheduledTime || '00:00').localeCompare(b.scheduledTime || '00:00'));

    listContainer.innerHTML = sorted.map(s => {
      const p = this.getPatientById(s.patientId);
      const name = p ? p.fullName : (s.patientName || 'Patient');
      const mrn = p ? p.mrn : (s.mrn || 'MRN');
      const diag = p ? p.primaryDiagnosis : 'Oncology Patient';
      const stage = p ? p.stage : '';
      const phone = p ? (p.phone || p.contactPhone || 'No contact phone recorded') : 'No phone recorded';
      const allergies = p ? (Array.isArray(p.allergies) ? p.allergies.join(', ') : String(p.allergies || '')) : '';
      const initials = (name || 'PT').split(/[\s,]+/).filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');
      const isConsult = s.type === 'consultation';
      const isLab = s.type === 'laboratory';

      return `
        <div class="reminder-patient-card ${isConsult ? 'reminder-consultation-card' : (isLab ? 'reminder-lab-card' : 'reminder-treatment-card')}" id="reminder-card-${s.id}">
          
          <div class="reminder-patient-header">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div class="schedule-avatar-pill ${isConsult ? 'consult-avatar' : (isLab ? 'lab-avatar' : 'tx-avatar')}" style="width: 38px; height: 38px; font-size: 0.85rem;">
                ${initials}
              </div>
              <div>
                <a class="reminder-patient-name" onclick="app.navigateTo('patient-chart', '${s.patientId}'); app.closeModal(document.getElementById('modal-tomorrow-reminder'));" title="Open Medical Chart">
                  ${this.escapeHtml(name)}
                </a>
                <span class="patient-mrn" style="margin-left: 0.35rem; font-size: 0.78rem;">${this.escapeHtml(mrn)}</span>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 1px;">
                  ${this.escapeHtml(diag)}${stage ? ` &bull; ${this.escapeHtml(stage)}` : ''}
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              ${isConsult 
                ? `<span class="badge" style="background: #f0fdf4; color: #166534; border: 1px solid #86efac; font-weight: 700;">🌿 Consultation</span>`
                : (isLab 
                    ? `<span class="badge" style="background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; font-weight: 700;">🧪 Laboratory</span>`
                    : `<span class="badge" style="background: #fefce8; color: #854d0e; border: 1px solid #fde047; font-weight: 700;">🟡 Chemotherapy</span>`)}
              <span class="badge badge-primary" style="font-weight: 700;">🕒 ${s.scheduledTime || '09:00'}</span>
            </div>
          </div>

          <!-- Meta Grid -->
          <div class="reminder-meta-grid">
            <div>
              <strong>Station:</strong> 🪑 ${this.escapeHtml(s.station || (isConsult ? 'Exam Room 1' : 'Infusion Chair'))}
            </div>
            <div>
              <strong>Contact Phone:</strong> 
              ${phone && (phone.includes('+') || phone.includes('09') || phone.includes('9'))
                ? `<a href="tel:${phone.replace(/\s+/g, '')}" style="color: var(--primary); font-weight: 700; text-decoration: none;">📞 ${this.escapeHtml(phone)}</a>`
                : `<span style="color: var(--text-muted);">${this.escapeHtml(phone)}</span>`}
            </div>
            <div>
              <strong>Attending Staff:</strong> 👨‍⚕️ ${this.escapeHtml(s.oncologist || (p ? p.primaryOncologist : 'Oncologist'))}
            </div>
            <div>
              <strong>${isConsult ? 'Clinical Clearance:' : 'Chemo Protocol:'}</strong> 
              ${!isConsult && s.regimenName 
                ? `<span style="font-weight: 700; color: #a16207;">${this.escapeHtml(s.regimenName)}</span> ${s.cycleNumber ? `(C${this.escapeHtml(String(s.cycleNumber))})` : ''}` 
                : `<span style="font-weight: 600;">${this.escapeHtml(s.reason || 'Clearance & Lab Review')}</span>`}
            </div>
          </div>

          <!-- Notes / Preparation Alerts -->
          ${allergies && allergies.toLowerCase() !== 'none' && allergies.toLowerCase() !== 'n/a' ? `
            <div style="margin-bottom: 0.4rem;">
              <span class="badge badge-danger" style="font-size: 0.72rem; padding: 2px 7px;">⚠️ Allergy: ${this.escapeHtml(allergies)}</span>
            </div>
          ` : ''}

          ${s.notes ? `
            <div class="reminder-notes-box">
              <span>📋</span>
              <div><strong>Preparation Instructions:</strong> ${this.escapeHtml(s.notes)}</div>
            </div>
          ` : ''}

          <!-- Quick Actions Footer -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px dashed var(--border);">
            <div id="reminder-call-status-${s.id}">
              <button type="button" class="btn btn-sm btn-outline" onclick="app.toggleReminderCallConfirmed('${s.id}')" style="font-size: 0.76rem; padding: 2px 8px;" title="Mark patient notified by phone">
                📞 Mark Call Confirmed
              </button>
            </div>
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <button type="button" class="btn btn-sm btn-ghost" onclick="app.openEditScheduleModal('${s.id}'); app.closeModal(document.getElementById('modal-tomorrow-reminder'));" style="font-size: 0.76rem;">
                Reschedule
              </button>
              <button type="button" class="btn btn-sm btn-primary" onclick="app.navigateTo('patient-chart', '${s.patientId}'); app.closeModal(document.getElementById('modal-tomorrow-reminder'));" style="font-size: 0.76rem; padding: 3px 10px;">
                Open Patient Chart &rarr;
              </button>
            </div>
          </div>

        </div>
      `;
    }).join('');
  }

  toggleReminderCallConfirmed(scheduleId) {
    const el = document.getElementById(`reminder-call-status-${scheduleId}`);
    if (el) {
      el.innerHTML = `
        <span class="badge" style="background: #dcfce7; color: #166534; border: 1px solid #86efac; font-weight: 700; font-size: 0.78rem;">
          ✓ Patient Notified & Confirmed
        </span>
      `;
      this.showToast('Patient call logged as confirmed for tomorrow', 'success');
    }
  }

  printTomorrowSchedule() {
    const tomorrowStr = this.getTomorrowDateStr();
    const appts = this.getTomorrowAppointments();
    const formattedDate = new Date(tomorrowStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    const consults = appts.filter(s => s.type === 'consultation');
    const txs = appts.filter(s => s.type === 'treatment');
    const labs = appts.filter(s => s.type === 'laboratory');

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tomorrow's Clinical Call Roster - ${formattedDate}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 25px; color: #1e293b; }
          .header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }
          h1 { margin: 0; font-size: 20px; color: #0f172a; }
          .sub { font-size: 13px; color: #64748b; margin-top: 4px; }
          .summary { display: flex; gap: 15px; margin-bottom: 20px; font-size: 13px; font-weight: bold; flex-wrap: wrap; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th { background: #f1f5f9; padding: 8px 10px; text-align: left; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; }
          td { padding: 8px 10px; border: 1px solid #cbd5e1; vertical-align: top; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .badge-consult { background: #dcfce7; color: #166534; }
          .badge-tx { background: #fefce8; color: #854d0e; }
          .badge-lab { background: #e0f2fe; color: #0284c7; }
          .signature-block { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Imus Chemotherapy Center &bull; Tomorrow's Clinical Call & Prep Roster</h1>
          <div class="sub">Scheduled for: <strong>${formattedDate}</strong> &bull; Printed: ${new Date().toLocaleString()}</div>
        </div>
        <div class="summary">
          <span>Total: ${appts.length} Appointments</span>
          <span>Consultations: ${consults.length}</span>
          <span>Treatments: ${txs.length}</span>
          <span>Laboratories: ${labs.length}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Patient Full Name & MRN</th>
              <th>Contact Phone</th>
              <th>Primary Cancer Diagnosis</th>
              <th>Station</th>
              <th>Regimen / Clearance Purpose</th>
              <th>Staff Assignment</th>
              <th>Call Confirmed</th>
            </tr>
          </thead>
          <tbody>
            ${appts.map(s => {
              const p = this.getPatientById(s.patientId);
              const name = p ? p.fullName : (s.patientName || 'Patient');
              const mrn = p ? p.mrn : (s.mrn || 'MRN');
              const diag = p ? p.primaryDiagnosis : '';
              const phone = p ? (p.phone || p.contactPhone || '-') : '-';
              const isConsult = s.type === 'consultation';
              const isLab = s.type === 'laboratory';
              return `
                <tr>
                  <td><strong>${s.scheduledTime || '09:00'}</strong></td>
                  <td><span class="badge ${isConsult ? 'badge-consult' : (isLab ? 'badge-lab' : 'badge-tx')}">${isConsult ? 'Consultation' : (isLab ? 'Laboratory' : 'Treatment')}</span></td>
                  <td><strong>${name}</strong><br><small>${mrn}</small></td>
                  <td>${phone}</td>
                  <td>${diag}</td>
                  <td>${s.station || '-'}</td>
                  <td>${!isConsult && s.regimenName ? `<strong>${s.regimenName}</strong> (C${s.cycleNumber || '1'})<br>` : ''}${s.reason || s.notes || '-'}</td>
                  <td>${s.oncologist || '-'} / ${s.nurse || '-'}</td>
                  <td style="text-align: center; width: 60px;">[ &nbsp; ]</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        <div class="signature-block">
          <div>Prepared by: ________________________ (Charge Nurse)</div>
          <div>Reviewed by: ________________________ (Attending Oncologist)</div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  createOrUpdateLinkedSchedule(details) {
    if (!details || !details.patientId || !details.scheduledDate) return;
    const patient = this.getPatientById(details.patientId);
    const patName = patient ? patient.fullName : 'Patient';
    const mrn = patient ? patient.mrn : '';

    const existingIdx = (this.schedules || []).findIndex(s => 
      s.patientId === details.patientId && 
      s.scheduledDate === details.scheduledDate && 
      s.type === details.type
    );

    const schItem = {
      id: existingIdx !== -1 ? this.schedules[existingIdx].id : ('sch-' + Date.now()),
      patientId: details.patientId,
      patientName: patName,
      mrn: mrn,
      type: details.type || 'consultation',
      scheduledDate: details.scheduledDate,
      scheduledTime: details.scheduledTime || '09:00',
      durationMinutes: details.durationMinutes || (details.type === 'treatment' ? 180 : (details.type === 'laboratory' ? 30 : 45)),
      station: details.station || (details.type === 'treatment' ? 'Infusion Chair #1' : (details.type === 'laboratory' ? 'Laboratory Phlebotomy Station 1' : 'Consultation Exam Room 1')),
      status: details.status || 'Scheduled',
      oncologist: details.oncologist || (patient ? patient.primaryOncologist : ''),
      nurse: details.nurse || (patient ? patient.primaryNurse : ''),
      regimenName: details.regimenName || '',
      cycleNumber: details.cycleNumber || '',
      cycleTotal: details.cycleTotal || '',
      reason: details.reason || (details.type === 'treatment' ? 'Chemotherapy Treatment Session' : (details.type === 'laboratory' ? 'Laboratory & Diagnostic Extraction' : 'Pre-Chemo Clearance')),
      notes: details.notes || ''
    };

    if (existingIdx !== -1) {
      this.schedules[existingIdx] = schItem;
    } else {
      this.schedules.push(schItem);
    }

    this.saveData();
  }

  renderSchedule() {
    const container = document.getElementById('schedule-timeline-container');
    if (!container) return;

    // Ensure all schedule patient names and MRNs are in sync with patients database
    (this.schedules || []).forEach(s => {
      if (s.patientId) {
        const p = this.getPatientById(s.patientId);
        if (p) {
          s.patientName = p.fullName;
          s.mrn = p.mrn;
        }
      }
    });

    // Dates calculation
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    
    const tomDate = new Date(today);
    tomDate.setDate(tomDate.getDate() + 1);
    const tomorrowStr = tomDate.toISOString().slice(0, 10);

    const endWeekDate = new Date(today);
    endWeekDate.setDate(endWeekDate.getDate() + 7);
    const endOfWeekStr = endWeekDate.toISOString().slice(0, 10);

    const endNextWeekDate = new Date(today);
    endNextWeekDate.setDate(endNextWeekDate.getDate() + 14);
    const endOfNextWeekStr = endNextWeekDate.toISOString().slice(0, 10);

    const schedules = this.schedules || [];

    // Active schedules
    const activeSchedules = schedules.filter(s => s.status !== 'Cancelled');
    const todaySchedules = activeSchedules.filter(s => s.scheduledDate === todayStr);
    const todayConsults = todaySchedules.filter(s => s.type === 'consultation').length;
    const todayTx = todaySchedules.filter(s => s.type === 'treatment').length;
    const todayLabs = todaySchedules.filter(s => s.type === 'laboratory').length;

    const elToday = document.getElementById('stat-schedule-today-count');
    const elTodaySub = document.getElementById('stat-schedule-today-sub');
    if (elToday) elToday.textContent = todaySchedules.length;
    if (elTodaySub) elTodaySub.textContent = `${todayConsults} consults, ${todayTx} treatments${todayLabs > 0 ? `, ${todayLabs} labs` : ''}`;

    // Apply Filters: "From" and "To" Date Range
    const fromDate = this.scheduleDateFrom || '';
    const toDate = this.scheduleDateTo || '';
    const typeFilter = this.scheduleTypeFilter || 'all';
    const statusFilter = this.scheduleStatusFilter || 'all';
    const search = (this.scheduleSearchQuery || '').toLowerCase().trim();

    let filtered = schedules.filter(s => {
      // Date range filter between "from" and "to"
      if (fromDate && s.scheduledDate < fromDate) {
        return false;
      }
      if (toDate && s.scheduledDate > toDate) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && s.type !== typeFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;

      // Search query
      if (search) {
        const p = this.getPatientById(s.patientId);
        const pName = (p ? p.fullName : s.patientName || '').toLowerCase();
        const pMrn = (p ? p.mrn : s.mrn || '').toLowerCase();
        const onc = (s.oncologist || '').toLowerCase();
        const nurse = (s.nurse || '').toLowerCase();
        const reg = (s.regimenName || '').toLowerCase();
        const reason = (s.reason || '').toLowerCase();
        const station = (s.station || '').toLowerCase();

        const match = pName.includes(search) || 
                      pMrn.includes(search) || 
                      onc.includes(search) || 
                      nurse.includes(search) || 
                      reg.includes(search) || 
                      reason.includes(search) || 
                      station.includes(search);
        if (!match) return false;
      }

      return true;
    });

    // Chronological Sort
    filtered.sort((a, b) => {
      if (a.scheduledDate !== b.scheduledDate) {
        return a.scheduledDate.localeCompare(b.scheduledDate);
      }
      return (a.scheduledTime || '00:00').localeCompare(b.scheduledTime || '00:00');
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="panel" style="text-align: center; padding: 3rem 1.5rem; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px;">
          <div style="font-size: 3rem; margin-bottom: 0.75rem;">📅</div>
          <h3 style="margin-bottom: 0.35rem; color: var(--text-dark);">No Scheduled Appointments Found</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 480px; margin: 0 auto 1.25rem auto;">
            ${fromDate || toDate 
              ? `No consultations or treatments were found between <strong>${this.escapeHtml(fromDate || 'the beginning')}</strong> and <strong>${this.escapeHtml(toDate || 'the end')}</strong>.` 
              : 'There are no consultations or treatments matching your current filter criteria.'}
          </p>
          <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="app.clearScheduleDateFilter()">Show All Scheduled Patients</button>
            <button class="btn btn-secondary" onclick="app.openNewScheduleModal()">+ Schedule New Appointment</button>
          </div>
        </div>
      `;
      return;
    }

    const getInitials = (name) => {
      if (!name) return 'PT';
      return name.split(/[\s,]+/).filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');
    };

    // Render Clinical Schedule List: Date First, then Patient Name
    container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem; padding: 0.6rem 1rem; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px; flex-wrap: wrap; gap: 0.5rem;">
          <div style="font-size: 0.86rem; color: var(--text-dark); font-weight: 600; display: flex; align-items: center; gap: 6px;">
            <span>📋 Scheduled Patients:</span>
            <span class="badge badge-primary" style="font-size: 0.78rem;">${filtered.length} ${filtered.length === 1 ? 'Appointment' : 'Appointments'}</span>
            ${fromDate || toDate ? `<span style="font-size: 0.8rem; font-weight: 500; color: var(--text-muted);">(${fromDate || 'Start'} to ${toDate || 'End'})</span>` : '<span style="font-size: 0.8rem; font-weight: 500; color: var(--text-muted);">(All Dates)</span>'}
          </div>
          <button type="button" class="btn btn-sm btn-ghost" onclick="app.clearScheduleDateFilter()" style="font-size: 0.76rem; padding: 2px 8px; color: var(--text-muted);">
            ✕ Clear Filter
          </button>
        </div>
        <div class="schedule-list-container">
          ${filtered.map(s => {
            const p = this.getPatientById(s.patientId);
            const patName = p ? p.fullName : (s.patientName || 'Patient');
            const patMrn = p ? p.mrn : (s.mrn || 'MRN');
            const patDiagnosis = p ? p.primaryDiagnosis : 'Oncology Patient';
            const patStage = p ? p.stage : '';
            const patAllergies = p ? (Array.isArray(p.allergies) ? p.allergies.join(', ') : String(p.allergies || '')) : '';
            const initials = getInitials(patName);
            const isConsult = s.type === 'consultation';
            const isLab = s.type === 'laboratory';

            // Format Day label
            let dayLabel = '';
            if (s.scheduledDate === todayStr) {
              dayLabel = '<span class="badge" style="background: #dbeafe; color: #1e40af; font-weight: 700;">TODAY</span>';
            } else if (s.scheduledDate === tomorrowStr) {
              dayLabel = '<span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700;">TOMORROW</span>';
            } else {
              const dt = new Date(s.scheduledDate + 'T00:00:00');
              dayLabel = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            }

            let statusBadge = '';
            if (s.status === 'Checked-In') {
              statusBadge = `<span class="badge" style="background:#e0e7ff; color:#3730a3; font-weight:700;">✓ Checked In</span>`;
            } else if (s.status === 'Completed') {
              statusBadge = `<span class="badge badge-success">Completed</span>`;
            } else if (s.status === 'Cancelled') {
              statusBadge = `<span class="badge badge-secondary" style="text-decoration: line-through;">Cancelled</span>`;
            } else {
              statusBadge = `<span class="badge badge-primary">Scheduled</span>`;
            }

            return `
              <div class="schedule-list-card ${isConsult ? 'consult-item' : (isLab ? 'lab-item' : 'tx-item')}">
                
                <!-- 1. DATE FIRST -->
                <div class="schedule-list-date-col">
                  <div class="schedule-list-date-val">
                    <span>📅</span> <span>${s.scheduledDate}</span>
                  </div>
                  <div class="schedule-list-time-val">
                    <span>🕒</span> <span>${s.scheduledTime || '09:00'}</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500;">(${s.durationMinutes || 60}m)</span>
                  </div>
                  <div class="schedule-list-day-label">
                    ${dayLabel}
                  </div>
                </div>

                <!-- 2. PATIENT NAME NEXT -->
                <div class="schedule-list-patient-col">
                  <div class="schedule-avatar-pill ${isConsult ? 'consult-avatar' : (isLab ? 'lab-avatar' : 'tx-avatar')}">
                    ${initials}
                  </div>
                  <div style="min-width: 0;">
                    <a class="schedule-list-name-link" onclick="app.navigateTo('patient-chart', '${s.patientId}')" title="View Patient Chart">
                      ${this.escapeHtml(patName)}
                    </a>
                    <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">
                      <strong>${this.escapeHtml(patMrn)}</strong> &bull; ${this.escapeHtml(patStage || 'Oncology')}
                    </div>
                    <div style="font-size: 0.74rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;" title="${this.escapeHtml(patDiagnosis)}">
                      ${this.escapeHtml(patDiagnosis)}
                    </div>
                  </div>
                </div>

                <!-- 3. CLINICAL DETAILS -->
                <div class="schedule-list-details-col">
                  <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
                    ${isConsult 
                      ? `<span class="badge" style="background: #f0fdf4; color: #166534; border: 1px solid #86efac; font-weight: 700;">🌿 Consultation</span>`
                      : (isLab 
                          ? `<span class="badge" style="background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; font-weight: 700;">🧪 Laboratory</span>`
                          : `<span class="badge" style="background: #fefce8; color: #854d0e; border: 1px solid #fde047; font-weight: 700;">🟡 Treatment</span>`)}
                    <span class="schedule-station-badge">🪑 ${this.escapeHtml(s.station || (isLab ? 'Laboratory Unit' : 'Clinical Unit'))}</span>
                    ${patAllergies && patAllergies.toLowerCase() !== 'none' && patAllergies.toLowerCase() !== 'n/a'
                      ? `<span class="badge badge-danger" style="font-size: 0.68rem; padding: 1px 5px;">⚠️ ${this.escapeHtml(patAllergies)}</span>` : ''}
                  </div>

                  <div style="font-size: 0.85rem; color: var(--text-dark);">
                    ${!isConsult && !isLab && s.regimenName 
                      ? `<strong style="color: #a16207;">${this.escapeHtml(s.regimenName)}</strong> ${s.cycleNumber ? `(Cycle ${this.escapeHtml(String(s.cycleNumber))}${s.cycleTotal ? ` of ${this.escapeHtml(String(s.cycleTotal))}` : ''})` : ''} &bull; ` 
                      : ''}
                    <span>${this.escapeHtml(s.reason || (isConsult ? 'Pre-Chemo Clearance' : (isLab ? 'Blood Extraction & Diagnostics' : 'Chemo Infusion')))}</span>
                  </div>

                  <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 0.85rem; flex-wrap: wrap;">
                    ${s.oncologist ? `<span>👨‍⚕️ ${this.escapeHtml(s.oncologist)}</span>` : ''}
                    ${s.nurse ? `<span>👩‍⚕️ ${this.escapeHtml(s.nurse)}</span>` : ''}
                    ${s.notes ? `<span style="font-style: italic;">📝 ${this.escapeHtml(s.notes)}</span>` : ''}
                  </div>
                </div>

                <!-- 4. STATUS & ACTIONS -->
                <div class="schedule-list-actions-col">
                  ${statusBadge}

                  ${s.status === 'Scheduled' ? `
                    <button class="btn btn-sm btn-outline-primary" onclick="app.checkInSchedule('${s.id}')" title="Check In">
                      Check In
                    </button>
                  ` : ''}

                  ${isConsult ? `
                    <button class="btn btn-sm btn-primary" onclick="app.startScheduledActivity('${s.id}')" style="background: #16a34a; border-color: #15803d; font-size: 0.78rem;">
                      + Log Consult
                    </button>
                  ` : (isLab ? `
                    <button class="btn btn-sm btn-primary" onclick="app.startScheduledActivity('${s.id}')" style="background: #0284c7; border-color: #0369a1; font-size: 0.78rem;">
                      + Log Lab
                    </button>
                  ` : `
                    <button class="btn btn-sm btn-primary" onclick="app.startScheduledActivity('${s.id}')" style="background: #eab308; border-color: #ca8a04; color: #713f12; font-size: 0.78rem;">
                      + Log Chemo
                    </button>
                  `)}

                  <button class="btn btn-sm btn-secondary" onclick="app.openEditScheduleModal('${s.id}')" style="font-size: 0.78rem;">
                    Edit
                  </button>
                </div>

              </div>
            `;
          }).join('')}
        </div>
      `;
  }

  applyScheduleDateFilter() {
    const fromInput = document.getElementById('schedule-date-from');
    const toInput = document.getElementById('schedule-date-to');
    let fromDate = fromInput ? fromInput.value.trim() : '';
    let toDate = toInput ? toInput.value.trim() : '';

    if (fromDate && toDate && fromDate > toDate) {
      const temp = fromDate;
      fromDate = toDate;
      toDate = temp;
      if (fromInput) fromInput.value = fromDate;
      if (toInput) toInput.value = toDate;
    }

    this.scheduleDateFrom = fromDate;
    this.scheduleDateTo = toDate;
    this.renderSchedule();

    if (fromDate || toDate) {
      this.showToast(`Displaying schedule: ${fromDate || 'Start'} to ${toDate || 'End'}`, 'info');
    } else {
      this.showToast('Displaying all scheduled patients', 'info');
    }
  }

  clearScheduleDateFilter() {
    this.scheduleDateFrom = '';
    this.scheduleDateTo = '';
    const fromInput = document.getElementById('schedule-date-from');
    if (fromInput) fromInput.value = '';
    const toInput = document.getElementById('schedule-date-to');
    if (toInput) toInput.value = '';
    this.renderSchedule();
    this.showToast('Cleared date range filter. Displaying all scheduled patients.', 'info');
  }

  resetScheduleFilters() {
    this.scheduleDateFrom = '';
    this.scheduleDateTo = '';
    this.scheduleTypeFilter = 'all';
    this.scheduleStatusFilter = 'all';
    this.scheduleSearchQuery = '';

    const fromInput = document.getElementById('schedule-date-from');
    if (fromInput) fromInput.value = '';
    const toInput = document.getElementById('schedule-date-to');
    if (toInput) toInput.value = '';
    const searchInput = document.getElementById('schedule-search-input');
    if (searchInput) searchInput.value = '';
    const typeSelect = document.getElementById('schedule-type-filter');
    if (typeSelect) typeSelect.value = 'all';
    const statusSelect = document.getElementById('schedule-status-filter');
    if (statusSelect) statusSelect.value = 'all';

    this.renderSchedule();
  }

  openNewScheduleModal(defaultType = 'consultation', preselectedPatientId = null) {
    const modal = document.getElementById('modal-schedule-appointment');
    const form = document.getElementById('form-schedule-appointment');
    if (!modal || !form) return;

    form.reset();
    this.editingScheduleId = null;
    document.getElementById('sch-id').value = '';

    const titleEl = document.getElementById('modal-schedule-title-text');
    if (titleEl) titleEl.textContent = 'Schedule Clinical Appointment';
    const btnSave = document.getElementById('btn-save-schedule');
    if (btnSave) btnSave.textContent = 'Save Appointment';

    // Set default date to today
    const dateInput = document.getElementById('sch-date');
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

    const timeInput = document.getElementById('sch-time');
    if (timeInput) timeInput.value = '09:00';

    // Select type radio
    const radio = document.querySelector(`input[name="sch-type"][value="${defaultType}"]`);
    if (radio) {
      radio.checked = true;
    }
    this.onScheduleTypeChanged();

    // Patient selection
    const preview = document.getElementById('sch-selected-patient-preview');
    const hidden = document.getElementById('sch-patient-select');
    const searchInput = document.getElementById('sch-patient-search');

    if (preselectedPatientId) {
      this.selectSchedulePatient(preselectedPatientId);
    } else {
      if (preview) preview.style.display = 'none';
      if (hidden) hidden.value = '';
      if (searchInput) {
        searchInput.value = '';
        searchInput.style.display = 'block';
      }
    }

    this.openModal(modal);
    setTimeout(() => searchInput?.focus(), 150);
  }

  onScheduleTypeChanged() {
    const radio = document.querySelector('input[name="sch-type"]:checked');
    const val = radio ? radio.value : 'consultation';
    const txFields = document.getElementById('sch-treatment-fields');
    const stationSelect = document.getElementById('sch-station');

    if (val === 'treatment') {
      if (txFields) txFields.style.display = 'block';
      if (stationSelect && (stationSelect.value.startsWith('Consultation') || stationSelect.value.startsWith('Laboratory'))) {
        stationSelect.value = 'Infusion Chair #1';
      }
    } else if (val === 'laboratory') {
      if (txFields) txFields.style.display = 'none';
      if (stationSelect && !stationSelect.value.startsWith('Laboratory')) {
        stationSelect.value = 'Laboratory Phlebotomy Station 1';
      }
    } else {
      if (txFields) txFields.style.display = 'none';
      if (stationSelect && (stationSelect.value.startsWith('Infusion') || stationSelect.value.startsWith('Laboratory'))) {
        stationSelect.value = 'Consultation Exam Room 1';
      }
    }
  }

  openEditScheduleModal(id) {
    const sch = (this.schedules || []).find(s => s.id === id);
    if (!sch) return;

    const modal = document.getElementById('modal-schedule-appointment');
    const form = document.getElementById('form-schedule-appointment');
    form.reset();

    this.editingScheduleId = id;
    document.getElementById('sch-id').value = sch.id;

    const titleEl = document.getElementById('modal-schedule-title-text');
    if (titleEl) titleEl.textContent = 'Edit Scheduled Appointment';
    const btnSave = document.getElementById('btn-save-schedule');
    if (btnSave) btnSave.textContent = 'Update Appointment';

    // Type radio
    const radio = document.querySelector(`input[name="sch-type"][value="${sch.type}"]`);
    if (radio) radio.checked = true;
    this.onScheduleTypeChanged();

    // Patient
    this.selectSchedulePatient(sch.patientId);

    // Fields
    const setVal = (fid, v) => {
      const el = document.getElementById(fid);
      if (el && v !== undefined && v !== null) el.value = v;
    };

    setVal('sch-date', sch.scheduledDate);
    setVal('sch-time', sch.scheduledTime);
    setVal('sch-station', sch.station);
    setVal('sch-status', sch.status || 'Scheduled');
    setVal('sch-oncologist', sch.oncologist);
    setVal('sch-nurse', sch.nurse);
    setVal('sch-regimen', sch.regimenName);
    setVal('sch-cycle-num', sch.cycleNumber);
    setVal('sch-cycle-total', sch.cycleTotal);
    setVal('sch-reason', sch.reason);
    setVal('sch-notes', sch.notes);

    this.openModal(modal);
  }

  saveSchedule(formData) {
    const id = formData.get('sch-id') || document.getElementById('sch-id')?.value || ('sch-' + Date.now());
    const patientId = formData.get('sch-patient-select') || document.getElementById('sch-patient-select')?.value;
    if (!patientId) {
      this.showToast('Please search and select a patient first.', 'warning');
      return;
    }

    const patient = this.getPatientById(patientId);
    const patName = patient ? patient.fullName : 'Patient';
    const mrn = patient ? patient.mrn : '';

    const typeRadio = document.querySelector('input[name="sch-type"]:checked');
    const type = typeRadio ? typeRadio.value : 'consultation';

    const scheduledDate = formData.get('sch-date') || document.getElementById('sch-date')?.value;
    const scheduledTime = formData.get('sch-time') || document.getElementById('sch-time')?.value || '09:00';
    const station = formData.get('sch-station') || document.getElementById('sch-station')?.value || 'Clinical Unit';
    const status = formData.get('sch-status') || document.getElementById('sch-status')?.value || 'Scheduled';

    const oncologist = formData.get('sch-oncologist') || document.getElementById('sch-oncologist')?.value;
    const nurse = formData.get('sch-nurse') || document.getElementById('sch-nurse')?.value;

    const regimenName = formData.get('sch-regimen') || document.getElementById('sch-regimen')?.value || '';
    const cycleNumber = (formData.get('sch-cycle-num') || document.getElementById('sch-cycle-num')?.value || '').toString().trim();
    const cycleTotal = (formData.get('sch-cycle-total') || document.getElementById('sch-cycle-total')?.value || '').toString().trim();

    const reason = formData.get('sch-reason') || document.getElementById('sch-reason')?.value || (type === 'treatment' ? 'Chemotherapy Treatment Session' : (type === 'laboratory' ? 'Laboratory & Diagnostic Extraction' : 'Pre-Chemo Consultation & Clearance'));
    const notes = formData.get('sch-notes') || document.getElementById('sch-notes')?.value || '';

    const schData = {
      id,
      patientId,
      patientName: patName,
      mrn,
      type,
      scheduledDate,
      scheduledTime,
      durationMinutes: type === 'treatment' ? 180 : (type === 'laboratory' ? 30 : 45),
      station,
      status,
      oncologist,
      nurse,
      regimenName,
      cycleNumber,
      cycleTotal,
      reason,
      notes,
      updatedAt: new Date().toISOString()
    };

    const existingIdx = (this.schedules || []).findIndex(s => s.id === id);
    if (existingIdx !== -1) {
      this.schedules[existingIdx] = { ...this.schedules[existingIdx], ...schData };
      this.showToast('Appointment rescheduled and updated.', 'success');
    } else {
      schData.createdAt = new Date().toISOString();
      this.schedules.push(schData);
      this.showToast(`Appointment scheduled for ${patName}!`, 'success');
    }

    this.saveData();
    this.closeModal(document.getElementById('modal-schedule-appointment'));
    this.render();
  }

  checkInSchedule(id) {
    const sch = (this.schedules || []).find(s => s.id === id);
    if (!sch) return;
    sch.status = 'Checked-In';
    sch.checkedInAt = new Date().toISOString();
    this.saveData();
    this.showToast(`Patient ${sch.patientName || ''} marked as Checked In.`, 'success');
    this.render();
  }

  cancelSchedule(id) {
    const sch = (this.schedules || []).find(s => s.id === id);
    if (!sch) return;
    if (confirm(`Cancel scheduled ${sch.type} appointment for ${sch.patientName} on ${sch.scheduledDate}?`)) {
      sch.status = 'Cancelled';
      this.saveData();
      this.showToast('Appointment cancelled.', 'info');
      this.render();
    }
  }

  startScheduledActivity(id) {
    const sch = (this.schedules || []).find(s => s.id === id);
    if (!sch) return;

    if (sch.type === 'consultation') {
      this.openNewConsultModal(sch.patientId);
      if (sch.oncologist) {
        const oncField = document.getElementById('consult-oncologist');
        if (oncField) oncField.value = sch.oncologist;
      }
      if (sch.reason) {
        const reasonField = document.getElementById('consult-reason');
        if (reasonField) reasonField.value = sch.reason;
      }
    } else if (sch.type === 'laboratory') {
      this.openNewLabModal(sch.patientId);
      if (sch.oncologist) {
        const oncField = document.getElementById('lab-form-doctor');
        if (oncField) oncField.value = sch.oncologist;
      }
      if (sch.reason) {
        const testField = document.getElementById('lab-form-test-name');
        if (testField) testField.value = sch.reason;
      }
    } else {
      this.openNewTreatmentModal(sch.patientId);
      if (sch.regimenName) {
        const select = document.getElementById('tx-regimen-select');
        if (select) {
          const match = Array.from(select.options).find(o => o.text.toLowerCase().includes(sch.regimenName.toLowerCase()));
          if (match) {
            select.value = match.value;
            this.onRegimenSelectChanged();
          }
        }
      }
      if (sch.cycleNumber) {
        const cycleField = document.getElementById('tx-cycle-num');
        if (cycleField) cycleField.value = sch.cycleNumber;
      }
      if (sch.cycleTotal) {
        const totalField = document.getElementById('tx-cycle-total');
        if (totalField) totalField.value = sch.cycleTotal;
      }
      if (sch.oncologist) {
        const oncField = document.getElementById('tx-oncologist');
        if (oncField) oncField.value = sch.oncologist;
      }
      if (sch.nurse) {
        const nurseField = document.getElementById('tx-nurse');
        if (nurseField) nurseField.value = sch.nurse;
      }
    }
  }

  selectSchedulePatient(patientId) {
    const patient = this.getPatientById(patientId);
    if (!patient) return;

    const preview = document.getElementById('sch-selected-patient-preview');
    const hidden = document.getElementById('sch-patient-select');
    const searchInput = document.getElementById('sch-patient-search');
    const resultsEl = document.getElementById('sch-search-results');

    if (hidden) hidden.value = patient.id;
    if (preview) preview.style.display = 'block';
    if (searchInput) searchInput.style.display = 'none';
    if (resultsEl) resultsEl.style.display = 'none';

    const pName = document.getElementById('sch-preview-name');
    const pMrn = document.getElementById('sch-preview-mrn');
    const pDiag = document.getElementById('sch-preview-diag');

    if (pName) pName.textContent = patient.fullName;
    if (pMrn) pMrn.textContent = patient.mrn;
    if (pDiag) pDiag.textContent = `${patient.primaryDiagnosis || 'Oncology'} (Stage: ${patient.stage || 'N/A'})`;

    // Auto-fill oncologist and nurse if not already set
    const oncField = document.getElementById('sch-oncologist');
    if (oncField && !oncField.value && patient.primaryOncologist) {
      oncField.value = patient.primaryOncologist;
    }
    const nurseField = document.getElementById('sch-nurse');
    if (nurseField && !nurseField.value && patient.primaryNurse) {
      nurseField.value = patient.primaryNurse;
    }
    const regField = document.getElementById('sch-regimen');
    if (regField && !regField.value && patient.activeRegimen) {
      regField.value = patient.activeRegimen;
    }
  }

  populateSchedulePatientDropdown(query = '') {
    const resultsEl = document.getElementById('sch-search-results');
    if (!resultsEl) return;

    const q = (query || '').toLowerCase().trim();
    if (!q) {
      resultsEl.innerHTML = '';
      resultsEl.style.display = 'none';
      return;
    }

    const matches = this.patients.filter(p =>
      (p.fullName && p.fullName.toLowerCase().includes(q)) ||
      (p.mrn && p.mrn.toLowerCase().includes(q))
    ).slice(0, 8);

    if (matches.length === 0) {
      resultsEl.innerHTML = '<div style="padding: 0.5rem 0.75rem; color: #94a3b8; font-size: 0.82rem;">No matching patients</div>';
      resultsEl.style.display = 'block';
      return;
    }

    resultsEl.innerHTML = matches.map(p => `
      <div class="search-dropdown-item" onclick="app.selectSchedulePatient('${p.id}')">
        <strong>${this.escapeHtml(p.fullName)}</strong>
        <span class="patient-mrn" style="margin-left: 0.35rem; font-size: 0.75rem;">${this.escapeHtml(p.mrn)}</span>
        <div style="font-size: 0.74rem; color: #64748b; margin-top: 2px;">${this.escapeHtml(p.primaryDiagnosis || '')}</div>
      </div>
    `).join('');
    resultsEl.style.display = 'block';
  }

  /* ------------------------------------------------------------------
   * View: Oncology Laboratory & Diagnostics Module
   * ------------------------------------------------------------------ */
  ensureInitialSampleLaboratory() {
    if (this.laboratory && this.laboratory.length > 0) return;
    if (!this.patients || this.patients.length === 0) return;

    const p0 = this.patients[0];
    const p1 = this.patients[1] || p0;
    const p2 = this.patients[2] || p0;
    const p3 = this.patients[3] || p0;
    const p4 = this.patients[4] || p0;
    const p5 = this.patients[5] || p0;

    const todayStr = this.getTodayDateStr();
    const d = new Date();
    const getDateDaysAgo = (days) => {
      const dt = new Date(d);
      dt.setDate(dt.getDate() - days);
      return dt.toISOString().slice(0, 10);
    };

    this.laboratory = [
      {
        id: 'lab-101',
        patientId: p0.id,
        testDate: todayStr,
        testTime: '07:45',
        category: 'Complete Blood Count (CBC)',
        testName: 'Complete Blood Count (CBC) w/ ANC & Platelet Differential',
        orderingPhysician: 'Dr. Evelyn Reed, MD',
        performingFacility: 'Imus Cancer Center Clinical Diagnostic Laboratory',
        anc: 2.45,
        platelets: 220,
        wbc: 6.8,
        hemoglobin: 12.1,
        creatinine: 0.82,
        alt: 22,
        ast: 20,
        tumorMarker: '',
        clearanceStatus: 'Cleared for Chemotherapy',
        remarks: 'Safe hematologic parameters. ANC ≥ 1.5, Platelets ≥ 100. Patient fully cleared for scheduled chemotherapy infusion.',
        documents: [
          {
            id: 'doc_lab_101',
            name: `${p0.mrn}_CBC_ANC_Differential_${todayStr}.pdf`,
            size: 154200,
            sizeFormatted: '150 KB',
            type: 'application/pdf',
            category: 'CBC Hematology Report',
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'Clinical Diagnostic Lab',
            data: typeof generateSamplePdfDataUrl === 'function' ? generateSamplePdfDataUrl(
              'IMUS CLINICAL LABORATORY - CBC WITH ANC & DIFFERENTIAL',
              `Patient: ${p0.fullName} | MRN: ${p0.mrn} | Collection: ${todayStr} 07:45`,
              [
                'ABSOLUTE NEUTROPHIL COUNT (ANC): 2.45 x10^9/L (Ref: 1.50 - 8.00) [NORMAL / SAFE]',
                'PLATELET COUNT: 220 x10^9/L (Ref: 150 - 450) [NORMAL / SAFE]',
                'WHITE BLOOD CELLS (WBC): 6.8 x10^9/L (Ref: 4.0 - 11.0)',
                'HEMOGLOBIN: 12.1 g/dL (Ref: 12.0 - 16.0)',
                'HEMATOCRIT: 37.2 % (Ref: 36.0 - 46.0)',
                'CHEMOTHERAPY CLEARANCE: APPROVED - ADEQUATE MARROW RESERVE'
              ]
            ) : null
          }
        ],
        updatedAt: new Date().toISOString()
      },
      {
        id: 'lab-102',
        patientId: p1.id,
        testDate: getDateDaysAgo(1),
        testTime: '08:30',
        category: 'Comprehensive Chemistry Panel',
        testName: 'Comprehensive Metabolic Panel (CMP) & Hepatorenal Profile',
        orderingPhysician: 'Dr. Julian Santos, MD',
        performingFacility: 'Imus Cancer Center Clinical Diagnostic Laboratory',
        anc: 1.85,
        platelets: 180,
        wbc: 5.2,
        hemoglobin: 11.4,
        creatinine: 0.95,
        alt: 34,
        ast: 28,
        tumorMarker: '',
        clearanceStatus: 'Cleared for Chemotherapy',
        remarks: 'Renal function intact (creatinine 0.95 mg/dL, estimated GFR > 75 mL/min). Liver transaminases within acceptable oncologic limits.',
        documents: [
          {
            id: 'doc_lab_102',
            name: `${p1.mrn}_Comprehensive_Metabolic_Panel.pdf`,
            size: 168000,
            sizeFormatted: '164 KB',
            type: 'application/pdf',
            category: 'Chemistry / Organ Panel',
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'Clinical Diagnostic Lab',
            data: typeof generateSamplePdfDataUrl === 'function' ? generateSamplePdfDataUrl(
              'IMUS CLINICAL LABORATORY - COMPREHENSIVE CHEMISTRY PANEL',
              `Patient: ${p1.fullName} | MRN: ${p1.mrn} | Date: ${getDateDaysAgo(1)}`,
              [
                'SERUM CREATININE: 0.95 mg/dL (Ref: 0.60 - 1.20)',
                'BLOOD UREA NITROGEN (BUN): 16 mg/dL (Ref: 7 - 20)',
                'SGPT / ALT: 34 U/L (Ref: 7 - 56)',
                'SGOT / AST: 28 U/L (Ref: 10 - 40)',
                'TOTAL BILIRUBIN: 0.6 mg/dL (Ref: 0.2 - 1.2)',
                'CLEARANCE INTERPRETATION: Renal & Hepatic reserves clear for platinum protocol'
              ]
            ) : null
          }
        ],
        updatedAt: new Date().toISOString()
      },
      {
        id: 'lab-103',
        patientId: p2.id,
        testDate: todayStr,
        testTime: '09:15',
        category: 'Complete Blood Count (CBC)',
        testName: 'Urgent Stat CBC - Post-Chemotherapy Nadir Monitoring',
        orderingPhysician: 'Dr. Evelyn Reed, MD',
        performingFacility: 'Imus Cancer Center Emergency & Stat Laboratory',
        anc: 0.88,
        platelets: 78,
        wbc: 1.9,
        hemoglobin: 9.2,
        creatinine: 1.10,
        alt: 48,
        ast: 42,
        tumorMarker: '',
        clearanceStatus: 'Critical - Hold Chemotherapy',
        remarks: 'CRITICAL CYTOPENIA ALERT: Grade 3 Neutropenia (ANC 0.88 x10^9/L) and Grade 1 Thrombocytopenia (Plt 78 x10^9/L). Chemotherapy held. Filgrastim (G-CSF) prescribed.',
        documents: [
          {
            id: 'doc_lab_103',
            name: `${p2.mrn}_STAT_Nadir_CBC_Alert.pdf`,
            size: 142000,
            sizeFormatted: '138 KB',
            type: 'application/pdf',
            category: 'CBC Hematology Report',
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'Emergency Stat Lab',
            data: typeof generateSamplePdfDataUrl === 'function' ? generateSamplePdfDataUrl(
              'CRITICAL ALERT - NADIR HEMATOLOGIC TOXICITY',
              `Patient: ${p2.fullName} | MRN: ${p2.mrn} | Date: ${todayStr}`,
              [
                '*** CRITICAL RESULT ***',
                'ABSOLUTE NEUTROPHIL COUNT (ANC): 0.88 x10^9/L (Ref: >= 1.50) [CRITICAL LOW]',
                'PLATELET COUNT: 78 x10^9/L (Ref: >= 100) [LOW / THROMBOCYTOPENIA]',
                'TOTAL WBC: 1.9 x10^9/L (Ref: 4.0 - 11.0) [LEUKOPENIA]',
                'ACTION TAKEN: Physician contacted immediately. Day 1 Chemotherapy postponed.',
                'RECOMMENDATION: G-CSF 300mcg subcutaneous daily x 3 days. Retest in 72h.'
              ]
            ) : null
          }
        ],
        updatedAt: new Date().toISOString()
      },
      {
        id: 'lab-104',
        patientId: p3.id,
        testDate: getDateDaysAgo(2),
        testTime: '10:00',
        category: 'Tumor Markers',
        testName: 'Oncology Serum Biomarker Assay (CEA & CA 19-9)',
        orderingPhysician: 'Dr. Marcus Vance, MD',
        performingFacility: 'Imus Specialized Immunoassay Diagnostics',
        anc: 3.20,
        platelets: 245,
        wbc: 7.1,
        hemoglobin: 12.8,
        creatinine: 0.88,
        alt: 25,
        ast: 22,
        tumorMarker: 'CEA: 2.1 ng/mL | CA 19-9: 14 U/mL',
        clearanceStatus: 'Cleared for Chemotherapy',
        remarks: 'Serial tumor markers show favorable response. Both CEA and CA 19-9 remain well below baseline and normal reference upper limits.',
        documents: [],
        updatedAt: new Date().toISOString()
      },
      {
        id: 'lab-105',
        patientId: p4.id,
        testDate: getDateDaysAgo(3),
        testTime: '11:20',
        category: 'Complete Blood Count (CBC)',
        testName: 'CBC & Renal Clearance Prior to Cycle 3',
        orderingPhysician: 'Dr. Evelyn Reed, MD',
        performingFacility: 'Imus Cancer Center Clinical Diagnostic Laboratory',
        anc: 1.42,
        platelets: 108,
        wbc: 3.9,
        hemoglobin: 10.4,
        creatinine: 1.48,
        alt: 38,
        ast: 35,
        tumorMarker: '',
        clearanceStatus: 'Dose Adjustment Advised',
        remarks: 'Borderline ANC (1.42 x10^9/L) and elevated serum creatinine (1.48 mg/dL). 20% dose reduction recommended for nephrotoxic agents or 48h hydration.',
        documents: [],
        updatedAt: new Date().toISOString()
      },
      {
        id: 'lab-106',
        patientId: p5.id,
        testDate: getDateDaysAgo(5),
        testTime: '14:00',
        category: 'Pathology & Biopsy',
        testName: 'Surgical Histopathology & Immunohistochemistry Panel',
        orderingPhysician: 'Dr. Lea De Castro, MD',
        performingFacility: 'Cavite Regional Histopathology Specialty Center',
        anc: null,
        platelets: null,
        wbc: null,
        hemoglobin: null,
        creatinine: null,
        alt: null,
        ast: null,
        tumorMarker: 'ER: 90% (+), PR: 85% (+), HER2: Negative (Score 1+), Ki-67: 18%',
        clearanceStatus: 'Normal - Within Limits',
        remarks: 'Confirmation of Luminal A invasive carcinoma. Favorable prognostic subtype. Histological Grade 2.',
        documents: [],
        updatedAt: new Date().toISOString()
      }
    ];

    this.saveData();
  }

  renderLaboratory() {
    const container = document.getElementById('laboratory-list-container');
    if (!container) return;

    const allLabs = this.laboratory || [];
    const totalCount = allLabs.length;
    const alertCount = allLabs.filter(l => 
      l.clearanceStatus === 'Critical - Hold Chemotherapy' ||
      (l.anc !== null && l.anc !== '' && Number(l.anc) < 1.5) ||
      (l.platelets !== null && l.platelets !== '' && Number(l.platelets) < 100)
    ).length;
    const clearedCount = allLabs.filter(l => 
      l.clearanceStatus === 'Cleared for Chemotherapy'
    ).length;

    // Recent in last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const recentCount = allLabs.filter(l => {
      if (!l.testDate) return false;
      const d = new Date(l.testDate);
      return d >= sevenDaysAgo && d <= now;
    }).length;

    const elTotal = document.getElementById('stat-lab-total');
    const elAlerts = document.getElementById('stat-lab-alerts');
    const elCleared = document.getElementById('stat-lab-cleared');
    const elRecent = document.getElementById('stat-lab-recent');

    if (elTotal) elTotal.textContent = totalCount;
    if (elAlerts) elAlerts.textContent = alertCount;
    if (elCleared) elCleared.textContent = clearedCount;
    if (elRecent) elRecent.textContent = recentCount;

    // Filter labs
    const q = (this.labSearchQuery || '').toLowerCase().trim();
    const cat = this.labCategoryFilter || 'all';
    const st = this.labStatusFilter || 'all';
    const patId = this.labPatientFilter || '';

    const filtered = allLabs.filter(lab => {
      const patient = this.getPatientById(lab.patientId);
      const patName = patient ? patient.fullName.toLowerCase() : '';
      const patMrn = patient ? patient.mrn.toLowerCase() : '';
      const cancer = patient ? (patient.cancerType || '').toLowerCase() : '';

      // Search match
      if (q) {
        const matchesQuery = 
          patName.includes(q) ||
          patMrn.includes(q) ||
          cancer.includes(q) ||
          (lab.testName && lab.testName.toLowerCase().includes(q)) ||
          (lab.category && lab.category.toLowerCase().includes(q)) ||
          (lab.orderingPhysician && lab.orderingPhysician.toLowerCase().includes(q)) ||
          (lab.performingFacility && lab.performingFacility.toLowerCase().includes(q)) ||
          (lab.tumorMarker && lab.tumorMarker.toLowerCase().includes(q)) ||
          (lab.remarks && lab.remarks.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      // Category match
      if (cat !== 'all' && lab.category !== cat) {
        return false;
      }

      // Patient match
      if (patId && lab.patientId !== patId) {
        return false;
      }

      // Status match
      if (st === 'cleared') {
        if (lab.clearanceStatus !== 'Cleared for Chemotherapy') return false;
      } else if (st === 'critical') {
        const isCrit = lab.clearanceStatus === 'Critical - Hold Chemotherapy' ||
          (lab.anc !== null && lab.anc !== '' && Number(lab.anc) < 1.5) ||
          (lab.platelets !== null && lab.platelets !== '' && Number(lab.platelets) < 100);
        if (!isCrit) return false;
      } else if (st === 'normal') {
        if (lab.clearanceStatus !== 'Normal - Within Limits' && lab.clearanceStatus !== 'Dose Adjustment Advised') return false;
      }

      return true;
    });

    // Sort descending by testDate then testTime
    filtered.sort((a, b) => {
      const dtA = `${a.testDate || ''} ${a.testTime || ''}`;
      const dtB = `${b.testDate || ''} ${b.testTime || ''}`;
      return dtB.localeCompare(dtA);
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 3rem 1.5rem; text-align: center; background: #ffffff; border: 1px dashed var(--border); border-radius: 10px;">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem; color: #94a3b8;">🧪</div>
          <h4 style="color: var(--text-dark); margin-bottom: 0.35rem; font-size: 1.1rem;">No Laboratory Results Found</h4>
          <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 440px; margin: 0 auto 1.25rem;">
            No laboratory records match your selected search or filter criteria. You can reset filters or log a new diagnostic panel.
          </p>
          <div style="display: flex; gap: 0.5rem; justify-content: center;">
            <button class="btn btn-secondary btn-sm" onclick="app.resetLabFilters()">Reset Filters</button>
            <button class="btn btn-primary btn-sm" onclick="app.openNewLabModal()" style="background: #0284c7; border-color: #0369a1;">+ Log Lab Result</button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(lab => {
      const patient = this.getPatientById(lab.patientId);
      const isCritical = lab.clearanceStatus === 'Critical - Hold Chemotherapy' ||
        (lab.anc !== null && lab.anc !== '' && Number(lab.anc) < 1.5) ||
        (lab.platelets !== null && lab.platelets !== '' && Number(lab.platelets) < 100);

      const ancVal = lab.anc !== null && lab.anc !== '' ? Number(lab.anc) : null;
      const pltVal = lab.platelets !== null && lab.platelets !== '' ? Number(lab.platelets) : null;
      const creatVal = lab.creatinine !== null && lab.creatinine !== '' ? Number(lab.creatinine) : null;

      return `
        <div class="lab-card ${isCritical ? 'critical-lab' : ''}">
          <!-- Lab Card Header -->
          <div class="lab-card-header">
            <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 250px;">
              <div class="patient-avatar-thumb" style="width: 42px; height: 42px; border: 2px solid #0284c7; font-size: 0.95rem; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #e0f2fe; flex-shrink: 0;">
                ${this.renderPatientAvatar(patient)}
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <span class="patient-link" onclick="app.navigateTo('patient-chart', '${lab.patientId}')" style="font-size: 1rem; font-weight: 700; color: #0284c7;">
                    ${patient ? this.escapeHtml(patient.fullName) : 'Unknown Patient'}
                  </span>
                  <span class="badge badge-outline" style="font-size: 0.72rem; padding: 0.15rem 0.4rem;">${patient ? patient.mrn : 'N/A'}</span>
                  ${patient && patient.cancerType ? `<span class="badge badge-info" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">${this.escapeHtml(patient.cancerType)}</span>` : ''}
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <span>Specimen: <strong>${lab.testDate || 'N/A'}</strong> ${lab.testTime ? `at ${lab.testTime}` : ''}</span>
                  <span>•</span>
                  <span>${this.escapeHtml(lab.orderingPhysician || 'Oncologist')}</span>
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              ${this.renderLabClearanceBadge(lab)}
            </div>
          </div>

          <!-- Lab Card Body -->
          <div class="lab-card-body">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.85rem;">
              <div>
                <h4 style="margin: 0; font-size: 1.02rem; font-weight: 700; color: var(--text-dark);">
                  ${this.escapeHtml(lab.testName || 'Diagnostic Panel')}
                </h4>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                  <span class="badge badge-secondary" style="font-size: 0.72rem; font-weight: 600;">${this.escapeHtml(lab.category || 'General')}</span>
                  <span style="margin-left: 0.5rem;">${this.escapeHtml(lab.performingFacility || 'Imus Clinical Lab')}</span>
                </div>
              </div>
            </div>

            <!-- Clinical Values Badges Row -->
            <div class="lab-values-row">
              ${ancVal !== null ? `
                <div class="lab-val-badge ${ancVal >= 1.5 ? 'safe' : 'alert'}">
                  <span>ANC:</span>
                  <strong>${ancVal.toFixed(2)}</strong>
                  <small>x10⁹/L ${ancVal >= 1.5 ? '✓ Safe' : '⚠️ LOW'}</small>
                </div>
              ` : ''}
              ${pltVal !== null ? `
                <div class="lab-val-badge ${pltVal >= 100 ? 'safe' : 'alert'}">
                  <span>Platelets:</span>
                  <strong>${pltVal}</strong>
                  <small>x10⁹/L ${pltVal >= 100 ? '✓ Safe' : '⚠️ LOW'}</small>
                </div>
              ` : ''}
              ${lab.wbc !== null && lab.wbc !== '' ? `
                <div class="lab-val-badge neutral">
                  <span>WBC:</span>
                  <strong>${lab.wbc}</strong>
                  <small>x10⁹/L</small>
                </div>
              ` : ''}
              ${lab.hemoglobin !== null && lab.hemoglobin !== '' ? `
                <div class="lab-val-badge neutral">
                  <span>Hemoglobin:</span>
                  <strong>${lab.hemoglobin}</strong>
                  <small>g/dL</small>
                </div>
              ` : ''}
              ${creatVal !== null ? `
                <div class="lab-val-badge ${creatVal <= 1.2 ? 'safe' : 'alert'}">
                  <span>Creatinine:</span>
                  <strong>${creatVal.toFixed(2)}</strong>
                  <small>mg/dL ${creatVal <= 1.2 ? '✓' : '⚠️'}</small>
                </div>
              ` : ''}
              ${lab.alt !== null && lab.alt !== '' ? `
                <div class="lab-val-badge neutral">
                  <span>SGPT/ALT:</span>
                  <strong>${lab.alt}</strong>
                  <small>U/L</small>
                </div>
              ` : ''}
              ${lab.ast !== null && lab.ast !== '' ? `
                <div class="lab-val-badge neutral">
                  <span>SGOT/AST:</span>
                  <strong>${lab.ast}</strong>
                  <small>U/L</small>
                </div>
              ` : ''}
              ${lab.tumorMarker ? `
                <div class="lab-val-badge neutral" style="grid-column: span 2;">
                  <span>Tumor Marker:</span>
                  <strong>${this.escapeHtml(lab.tumorMarker)}</strong>
                </div>
              ` : ''}
            </div>

            <!-- Remarks / Clinical Notes -->
            ${lab.remarks ? `
              <div style="margin-top: 0.75rem; background: #f8fafc; border-left: 3.5px solid ${isCritical ? '#dc2626' : '#0284c7'}; padding: 0.55rem 0.75rem; border-radius: 4px; font-size: 0.82rem; color: #334155; line-height: 1.45;">
                <strong style="color: ${isCritical ? '#dc2626' : '#0284c7'}; font-size: 0.75rem; text-transform: uppercase;">Remarks:</strong>
                <span style="margin-left: 0.35rem;">${this.escapeHtml(lab.remarks)}</span>
              </div>
            ` : ''}

            <!-- Attached Documents Strip -->
            ${lab.documents && lab.documents.length > 0 ? `
              <div style="margin-top: 0.85rem; padding-top: 0.75rem; border-top: 1px dashed var(--border); display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Attachments (${lab.documents.length}):</span>
                ${lab.documents.map(d => `
                  <button type="button" class="btn btn-xs btn-outline" onclick="app.viewDocument('${d.id}', 'laboratory', '${lab.id}')" title="Preview ${this.escapeHtml(d.name)}" style="font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                    <span>📄</span>
                    <span style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(d.name)}</span>
                  </button>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Lab Card Footer Actions -->
          <div class="lab-card-footer">
            <div style="font-size: 0.75rem; color: var(--text-muted);">
              Ref ID: <code style="font-size: 0.72rem;">${lab.id}</code>
            </div>
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <button type="button" class="btn btn-xs btn-outline" onclick="app.viewLaboratory('${lab.id}')" title="View Full Report">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -1px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                <span>View Details</span>
              </button>
              <button type="button" class="btn btn-xs btn-secondary" onclick="app.openEditLabModal('${lab.id}')" title="Edit Lab Result">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -1px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span>Edit</span>
              </button>
              <button type="button" class="btn btn-xs btn-ghost" style="color: var(--danger);" onclick="app.deleteLaboratory('${lab.id}')" title="Delete Lab Record">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -1px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderLabClearanceBadge(lab) {
    const isCritical = lab.clearanceStatus === 'Critical - Hold Chemotherapy' ||
      (lab.anc !== null && lab.anc !== '' && Number(lab.anc) < 1.5) ||
      (lab.platelets !== null && lab.platelets !== '' && Number(lab.platelets) < 100);

    if (isCritical) {
      return `<span class="badge badge-danger" style="font-weight: 700; font-size: 0.8rem; padding: 0.35rem 0.65rem; border-radius: 6px; box-shadow: 0 1px 3px rgba(220, 38, 38, 0.2);">⚠️ Critical Cytopenia - Hold Chemo</span>`;
    }
    if (lab.clearanceStatus === 'Dose Adjustment Advised') {
      return `<span class="badge badge-warning" style="font-weight: 700; font-size: 0.8rem; padding: 0.35rem 0.65rem; border-radius: 6px;">⚠️ Dose Adjustment Advised</span>`;
    }
    if (lab.clearanceStatus === 'Cleared for Chemotherapy') {
      return `<span class="badge badge-success" style="font-weight: 700; font-size: 0.8rem; padding: 0.35rem 0.65rem; border-radius: 6px; box-shadow: 0 1px 3px rgba(22, 163, 74, 0.2);">✅ Cleared for Chemotherapy</span>`;
    }
    return `<span class="badge badge-info" style="font-weight: 600; font-size: 0.8rem; padding: 0.35rem 0.65rem; border-radius: 6px;">🧪 Normal / Within Limits</span>`;
  }

  openNewLabModal(patientId = null) {
    const modal = document.getElementById('modal-laboratory');
    const form = document.getElementById('form-laboratory');
    if (!modal || !form) return;

    form.reset();
    this.editingLabId = null;
    document.getElementById('lab-edit-id').value = '';

    const titleEl = document.getElementById('modal-lab-title-text');
    if (titleEl) titleEl.textContent = 'Log Diagnostic Laboratory Result';

    const dateInput = document.getElementById('lab-form-date');
    if (dateInput) dateInput.value = this.getTodayDateStr();

    const timeInput = document.getElementById('lab-form-time');
    if (timeInput) timeInput.value = '08:00';

    if (patientId) {
      const select = document.getElementById('lab-form-patient-select');
      if (select) select.value = patientId;
    }

    this.modalPendingDocs.laboratory = [];
    this.renderModalDocsList('laboratory');
    this.openModal(modal);
  }

  openEditLabModal(labId) {
    const lab = (this.laboratory || []).find(l => l.id === labId);
    if (!lab) return;

    const modal = document.getElementById('modal-laboratory');
    const form = document.getElementById('form-laboratory');
    if (!modal || !form) return;

    form.reset();
    this.editingLabId = lab.id;
    document.getElementById('lab-edit-id').value = lab.id;

    const titleEl = document.getElementById('modal-lab-title-text');
    if (titleEl) titleEl.textContent = 'Edit Diagnostic Laboratory Result';

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== undefined && val !== null) el.value = val;
    };

    setVal('lab-form-patient-select', lab.patientId);
    setVal('lab-form-date', lab.testDate);
    setVal('lab-form-time', lab.testTime);
    setVal('lab-form-category', lab.category);
    setVal('lab-form-test-name', lab.testName);
    setVal('lab-form-doctor', lab.orderingPhysician);
    setVal('lab-form-facility', lab.performingFacility);
    setVal('lab-form-anc', lab.anc);
    setVal('lab-form-platelets', lab.platelets);
    setVal('lab-form-wbc', lab.wbc);
    setVal('lab-form-hemoglobin', lab.hemoglobin);
    setVal('lab-form-creatinine', lab.creatinine);
    setVal('lab-form-alt', lab.alt);
    setVal('lab-form-ast', lab.ast);
    setVal('lab-form-tumor-marker', lab.tumorMarker);
    setVal('lab-form-clearance', lab.clearanceStatus);
    setVal('lab-form-remarks', lab.remarks);

    this.modalPendingDocs.laboratory = [...(lab.documents || [])];
    this.renderModalDocsList('laboratory');
    this.openModal(modal);
  }

  saveLaboratory(formData) {
    const id = formData.get('lab-edit-id') || document.getElementById('lab-edit-id')?.value || ('lab-' + Date.now());
    const patientId = formData.get('patientId') || document.getElementById('lab-form-patient-select')?.value;
    if (!patientId) {
      this.showToast('Please select an oncology patient first.', 'warning');
      return;
    }

    const testDate = formData.get('testDate') || document.getElementById('lab-form-date')?.value || this.getTodayDateStr();
    const testTime = formData.get('testTime') || document.getElementById('lab-form-time')?.value || '08:00';
    const category = formData.get('category') || document.getElementById('lab-form-category')?.value || 'Complete Blood Count (CBC)';
    const testName = formData.get('testName') || document.getElementById('lab-form-test-name')?.value || 'Laboratory Panel';
    const orderingPhysician = formData.get('orderingPhysician') || document.getElementById('lab-form-doctor')?.value || 'Dr. Evelyn Reed, MD';
    const performingFacility = formData.get('performingFacility') || document.getElementById('lab-form-facility')?.value || 'Imus Chemotherapy Center Clinical Laboratory';

    const anc = formData.get('anc') || document.getElementById('lab-form-anc')?.value || '';
    const platelets = formData.get('platelets') || document.getElementById('lab-form-platelets')?.value || '';
    const wbc = formData.get('wbc') || document.getElementById('lab-form-wbc')?.value || '';
    const hemoglobin = formData.get('hemoglobin') || document.getElementById('lab-form-hemoglobin')?.value || '';
    const creatinine = formData.get('creatinine') || document.getElementById('lab-form-creatinine')?.value || '';
    const alt = formData.get('alt') || document.getElementById('lab-form-alt')?.value || '';
    const ast = formData.get('ast') || document.getElementById('lab-form-ast')?.value || '';
    const tumorMarker = formData.get('tumorMarker') || document.getElementById('lab-form-tumor-marker')?.value || '';

    const clearanceStatus = formData.get('clearanceStatus') || document.getElementById('lab-form-clearance')?.value || 'Cleared for Chemotherapy';
    const remarks = formData.get('remarks') || document.getElementById('lab-form-remarks')?.value || '';

    // Check existing documents
    const existingLab = (this.laboratory || []).find(l => l.id === id);
    const existingDocs = existingLab ? (existingLab.documents || []) : [];
    const pendingDocs = this.modalPendingDocs.laboratory || [];
    const mergedDocs = [...pendingDocs];
    existingDocs.forEach(d => {
      if (!mergedDocs.some(pd => pd.id === d.id)) {
        mergedDocs.push(d);
      }
    });

    const labRecord = {
      id,
      patientId,
      testDate,
      testTime,
      category,
      testName,
      orderingPhysician,
      performingFacility,
      anc: anc !== '' && anc !== null ? Number(anc) : null,
      platelets: platelets !== '' && platelets !== null ? Number(platelets) : null,
      wbc: wbc !== '' && wbc !== null ? Number(wbc) : null,
      hemoglobin: hemoglobin !== '' && hemoglobin !== null ? Number(hemoglobin) : null,
      creatinine: creatinine !== '' && creatinine !== null ? Number(creatinine) : null,
      alt: alt !== '' && alt !== null ? Number(alt) : null,
      ast: ast !== '' && ast !== null ? Number(ast) : null,
      tumorMarker: tumorMarker ? String(tumorMarker).trim() : '',
      clearanceStatus,
      remarks,
      documents: mergedDocs,
      updatedAt: new Date().toISOString()
    };

    const idx = (this.laboratory || []).findIndex(l => l.id === id);
    if (idx >= 0) {
      this.laboratory[idx] = labRecord;
      this.showToast(`Updated laboratory result for ${this.getPatientById(patientId)?.fullName || 'patient'}.`, 'success');
    } else {
      this.laboratory = this.laboratory || [];
      this.laboratory.unshift(labRecord);
      this.showToast(`Logged new laboratory result successfully.`, 'success');
    }

    this.modalPendingDocs.laboratory = [];
    this.saveData();
    this.closeModal(document.getElementById('modal-laboratory'));
    this.render();
  }

  deleteLaboratory(labId) {
    const lab = (this.laboratory || []).find(l => l.id === labId);
    if (!lab) return;
    const pat = this.getPatientById(lab.patientId);
    const patName = pat ? pat.fullName : 'patient';

    if (confirm(`Are you sure you want to delete this lab record (${lab.testName}) for ${patName}?`)) {
      this.laboratory = (this.laboratory || []).filter(l => l.id !== labId);
      this.saveData();
      this.showToast('Laboratory record deleted.', 'info');
      this.render();
    }
  }

  viewLaboratory(id) {
    const lab = (this.laboratory || []).find(l => l.id === id);
    if (!lab) {
      this.showToast('Laboratory record not found.', 'danger');
      return;
    }
    const patient = this.getPatientById(lab.patientId);

    const titleEl = document.getElementById('modal-view-record-title');
    const headerEl = document.getElementById('modal-view-record-header');
    const bodyEl = document.getElementById('modal-view-record-body');
    const editBtn = document.getElementById('modal-view-edit-btn');

    if (titleEl) {
      titleEl.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -3px;"><path d="M10 2v7.31L4.36 19.46A2 2 0 0 0 6.11 22h11.78a2 2 0 0 0 1.75-2.54L14 9.31V2"></path><path d="M8.5 2h7"></path></svg>
        <span>Diagnostic Laboratory & Pre-Chemo Clearance</span>
      `;
    }
    if (headerEl) {
      headerEl.style.background = 'linear-gradient(135deg, #0284c7, #0369a1)';
      headerEl.style.color = '#ffffff';
    }

    if (bodyEl) {
      bodyEl.innerHTML = `
        <!-- Patient Banner -->
        <div style="background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <div class="patient-avatar-thumb" style="width: 48px; height: 48px; border: 2px solid #0284c7; font-size: 1rem; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #e0f2fe;">
              ${this.renderPatientAvatar(patient)}
            </div>
            <div>
              <div style="font-size: 1.15rem; font-weight: 700; color: #0369a1;">${patient ? this.escapeHtml(patient.fullName) : 'Unknown Patient'}</div>
              <div style="font-size: 0.82rem; color: #0284c7; display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 2px;">
                <span><strong>MRN:</strong> ${patient ? patient.mrn : 'N/A'}</span>
                <span>|</span>
                <span><strong>PhilHealth:</strong> ${patient?.philhealthNo || 'N/A'}</span>
                <span>|</span>
                <span><strong>Age/Sex:</strong> ${patient ? `${patient.age}y / ${patient.gender}` : 'N/A'}</span>
              </div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.82rem; color: #0369a1; font-weight: 600;">Specimen Date:</div>
            <div style="font-size: 1rem; font-weight: 700; color: #075985;">${lab.testDate} ${lab.testTime ? `at ${lab.testTime}` : ''}</div>
            <div style="margin-top: 4px;">${this.renderLabClearanceBadge(lab)}</div>
          </div>
        </div>

        <!-- Clinical Meta Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem;">
          <div style="background: #ffffff; border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Test Category</div>
            <div style="font-weight: 600; color: var(--secondary); margin-top: 2px;">${this.escapeHtml(lab.category || 'Laboratory')}</div>
          </div>
          <div style="background: #ffffff; border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Panel Name</div>
            <div style="font-weight: 600; color: var(--secondary); margin-top: 2px;">${this.escapeHtml(lab.testName || 'Lab Panel')}</div>
          </div>
          <div style="background: #ffffff; border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Ordering Oncologist</div>
            <div style="font-weight: 600; color: var(--secondary); margin-top: 2px;">${this.escapeHtml(lab.orderingPhysician || 'Oncologist')}</div>
          </div>
          <div style="background: #ffffff; border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Performing Facility</div>
            <div style="font-weight: 600; color: var(--secondary); margin-top: 2px;">${this.escapeHtml(lab.performingFacility || 'Clinical Lab')}</div>
          </div>
        </div>

        <!-- Clinical Parameters Grid -->
        <div class="panel" style="margin-bottom: 1.25rem; border: 1px solid #bae6fd; background: #f8fafc;">
          <div class="panel-header" style="background: #e0f2fe; padding: 0.65rem 1rem;">
            <h4 style="margin: 0; font-size: 0.9rem; color: #0369a1; font-weight: 700;">Clinical Diagnostic Parameters</h4>
          </div>
          <div class="panel-body" style="padding: 1rem;">
            <div class="lab-values-row" style="margin: 0;">
              ${lab.anc !== null && lab.anc !== '' ? `
                <div class="lab-val-badge ${Number(lab.anc) >= 1.5 ? 'safe' : 'alert'}">
                  <span>ANC:</span>
                  <strong>${Number(lab.anc).toFixed(2)}</strong>
                  <small>x10⁹/L ${Number(lab.anc) >= 1.5 ? '(Safe ≥ 1.5)' : '(Critical Low)'}</small>
                </div>
              ` : ''}
              ${lab.platelets !== null && lab.platelets !== '' ? `
                <div class="lab-val-badge ${Number(lab.platelets) >= 100 ? 'safe' : 'alert'}">
                  <span>Platelets:</span>
                  <strong>${lab.platelets}</strong>
                  <small>x10⁹/L ${Number(lab.platelets) >= 100 ? '(Safe ≥ 100)' : '(Critical Low)'}</small>
                </div>
              ` : ''}
              ${lab.wbc !== null && lab.wbc !== '' ? `
                <div class="lab-val-badge neutral">
                  <span>WBC:</span>
                  <strong>${lab.wbc}</strong>
                  <small>x10⁹/L (Ref: 4.0 - 11.0)</small>
                </div>
              ` : ''}
              ${lab.hemoglobin !== null && lab.hemoglobin !== '' ? `
                <div class="lab-val-badge neutral">
                  <span>Hemoglobin:</span>
                  <strong>${lab.hemoglobin}</strong>
                  <small>g/dL (Ref: 12 - 16)</small>
                </div>
              ` : ''}
              ${lab.creatinine !== null && lab.creatinine !== '' ? `
                <div class="lab-val-badge ${Number(lab.creatinine) <= 1.2 ? 'safe' : 'alert'}">
                  <span>Creatinine:</span>
                  <strong>${Number(lab.creatinine).toFixed(2)}</strong>
                  <small>mg/dL (Ref: 0.6 - 1.2)</small>
                </div>
              ` : ''}
              ${lab.alt !== null && lab.alt !== '' ? `
                <div class="lab-val-badge neutral">
                  <span>SGPT / ALT:</span>
                  <strong>${lab.alt}</strong>
                  <small>U/L (Ref: 7 - 56)</small>
                </div>
              ` : ''}
              ${lab.ast !== null && lab.ast !== '' ? `
                <div class="lab-val-badge neutral">
                  <span>SGOT / AST:</span>
                  <strong>${lab.ast}</strong>
                  <small>U/L (Ref: 10 - 40)</small>
                </div>
              ` : ''}
              ${lab.tumorMarker ? `
                <div class="lab-val-badge neutral" style="grid-column: 1 / -1;">
                  <span>Tumor Marker / Specific Value:</span>
                  <strong>${this.escapeHtml(lab.tumorMarker)}</strong>
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Remarks -->
        ${lab.remarks ? `
          <div style="background: #ffffff; border-left: 4px solid #0284c7; padding: 0.85rem 1rem; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 1.25rem;">
            <div style="font-size: 0.78rem; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-bottom: 0.35rem;">Technologist Remarks & Interpretation</div>
            <div style="font-size: 0.88rem; color: #1e293b; line-height: 1.5;">${this.escapeHtml(lab.remarks)}</div>
          </div>
        ` : ''}

        <!-- Attached Documents -->
        <div style="margin-top: 1.25rem; border-top: 1px solid var(--border); padding-top: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-dark); text-transform: uppercase;">Attached Scanned Slips & PDF Reports (${(lab.documents || []).length})</div>
          </div>
          <div class="doc-cards-grid">
            ${this.renderDocumentCardsHtml(lab.documents || [], 'laboratory', lab.id)}
          </div>
        </div>
      `;
    }

    if (editBtn) {
      editBtn.style.display = 'inline-flex';
      editBtn.onclick = () => {
        this.closeModal(document.getElementById('modal-view-record'));
        this.openEditLabModal(lab.id);
      };
    }

    this.openModal(document.getElementById('modal-view-record'));
  }

  resetLabFilters() {
    this.labSearchQuery = '';
    this.labCategoryFilter = 'all';
    this.labStatusFilter = 'all';
    this.labPatientFilter = '';

    const sIn = document.getElementById('lab-search-filter');
    if (sIn) sIn.value = '';
    const pSel = document.getElementById('lab-patient-filter');
    if (pSel) pSel.value = '';
    const cSel = document.getElementById('lab-category-filter');
    if (cSel) cSel.value = 'all';
    const stSel = document.getElementById('lab-status-filter');
    if (stSel) stSel.value = 'all';

    this.renderLaboratory();
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
            ${Array.isArray(patient.documents) && patient.documents.length > 0 ? `
              <div style="margin-top: 3px;">
                <span class="badge-doc-count" onclick="event.stopPropagation(); app.navigateTo('patient-chart', '${patient.id}'); setTimeout(() => document.querySelector('[data-chart-tab=\\'documents\\']')?.click(), 80);" title="${patient.documents.length} document(s) attached">
                  📎 ${patient.documents.length} doc${patient.documents.length > 1 ? 's' : ''}
                </span>
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
    const docBadge = document.getElementById('chart-tab-doc-count');
    if (consultBadge) consultBadge.textContent = consults.length;
    if (txBadge) txBadge.textContent = treatments.length;
    if (docBadge) docBadge.textContent = (patient.documents || []).length;

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
                      <div class="timeline-title" style="color: #713f12; font-size: 1.05rem; font-weight: 700;">💉 Chemotherapy Infusion: ${this.escapeHtml(t.regimenName)} (Cycle ${this.escapeHtml(String(t.cycleNumber))} of ${this.escapeHtml(String(t.cycleTotal || '?'))})</div>
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
                      <button class="btn btn-sm btn-outline" onclick="app.requestEditTreatment('${t.id}')" title="Edit Treatment">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        <span>Edit</span>
                      </button>
                      <button class="btn btn-sm btn-ghost" style="color: var(--danger);" onclick="app.requestDeleteTreatment('${t.id}')" title="Delete Treatment">
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
        txContainer.innerHTML = `<div class="empty-state"><h4>No Treatments Logged</h4><p>Click "+ Log Treatment" to log an administered cycle.</p></div>`;
      } else {
        txContainer.innerHTML = treatments.map(t => `
          <div class="panel treatment-panel treatment-card-container" style="margin-bottom: 1.25rem; background-color: #fefce8 !important; border: 1.5px solid #fde047 !important; border-left: 6px solid #eab308 !important; border-radius: var(--radius-md); box-shadow: 0 2px 8px rgba(234, 179, 8, 0.12);">
            <div class="panel-header" style="background: #fef08a; border-bottom: 1.5px solid #fde047;">
              <div>
                <div class="panel-title" style="color: #713f12; font-size: 1.05rem; font-weight: 700;">
                  🟡 ${this.escapeHtml(t.regimenName)} - Cycle ${this.escapeHtml(String(t.cycleNumber))} of ${this.escapeHtml(String(t.cycleTotal || '?'))} (Day ${t.dayOfCycle || 1})
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

    // 5. Clinical Documents Tab
    this.renderPatientDocuments(patient);
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
            ${Array.isArray(c.documents) && c.documents.length > 0 ? `
              <div style="margin-top: 3px;">
                <span class="badge-doc-count" onclick="event.stopPropagation(); app.viewConsultation('${c.id}')" title="${c.documents.length} document(s) attached">
                  📎 ${c.documents.length} doc${c.documents.length > 1 ? 's' : ''}
                </span>
              </div>
            ` : ''}
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
            ${Array.isArray(t.documents) && t.documents.length > 0 ? `
              <div style="margin-top: 3px;">
                <span class="badge-doc-count" onclick="event.stopPropagation(); app.viewTreatment('${t.id}')" title="${t.documents.length} document(s) attached">
                  📎 ${t.documents.length} doc${t.documents.length > 1 ? 's' : ''}
                </span>
              </div>
            ` : ''}
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
            <span class="badge badge-warning">Cycle ${this.escapeHtml(String(t.cycleNumber))} of ${this.escapeHtml(String(t.cycleTotal || '?'))}</span>
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
            <p>Treatments Administered</p>
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
                                  <td><strong>${this.escapeHtml(t.regimenName)}</strong> (Cycle ${this.escapeHtml(String(t.cycleNumber))})</td>
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
                      <div style="font-size: 0.75rem; color: var(--text-muted);">Cycle ${this.escapeHtml(String(t.cycleNumber))} of ${this.escapeHtml(String(t.cycleTotal || '?'))} (Day ${t.dayOfCycle || 1})</div>
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
    this.modalPendingDocs.patient = [];
    this.renderModalDocsList('patient');
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
    this.modalPendingDocs.patient = [...(patient.documents || [])];
    this.renderModalDocsList('patient');
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
      documents: [...(this.modalPendingDocs.patient || [])],
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
    if (cycleNumField) {
      const prevCompleted = parseInt(patient.cyclesCompleted, 10);
      cycleNumField.value = !isNaN(prevCompleted) ? (prevCompleted + 1) : (patient.cyclesCompleted || '1');
    }
    const cycleTotalField = document.getElementById('tx-cycle-total');
    if (cycleTotalField) cycleTotalField.value = patient.cyclesPlanned || '8';
  }

  populatePatientDropdowns() {
    this.populateConsultPatientDropdown('');
    this.populateTxPatientDropdown('');

    const consultFilter = document.getElementById('consult-patient-filter');
    const txFilter = document.getElementById('tx-patient-filter');
    const reportPatFilter = document.getElementById('report-patient-filter');
    const labPatFilter = document.getElementById('lab-patient-filter');
    const labFormPatSelect = document.getElementById('lab-form-patient-select');

    const options = this.patients.map(p => `<option value="${p.id}">${this.escapeHtml(p.fullName)} (${p.mrn}) - ${p.cancerType}</option>`).join('');

    const filterOptions = '<option value="">All Patients</option>' + options;
    if (consultFilter) consultFilter.innerHTML = filterOptions;
    if (txFilter) txFilter.innerHTML = filterOptions;
    if (labPatFilter) {
      labPatFilter.innerHTML = filterOptions;
      labPatFilter.value = this.labPatientFilter || '';
    }
    if (labFormPatSelect) {
      labFormPatSelect.innerHTML = '<option value="">-- Choose Oncology Patient --</option>' + options;
    }

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

    this.modalPendingDocs.consultation = [];
    this.renderModalDocsList('consultation');
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

    this.modalPendingDocs.consultation = [...(consult.documents || [])];
    this.renderModalDocsList('consultation');
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
      documents: [...(this.modalPendingDocs.consultation || [])],
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

    // Auto-schedule next appointment if specified
    const nextApptDate = formData.get('consult-next-date') || document.getElementById('consult-next-date')?.value;
    if (nextApptDate) {
      this.createOrUpdateLinkedSchedule({
        patientId,
        type: 'consultation',
        scheduledDate: nextApptDate,
        scheduledTime: '09:00',
        oncologist: formData.get('consult-oncologist') || document.getElementById('consult-oncologist')?.value || '',
        reason: 'Scheduled Follow-Up & Clearance'
      });
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

    this.modalPendingDocs.treatment = [];
    this.renderModalDocsList('treatment');

    this.openModal(modal);
    setTimeout(() => searchInput?.focus(), 150);
  }

  requestEditTreatment(id) {
    const tx = this.treatments.find(t => t.id === id);
    if (!tx) return;
    const patient = this.getPatientById(tx.patientId);
    const patName = patient ? patient.fullName : 'Patient';

    this.requireAuthorization(
      `Edit Treatment: ${patName} (Cycle ${tx.cycleNumber} - ${tx.regimenName})`,
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
    setVal('tx-cycle-num', tx.cycleNumber !== undefined && tx.cycleNumber !== null ? tx.cycleNumber : '1');
    setVal('tx-cycle-total', tx.cycleTotal !== undefined && tx.cycleTotal !== null ? tx.cycleTotal : '');
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

    this.modalPendingDocs.treatment = [...(tx.documents || [])];
    this.renderModalDocsList('treatment');

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

    const cycleNumRaw = (formData.get('tx-cycle-num') || document.getElementById('tx-cycle-num')?.value || '1').toString().trim();
    const cycleTotalRaw = (formData.get('tx-cycle-total') || document.getElementById('tx-cycle-total')?.value || '').toString().trim();
    const cycleNumber = cycleNumRaw || '1';
    const cycleTotal = cycleTotalRaw || '';

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
      documents: [...(this.modalPendingDocs.treatment || [])],
      createdAt: new Date().toISOString()
    };

    // Update patient's completed cycles count if this is the newest cycle
    const patient = this.getPatientById(patientId);
    if (patient) {
      const numVal = parseInt(cycleNumber, 10);
      if (!isNaN(numVal) && numVal > (parseInt(patient.cyclesCompleted, 10) || 0)) {
        patient.cyclesCompleted = numVal;
      }
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

    // Auto-schedule next cycle target date if specified
    const nextTxDate = formData.get('tx-next-cycle') || document.getElementById('tx-next-cycle')?.value;
    if (nextTxDate) {
      const parsedNum = parseInt(cycleNumber, 10);
      const nextCycleVal = !isNaN(parsedNum) ? String(parsedNum + 1) : '';
      this.createOrUpdateLinkedSchedule({
        patientId,
        type: 'treatment',
        scheduledDate: nextTxDate,
        scheduledTime: '09:00',
        regimenName,
        cycleNumber: nextCycleVal,
        cycleTotal: cycleTotal || '',
        oncologist: formData.get('tx-oncologist') || document.getElementById('tx-oncologist')?.value || '',
        nurse: formData.get('tx-nurse') || document.getElementById('tx-nurse')?.value || '',
        reason: `${regimenName} (Cycle ${nextCycleVal || 'Next'})`
      });
    }
  }

  requestDeleteTreatment(id) {
    const tx = this.treatments.find(t => t.id === id);
    if (!tx) return;
    const patient = this.getPatientById(tx.patientId);
    const patName = patient ? patient.fullName : 'Patient';

    this.requireAuthorization(
      `Delete Treatment Record: ${patName} (Cycle ${tx.cycleNumber} - ${tx.regimenName}) on ${tx.treatmentDate}`,
      () => {
        if (confirm(`Permanently delete chemotherapy treatment record for ${patName} (Cycle ${tx.cycleNumber} - ${tx.regimenName}) on ${tx.treatmentDate}? This action cannot be undone.`)) {
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

        <!-- Attached Clinical Documents -->
        <div style="margin-top: 1.25rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <strong style="color: #0f172a; font-size: 0.92rem; display: flex; align-items: center; gap: 6px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
              Attached Consultation Documents (${consult.documents ? consult.documents.length : 0})
            </strong>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <input type="file" id="view-consult-doc-input" multiple style="display: none;" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.doc,.docx" />
              <button type="button" class="btn btn-sm btn-outline-primary" onclick="document.getElementById('view-consult-doc-input').click()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Upload Document
              </button>
            </div>
          </div>
          <div id="view-consult-docs-container">
            ${this.renderDocumentCardsHtml(consult.documents || [], 'consultation', consult.id)}
          </div>
        </div>
      `;

      const consultFileInput = document.getElementById('view-consult-doc-input');
      if (consultFileInput) {
        consultFileInput.onchange = (e) => {
          if (e.target.files && e.target.files.length > 0) {
            this.uploadFilesToEntity(e.target.files, 'consultation', consult.id, 'Consultation Report');
          }
        };
      }
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
              Cycle ${this.escapeHtml(String(tx.cycleNumber))} of ${this.escapeHtml(String(tx.cycleTotal || '?'))} (Day ${tx.dayOfCycle || 1})
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

        <!-- Attached Infusion & Treatment Documents -->
        <div style="margin-top: 1.25rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <strong style="color: #0f172a; font-size: 0.92rem; display: flex; align-items: center; gap: 6px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
              Attached Infusion Documents (${tx.documents ? tx.documents.length : 0})
            </strong>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <input type="file" id="view-tx-doc-input" multiple style="display: none;" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.doc,.docx" />
              <button type="button" class="btn btn-sm btn-outline-primary" onclick="document.getElementById('view-tx-doc-input').click()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Upload Document
              </button>
            </div>
          </div>
          <div id="view-tx-docs-container">
            ${this.renderDocumentCardsHtml(tx.documents || [], 'treatment', tx.id)}
          </div>
        </div>
      `;

      const txFileInput = document.getElementById('view-tx-doc-input');
      if (txFileInput) {
        txFileInput.onchange = (e) => {
          if (e.target.files && e.target.files.length > 0) {
            this.uploadFilesToEntity(e.target.files, 'treatment', tx.id, 'Infusion Log');
          }
        };
      }
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

    document.getElementById('btn-forgot-password')?.addEventListener('click', () => {
      this.openModal(document.getElementById('modal-forgot-password'));
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

    // Clinical Document Upload & Attachment Listeners
    // 1. Patient Chart Dropzone & File Input
    document.getElementById('btn-chart-browse-docs')?.addEventListener('click', () => {
      document.getElementById('patient-chart-file-input')?.click();
    });

    document.getElementById('patient-chart-file-input')?.addEventListener('change', (e) => {
      const cat = document.getElementById('patient-chart-doc-category')?.value || 'General Clinical Document';
      if (e.target.files && e.target.files.length > 0) {
        this.uploadFilesToEntity(e.target.files, 'patient', this.selectedPatientId, cat);
      }
      e.target.value = '';
    });

    const chartDropzone = document.getElementById('chart-doc-dropzone');
    if (chartDropzone) {
      chartDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        chartDropzone.classList.add('dragover');
      });
      chartDropzone.addEventListener('dragleave', () => {
        chartDropzone.classList.remove('dragover');
      });
      chartDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        chartDropzone.classList.remove('dragover');
        const cat = document.getElementById('patient-chart-doc-category')?.value || 'General Clinical Document';
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.uploadFilesToEntity(e.dataTransfer.files, 'patient', this.selectedPatientId, cat);
        }
      });
    }

    // 2. Patient Modal Attachment Input
    document.getElementById('btn-modal-patient-add-doc')?.addEventListener('click', () => {
      document.getElementById('modal-patient-file-input')?.click();
    });

    document.getElementById('modal-patient-file-input')?.addEventListener('change', (e) => {
      const cat = document.getElementById('modal-patient-doc-category')?.value || 'Clinical Summary';
      if (e.target.files && e.target.files.length > 0) {
        this.uploadFilesToEntity(e.target.files, 'patient', null, cat);
      }
      e.target.value = '';
    });

    // 3. Consultation Modal Attachment Input
    document.getElementById('btn-modal-consult-add-doc')?.addEventListener('click', () => {
      document.getElementById('modal-consult-file-input')?.click();
    });

    document.getElementById('modal-consult-file-input')?.addEventListener('change', (e) => {
      const cat = document.getElementById('modal-consult-doc-category')?.value || 'Lab Report';
      if (e.target.files && e.target.files.length > 0) {
        this.uploadFilesToEntity(e.target.files, 'consultation', null, cat);
      }
      e.target.value = '';
    });

    // 4. Treatment Infusion Modal Attachment Input
    document.getElementById('btn-modal-tx-add-doc')?.addEventListener('click', () => {
      document.getElementById('modal-tx-file-input')?.click();
    });

    document.getElementById('modal-tx-file-input')?.addEventListener('change', (e) => {
      const cat = document.getElementById('modal-tx-doc-category')?.value || 'Infusion Flow Sheet';
      if (e.target.files && e.target.files.length > 0) {
        this.uploadFilesToEntity(e.target.files, 'treatment', null, cat);
      }
      e.target.value = '';
    });

    // "From" and "To" Date Range Filter
    document.getElementById('btn-filter-date-range')?.addEventListener('click', () => {
      this.applyScheduleDateFilter();
    });
    document.getElementById('schedule-date-from')?.addEventListener('keydown', (e) => { 
      if (e.key === 'Enter') this.applyScheduleDateFilter(); 
    });
    document.getElementById('schedule-date-to')?.addEventListener('keydown', (e) => { 
      if (e.key === 'Enter') this.applyScheduleDateFilter(); 
    });

    document.getElementById('schedule-date-from')?.addEventListener('change', (e) => {
      this.scheduleDateFrom = e.target.value;
    });

    document.getElementById('schedule-date-to')?.addEventListener('change', (e) => {
      this.scheduleDateTo = e.target.value;
    });

    document.getElementById('btn-clear-date-range')?.addEventListener('click', () => {
      this.clearScheduleDateFilter();
    });

    document.getElementById('schedule-type-filter')?.addEventListener('change', (e) => {
      this.scheduleTypeFilter = e.target.value;
      this.renderSchedule();
    });

    document.getElementById('schedule-status-filter')?.addEventListener('change', (e) => {
      this.scheduleStatusFilter = e.target.value;
      this.renderSchedule();
    });

    document.getElementById('schedule-search-input')?.addEventListener('input', (e) => {
      this.scheduleSearchQuery = e.target.value;
      this.renderSchedule();
    });

    document.getElementById('btn-schedule-new-appt')?.addEventListener('click', () => {
      this.openNewScheduleModal();
    });

    document.querySelectorAll('input[name="sch-type"]').forEach(r => {
      r.addEventListener('change', () => this.onScheduleTypeChanged());
    });

    document.getElementById('sch-patient-search')?.addEventListener('input', (e) => {
      this.populateSchedulePatientDropdown(e.target.value);
    });

    document.getElementById('btn-sch-clear-patient')?.addEventListener('click', () => {
      const preview = document.getElementById('sch-selected-patient-preview');
      const hidden = document.getElementById('sch-patient-select');
      const searchInput = document.getElementById('sch-patient-search');
      if (preview) preview.style.display = 'none';
      if (hidden) hidden.value = '';
      if (searchInput) {
        searchInput.value = '';
        searchInput.style.display = 'block';
        searchInput.focus();
      }
    });

    document.getElementById('form-schedule-appointment')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSchedule(new FormData(e.target));
    });

    // Tomorrow's Schedule Reminder Events
    document.getElementById('btn-header-reminder')?.addEventListener('click', () => {
      this.checkAndShowTomorrowReminder(true);
    });

    document.getElementById('btn-print-tomorrow-reminder')?.addEventListener('click', () => {
      this.printTomorrowSchedule();
    });

    document.getElementById('btn-reminder-go-to-schedule')?.addEventListener('click', () => {
      this.closeModal(document.getElementById('modal-tomorrow-reminder'));
      this.navigateTo('schedule');
    });

    document.getElementById('chk-reminder-dismiss-today')?.addEventListener('change', (e) => {
      const todayStr = this.getTodayDateStr();
      if (e.target.checked) {
        localStorage.setItem('ICC_dismiss_tomorrow_reminder_' + todayStr, 'true');
      } else {
        localStorage.removeItem('ICC_dismiss_tomorrow_reminder_' + todayStr);
      }
    });

    // Laboratory Module Events
    document.getElementById('btn-add-lab-main')?.addEventListener('click', () => {
      this.openNewLabModal();
    });

    document.getElementById('lab-search-filter')?.addEventListener('input', (e) => {
      this.labSearchQuery = e.target.value;
      this.renderLaboratory();
    });

    document.getElementById('lab-patient-filter')?.addEventListener('change', (e) => {
      this.labPatientFilter = e.target.value;
      this.renderLaboratory();
    });

    document.getElementById('lab-category-filter')?.addEventListener('change', (e) => {
      this.labCategoryFilter = e.target.value;
      this.renderLaboratory();
    });

    document.getElementById('lab-status-filter')?.addEventListener('change', (e) => {
      this.labStatusFilter = e.target.value;
      this.renderLaboratory();
    });

    document.getElementById('form-laboratory')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveLaboratory(new FormData(e.target));
    });

    document.getElementById('btn-modal-lab-add-doc')?.addEventListener('click', () => {
      document.getElementById('modal-lab-file-input')?.click();
    });

    document.getElementById('modal-lab-file-input')?.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      const category = document.getElementById('modal-lab-doc-category')?.value || 'CBC Hematology Report';
      this.uploadFilesToEntity(files, 'laboratory', this.editingLabId || null, category);
      e.target.value = '';
    });
  }
}

// Instantiate globally
let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new ChemoApp();
  window.app = app;
});
