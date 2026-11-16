// Shared constants for the school management system

export const LEVELS = [
  { value: 100, label: 'ND I' },
  { value: 200, label: 'ND II' },
  { value: 300, label: 'HND I' },
  { value: 400, label: 'HND II' },
] as const

export function levelLabel(level: number): string {
  return LEVELS.find((l) => l.value === level)?.label || `Level ${level}`
}

export const SEMESTERS = [
  { value: 1, label: 'First Semester' },
  { value: 2, label: 'Second Semester' },
] as const

export const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const
export const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
}

export const GRADE_BANDS = [
  { min: 70, grade: 'A', point: 5 },
  { min: 60, grade: 'B', point: 4 },
  { min: 50, grade: 'C', point: 3 },
  { min: 45, grade: 'D', point: 2 },
  { min: 40, grade: 'E', point: 1 },
  { min: 0, grade: 'F', point: 0 },
] as const

export function computeGrade(total: number): { grade: string; point: number } {
  const band = GRADE_BANDS.find((b) => total >= b.min) || GRADE_BANDS[GRADE_BANDS.length - 1]
  return { grade: band.grade, point: band.point }
}

export const PAYMENT_METHODS = ['CASH', 'TRANSFER', 'POS'] as const

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE'] as const

export const STAFF_RANKS = [
  'Chief Lecturer',
  'Principal Lecturer',
  'Senior Lecturer',
  'Lecturer I',
  'Lecturer II',
  'Lecturer III',
  'Instructor',
  'Senior Instructor',
  'Chief Technologist',
  'Administrative Officer',
] as const

export const GENDERS = ['Male', 'Female'] as const

export const STUDENT_STATUSES = ['ACTIVE', 'GRADUATED', 'SUSPENDED', 'WITHDRAWN'] as const

export const EXAM_TYPES = ['WAEC', 'NECO', 'NABTEB', 'GCE', 'Other'] as const

export type AdminRole = 'PROVOST' | 'REGISTRAR' | 'BURSAR'

export const ROLE_LABELS: Record<AdminRole, string> = {
  PROVOST: 'Provost',
  REGISTRAR: 'Registrar',
  BURSAR: 'Bursar',
}

export type ModuleKey =
  | 'dashboard'
  | 'students'
  | 'admissions'
  | 'staff'
  | 'results'
  | 'fees'
  | 'timetable'
  | 'library'
  | 'communication'
  | 'users'
  | 'settings'

export const MODULES: Array<{ key: ModuleKey; label: string; roles: AdminRole[] }> = [
  { key: 'dashboard', label: 'Dashboard', roles: ['PROVOST', 'REGISTRAR', 'BURSAR'] },
  { key: 'students', label: 'Students', roles: ['PROVOST', 'REGISTRAR'] },
  { key: 'admissions', label: 'Admissions', roles: ['PROVOST', 'REGISTRAR'] },
  { key: 'staff', label: 'Staff', roles: ['PROVOST', 'REGISTRAR'] },
  { key: 'results', label: 'Results Upload', roles: ['PROVOST', 'REGISTRAR'] },
  { key: 'fees', label: 'Fees & Payments', roles: ['PROVOST', 'BURSAR'] },
  { key: 'timetable', label: 'Timetable', roles: ['PROVOST', 'REGISTRAR'] },
  { key: 'library', label: 'Library', roles: ['PROVOST', 'REGISTRAR'] },
  { key: 'communication', label: 'Communication', roles: ['PROVOST', 'REGISTRAR', 'BURSAR'] },
  { key: 'users', label: 'Users', roles: ['PROVOST'] },
  { key: 'settings', label: 'Settings', roles: ['PROVOST'] },
]

export function modulesForRole(role: AdminRole) {
  return MODULES.filter((m) => m.roles.includes(role))
}

export function canAccess(role: AdminRole, key: ModuleKey): boolean {
  return MODULES.find((m) => m.key === key)?.roles.includes(role) || false
}

// Nigerian phone → international format for wa.me links
export function phoneToWaIntl(phone: string): string | null {
  const digits = phone.replace(/[^\d]/g, '')
  if (!digits) return null
  if (digits.startsWith('234') && digits.length >= 13) return digits
  if (digits.startsWith('0') && digits.length === 11) return `234${digits.slice(1)}`
  if (digits.length === 10) return `234${digits}`
  return digits
}
