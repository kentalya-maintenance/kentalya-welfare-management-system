
import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  datetime,
  date,
  mysqlEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/mysql-core';

import { sql } from 'drizzle-orm';

// ============================================================
// EMPLOYEE DIRECTORY
// ============================================================

export const employees = mysqlTable(
  'employees',
  {
    id: int('id').autoincrement().primaryKey(),
    oneLoginEmployeeId: varchar('one_login_employee_id', { length: 100 }),
    oneLoginSubject: varchar('one_login_subject', { length: 255 }),
    employeeNumber: varchar('employee_number', { length: 50 }).notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    designation: varchar('designation', { length: 255 }),
    department: varchar('department', { length: 255 }),
    section: varchar('section', { length: 255 }),
    status: mysqlEnum('status', ['active', 'inactive'])
      .default('active')
      .notNull(),
    rawData: text('raw_data'),
    lastSyncedAt: datetime('last_synced_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .onUpdateNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('employees_number_unique').on(table.employeeNumber),
    uniqueIndex('employees_onelogin_id_unique').on(table.oneLoginEmployeeId),
    index('employees_name_idx').on(table.fullName),
    index('employees_status_idx').on(table.status),
  ],
);

// ============================================================
// APPLICATION USERS
// ============================================================

export const appUsers = mysqlTable(
  'app_users',
  {
    id: int('id').autoincrement().primaryKey(),
    employeeId: int('employee_id').references(() => employees.id, {
      onDelete: 'set null',
    }),
    username: varchar('username', { length: 100 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }),
    oneLoginSubject: varchar('one_login_subject', { length: 255 }),
    role: varchar('role', { length: 100 })
      .default('welfare_staff')
      .notNull(),
    isActive: mysqlEnum('is_active', ['yes', 'no'])
      .default('yes')
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .onUpdateNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('app_users_username_unique').on(table.username),
    uniqueIndex('app_users_onelogin_subject_unique').on(table.oneLoginSubject),
  ],
);

// ============================================================
// APPROVAL DELEGATIONS
// Out of Office / Delegate Approval
// ============================================================

export const approvalDelegations = mysqlTable(
  'approval_delegations',
  {
    id: int('id').autoincrement().primaryKey(),

    delegatorUserId: int('delegator_user_id')
      .notNull()
      .references(() => appUsers.id),

    delegateUserId: int('delegate_user_id')
      .notNull()
      .references(() => appUsers.id),

    delegatorRole: varchar('delegator_role', { length: 50 }).notNull(),

    startDate: date('start_date', { mode: 'string' }).notNull(),

    endDate: date('end_date', { mode: 'string' }).notNull(),

    reason: text('reason'),

    status: mysqlEnum('status', ['active', 'cancelled'])
      .notNull()
      .default('active'),

    createdBy: int('created_by')
      .notNull()
      .references(() => appUsers.id),

    createdAt: datetime('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    cancelledAt: datetime('cancelled_at'),

    cancelledBy: int('cancelled_by').references(() => appUsers.id),
  },
  (table) => [
    index('idx_delegation_owner').on(table.delegatorUserId),
    index('idx_delegation_delegate').on(table.delegateUserId),
    index('idx_delegation_dates').on(table.startDate, table.endDate),
    index('idx_delegation_status').on(table.status),
  ],
);

// ============================================================
// WELFARE JOB CARDS
// ============================================================

export const welfareJobCards = mysqlTable(
  'welfare_job_cards',
  {
    id: int('id').autoincrement().primaryKey(),
    jobCardNumber: varchar('job_card_number', { length: 50 }).notNull(),

    employeeId: int('employee_id')
      .notNull()
      .references(() => employees.id),

    employeeName: varchar('employee_name', { length: 255 }).notNull(),
    employeeNumber: varchar('employee_number', { length: 50 }).notNull(),
    designation: varchar('designation', { length: 255 }),

    jobDate: datetime('job_date').notNull(),
    jobDescription: text('job_description').notNull(),
    section: varchar('section', { length: 255 }),
    specificArea: varchar('specific_area', { length: 255 }),

    startTime: varchar('start_time', { length: 10 }),
    endTime: varchar('end_time', { length: 10 }),
    lunchInformation: text('lunch_information'),
    afterLunchWork: text('after_lunch_work'),
    afterLunchStartTime: varchar('after_lunch_start_time', { length: 10 }),
    afterLunchEndTime: varchar('after_lunch_end_time', { length: 10 }),

    defectsEncountered: text('defects_encountered'),
    employeeJobStatus: varchar('employee_job_status', { length: 100 }),

    employeeSignature: text('employee_signature'),
    employeeSignedAt: datetime('employee_signed_at'),

    supervisorName: varchar('supervisor_name', { length: 255 }),
    supervisorSignature: text('supervisor_signature'),
    supervisorSignedAt: datetime('supervisor_signed_at'),

    language: mysqlEnum('language', ['en', 'sw']).default('en').notNull(),

    // Job Card workflow and approval status
    status: mysqlEnum('status', [
      'draft',
      'assigned',
      'in_progress',
      'completed',
      'cancelled',
      'submitted',
      'supervisor_approved',
      'hod_approved',
      'rejected',
    ])
      .default('draft')
      .notNull(),

    // Worker submission
    submittedAt: datetime('submitted_at'),

    // Supervisor verification
    supervisorApprovedBy: int('supervisor_approved_by'),
    supervisorApprovedAt: datetime('supervisor_approved_at'),
    supervisorComments: text('supervisor_comments'),

    // Supervisor work assessment
    supervisorWorkStatus: mysqlEnum('supervisor_work_status', [
      'completed',
      'in_progress',
      'on_hold',
      'not_completed',
    ]),

    supervisorWorkAssessmentComments: text(
      'supervisor_work_assessment_comments',
    ),

    supervisorAssessedBy: int('supervisor_assessed_by'),
    supervisorAssessedAt: datetime('supervisor_assessed_at'),

    // HOD final approval
    hodApprovedBy: int('hod_approved_by'),
    hodApprovedAt: datetime('hod_approved_at'),
    hodComments: text('hod_comments'),

    // Rejection and return for correction
    rejectedBy: int('rejected_by'),
    rejectedAt: datetime('rejected_at'),
    rejectionReason: text('rejection_reason'),

    createdBy: int('created_by').references(() => appUsers.id, {
      onDelete: 'set null',
    }),

    createdAt: timestamp('created_at').defaultNow().notNull(),

    updatedAt: timestamp('updated_at')
      .defaultNow()
      .onUpdateNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('job_card_number_unique').on(table.jobCardNumber),
    index('job_card_employee_idx').on(table.employeeId),
    index('job_card_date_idx').on(table.jobDate),
    index('job_card_status_idx').on(table.status),
  ],
);

// ============================================================
// JOB CARD EQUIPMENT
// ============================================================

export const jobCardEquipment = mysqlTable(
  'job_card_equipment',
  {
    id: int('id').autoincrement().primaryKey(),
    jobCardId: int('job_card_id')
      .notNull()
      .references(() => welfareJobCards.id, { onDelete: 'cascade' }),
    equipmentName: varchar('equipment_name', { length: 255 }).notNull(),
    quantity: int('quantity').default(1).notNull(),
    issuedAt: datetime('issued_at'),
    returnedAt: datetime('returned_at'),
    conditionOnIssue: varchar('condition_on_issue', { length: 100 }),
    conditionOnReturn: varchar('condition_on_return', { length: 100 }),
    remarks: text('remarks'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('job_equipment_job_idx').on(table.jobCardId),
  ],
);

// ============================================================
// EMPLOYEE SUPERVISOR ASSIGNMENTS
// ============================================================

export const employeeSupervisorAssignments = mysqlTable(
  'employee_supervisor_assignments',
  {
    id: int('id').autoincrement().primaryKey(),
    employeeId: int('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    supervisorEmployeeId: int('supervisor_employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    assignedBy: int('assigned_by').references(() => appUsers.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    employeeUnique: uniqueIndex('employee_supervisor_employee_unique')
      .on(table.employeeId),
    supervisorIndex: index('employee_supervisor_supervisor_idx')
      .on(table.supervisorEmployeeId),
  }),
);

// ============================================================
// WORK SCHEDULES
// Each record represents one task, on a particular date.
// An employee can have multiple tasks on the same day.
// ============================================================

export const workSchedules = mysqlTable(
  'work_schedules',
  {
    id: int('id').autoincrement().primaryKey(),
    scheduleNumber: varchar('schedule_number', { length: 50 }).notNull(),
    scheduleDate: datetime('schedule_date').notNull(),
    taskTitle: varchar('task_title', { length: 255 }).notNull(),
    taskDescription: text('task_description').notNull(),
    section: varchar('section', { length: 255 }),
    location: varchar('location', { length: 255 }),
    startTime: varchar('start_time', { length: 10 }),
    endTime: varchar('end_time', { length: 10 }),
    instructions: text('instructions'),

    status: mysqlEnum('status', [
      'planned',
      'assigned',
      'in_progress',
      'completed',
      'cancelled',
    ])
      .default('planned')
      .notNull(),

    createdBy: int('created_by').references(() => appUsers.id, {
      onDelete: 'set null',
    }),

    createdAt: timestamp('created_at').defaultNow().notNull(),

    updatedAt: timestamp('updated_at')
      .defaultNow()
      .onUpdateNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('work_schedule_number_unique').on(table.scheduleNumber),
    index('work_schedule_date_idx').on(table.scheduleDate),
    index('work_schedule_status_idx').on(table.status),
    index('work_schedule_section_idx').on(table.section),
  ],
);

// ============================================================
// WORK SCHEDULE ASSIGNMENTS
// One task can be assigned to multiple employees.
// An employee can receive multiple tasks on the same day.
// ============================================================

export const workScheduleAssignments = mysqlTable(
  'work_schedule_assignments',
  {
    id: int('id').autoincrement().primaryKey(),

    scheduleId: int('schedule_id')
      .notNull()
      .references(() => workSchedules.id, { onDelete: 'cascade' }),

    employeeId: int('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    assignedBy: int('assigned_by').references(() => appUsers.id, {
      onDelete: 'set null',
    }),

    status: mysqlEnum('status', [
      'assigned',
      'in_progress',
      'completed',
      'not_completed',
      'cancelled',
    ])
      .default('assigned')
      .notNull(),

    employeeRemarks: text('employee_remarks'),
    completedAt: datetime('completed_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),

    updatedAt: timestamp('updated_at')
      .defaultNow()
      .onUpdateNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('work_schedule_employee_unique').on(
      table.scheduleId,
      table.employeeId,
    ),
    index('work_assignment_employee_idx').on(table.employeeId),
    index('work_assignment_status_idx').on(table.status),
  ],
);

// ============================================================
// SAFETY & DEFECTS REPORTS
// ============================================================

export const safetyReports = mysqlTable(
  'safety_reports',
  {
    id: int('id').autoincrement().primaryKey(),
    reportNumber: varchar('report_number', { length: 50 }).notNull(),
    reportDate: datetime('report_date').notNull(),

    reportType: mysqlEnum('report_type', [
      'hazard',
      'accident',
      'injury',
      'near_miss',
      'equipment_defect',
    ]).notNull(),

    severity: mysqlEnum('severity', [
      'low',
      'medium',
      'high',
      'critical',
    ])
      .default('medium')
      .notNull(),

    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    farm: varchar('farm', { length: 100 }),
    section: varchar('section', { length: 255 }),
    location: varchar('location', { length: 255 }),
    equipmentName: varchar('equipment_name', { length: 255 }),
    equipmentCode: varchar('equipment_code', { length: 100 }),
    immediateAction: text('immediate_action'),

    reportedByEmployeeId: int('reported_by_employee_id')
      .references(() => employees.id, { onDelete: 'set null' }),

    reportedByUserId: int('reported_by_user_id')
      .references(() => appUsers.id, { onDelete: 'set null' }),

    assignedToEmployeeId: int('assigned_to_employee_id')
      .references(() => employees.id, { onDelete: 'set null' }),

    status: mysqlEnum('status', [
      'open',
      'under_investigation',
      'in_progress',
      'resolved',
      'closed',
    ])
      .default('open')
      .notNull(),

    resolutionDetails: text('resolution_details'),
    resolvedAt: datetime('resolved_at'),
    closedAt: datetime('closed_at'),

    createdBy: int('created_by')
      .references(() => appUsers.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at').defaultNow().notNull(),

    updatedAt: timestamp('updated_at')
      .defaultNow()
      .onUpdateNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('safety_report_number_unique').on(table.reportNumber),
    index('safety_report_date_idx').on(table.reportDate),
    index('safety_report_type_idx').on(table.reportType),
    index('safety_report_severity_idx').on(table.severity),
    index('safety_report_status_idx').on(table.status),
    index('safety_report_section_idx').on(table.section),
    index('safety_report_assigned_idx').on(table.assignedToEmployeeId),
    index('safety_report_employee_idx').on(table.reportedByEmployeeId),
  ],
);

// ============================================================
// SAFETY CORRECTIVE ACTIONS
// A report can have multiple corrective actions.
// ============================================================

export const safetyCorrectiveActions = mysqlTable(
  'safety_corrective_actions',
  {
    id: int('id').autoincrement().primaryKey(),

    reportId: int('report_id')
      .notNull()
      .references(() => safetyReports.id, { onDelete: 'cascade' }),

    actionDescription: text('action_description').notNull(),

    assignedToEmployeeId: int('assigned_to_employee_id')
      .references(() => employees.id, { onDelete: 'set null' }),

    dueDate: datetime('due_date'),

    status: mysqlEnum('status', [
      'pending',
      'in_progress',
      'completed',
      'cancelled',
    ])
      .default('pending')
      .notNull(),

    completionNotes: text('completion_notes'),
    completedAt: datetime('completed_at'),

    createdBy: int('created_by')
      .references(() => appUsers.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at').defaultNow().notNull(),

    updatedAt: timestamp('updated_at')
      .defaultNow()
      .onUpdateNow()
      .notNull(),
  },
  (table) => [
    index('safety_action_report_idx').on(table.reportId),
    index('safety_action_employee_idx').on(table.assignedToEmployeeId),
    index('safety_action_status_idx').on(table.status),
    index('safety_action_due_date_idx').on(table.dueDate),
  ],
);
