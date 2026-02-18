/**
 * Role-Based Access Control Configuration
 * Defines what each role can access in the system
 */

export interface ModuleAccess {
  canView: boolean
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
  hideTotals?: boolean // Hide financial totals/summaries
}

export interface RolePermissions {
  dashboard: ModuleAccess
  finance: {
    bankAccounts: ModuleAccess
    expenses: ModuleAccess
    reports: ModuleAccess & { hideNetProfit?: boolean; hideAllTimeStats?: boolean }
    quickEntry: ModuleAccess
    quotations: ModuleAccess
    income: ModuleAccess
    invoices: ModuleAccess
  }
  hr: {
    employees: ModuleAccess
    salaries: ModuleAccess
  }
  marine: {
    vessels: ModuleAccess
    customers: ModuleAccess
    rentals: ModuleAccess
  }
  scrap: {
    lands: ModuleAccess
    equipment: ModuleAccess
  }
  warehouse: {
    inventory: ModuleAccess
    sales: ModuleAccess
  }
  settings: ModuleAccess
}

const defaultAccess: ModuleAccess = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  hideTotals: true
}

const fullAccess: ModuleAccess = {
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
  hideTotals: false
}

const viewOnly: ModuleAccess = {
  canView: true,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  hideTotals: true
}

export const ROLE_PERMISSIONS: Record<string, RolePermissions> = {
  admin: {
    dashboard: fullAccess,
    finance: {
      bankAccounts: fullAccess,
      expenses: fullAccess,
      reports: { ...fullAccess, hideNetProfit: false, hideAllTimeStats: false },
      quickEntry: fullAccess,
      quotations: fullAccess,
      income: fullAccess,
      invoices: fullAccess,
    },
    hr: {
      employees: fullAccess,
      salaries: fullAccess,
    },
    marine: {
      vessels: fullAccess,
      customers: fullAccess,
      rentals: fullAccess,
    },
    scrap: {
      lands: fullAccess,
      equipment: fullAccess,
    },
    warehouse: {
      inventory: fullAccess,
      sales: fullAccess,
    },
    settings: fullAccess,
  },

  hr: {
    dashboard: { ...viewOnly, hideTotals: true },
    finance: {
      bankAccounts: defaultAccess,
      expenses: defaultAccess,
      reports: { ...defaultAccess, hideNetProfit: true, hideAllTimeStats: true },
      quickEntry: defaultAccess,
      quotations: defaultAccess,
      income: defaultAccess,
      invoices: defaultAccess,
    },
    hr: {
      employees: fullAccess,
      salaries: { canView: true, canCreate: true, canEdit: true, canDelete: false, hideTotals: false }, // Can't delete salary records
    },
    marine: {
      vessels: defaultAccess,
      customers: defaultAccess,
      rentals: defaultAccess,
    },
    scrap: {
      lands: defaultAccess,
      equipment: defaultAccess,
    },
    warehouse: {
      inventory: defaultAccess,
      sales: defaultAccess,
    },
    settings: viewOnly,
  },

  accountant: {
    dashboard: { ...viewOnly, hideTotals: false },
    finance: {
      bankAccounts: { canView: true, canCreate: true, canEdit: false, canDelete: false, hideTotals: false }, // Can't edit bank accounts
      expenses: { canView: true, canCreate: true, canEdit: true, canDelete: false, hideTotals: false }, // Can edit but not delete
      reports: { ...viewOnly, hideNetProfit: true, hideAllTimeStats: true, canView: true }, // Can see transactions but not net profit
      quickEntry: { canView: true, canCreate: true, canEdit: false, canDelete: false, hideTotals: false },
      quotations: { canView: true, canCreate: true, canEdit: true, canDelete: false, hideTotals: false },
      income: { canView: true, canCreate: false, canEdit: false, canDelete: false, hideTotals: false },
      invoices: { canView: true, canCreate: true, canEdit: true, canDelete: false, hideTotals: false },
    },
    hr: {
      employees: viewOnly,
      salaries: { canView: true, canCreate: false, canEdit: false, canDelete: false, hideTotals: true }, // Can see salaries but not create
    },
    marine: {
      vessels: { canView: true, canCreate: false, canEdit: false, canDelete: false, hideTotals: false }, // View only, no editing vessels
      customers: fullAccess,
      rentals: { canView: true, canCreate: true, canEdit: true, canDelete: false, hideTotals: false }, // Can't delete rentals
    },
    scrap: {
      lands: { canView: true, canCreate: false, canEdit: false, canDelete: false, hideTotals: false }, // View only, no editing land purchases
      equipment: { canView: true, canCreate: false, canEdit: false, canDelete: false, hideTotals: false }, // View only
    },
    warehouse: {
      inventory: { canView: true, canCreate: true, canEdit: true, canDelete: false, hideTotals: false }, // Can manage but not delete
      sales: { canView: true, canCreate: true, canEdit: true, canDelete: false, hideTotals: false },
    },
    settings: viewOnly,
  },

  storekeeper: {
    dashboard: { ...viewOnly, hideTotals: true },
    finance: {
      bankAccounts: defaultAccess,
      expenses: defaultAccess,
      reports: { ...defaultAccess, hideNetProfit: true, hideAllTimeStats: true },
      quickEntry: { canView: true, canCreate: true, canEdit: false, canDelete: false, hideTotals: true }, // Can record sales
      quotations: defaultAccess,
      income: defaultAccess,
      invoices: defaultAccess,
    },
    hr: {
      employees: defaultAccess,
      salaries: defaultAccess,
    },
    marine: {
      vessels: viewOnly,
      customers: viewOnly,
      rentals: viewOnly,
    },
    scrap: {
      lands: viewOnly,
      equipment: { canView: true, canCreate: true, canEdit: true, canDelete: false, hideTotals: true }, // Manage equipment but can't delete
    },
    warehouse: {
      inventory: { canView: true, canCreate: true, canEdit: true, canDelete: true, hideTotals: false }, // Full control over inventory only
      sales: { canView: true, canCreate: true, canEdit: false, canDelete: false, hideTotals: false }, // Can record but not edit/delete sales
    },
    settings: defaultAccess,
  },
}

// Helper function to get permissions for a role
export function getRolePermissions(role: string): RolePermissions {
  const normalizedRole = role.toLowerCase()
  return ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.storekeeper // Default to most restricted
}

// Helper to check if user can access a module
export function canAccessModule(role: string, modulePath: string[]): boolean {
  const permissions = getRolePermissions(role)
  
  let current: any = permissions
  for (const path of modulePath) {
    if (!current[path]) return false
    current = current[path]
  }
  
  return current.canView === true
}

// Helper to check specific permission
export function hasModulePermission(
  role: string, 
  modulePath: string[], 
  action: 'view' | 'create' | 'edit' | 'delete'
): boolean {
  const permissions = getRolePermissions(role)
  
  let current: any = permissions
  for (const path of modulePath) {
    if (!current[path]) return false
    current = current[path]
  }
  
  const actionMap = {
    view: 'canView',
    create: 'canCreate',
    edit: 'canEdit',
    delete: 'canDelete',
  }
  
  return current[actionMap[action]] === true
}

// Helper to check if should hide financial totals
export function shouldHideTotals(role: string, modulePath: string[]): boolean {
  const permissions = getRolePermissions(role)
  
  let current: any = permissions
  for (const path of modulePath) {
    if (!current[path]) return true
    current = current[path]
  }
  
  return current.hideTotals === true
}

/**
 * Check if sensitive financial fields (purchase prices, costs) should be hidden
 * Only admin can see purchase prices and costs
 */
export function shouldHidePrices(role: string): boolean {
  return role?.toLowerCase() !== 'admin'
}

/**
 * Get masked value for sensitive data (purchase prices, costs)
 */
export function getMaskedValue(value: any, role: string): string {
  if (role?.toLowerCase() === 'admin') {
    return value?.toString() || '0'
  }
  return '***'
}
