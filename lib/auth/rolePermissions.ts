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
    dashboard: defaultAccess, // No dashboard access - finance only
    finance: {
      bankAccounts: { canView: true, canCreate: true, canEdit: false, canDelete: false, hideTotals: false }, // Can't edit bank accounts
      expenses: { canView: true, canCreate: true, canEdit: true, canDelete: false, hideTotals: false }, // Can edit but not delete
      reports: { ...viewOnly, hideNetProfit: true, hideAllTimeStats: true, canView: true }, // Can see transactions but not net profit
      quickEntry: { canView: true, canCreate: true, canEdit: false, canDelete: false, hideTotals: false },
    },
    hr: {
      employees: defaultAccess,
      salaries: defaultAccess,
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

  storekeeper: {
    dashboard: defaultAccess, // No dashboard access - inventory only
    finance: {
      bankAccounts: defaultAccess,
      expenses: defaultAccess,
      reports: { ...defaultAccess, hideNetProfit: true, hideAllTimeStats: true },
      quickEntry: defaultAccess,
    },
    hr: {
      employees: defaultAccess,
      salaries: defaultAccess,
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
      inventory: { canView: true, canCreate: true, canEdit: true, canDelete: true, hideTotals: false }, // Full control over inventory
      sales: { canView: true, canCreate: true, canEdit: false, canDelete: false, hideTotals: false }, // Can record sales
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

/**
 * Get the default landing route for a role.
 * Restricted roles are redirected to their allowed section instead of the dashboard.
 */
export function getDefaultRoute(role: string): string {
  const normalizedRole = role?.toLowerCase()
  switch (normalizedRole) {
    case 'accountant':
      return '/dashboard/finance/invoices'
    case 'storekeeper':
      return '/dashboard/marine/inventory'
    default:
      return '/dashboard'
  }
}

/**
 * Get the allowed route prefixes for restricted roles.
 * Returns null if all routes are allowed (admin, hr).
 * Common routes (settings, profile) are always allowed for all roles.
 */
export function getAllowedRoutes(role: string): string[] | null {
  const normalizedRole = role?.toLowerCase()
  switch (normalizedRole) {
    case 'accountant':
      return ['/dashboard/finance', '/dashboard/settings', '/dashboard/profile']
    case 'storekeeper':
      return ['/dashboard/marine/inventory', '/dashboard/settings', '/dashboard/profile']
    default:
      return null // null means all routes are allowed
  }
}

/**
 * Check if a given pathname is allowed for a role.
 */
export function isRouteAllowed(role: string, pathname: string): boolean {
  const allowedRoutes = getAllowedRoutes(role)
  if (allowedRoutes === null) return true // No restrictions
  return allowedRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
}
