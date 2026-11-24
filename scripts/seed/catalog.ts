/**
 * Reference catalogues for synthetic data. All names, insurers and codes are used
 * only to make fake records plausible; insurer names are invented.
 */

export type Cohort =
  | "healthy"
  | "athlete"
  | "hypertension"
  | "type2_diabetes"
  | "heart_failure"
  | "copd"
  | "asthma";

export type ConditionSpec = { code: string; name: string; description: string; chronic: boolean };

export const CONDITIONS = {
  hypertension: { code: "I10", name: "Hypertension", description: "Essential (primary) hypertension", chronic: true },
  t2dm: { code: "E11.9", name: "Type 2 diabetes", description: "Type 2 diabetes mellitus without complications", chronic: true },
  heart_failure: { code: "I50.9", name: "Heart failure", description: "Chronic heart failure, reduced ejection fraction", chronic: true },
  copd: { code: "J44.9", name: "COPD", description: "Chronic obstructive pulmonary disease", chronic: true },
  asthma: { code: "J45.909", name: "Asthma", description: "Moderate persistent asthma, uncomplicated", chronic: true },
  hyperlipidemia: { code: "E78.5", name: "Hyperlipidaemia", description: "Elevated LDL cholesterol", chronic: true },
  obesity: { code: "E66.9", name: "Obesity", description: "Obesity, BMI 30–34.9", chronic: true },
  afib: { code: "I48.91", name: "Atrial fibrillation", description: "Paroxysmal atrial fibrillation", chronic: true },
  hypothyroidism: { code: "E03.9", name: "Hypothyroidism", description: "Primary hypothyroidism on replacement", chronic: true },
  sleep_apnea: { code: "G47.33", name: "Sleep apnoea", description: "Obstructive sleep apnoea", chronic: true },
  anxiety: { code: "F41.1", name: "Anxiety", description: "Generalised anxiety disorder", chronic: true },
  uri: { code: "J06.9", name: "Upper respiratory infection", description: "Acute viral URTI", chronic: false },
  pneumonia: { code: "J18.9", name: "Pneumonia", description: "Community-acquired pneumonia", chronic: false },
  uti: { code: "N39.0", name: "Urinary tract infection", description: "Uncomplicated lower UTI", chronic: false },
  back_pain: { code: "M54.50", name: "Low back pain", description: "Mechanical low back pain", chronic: false },
} as const satisfies Record<string, ConditionSpec>;

export type ConditionKey = keyof typeof CONDITIONS;

export const COHORT_CONDITIONS: Record<Cohort, { primary: ConditionKey[]; possible: ConditionKey[] }> = {
  healthy: { primary: [], possible: ["anxiety", "back_pain"] },
  athlete: { primary: [], possible: ["back_pain"] },
  hypertension: { primary: ["hypertension"], possible: ["hyperlipidemia", "obesity", "sleep_apnea"] },
  type2_diabetes: { primary: ["t2dm"], possible: ["hypertension", "hyperlipidemia", "obesity"] },
  heart_failure: { primary: ["heart_failure", "hypertension"], possible: ["afib", "t2dm", "hyperlipidemia"] },
  copd: { primary: ["copd"], possible: ["hypertension", "anxiety", "sleep_apnea"] },
  asthma: { primary: ["asthma"], possible: ["anxiety", "obesity"] },
};

export const COHORT_WEIGHTS: Array<[Cohort, number]> = [
  ["healthy", 8],
  ["athlete", 3],
  ["hypertension", 12],
  ["type2_diabetes", 9],
  ["heart_failure", 6],
  ["copd", 6],
  ["asthma", 6],
];

export const COHORT_AGE: Record<Cohort, [number, number]> = {
  healthy: [22, 55],
  athlete: [20, 40],
  hypertension: [42, 82],
  type2_diabetes: [38, 76],
  heart_failure: [58, 91],
  copd: [52, 86],
  asthma: [18, 62],
};

/** Baseline vitals per cohort before drift, seasonality, episodes and noise. */
export const COHORT_BASELINE: Record<
  Cohort,
  { sbp: number; dbp: number; hr: number; rr: number; temp: number; spo2: number }
> = {
  healthy: { sbp: 116, dbp: 74, hr: 70, rr: 14, temp: 36.7, spo2: 98 },
  athlete: { sbp: 112, dbp: 70, hr: 52, rr: 13, temp: 36.6, spo2: 98.5 },
  hypertension: { sbp: 148, dbp: 92, hr: 76, rr: 15, temp: 36.7, spo2: 97 },
  type2_diabetes: { sbp: 134, dbp: 84, hr: 80, rr: 15, temp: 36.7, spo2: 97 },
  heart_failure: { sbp: 124, dbp: 76, hr: 88, rr: 18, temp: 36.6, spo2: 94.5 },
  copd: { sbp: 132, dbp: 82, hr: 86, rr: 20, temp: 36.7, spo2: 92.5 },
  asthma: { sbp: 118, dbp: 76, hr: 78, rr: 16, temp: 36.7, spo2: 97 },
};

export const INSURERS = [
  "Northwind Health",
  "Meridian Mutual",
  "Cedar Shield",
  "Harborline Care",
  "Lumen Assurance",
  "Bluefield Cooperative",
];

export const PLANS = ["PPO Gold", "PPO Silver", "HMO Silver", "EPO Bronze"];

export const BLOOD_TYPES: Array<[string, number]> = [
  ["O+", 37],
  ["A+", 34],
  ["B+", 9],
  ["O-", 7],
  ["A-", 6],
  ["AB+", 4],
  ["B-", 2],
  ["AB-", 1],
];

export type Analyte = { analyte: string; unit: string; low: number; high: number; mean: number; sd: number; decimals: number };

export const LAB_PANELS: Record<string, Analyte[]> = {
  "Complete blood count": [
    { analyte: "Haemoglobin", unit: "g/dL", low: 12, high: 17.5, mean: 14.2, sd: 1.2, decimals: 1 },
    { analyte: "White cell count", unit: "×10⁹/L", low: 4, high: 11, mean: 7, sd: 1.8, decimals: 1 },
    { analyte: "Platelets", unit: "×10⁹/L", low: 150, high: 400, mean: 260, sd: 50, decimals: 0 },
  ],
  "Basic metabolic panel": [
    { analyte: "Sodium", unit: "mmol/L", low: 135, high: 145, mean: 140, sd: 2.5, decimals: 0 },
    { analyte: "Potassium", unit: "mmol/L", low: 3.5, high: 5.1, mean: 4.3, sd: 0.4, decimals: 1 },
    { analyte: "Creatinine", unit: "µmol/L", low: 60, high: 110, mean: 85, sd: 15, decimals: 0 },
    { analyte: "Glucose (fasting)", unit: "mmol/L", low: 3.9, high: 5.6, mean: 5, sd: 0.5, decimals: 1 },
  ],
  "Lipid panel": [
    { analyte: "Total cholesterol", unit: "mmol/L", low: 0, high: 5.2, mean: 4.8, sd: 0.8, decimals: 1 },
    { analyte: "LDL cholesterol", unit: "mmol/L", low: 0, high: 3, mean: 2.8, sd: 0.7, decimals: 1 },
    { analyte: "HDL cholesterol", unit: "mmol/L", low: 1, high: 3, mean: 1.4, sd: 0.3, decimals: 1 },
  ],
  HbA1c: [{ analyte: "HbA1c", unit: "%", low: 4, high: 5.6, mean: 5.3, sd: 0.3, decimals: 1 }],
  "Thyroid panel": [
    { analyte: "TSH", unit: "mIU/L", low: 0.4, high: 4, mean: 2, sd: 0.8, decimals: 2 },
    { analyte: "Free T4", unit: "pmol/L", low: 12, high: 22, mean: 16, sd: 2, decimals: 1 },
  ],
  "NT-proBNP": [{ analyte: "NT-proBNP", unit: "pg/mL", low: 0, high: 125, mean: 80, sd: 30, decimals: 0 }],
};

/** Panels ordered per cohort, plus analyte means shifted to reflect disease. */
export const COHORT_LABS: Record<Cohort, { panels: string[]; shift: Record<string, number> }> = {
  healthy: { panels: ["Complete blood count", "Basic metabolic panel", "Lipid panel"], shift: {} },
  athlete: { panels: ["Complete blood count", "Basic metabolic panel"], shift: {} },
  hypertension: { panels: ["Basic metabolic panel", "Lipid panel", "Complete blood count"], shift: { "LDL cholesterol": 0.6, Creatinine: 10 } },
  type2_diabetes: {
    panels: ["HbA1c", "Basic metabolic panel", "Lipid panel"],
    shift: { HbA1c: 2.1, "Glucose (fasting)": 2.4, "LDL cholesterol": 0.5 },
  },
  heart_failure: { panels: ["NT-proBNP", "Basic metabolic panel", "Complete blood count"], shift: { "NT-proBNP": 900, Creatinine: 30, Sodium: -3 } },
  copd: { panels: ["Complete blood count", "Basic metabolic panel"], shift: { Haemoglobin: 1.2, "White cell count": 1.5 } },
  asthma: { panels: ["Complete blood count", "Basic metabolic panel"], shift: { "White cell count": 0.8 } },
};
