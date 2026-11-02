/**
 * Oncology Protocols & Regimens Reference Catalog
 * Standard Chemotherapy, Immunotherapy & Targeted Regimens
 */
const CHEMO_PROTOCOLS = [
  {
    id: 'folfox6',
    name: 'mFOLFOX6 (Modified FOLFOX 6)',
    cancerType: 'Colorectal',
    cycleDurationDays: 14,
    totalCyclesPlanned: 12,
    emetogenicRisk: 'Moderate to High',
    premeds: [
      'Dexamethasone 10-20 mg IV',
      'Ondansetron 8-16 mg IV or Palonosetron 0.25 mg IV',
      'Diphenhydramine 25 mg IV (optional)',
      'Normal Saline 500 mL hydration'
    ],
    drugs: [
      { name: 'Oxaliplatin', standardDose: '85 mg/m²', route: 'IV Infusion (2 hours in D5W)', notes: 'Avoid cold exposure (neuropathy)' },
      { name: 'Leucovorin (Folinic Acid)', standardDose: '400 mg/m²', route: 'IV Infusion (2 hours)', notes: 'Infuse concurrently with oxaliplatin' },
      { name: 'Fluorouracil (5-FU) Bolus', standardDose: '400 mg/m²', route: 'IV Push (over 5-10 mins)', notes: 'Administer before continuous infusion' },
      { name: 'Fluorouracil (5-FU) Continuous', standardDose: '2400 mg/m²', route: 'IV Continuous infusion over 46-48 hours', notes: 'Via elastomeric ambulatory pump' }
    ],
    toxicityChecks: ['Peripheral neuropathy', 'Diarrhea', 'Neutropenia', 'Cold sensitivity']
  },
  {
    id: 'ac-t',
    name: 'AC-T (Doxorubicin + Cyclophosphamide followed by Paclitaxel)',
    cancerType: 'Breast',
    cycleDurationDays: 21,
    totalCyclesPlanned: 8,
    emetogenicRisk: 'High (AC phase)',
    premeds: [
      'Aprepitant 125 mg PO Day 1 (or Fosaprepitant 150 mg IV)',
      'Dexamethasone 12 mg IV Day 1',
      'Ondansetron 16 mg IV',
      'Diphenhydramine 25-50 mg IV (during Paclitaxel phase)'
    ],
    drugs: [
      { name: 'Doxorubicin (Adriamycin)', standardDose: '60 mg/m²', route: 'IV Slow Push (red devil)', notes: 'Cardiotoxicity risk; monitor lifetime cumulative dose' },
      { name: 'Cyclophosphamide', standardDose: '600 mg/m²', route: 'IV Infusion (30-60 mins)', notes: 'Adequate hydration to prevent hemorrhagic cystitis' },
      { name: 'Paclitaxel (Taxol - later cycles)', standardDose: '175 mg/m² (q3w) or 80 mg/m² (weekly)', route: 'IV Infusion (3 hours)', notes: 'Requires in-line filter and non-PVC tubing' }
    ],
    toxicityChecks: ['Alopecia', 'Nausea/Vomiting', 'Neutropenia', 'Cardiotoxicity (ECHO/MUGA)', 'Peripheral neuropathy']
  },
  {
    id: 'carbo-pacli',
    name: 'Carboplatin + Paclitaxel',
    cancerType: 'Lung (NSCLC) / Ovarian / Head & Neck',
    cycleDurationDays: 21,
    totalCyclesPlanned: 6,
    emetogenicRisk: 'Moderate',
    premeds: [
      'Dexamethasone 20 mg IV (30-60 mins prior)',
      'Diphenhydramine 50 mg IV',
      'Famotidine 20 mg IV',
      'Ondansetron 8-16 mg IV'
    ],
    drugs: [
      { name: 'Paclitaxel', standardDose: '175-200 mg/m²', route: 'IV Infusion (3 hours)', notes: 'Administer BEFORE Carboplatin to prevent toxicity' },
      { name: 'Carboplatin', standardDose: 'AUC 5 - 6 (Calvert Formula)', route: 'IV Infusion (30-60 mins in D5W or NS)', notes: 'Dose based on GFR/Creatinine clearance' }
    ],
    toxicityChecks: ['Hypersensitivity reactions', 'Myelosuppression', 'Peripheral neuropathy', 'Arthralgia/Myalgia']
  },
  {
    id: 'r-chop',
    name: 'R-CHOP (Rituximab, Cyclophosphamide, Doxorubicin, Vincristine, Prednisone)',
    cancerType: 'Lymphoma (DLBCL)',
    cycleDurationDays: 21,
    totalCyclesPlanned: 6,
    emetogenicRisk: 'High',
    premeds: [
      'Acetaminophen (Paracetamol) 650-1000 mg PO',
      'Diphenhydramine 50 mg IV',
      'Ondansetron 16 mg IV',
      'Dexamethasone or Prednisone 100 mg PO'
    ],
    drugs: [
      { name: 'Rituximab (MabThera)', standardDose: '375 mg/m²', route: 'IV Infusion (titrated rate 50-400 mg/hr)', notes: 'Observe closely for cytokine release reaction' },
      { name: 'Cyclophosphamide', standardDose: '750 mg/m²', route: 'IV Infusion (30 mins)', notes: 'Hydration advised' },
      { name: 'Doxorubicin', standardDose: '50 mg/m²', route: 'IV Slow push', notes: 'Vesicant precaution' },
      { name: 'Vincristine', standardDose: '1.4 mg/m² (capped at 2 mg max)', route: 'IV Infusion (10-15 mins)', notes: 'FATAL IF GIVEN INTRATHECALLY. Vesicant.' },
      { name: 'Prednisone', standardDose: '100 mg PO daily Days 1-5', route: 'Oral', notes: 'Take with food' }
    ],
    toxicityChecks: ['Infusion reaction (Rituximab)', 'Neutropenia / Febrile neutropenia', 'Neuropathy (Vincristine constipation/foot drop)', 'Cardiotoxicity']
  },
  {
    id: 'gem-cis',
    name: 'Gemcitabine + Cisplatin',
    cancerType: 'Bladder / Biliary / Pancreatic / NSCLC',
    cycleDurationDays: 21,
    totalCyclesPlanned: 6,
    emetogenicRisk: 'High (due to Cisplatin)',
    premeds: [
      'Aprepitant 125 mg PO',
      'Dexamethasone 12 mg IV',
      'Palonosetron 0.25 mg IV or Ondansetron 16 mg IV',
      'Aggressive Pre-hydration: Normal Saline 1000 mL + Mannitol + MgSO4'
    ],
    drugs: [
      { name: 'Gemcitabine', standardDose: '1000 mg/m² (Days 1, 8)', route: 'IV Infusion (30 mins in NS)', notes: 'Prolonging infusion beyond 30 min increases toxicity' },
      { name: 'Cisplatin', standardDose: '70 mg/m² (Day 1 or Day 2)', route: 'IV Infusion (2 hours with post-hydration)', notes: 'Nephrotoxic, ototoxic. Ensure urine output > 100mL/hr' }
    ],
    toxicityChecks: ['Nephrotoxicity (BUN/Creatinine)', 'Thrombocytopenia', 'Ototoxicity (Tinnitus/Hearing loss)', 'Delayed nausea']
  },
  {
    id: 'pembrolizumab',
    name: 'Pembrolizumab (Keytruda) Monotherapy',
    cancerType: 'Melanoma / NSCLC / MSI-H Colorectal / Head & Neck',
    cycleDurationDays: 21,
    totalCyclesPlanned: 18,
    emetogenicRisk: 'Low',
    premeds: [
      'Routine premedications generally not required unless prior mild reaction'
    ],
    drugs: [
      { name: 'Pembrolizumab', standardDose: '200 mg fixed dose (q3w) or 400 mg (q6w)', route: 'IV Infusion (30 mins with sterile, non-pyrogenic 0.2-5 micron filter)', notes: 'Immune checkpoint inhibitor (PD-1)' }
    ],
    toxicityChecks: ['Immune-related Adverse Events (irAEs)', 'Thyroiditis/Hypothyroidism (TSH monitoring)', 'Pneumonitis', 'Colitis/Severe diarrhea', 'Hepatitis']
  },
  {
    id: 'folfirinox',
    name: 'mFOLFIRINOX',
    cancerType: 'Pancreatic Adenocarcinoma',
    cycleDurationDays: 14,
    totalCyclesPlanned: 12,
    emetogenicRisk: 'High',
    premeds: [
      'Fosaprepitant 150 mg IV',
      'Dexamethasone 12 mg IV',
      'Ondansetron 16 mg IV',
      'Atropine 0.25-1 mg SC/IV (prophylaxis for acute cholinergic syndrome with irinotecan)'
    ],
    drugs: [
      { name: 'Oxaliplatin', standardDose: '85 mg/m²', route: 'IV Infusion (2 hours)', notes: 'Neurotoxicity warning' },
      { name: 'Irinotecan', standardDose: '150-180 mg/m²', route: 'IV Infusion (90 mins)', notes: 'Late diarrhea may require aggressive loperamide' },
      { name: 'Leucovorin', standardDose: '400 mg/m²', route: 'IV Infusion (2 hours)', notes: 'Concurrent with oxaliplatin' },
      { name: '5-FU Continuous', standardDose: '2400 mg/m²', route: 'IV Continuous over 46 hours', notes: 'Ambulatory infusion pump' }
    ],
    toxicityChecks: ['Severe diarrhea', 'Neutropenia', 'Fatigue', 'Peripheral neuropathy']
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CHEMO_PROTOCOLS };
}
