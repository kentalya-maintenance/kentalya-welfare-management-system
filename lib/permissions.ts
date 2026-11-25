
import { getSession, type SessionPayload } from '@/lib/auth';

// ============================================================
// KENTALYA WELFARE MANAGEMENT SYSTEM
// ROLES AND PERMISSIONS
// ============================================================

export const ROLES = {
  SYSTEM_ADMIN: 'system_admin',
  DIRECTOR: 'director',
  HEAD_OF_DEPARTMENT: 'head_of_department',
  SENIOR_SUPERVISOR: 'senior_supervisor',
  SUPERVISOR: 'supervisor',
  WELFARE_STAFF: 'welfare_staff',
} as const;

export type WelfareRole = (typeof ROLES)[keyof typeof ROLES];

// ============================================================
// PERMISSION DEFINITIONS
// ============================================================

export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',

  // EMPLOYEE DIRECTORY
  VIEW_EMPLOYEES: 'view_employees',
  CREATE_EMPLOYEES: 'create_employees',
  EDIT_EMPLOYEES: 'edit_employees',

  // JOB CARDS
  VIEW_ALL_JOB_CARDS: 'view_all_job_cards',
  VIEW_DEPARTMENT_JOB_CARDS: 'view_department_job_cards',
  VIEW_ASSIGNED_JOB_CARDS: 'view_assigned_job_cards',
  VIEW_OWN_JOB_CARDS: 'view_own_job_cards',

  CREATE_JOB_CARDS: 'create_job_cards',
  ASSIGN_JOB_CARDS: 'assign_job_cards',
  EDIT_JOB_CARDS: 'edit_job_cards',
  SUBMIT_JOB_CARDS: 'submit_job_cards',
  VERIFY_JOB_CARDS: 'verify_job_cards',
  APPROVE_JOB_CARDS: 'approve_job_cards',
  CANCEL_JOB_CARDS: 'cancel_job_cards',

  // EQUIPMENT AND DEFECTS
  MANAGE_EQUIPMENT: 'manage_equipment',
  RECORD_DEFECTS: 'record_defects',

  // WORK SCHEDULING
  VIEW_ALL_WORK_SCHEDULES: 'view_all_work_schedules',
  VIEW_DEPARTMENT_WORK_SCHEDULES: 'view_department_work_schedules',
  VIEW_ASSIGNED_WORK_SCHEDULES: 'view_assigned_work_schedules',
  VIEW_OWN_WORK_SCHEDULES: 'view_own_work_schedules',

  CREATE_WORK_SCHEDULES: 'create_work_schedules',
  ASSIGN_WORK_SCHEDULES: 'assign_work_schedules',
  EDIT_WORK_SCHEDULES: 'edit_work_schedules',
  UPDATE_WORK_SCHEDULE_STATUS: 'update_work_schedule_status',
  CANCEL_WORK_SCHEDULES: 'cancel_work_schedules',

  // SAFETY
  VIEW_ALL_SAFETY_REPORTS: 'view_all_safety_reports',
  VIEW_DEPARTMENT_SAFETY_REPORTS: 'view_department_safety_reports',
  VIEW_ASSIGNED_SAFETY_REPORTS: 'view_assigned_safety_reports',
  VIEW_OWN_SAFETY_REPORTS: 'view_own_safety_reports',

  CREATE_SAFETY_REPORTS: 'create_safety_reports',
  ASSIGN_SAFETY_REPORTS: 'assign_safety_reports',
  EDIT_SAFETY_REPORTS: 'edit_safety_reports',
  UPDATE_SAFETY_REPORT_STATUS: 'update_safety_report_status',
  CLOSE_SAFETY_REPORTS: 'close_safety_reports',

  MANAGE_CORRECTIVE_ACTIONS: 'manage_corrective_actions',
  UPDATE_CORRECTIVE_ACTION_STATUS: 'update_corrective_action_status',

  // REPORTS
  VIEW_REPORTS: 'view_reports',
  VIEW_DEPARTMENT_REPORTS: 'view_department_reports',

  // ADMINISTRATION
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_SETTINGS: 'manage_settings',
} as const;

export type WelfarePermission =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ============================================================
// ROLE PERMISSION MATRIX
// ============================================================

const ROLE_PERMISSIONS: Record<WelfareRole, WelfarePermission[]> = {
  system_admin: Object.values(PERMISSIONS),

  // DIRECTOR
  // READ-ONLY ACCESS TO WORK SCHEDULING AND REPORTS
  director: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_ALL_WORK_SCHEDULES,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_DEPARTMENT_REPORTS,
  ],

  // HEAD OF WELFARE DEPARTMENT
  head_of_department: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_EMPLOYEES,
    PERMISSIONS.EDIT_EMPLOYEES,

    PERMISSIONS.VIEW_DEPARTMENT_JOB_CARDS,
    PERMISSIONS.VERIFY_JOB_CARDS,
    PERMISSIONS.APPROVE_JOB_CARDS,
    PERMISSIONS.CANCEL_JOB_CARDS,

    PERMISSIONS.MANAGE_EQUIPMENT,
    PERMISSIONS.RECORD_DEFECTS,

    PERMISSIONS.VIEW_DEPARTMENT_WORK_SCHEDULES,
    PERMISSIONS.CREATE_WORK_SCHEDULES,
    PERMISSIONS.ASSIGN_WORK_SCHEDULES,
    PERMISSIONS.EDIT_WORK_SCHEDULES,
    PERMISSIONS.UPDATE_WORK_SCHEDULE_STATUS,
    PERMISSIONS.CANCEL_WORK_SCHEDULES,

    PERMISSIONS.VIEW_DEPARTMENT_SAFETY_REPORTS,
    PERMISSIONS.CREATE_SAFETY_REPORTS,
    PERMISSIONS.ASSIGN_SAFETY_REPORTS,
    PERMISSIONS.EDIT_SAFETY_REPORTS,
    PERMISSIONS.UPDATE_SAFETY_REPORT_STATUS,
    PERMISSIONS.CLOSE_SAFETY_REPORTS,
    PERMISSIONS.MANAGE_CORRECTIVE_ACTIONS,
    PERMISSIONS.UPDATE_CORRECTIVE_ACTION_STATUS,

    PERMISSIONS.VIEW_DEPARTMENT_REPORTS,
  ],

  // SENIOR SUPERVISOR
  senior_supervisor: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_EMPLOYEES,

    PERMISSIONS.VIEW_DEPARTMENT_JOB_CARDS,
    PERMISSIONS.VERIFY_JOB_CARDS,

    PERMISSIONS.MANAGE_EQUIPMENT,
    PERMISSIONS.RECORD_DEFECTS,

    PERMISSIONS.VIEW_ASSIGNED_WORK_SCHEDULES,
    PERMISSIONS.CREATE_WORK_SCHEDULES,
    PERMISSIONS.ASSIGN_WORK_SCHEDULES,
    PERMISSIONS.EDIT_WORK_SCHEDULES,
    PERMISSIONS.UPDATE_WORK_SCHEDULE_STATUS,

    PERMISSIONS.VIEW_ASSIGNED_SAFETY_REPORTS,
    PERMISSIONS.VIEW_OWN_SAFETY_REPORTS,
    PERMISSIONS.CREATE_SAFETY_REPORTS,
    PERMISSIONS.ASSIGN_SAFETY_REPORTS,
    PERMISSIONS.EDIT_SAFETY_REPORTS,
    PERMISSIONS.UPDATE_SAFETY_REPORT_STATUS,
    PERMISSIONS.MANAGE_CORRECTIVE_ACTIONS,
    PERMISSIONS.UPDATE_CORRECTIVE_ACTION_STATUS,

    PERMISSIONS.VIEW_DEPARTMENT_REPORTS,
  ],

  // WELFARE SUPERVISOR
  supervisor: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_EMPLOYEES,

    PERMISSIONS.VIEW_DEPARTMENT_JOB_CARDS,
    PERMISSIONS.VERIFY_JOB_CARDS,

    PERMISSIONS.MANAGE_EQUIPMENT,
    PERMISSIONS.RECORD_DEFECTS,

    PERMISSIONS.VIEW_ASSIGNED_WORK_SCHEDULES,
    PERMISSIONS.CREATE_WORK_SCHEDULES,
    PERMISSIONS.ASSIGN_WORK_SCHEDULES,
    PERMISSIONS.EDIT_WORK_SCHEDULES,
    PERMISSIONS.UPDATE_WORK_SCHEDULE_STATUS,

    PERMISSIONS.VIEW_ASSIGNED_SAFETY_REPORTS,
    PERMISSIONS.VIEW_OWN_SAFETY_REPORTS,
    PERMISSIONS.CREATE_SAFETY_REPORTS,
    PERMISSIONS.ASSIGN_SAFETY_REPORTS,
    PERMISSIONS.EDIT_SAFETY_REPORTS,
    PERMISSIONS.UPDATE_SAFETY_REPORT_STATUS,
    PERMISSIONS.MANAGE_CORRECTIVE_ACTIONS,
    PERMISSIONS.UPDATE_CORRECTIVE_ACTION_STATUS,

    PERMISSIONS.VIEW_DEPARTMENT_REPORTS,
  ],

  // WELFARE STAFF / WORKER
  welfare_staff: [
    PERMISSIONS.VIEW_DASHBOARD,

    PERMISSIONS.VIEW_OWN_JOB_CARDS,
    PERMISSIONS.CREATE_JOB_CARDS,
    PERMISSIONS.SUBMIT_JOB_CARDS,
    PERMISSIONS.RECORD_DEFECTS,

    PERMISSIONS.VIEW_OWN_WORK_SCHEDULES,
    PERMISSIONS.UPDATE_WORK_SCHEDULE_STATUS,

    PERMISSIONS.VIEW_OWN_SAFETY_REPORTS,
    PERMISSIONS.CREATE_SAFETY_REPORTS,
  ],
};

// ============================================================
// ROLE VALIDATION
// ============================================================

export function isValidRole(role: string): role is WelfareRole {
  return Object.values(ROLES).includes(role as WelfareRole);
}

// ============================================================
// CHECK A USER'S PERMISSION
// ============================================================

export function hasPermission(
  role: string,
  permission: WelfarePermission,
): boolean {
  if (!isValidRole(role)) {
    return false;
  }

  return ROLE_PERMISSIONS[role].includes(permission);
}

// ============================================================
// GET ALL PERMISSIONS FOR A ROLE
// ============================================================

export function getRolePermissions(
  role: string,
): WelfarePermission[] {
  if (!isValidRole(role)) {
    return [];
  }

  return [...ROLE_PERMISSIONS[role]];
}

// ============================================================
// REQUIRE A SPECIFIC PERMISSION
// ============================================================

export async function requirePermission(
  permission: WelfarePermission,
): Promise<SessionPayload | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  if (!hasPermission(session.role, permission)) {
    return null;
  }

  return session;
}

// ============================================================
// REQUIRE ONE OF THE SPECIFIED ROLES
// ============================================================

export async function requireAnyRole(
  allowedRoles: WelfareRole[],
): Promise<SessionPayload | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  if (!isValidRole(session.role)) {
    return null;
  }

  if (!allowedRoles.includes(session.role)) {
    return null;
  }

  return session;
}
