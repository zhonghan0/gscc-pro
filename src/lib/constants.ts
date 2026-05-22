export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
] as const

export const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'discharged', label: 'Discharged' },
] as const

export const CONDITION_OPTIONS = [
  { value: 'mobile', label: 'Mobile' },
  { value: 'wheelchair_bound', label: 'Wheelchair Bound' },
  { value: 'bedridden', label: 'Bedridden' },
] as const

export const PHYSIO_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'foc', label: 'FOC (Free of Charge)' },
  { value: 'alternate_day', label: 'Alternate Day' },
] as const

export const ACCOUNT_OPTIONS = [
  { value: 'quickbook', label: 'Quickbook' },
  { value: 'cash', label: 'Cash' },
] as const

export const WORKER_TYPE_OPTIONS = [
  { value: 'local', label: 'Local Worker' },
  { value: 'foreign', label: 'Caregiver' },
] as const

export const WORKER_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const

export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'staff', label: 'Staff' },
] as const

export const HEALTH_CONDITIONS = [
  'Healthy',
  'Diabetes',
  'High Blood Pressure / Hypertension',
  'Stroke',
  'Psychiatry (Psychiatric Conditions)',
  'Dementia',
  'Epilepsy',
  'Gastric (Gastric Issues)',
  "Parkinson's Disease",
  'Heart Problems',
  'Blood Thinners (Anticoagulant Medication)',
  'Uric Acid (Gout)',
  'Kidney Failure / Renal Damage',
  'Mental Illness',
  'Prostate (Prostate Issues)',
  'Asthma / COPD',
  'Severe Allergies',
  'Immunosuppressive Disease',
  'Steroid-Based Medication',
  'Obesity',
  'Hyperthyroidism',
  'Cancer',
] as const

export type HealthCondition = typeof HEALTH_CONDITIONS[number]
