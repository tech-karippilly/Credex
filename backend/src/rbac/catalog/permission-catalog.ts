export interface PermissionDefinition {
  key: string;
  module: string;
  action: string;
  description: string;
}

function permission(
  module: string,
  action: string,
  description: string,
): PermissionDefinition {
  return {
    key: `${module}.${action}`,
    module,
    action,
    description,
  };
}

/**
 * Version-controlled permission catalogue.
 * Seeding inserts missing keys and does not overwrite existing rows.
 * Role-management keys are separate from user-management keys.
 */
export const PERMISSION_CATALOGUE: readonly PermissionDefinition[] = [
  permission('users', 'read', 'View user accounts'),
  permission('users', 'create', 'Create user accounts'),
  permission('users', 'update', 'Update user accounts'),
  permission('users', 'delete', 'Delete user accounts'),
  permission('users', 'status.update', 'Activate or deactivate user accounts'),

  permission('roles', 'read', 'View roles and the permission catalogue'),
  permission('roles', 'create', 'Create custom roles'),
  permission('roles', 'update', 'Update custom role names and descriptions'),
  permission('roles', 'delete', 'Delete custom roles'),
  permission(
    'roles',
    'permissions.update',
    'Assign or remove permissions on a custom role',
  ),

  permission('careers', 'read', 'View career listings in administration'),
  permission('careers', 'create', 'Create career listings'),
  permission('careers', 'update', 'Update career listings'),
  permission('careers', 'delete', 'Delete career listings'),
  permission('careers', 'status.update', 'Change career visibility'),

  permission('services', 'read', 'View services in administration'),
  permission('services', 'create', 'Create services'),
  permission('services', 'update', 'Update services'),
  permission('services', 'delete', 'Delete services'),

  permission('team_members', 'read', 'View team members in administration'),
  permission('team_members', 'create', 'Create team member profiles'),
  permission('team_members', 'update', 'Update team member profiles'),
  permission('team_members', 'delete', 'Delete team member profiles'),
  permission(
    'team_members',
    'status.update',
    'Change team member publication status',
  ),

  permission('applications', 'read', 'View job applications'),
  permission('applications', 'delete', 'Delete job applications'),
  permission('applications', 'status.update', 'Change job application status'),
  permission('applications', 'analyze', 'Run resume analysis'),

  permission('site_contact', 'read', 'View site and contact settings'),
  permission('site_contact', 'update', 'Update site and contact settings'),

  permission('enquiries', 'read', 'View contact enquiries'),
  permission('enquiries', 'delete', 'Delete contact enquiries'),

  permission('leads', 'read', 'View leads and follow-up activity'),
  permission('leads', 'create', 'Create leads'),
  permission('leads', 'update', 'Update leads and record follow-up activity'),
  permission('leads', 'delete', 'Delete leads'),
  permission('leads', 'assign', 'Assign leads to login users'),
  permission('leads', 'import', 'Import leads from a spreadsheet'),
  permission('leads', 'export', 'Export leads'),

  permission('expense_categories', 'read', 'View expense categories'),
  permission('expense_categories', 'create', 'Create expense categories'),
  permission('expense_categories', 'update', 'Update expense categories'),
  permission('expense_categories', 'delete', 'Delete expense categories'),
  permission(
    'expense_categories',
    'status.update',
    'Activate or deactivate expense categories',
  ),

  permission('expenses', 'read', 'View expenses'),
  permission('expenses', 'create', 'Create expenses'),
  permission('expenses', 'update', 'Update expenses'),
  permission('expenses', 'delete', 'Delete expenses'),
  permission('expenses', 'export', 'Export expense reports'),
  permission('expenses', 'analyze', 'Analyze expense receipts'),

  permission('vouchers', 'read', 'View vouchers'),
  permission('vouchers', 'create', 'Create vouchers'),
  permission('vouchers', 'update', 'Update vouchers'),
  permission('vouchers', 'delete', 'Delete vouchers'),
  permission('vouchers', 'status.update', 'Change voucher status'),
  permission('vouchers', 'send_email', 'Send a voucher by email'),
  permission('vouchers', 'send_whatsapp', 'Send a voucher by WhatsApp'),

  permission('payments', 'read', 'View payments'),
  permission('payments', 'create', 'Record payments'),
  permission('payments', 'update', 'Update payments'),
  permission('payments', 'status.update', 'Change payment status'),

  permission('reports', 'read', 'View financial reports'),
  permission('reports', 'export', 'Export financial reports'),

  permission(
    'dashboard',
    'expenses_summary.read',
    'View the Expenses Summary card on the admin dashboard',
  ),
  permission(
    'dashboard',
    'expenses_by_category.read',
    'View the Expenses by Category card on the admin dashboard',
  ),
];
