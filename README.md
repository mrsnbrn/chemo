# Imus Chemotherapy Center
### Clinical Oncology & Infusion Day Center Management System

An advanced, responsive, and clinical-grade management application designed specifically for **Imus Chemotherapy Center**, Cavite.

---

## 🌟 Key Features

### 1. Patient Management (Complete CRUD)
- **Register New Patients**:
  - Auto-generated or custom Medical Record Numbers (MRN format: `ONC-YYYY-XXXX`).
  - **Structured Patient Demographics**: Registration Date (defaults to current date), separated **Last Name**, **First Name**, and **Middle Name**, DOB, age, biological sex, blood group, contact information, emergency contacts.
  - **Standardized Clinical Formatting**: Names standardly indexed as `LastName, FirstName MiddleName` across the EHR chart, consultation notes, and treatment sheets.
  - Comprehensive clinical oncology baseline: Primary cancer category, staging (Stage I–IV, metastatic), histology, biomarker profile (e.g. ER/PR/HER2, EGFR, KRAS, PD-L1), treatment intent (Adjuvant, Neoadjuvant, Palliative, Curative).
  - **Live Body Surface Area (BSA) Calculator**: Automatically computes BSA in real-time based on Height (cm) and Weight (kg) using the Mosteller Formula:
    $$\text{BSA} (m^2) = \sqrt{\frac{\text{Height (cm)} \times \text{Weight (kg)}}{3600}}$$
  - **Critical Allergy Banners**: High-visibility warnings for chemotherapy-specific hypersensitivities (Taxanes, Platinum compounds, Monoclonal Antibodies, Penicillin, etc.).
- **Patient Directory Table**:
  - **First Column**: Registration Date (`Date`).
  - **Second Column**: MRN / PhilHealth PIN.
  - **Third Column**: Last Name (with patient portrait avatar thumbnail).
  - **Fourth Column**: First Name (interactive chart link).
  - **Fifth Column**: Middle Name.
  - **Sixth Column**: Address (separated dedicated residential address column).
  - **Subsequent Columns**: Age/Sex, Diagnosis & Staging, Current Regimen, BSA, Center Status, Actions (View Chart, Edit, Delete).
- **Edit & Update**:
  - Full modification of Registration Date, Last Name, First Name, Middle Name, and clinical data with live name re-synchronization.
  - Live recalculation of BSA and BMI when weight fluctuations occur.
  - Status management: *Active Treatment*, *In Remission*, *Under Surveillance*, *Holding / Paused*, *Discharged*.
  - **Patient Photo**: Photo attachment and live avatar preview (with automatic client-side canvas scaling for optimal storage).
  - **PhilHealth Identification Number (PIN)**: Direct entry and verification of PhilHealth membership for health insurance processing.
  - **Residential Address**: Complete residential address tracking (Imus City / Cavite regional scope).
- **Delete with Safety Guard**:
  - Confirmation dialog displaying all linked consultations and treatment logs before permanent deletion.
- **360° Comprehensive Electronic Health Record (EHR)**:
  - Deep-dive patient chart with unified chronological medical event timeline.
  - Separate tabs for clinical consultation notes, infusion flowsheet history, and baseline oncology markers.
  - One-click chart printing formatted for medical records or PDF export.

---

### 2. Clinical Consultations & Pre-Chemotherapy Clearance
- Dedicated oncology consultation logger:
  - **Search-Only Patient Selection (No Dropdowns)**: Clean search bar with dedicated "Search" button. Instantly searches across **Name** (Last, First, Middle), **Number** (MRN, PhilHealth PIN, Phone), or **Diagnosis** (Cancer Type, Staging, Regimen). Automatically presents matching patients as 1-click selection cards and renders the full patient profile.
  - Consultation types: *Pre-Chemotherapy Clearance*, *Initial Oncologic Workup*, *Mid-Cycle Toxicity Assessment*, *Post-Chemo Restaging*, *Urgent Walk-in*.
  - Exam Vitals: BP, Pulse, Temperature, Respiration, Weight (auto-updates patient BSA), Pain score (0-10), ECOG Performance Status (0-4).
  - Pre-Chemo Hematology & Organ Clearance Lab Values:
    - Absolute Neutrophil Count (ANC) with automated safety alerts if $< 1.5 \times 10^9$/L.
    - Platelets with safety alerts if $< 100 \times 10^9$/L.
    - Hemoglobin, Serum Creatinine, Liver function indicators.
  - Common Terminology Criteria for Adverse Events (CTCAE) side-effect grading (Nausea, Neuropathy, Diarrhea, Mucositis, Fatigue).
  - **Clearance Decisions**:
    - 🟢 *Cleared for Scheduled Chemotherapy*
    - 🟡 *Cleared with Dose Reduction* (e.g., -20% or -25% due to peripheral neuropathy or hematologic toxicity)
    - 🔴 *Cycle Delayed / Withheld*
    - 🟣 *Regimen Adjusted / Terminated*

---

### 3. Chemotherapy Treatment & Infusion Flowsheets
- Administered systemic therapy tracking:
  - **Search-Only Patient Selection (No Dropdowns)**: Clean search bar with dedicated "Search" button. Instantly searches across **Name** (Last, First, Middle), **Number** (MRN, PhilHealth PIN, Phone), or **Diagnosis** (Cancer Type, Staging, Regimen). Automatically presents matching patients as 1-click selection cards and renders the full patient profile.
  - Regimen protocol selector linked with clinical reference library.
  - Cycle Number tracking (e.g., Cycle 3 of 8) and Day of Cycle.
  - Pre-medications checklist (Dexamethasone, Ondansetron/Palonosetron, Diphenhydramine, Aprepitant, Hydration fluids).
  - Antineoplastic agents administered table:
    - Planned dose vs. actual administered dose
    - Route (IV Infusion, IV Slow Push, Continuous Ambulatory Pump, Oral)
    - Dual nurse verification check
  - Multi-stage vitals monitoring (Pre-infusion, Mid-infusion, Post-infusion / Discharge).
  - Extravasation checks and CTCAE Acute Tolerability Grading (Grade 0 through Grade 4).

---

### 4. Periodic Reports & Clinical Analytics (Daily, Weekly, Monthly, Yearly)
- **Timeframe Granularity**:
  - **Daily Report**: Exact date operational logs and daily infusion roster.
  - **Weekly Report**: Monday-to-Sunday weekly census and throughput.
  - **Monthly Report**: Target month aggregate operations (e.g., October / November 2026).
  - **Yearly Report**: Annual clinical summary report.
  - **Custom Range**: Freely selectable start and end dates.
  - **All Time**: Cumulative historical clinical record.
- **Reporting Scopes**:
  1. **Executive Overview**:
     - Key KPIs: Active Patients, Consultations Conducted, Chemo Infusions Administered, Clearance Success Rate.
     - Distribution charts: Chemo Regimens Administered, Oncologist Clearance Decisions, Cancer Types Treated.
     - Patient Care Summary Roster.
  2. **Per-Patient Report**:
     - Individualized Longitudinal Clinical Care Sheets.
     - Scope by specific patient or view all patients.
     - Shows demographics, staging, BSA, all consultations with ANC/labs in the period, all infusion cycles with drug dosages, and clinical plans.
  3. **Consultations Report**:
     - Pre-chemo clearance metrics, dose modifications, delayed cycles, neutropenic alerts (ANC $< 1.5$).
     - Complete itemized log table with vitals, hematology, and oncologist orders.
  4. **Chemo Treatments Report**:
     - Infusion volume, acute tolerance grading (Grade 0 through Grade 3+), clinical safety tracking.
     - Complete itemized log table with drug names, actual doses, and supervising staff.
- **Export & Official Print Formatting**:
  - Official Hospital Print Header: *Chemotherapy Infusion Center — Imus Branch*.
  - Medical Oncologist, Chemotherapy Nurse Supervisor, and Clinical Oncology Pharmacist signature lines.
  - One-click CSV Export formatted for Excel.

---

### 5. Clinical Authentication & Role-Based Authorization
- **Full Login Gateway before System Access**:
  - Gated login portal before opening the system to protect sensitive medical records.
  - Active session monitoring with user badges in the header and sidebar, plus immediate "Log Out" capability.
  - Pre-configured Clinical Accounts:
    | Account Role | Username | Password | Full Name | Clinical Privileges |
    | :--- | :--- | :--- | :--- | :--- |
    | **Director / Admin** | `admin` | `admin123` | Dr. Evelyn Reed, MD | **Authorized**: Full CRUD on Patients, Consultations & Chemotherapy Treatments |
    | **Attending Oncologist** | `dr.reed` | `reed123` | Dr. Evelyn Reed, MD | **Authorized**: Full CRUD on Patients, Consultations & Chemotherapy Treatments |
    | **Attending Oncologist** | `dr.ross` | `ross123` | Dr. Julian Ross, MD | **Authorized**: Full CRUD on Patients, Consultations & Chemotherapy Treatments |
    | **Chemo Staff Nurse** | `nurse` | `nurse123` | Nurse Brenda Miller, RN | **Restricted**: View, register, and log records; **requires physician supervisor override to edit or delete** consultations and treatments |
- **Authorized-Only Edit & Delete Protection**:
  - **Edit Consultations & Chemotherapy Infusions**:
    - Pre-populates all existing data (patient, vitals, labs, regimen protocol, drug dosages, and tolerance grades) for accurate clinical amendments.
  - **Delete Consultations & Chemotherapy Infusions**:
    - Safe removal with confirmation dialogue.
  - **Supervisor Passkey Override**:
    - If a non-authorized user (e.g. `nurse`) attempts to click **Edit** or **Delete**, a **Supervisor Authorization Modal** prompts for attending physician credentials and clinical reason for modification/cancellation before allowing the action.

---

### 6. System-Wide Color-Coded Consultation & Chemotherapy Containers
- **Unified Color Identification Across the Entire System**:
  - 🌿 **All Consultation & Clearance Containers**: Styled in **Light Green** (`#f0fdf4` background, `#86efac` border, `#16a34a` left accent border, and `#dcfce7` header):
    - Full Medical Timeline cards
    - Patient Chart "Consultations & Clearances" tab cards and banner
    - Dashboard "Pre-Chemo Clearances & Notes" feed cards and panel header
    - Log New Consultation modal header and live patient profile preview container
    - Consultations Directory view filter toolbar and itemized table row accents
    - Clinical Event Record Detail Modal
  - 🟡 **All Chemotherapy Treatment Containers**: Styled in **Yellow** (`#fefce8` background, `#fde047` border, `#eab308` left accent border, and `#fef08a` header):
    - Full Medical Timeline cards
    - Patient Chart "Chemo Treatments" tab cards and banner
    - Dashboard "Recent Chemotherapy Infusions" panel header and table row accents
    - Log Chemo Treatment modal header and live patient profile preview container
    - Chemotherapy Treatments Directory view filter toolbar and itemized table row accents
    - Clinical Event Record Detail Modal
- **Dedicated "View" Action**:
  - Every card on the Full Medical Timeline and inside Patient Chart tabs features an interactive **👁 View** button (`.btn-view-event`).
  - Clicking "View" opens a comprehensive **Clinical Record Details Modal** (`#modal-view-record`) formatted for reading and printing:
    - **Consultation View**: Displays patient demographic banner, vital signs, ECOG score, hematology safety parameters (ANC, Platelets, Hgb with low-count danger alerts), documented toxicities (CTCAE), full oncologic evaluation notes, and physician clearance orders.
    - **Chemotherapy Treatment View**: Displays patient demographic banner, protocol details, cycle and day schedule, dual independent nurse verification status, full table of antineoplastic agents with planned vs. actual dosages, premedications checklist, and acute tolerance grading.
  - Integrated "Print Clinical Entry" and "Edit Record" actions (respecting supervisor authorization checks).
- **Timeline View Filter Toolbar**:
  - Filter pills to display **Show All**, **🌿 Consultations Only**, or **🟡 Chemo Treatments Only** with real-time counter badges and color legend.
- **Unified Directory View Integration**:
  - Quick **View** buttons are also integrated directly into the Consultations and Chemotherapy Treatments directory tables for rapid clinical lookup across the system.

---

### 7. Data Portability & Safety
- **Zero-Dependency Architecture**: Runs in modern web browsers (Chrome, Edge, Brave, Firefox) without requiring Node.js, Python, or complex external build tooling.
- **Local Persistence**: Automatically persists all data to browser storage.
- **Full JSON Backup & Restore**: One-click database export and import.
- **Demo Dataset Reset**: Instant reload of 4 realistic oncology cases (Breast, Colon, NSCLC, DLBCL) for quick verification.

---

## 🚀 How to Run the Application

1. Double-click `start-app.bat` inside this folder, or open `index.html` directly in any web browser.
2. The **Clinical Authentication Gateway** will appear:
   - Click **Doctor / Admin** (`admin` / `admin123`) to test full editing & deleting privileges.
   - Click **Staff Nurse** (`nurse` / `nurse123`) to test standard logging and verify the supervisor authorization safeguard.
3. You can set this folder as your active workspace in Antigravity IDE:
   `C:\Users\Home\.gemini\antigravity\scratch\chemo-center-app`
