# C:\Users\Home\.gemini\antigravity\scratch\convert_patients.ps1
# Master conversion script from CSV to JavaScript demo-data.js

$csvPath = "C:\Users\Home\.gemini\antigravity\scratch\patients_raw.csv"
$outputPath = "C:\Users\Home\.gemini\antigravity\scratch\chemo-center-app\demo-data.js"

$csv = Import-Csv -Path $csvPath

function To-TitleCase($str) {
    if ([string]::IsNullOrWhiteSpace($str)) { return "" }
    $words = $str.Trim().ToLower().Split(' ', [StringSplitOptions]::RemoveEmptyEntries)
    $titled = foreach ($w in $words) {
        if ($w.Length -gt 1) {
            $w.Substring(0,1).ToUpper() + $w.Substring(1)
        } else {
            $w.ToUpper()
        }
    }
    return ($titled -join ' ')
}

function Format-Phone($phone) {
    if ([string]::IsNullOrWhiteSpace($phone)) { return "+63 (046) 471-8900" }
    $clean = $phone -replace '[^0-9]', ''
    if ($clean.StartsWith('0')) { $clean = $clean.Substring(1) }
    if ($clean.Length -ge 10) {
        $c = $clean.Substring(0,10)
        return "+63 " + $c.Substring(0,3) + " " + $c.Substring(3,3) + " " + $c.Substring(6)
    }
    return "+63 $clean"
}

function Format-Address($addr, $city) {
    $a = To-TitleCase $addr
    $c = To-TitleCase $city
    if ([string]::IsNullOrWhiteSpace($c)) { $c = "Imus" }
    if ([string]::IsNullOrWhiteSpace($a)) { return "$c City, Cavite" }
    
    # Check if city already present
    if ($a -notlike "*$c*") {
        $a = "$a, $c City, Cavite"
    } elseif ($a -notlike "*Cavite*") {
        $a = "$a, Cavite"
    }
    return $a
}

function Get-PatientAvatarSvg($gender) {
    if ($gender -eq 'Female') {
        return "data:image/svg+xml;utf8,<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 100 100""><circle cx=""50"" cy=""50"" r=""50"" fill=""%23ec4899""/><circle cx=""50"" cy=""38"" r=""20"" fill=""%23fed7aa""/><path d=""M50 19c-13 0-21 8-21 19 0 6 3 11 8 13-1 2-2 5-2 9h30c0-4-1-7-2-9 5-2 8-7 8-13 0-11-8-19-21-19z"" fill=""%23831843""/><circle cx=""44"" cy=""37"" r=""2.5"" fill=""%231e293b""/><circle cx=""56"" cy=""37"" r=""2.5"" fill=""%231e293b""/><path d=""M47 45q3 3 6 0"" stroke=""%23dc2626"" stroke-width=""1.8"" fill=""none"" stroke-linecap=""round""/><path d=""M22 88c4-18 16-25 28-25s24 7 28 25"" fill=""%23fbcfe8""/></svg>"
    } else {
        return "data:image/svg+xml;utf8,<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 100 100""><circle cx=""50"" cy=""50"" r=""50"" fill=""%230284c7""/><circle cx=""50"" cy=""38"" r=""20"" fill=""%23fed7aa""/><path d=""M50 19c-12 0-19 6-19 14 0 4 2 7 5 9 1-5 4-8 14-8s13 3 14 8c3-2 5-5 5-9 0-8-7-14-19-14z"" fill=""%231e293b""/><circle cx=""44"" cy=""37"" r=""2.5"" fill=""%231e293b""/><circle cx=""56"" cy=""37"" r=""2.5"" fill=""%231e293b""/><path d=""M47 45q3 3 6 0"" stroke=""%230369a1"" stroke-width=""1.8"" fill=""none"" stroke-linecap=""round""/><path d=""M22 88c4-18 16-25 28-25s24 7 28 25"" fill=""%23bae6fd""/></svg>"
    }
}

function Classify-Cancer($diag) {
    $d = if ($diag) { $diag.ToUpper() } else { "" }
    if ($d -like "*BREAST*" -or $d -like "*SOLID PAPILLARY*") { return "Breast" }
    if ($d -like "*COLON*" -or $d -like "*RECTAL*" -or $d -like "*COLORECTAL*" -or $d -like "*RECTOSIGMOID*" -or $d -like "*SIGMOID*") { return "Colon & Rectal" }
    if ($d -like "*CERVICAL*") { return "Cervical" }
    if ($d -like "*LUNG*" -or $d -like "*CARCINOMA*LUNG*") { return "Lung" }
    if ($d -like "*OVARIAN*") { return "Ovarian" }
    if ($d -like "*LYMPHOMA*" -or $d -like "*HODGKIN*") { return "Lymphoma" }
    if ($d -like "*GASTRIC*" -or $d -like "*STOMACH*") { return "Gastric" }
    if ($d -like "*PANCREAT*") { return "Pancreatic" }
    if ($d -like "*BLADDER*" -or $d -like "*UROTHELIAL*") { return "Bladder & Urothelial" }
    if ($d -like "*ENDOMETRIAL*" -or $d -like "*UTERINE*") { return "Endometrial & Uterine" }
    if ($d -like "*NASOPHARYNGEAL*" -or $d -like "*TONGUE*" -or $d -like "*ORAL*") { return "Head & Neck" }
    if ($d -like "*HEPATIC*" -or $d -like "*CHOLANGIO*" -or $d -like "*LIVER*") { return "Hepatobiliary" }
    if ($d -like "*SARCOMA*") { return "Sarcoma" }
    if ($d -like "*LEUKEMIA*") { return "Leukemia" }
    if ($d -like "*ESOPHAG*") { return "Esophageal" }
    if ($d -like "*THYMIC*") { return "Thymic" }
    if ($d -like "*PROSTATE*") { return "Prostate" }
    return "Oncology Evaluation"
}

function Classify-Stage($diag) {
    $d = if ($diag) { $diag.ToUpper() } else { "" }
    if ($d -like "*STAGE IV*" -or $d -like "*STAGE 4*" -or $d -like "*IVA*" -or $d -like "*IVB*" -or $d -like "* IIIC *" -or $d -like "* IIIB *" -or $d -like "* IIIA *") {
        if ($d -like "*IVA*") { return "Stage IVA" }
        if ($d -like "*IVB*") { return "Stage IVB" }
        if ($d -like "*IV*") { return "Stage IV" }
    }
    if ($d -like "*STAGE IIIC*" -or $d -like "*IIIC*") { return "Stage IIIC" }
    if ($d -like "*STAGE IIIB*" -or $d -like "*IIIB*") { return "Stage IIIB" }
    if ($d -like "*STAGE IIIA*" -or $d -like "*IIIA*") { return "Stage IIIA" }
    if ($d -like "*STAGE III*" -or $d -like "*STAGE 3*" -or $d -like "* III*") { return "Stage III" }
    if ($d -like "*STAGE IIB*" -or $d -like "*IIB*") { return "Stage IIB" }
    if ($d -like "*STAGE IIA*" -or $d -like "*IIA*") { return "Stage IIA" }
    if ($d -like "*STAGE II*" -or $d -like "*STAGE 2*" -or $d -like "* II*") { return "Stage II" }
    if ($d -like "*STAGE IB*" -or $d -like "*IB*") { return "Stage IB" }
    if ($d -like "*STAGE IA*" -or $d -like "*IA*") { return "Stage IA" }
    if ($d -like "*STAGE I*" -or $d -like "*STAGE 1*") { return "Stage I" }
    return "Clinical Stage Stated"
}

function Normalize-Doctor($doc, $idx) {
    $d = if ($doc) { $doc.ToUpper().Trim() } else { "" }
    if ($d -like "*JAWID*") { return "Dr. Jawid, MD (Medical Oncology)" }
    if ($d -like "*JACINTO*") { return "Dr. Jacinto, MD (Medical Oncology)" }
    if ($d -like "*DE CASTRO*") { return "Dr. Lea De Castro, MD (Medical Oncology)" }
    if ($d -like "*CHUA*") { return "Dr. Chua, MD (Medical Oncology)" }
    if ($d -like "*MELENDEZ*") { return "Dr. Melendez, MD (Medical Oncology)" }
    if ($d -like "*TAN*") { return "Dr. Tan, MD (Medical Oncology)" }
    if ($d -like "*BILAS*") { return "Dr. Bilas, MD (Medical Oncology)" }
    if ($d -like "*SILANGCRUZ*") { return "Dr. Silangcruz, MD (Medical Oncology)" }
    if ($d -like "*NABI*") { return "Dr. Nabi, MD (Medical Oncology)" }
    
    # Default rotation
    $doctors = @(
        "Dr. Jawid, MD (Medical Oncology)",
        "Dr. Lea De Castro, MD (Medical Oncology)",
        "Dr. Chua, MD (Medical Oncology)",
        "Dr. Jacinto, MD (Medical Oncology)"
    )
    return $doctors[$idx % $doctors.Length]
}

function Get-RegimenName($cancerType, $treatmentCol) {
    $t = if ($treatmentCol) { $treatmentCol.ToUpper() } else { "" }
    if ($t -like "*ORAL*") {
        if ($cancerType -eq "Breast") { return "Oral Endocrine Therapy (Tamoxifen / Letrozole)" }
        if ($cancerType -eq "Colon & Rectal") { return "Oral Capecitabine (Xeloda) Protocol" }
        return "Oral Targeted / Maintenance Protocol"
    }
    if ($t -like "*IMMUNO*") {
        return "Pembrolizumab (Keytruda) 200 mg IV Q3W"
    }
    switch ($cancerType) {
        "Breast" { return "AC-T (Doxorubicin + Cyclophosphamide -> Paclitaxel)" }
        "Colon & Rectal" { return "FOLFOX-6 (Oxaliplatin + Leucovorin + 5-Fluorouracil)" }
        "Cervical" { return "Weekly Cisplatin 40 mg/m2 Concurrent IV" }
        "Lung" { return "Carboplatin + Pemetrexed IV Protocol" }
        "Ovarian" { return "Paclitaxel + Carboplatin IV Infusion" }
        "Lymphoma" { return "ABVD Protocol (Doxorubicin, Bleomycin, Vinblastine, Dacarbazine)" }
        "Gastric" { return "FLOT Protocol (5-FU, Leucovorin, Oxaliplatin, Docetaxel)" }
        "Pancreatic" { return "Gemcitabine + Nab-Paclitaxel IV" }
        "Bladder & Urothelial" { return "Gemcitabine + Cisplatin Protocol" }
        "Head & Neck" { return "Cisplatin + 5-Fluorouracil Protocol" }
        default { return "Standard Systemic Chemotherapy Infusion Protocol" }
    }
}

function Get-DrugsList($regimenName, $bsa) {
    $drugs = @()
    if ($regimenName -like "*AC-T*") {
        $drugs += @{
            drugName = "Doxorubicin (Adriamycin)"
            plannedDose = "$([math]::Round(60 * $bsa, 0)) mg (60 mg/m2)"
            actualDose = "$([math]::Round(60 * $bsa, 0)) mg"
            route = "IV Slow Push via Port-A-Cath"
            startTime = "09:40"
            endTime = "10:10"
            verifiedBy = "RN Miller / RN Santos"
        }
        $drugs += @{
            drugName = "Cyclophosphamide (Cytoxan)"
            plannedDose = "$([math]::Round(600 * $bsa, 0)) mg (600 mg/m2)"
            actualDose = "$([math]::Round(600 * $bsa, 0)) mg in 500 mL D5W"
            route = "IV Infusion over 60 mins"
            startTime = "10:20"
            endTime = "11:20"
            verifiedBy = "RN Miller / RN Santos"
        }
    } elseif ($regimenName -like "*FOLFOX*") {
        $drugs += @{
            drugName = "Oxaliplatin"
            plannedDose = "$([math]::Round(85 * $bsa, 0)) mg (85 mg/m2)"
            actualDose = "$([math]::Round(85 * $bsa, 0)) mg in 500 mL D5W"
            route = "IV Infusion over 2 hrs"
            startTime = "09:45"
            endTime = "11:45"
            verifiedBy = "RN Miller / RN Reyes"
        }
        $drugs += @{
            drugName = "Leucovorin (Folinic Acid)"
            plannedDose = "$([math]::Round(400 * $bsa, 0)) mg (400 mg/m2)"
            actualDose = "$([math]::Round(400 * $bsa, 0)) mg in 250 mL D5W"
            route = "IV Infusion over 2 hrs concurrent"
            startTime = "09:45"
            endTime = "11:45"
            verifiedBy = "RN Miller / RN Reyes"
        }
        $drugs += @{
            drugName = "5-Fluorouracil (5-FU)"
            plannedDose = "$([math]::Round(400 * $bsa, 0)) mg bolus"
            actualDose = "$([math]::Round(400 * $bsa, 0)) mg IV Bolus"
            route = "IV Push"
            startTime = "11:50"
            endTime = "12:05"
            verifiedBy = "RN Miller / RN Reyes"
        }
    } elseif ($regimenName -like "*Cisplatin*") {
        $drugs += @{
            drugName = "Cisplatin"
            plannedDose = "$([math]::Round(50 * $bsa, 0)) mg (50 mg/m2)"
            actualDose = "$([math]::Round(50 * $bsa, 0)) mg in 1000 mL 0.9% NaCl"
            route = "IV Infusion over 2 hrs"
            startTime = "10:00"
            endTime = "12:00"
            verifiedBy = "RN Santos / RN Reyes"
        }
    } elseif ($regimenName -like "*Pembrolizumab*") {
        $drugs += @{
            drugName = "Pembrolizumab (Keytruda)"
            plannedDose = "200 mg Fixed Dose"
            actualDose = "200 mg in 100 mL 0.9% NaCl"
            route = "IV Infusion over 30 mins"
            startTime = "09:30"
            endTime = "10:00"
            verifiedBy = "RN Miller / RN Santos"
        }
    } else {
        $drugs += @{
            drugName = "Primary Chemotherapy Agent"
            plannedDose = "Weight & BSA based protocol dose"
            actualDose = "Protocol standard dose"
            route = "IV Infusion"
            startTime = "09:45"
            endTime = "11:30"
            verifiedBy = "RN Santos / RN Miller"
        }
    }
    return $drugs
}

Write-Host "Processing $($csv.Count) patient rows..."

$patients = @()
$consultations = @()
$treatments = @()

$conIdCounter = 2000
$txIdCounter = 3000

$idx = 0
foreach ($row in $csv) {
    $idx++
    $pn = $row.'Patient Number'.Trim()
    $patId = "pat-$pn"
    
    $lName = To-TitleCase $row.'Last Name'
    $fName = To-TitleCase $row.'First Name'
    $mName = To-TitleCase $row.'Middle Name'
    $fullName = if ($mName) { "$lName, $fName $mName" } else { "$lName, $fName" }
    
    $gender = if ($row.SEX -eq 'F') { "Female" } else { "Male" }
    $age = if ($row.AGE -match '^\d+$') { [int]$row.AGE } else { 50 }
    
    $dob = $row.BIRTHDAY
    if ([string]::IsNullOrWhiteSpace($dob)) {
        $birthYear = 2025 - $age
        $dob = "$birthYear-05-15"
    }
    
    # Blood type deterministic distribution
    $bloodTypes = @('O+', 'A+', 'B+', 'AB+', 'O-', 'A+')
    $bloodType = $bloodTypes[$idx % $bloodTypes.Length]
    
    # Vitals / BSA
    $baseH = if ($gender -eq 'Female') { 152 + ($idx % 12) } else { 164 + ($idx % 12) }
    $baseW = if ($gender -eq 'Female') { 48.0 + (($idx * 3) % 24) } else { 58.0 + (($idx * 3) % 26) }
    $bsa = [math]::Round([math]::Sqrt(($baseH * $baseW) / 3600), 2)
    $bmi = [math]::Round($baseW / (($baseH / 100) * ($baseH / 100)), 1)
    
    # Address & Phone
    $phone = Format-Phone $row.'CONTACT NO'
    $resAddress = Format-Address $row.ADDRESS $row.CITY
    $city = if ($row.CITY) { To-TitleCase $row.CITY } else { "Imus" }
    
    # PhilHealth
    $philhealthNo = if ($row.'PHILHEALTH NO') { $row.'PHILHEALTH NO'.Trim() } else { "" }
    
    # Diagnosis & Staging
    $rawDiag = $row.DIAGNOSIS
    $primaryDiagnosis = if ($rawDiag) { To-TitleCase $rawDiag } else { "Oncology Clearance & Evaluation" }
    $cancerType = Classify-Cancer $rawDiag
    $stage = Classify-Stage $rawDiag
    
    # Doctor & Nurse
    $rawDoc = $row.Doctor
    if ($rawDoc -eq 'ONGOING') { $rawDoc = "DR. JAWID" }
    $primaryOncologist = Normalize-Doctor $rawDoc $idx
    $nurses = @("Nurse Brenda Miller, RN, OCN", "Nurse Maria Santos, RN, OCN", "Nurse Angelo Reyes, RN")
    $primaryNurse = $nurses[$idx % $nurses.Length]
    
    # Remarks & Status (Active, Not Active, Deceased, Graduated, Under Surveillance)
    $rem = if ($row.REMARKS) { $row.REMARKS.Trim() } else { "" }
    $status = "Active"
    if ($rem -like "*EXPIRED*") {
        $status = "Deceased"
    } elseif ($rem -like "*GRADUATED*") {
        $status = "Graduated"
    } elseif ($rem -like "*PULL-OUT*" -or $rem -like "*UNDER DLSU*") {
        $status = "Under Surveillance"
    } elseif ($rem -like "*DISCONTINUATION*" -or $rem -like "*DISCOINTINUATION*" -or $rem -like "*NO ENVELOPE*" -or $rem -like "*COMPLETING*") {
        $status = "Not Active"
    }
    
    # Sessions completed & planned
    $rawSessions = $row.'CURRENT TOTAL SESSION'
    $cyclesCompleted = 0
    if ($rawSessions -match '(\d+)') {
        $cyclesCompleted = [int]$matches[1]
    }
    
    $rawDuration = $row.'TREATMENT DUARTION'
    $cyclesPlanned = 6
    if ($rawDuration -match '(\d+)') {
        $cyclesPlanned = [int]$matches[1]
    }
    if ($cyclesCompleted -gt $cyclesPlanned) {
        $cyclesPlanned = $cyclesCompleted
    }
    
    # Regimen
    $activeRegimen = Get-RegimenName $cancerType $row.TREATMENT
    
    # Treatment Intent
    $intent = if ($stage -like "*IV*") { "Palliative" } elseif ($status -eq "Graduated") { "Curative (Completed)" } else { "Adjuvant" }
    
    # Avatar (Male or Female clinical person avatar when no uploaded photo)
    $photo = Get-PatientAvatarSvg $gender
    
    # Marital status & religion
    $mStatus = if ($row.STATUS) { To-TitleCase $row.STATUS } else { if ($age -gt 30) { "Married" } else { "Single" } }
    $rel = if ($row.RELIGION) { To-TitleCase $row.RELIGION } else { "Roman Catholic" }
    if ($rel -like "*Rc*" -or $rel -like "*Catholic*") { $rel = "Roman Catholic" }
    
    $regDate = $row.'Date Registered'
    if ([string]::IsNullOrWhiteSpace($regDate)) { $regDate = "2025-10-22" }
    
    # Construct Patient Object with ICC-P... MRN format
    $mrnFormatted = if ($pn.StartsWith("ICC-")) { $pn } else { "ICC-$pn" }
    
    $pat = @{
        id = $patId
        mrn = $mrnFormatted
        legacyId = $row.ID
        registrationDate = $regDate
        lastName = $lName
        firstName = $fName
        middleName = $mName
        fullName = $fullName
        dob = $dob
        age = $age
        gender = $gender
        bloodType = $bloodType
        philhealthNo = $philhealthNo
        residentialAddress = $resAddress
        city = $city
        photo = $photo
        phone = $phone
        email = "$($fName.ToLower().Replace(' ','')).$($lName.ToLower().Replace(' ',''))@care.imus.gov.ph"
        emergencyContact = @{
            name = "$fName Family Contact"
            relationship = if ($mStatus -eq "Married") { "Spouse" } else { "Relative" }
            phone = $phone
        }
        primaryDiagnosis = $primaryDiagnosis
        cancerType = $cancerType
        stage = $stage
        histologyMarkers = if ($cancerType -eq "Breast") { "ER+, PR+, HER2 Negative, Ki-67 20%" } elseif ($cancerType -eq "Colon & Rectal") { "Adenocarcinoma, KRAS WT" } else { "Biopsy Confirmed Carcinoma" }
        heightCm = $baseH
        weightKg = $baseW
        bsa = $bsa
        bmi = $bmi
        allergies = @("No Known Drug Allergies (NKDA)")
        primaryOncologist = $primaryOncologist
        primaryNurse = $primaryNurse
        treatmentIntent = $intent
        activeRegimen = $activeRegimen
        cyclesPlanned = $cyclesPlanned
        cyclesCompleted = $cyclesCompleted
        status = $status
        remarks = $rem
        civilStatus = $mStatus
        maritalStatus = $mStatus
        religion = $rel
        ecogBaseline = if ($status -eq "Deceased") { 3 } else { 1 }
        comorbidities = @("Controlled Hypertension", "None reported")
        createdAt = "$($regDate)T08:00:00Z"
        updatedAt = "2026-10-28T14:15:00Z"
    }
    $patients += $pat
    
    # -------------------------------------------------------------
    # GENERATE CLINICAL EVENTS (CONSULTATIONS & TREATMENTS)
    # -------------------------------------------------------------
    $sessionsToGenerate = [math]::Min($cyclesCompleted, 6) # Generate up to 6 detailed session cards
    if ($cyclesCompleted -eq 0) {
        # Initial clearance/evaluation consultation
        $conIdCounter++
        $consultations += @{
            id = "con-$conIdCounter"
            patientId = $patId
            date = $regDate
            time = "09:30"
            oncologist = $primaryOncologist
            consultationType = "Initial Oncology Consultation & Workup"
            reasonForVisit = "Baseline evaluation and treatment planning for $primaryDiagnosis"
            clearanceStatus = if ($status -eq "Deceased") { "Palliative Care Only" } else { "Cleared for Treatment Planning" }
            decision = "Cleared for Full Dose"
            vitals = @{
                bp = "120/80"
                pulse = 76
                tempC = 36.6
                respRate = 18
                spO2 = 99
                weightKg = $baseW
                painScore = 0
                ecogScore = 1
            }
            labReview = @{
                anc = 2.8
                platelets = 240
                hemoglobin = 12.2
                creatinine = 0.8
                bilirubin = 0.6
                altAst = "20/24"
            }
            clinicalNotes = "Patient registered at Imus Chemotherapy Center. Biopsy and imaging reviewed. Discussed protocol: $activeRegimen. Patient and family consented for outpatient therapy."
            managementPlan = "Proceed with pre-chemo cardiac/laboratory baseline. Scheduled for protocol orientation."
            signedBy = $primaryOncologist
        }
    } else {
        # Generate pre-chemo clearance consultations and treatments for completed sessions
        for ($s = 1; $s -le $sessionsToGenerate; $s++) {
            # Compute session date (spaced 14-21 days apart)
            $regDt = [DateTime]::Parse($regDate)
            $txDt = $regDt.AddDays(7 + (($s - 1) * 21))
            $txDateStr = $txDt.ToString("yyyy-MM-dd")
            $conDt = $txDt.AddDays(-1)
            $conDateStr = $conDt.ToString("yyyy-MM-dd")
            
            # Consultation
            $conIdCounter++
            $consultations += @{
                id = "con-$conIdCounter"
                patientId = $patId
                date = $conDateStr
                time = "10:00"
                oncologist = $primaryOncologist
                consultationType = "Pre-Chemotherapy Clearance"
                reasonForVisit = "Pre-chemo assessment & lab clearance prior to Cycle $s of $activeRegimen"
                clearanceStatus = "Cleared for Full Dose"
                decision = "Cleared for Full Dose"
                vitals = @{
                    bp = "120/80"
                    pulse = 74 + ($s % 6)
                    tempC = 36.5
                    respRate = 18
                    spO2 = 99
                    weightKg = $baseW
                    painScore = 0
                    ecogScore = 1
                }
                labReview = @{
                    anc = [math]::Round(2.2 + ($s * 0.1), 1)
                    platelets = 210 + ($s * 10)
                    hemoglobin = [math]::Round(11.8 + ($s * 0.1), 1)
                    creatinine = 0.8
                    bilirubin = 0.5
                    altAst = "19/22"
                }
                clinicalNotes = "Cycle $s pre-chemotherapy evaluation. Patient is ambulatory, tolerating oral fluids without nausea. CBC and organ functions meet protocol clearance thresholds."
                managementPlan = "Clear for Cycle $s infusion with standard premedication antiemetics. Hydration orders verified."
                signedBy = $primaryOncologist
            }
            
            # Treatment
            $txIdCounter++
            $treatments += @{
                id = "tx-$txIdCounter"
                patientId = $patId
                regimenId = $activeRegimen.ToLower().Replace(' ','-')
                regimenName = "$activeRegimen (Session $s)"
                cycleNumber = $s
                cycleTotal = $cyclesPlanned
                dayOfCycle = 1
                treatmentDate = $txDateStr
                startTime = "09:00"
                endTime = "12:15"
                attendingOncologist = $primaryOncologist
                supervisingNurse = $primaryNurse
                toleranceGrade = "Grade 0 (None / Well Tolerated)"
                premedsGiven = @(
                    @{ name = "Dexamethasone"; dose = "12 mg IV"; status = "Given at 09:10" },
                    @{ name = "Ondansetron"; dose = "16 mg IV"; status = "Given at 09:15" },
                    @{ name = "Diphenhydramine"; dose = "50 mg IV"; status = "Given at 09:20" },
                    @{ name = "Normal Saline Hydration"; dose = "500 mL IV"; status = "Given at 09:00" }
                )
                drugsAdministered = Get-DrugsList $activeRegimen $bsa
                vitalSignsTimeline = @(
                    @{ time = "09:00"; bp = "120/80"; hr = 76; rr = 18; temp = "36.6"; o2 = "99%" },
                    @{ time = "10:30"; bp = "118/76"; hr = 74; rr = 16; temp = "36.5"; o2 = "99%" },
                    @{ time = "12:00"; bp = "122/80"; hr = 75; rr = 16; temp = "36.6"; o2 = "99%" }
                )
                adverseReactions = "Infusion completed uneventfully. No acute hypersensitivity reactions observed."
                nurseNotes = "IV access patent via peripheral port. Infusion administered according to institutional safety guidelines. Take-home antiemetics issued."
                status = "Completed"
            }
        }
        
        # If graduated, add completion consultation
        if ($status -eq "Graduated") {
            $conIdCounter++
            $consultations += @{
                id = "con-$conIdCounter"
                patientId = $patId
                date = "2026-09-01"
                time = "11:00"
                oncologist = $primaryOncologist
                consultationType = "Protocol Completion / Graduation Clearance"
                reasonForVisit = "Final chemotherapy review & graduation clearance"
                clearanceStatus = "Completed Protocol - In Remission"
                decision = "Protocol Completed"
                vitals = @{
                    bp = "118/78"
                    pulse = 72
                    tempC = 36.6
                    respRate = 16
                    spO2 = 99
                    weightKg = $baseW
                    painScore = 0
                    ecogScore = 0
                }
                clinicalNotes = "Patient has successfully completed all planned cycles ($cyclesCompleted sessions). Clinical examination confirms no palpable adenopathy or disease recurrence. Officially graduated from active chemotherapy."
                managementPlan = "Transition to post-treatment oncology surveillance. Schedule 3-month follow-up CT and biomarker panel."
                signedBy = $primaryOncologist
            }
        }
    }
}

Write-Host "Generated $($patients.Count) patients, $($consultations.Count) consultations, $($treatments.Count) treatments."

# Convert to JSON strings
$patientsJson = $patients | ConvertTo-Json -Depth 10
$consultationsJson = $consultations | ConvertTo-Json -Depth 10
$treatmentsJson = $treatments | ConvertTo-Json -Depth 10

# Construct JavaScript file
$jsContent = @"
/**
 * Master Clinical Dataset for Imus Chemotherapy Center
 * Imported census of 256 patients with full clinical consultations,
 * biometric vitals, chemotherapy flowsheets, and medical timelines.
 */

const DEMO_PATIENTS = $patientsJson;

const DEMO_CONSULTATIONS = $consultationsJson;

const DEMO_TREATMENTS = $treatmentsJson;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEMO_PATIENTS, DEMO_CONSULTATIONS, DEMO_TREATMENTS };
}
"@

[System.IO.File]::WriteAllText($outputPath, $jsContent, [System.Text.Encoding]::UTF8)
Write-Host "Successfully written demo-data.js to $outputPath"
