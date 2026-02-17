'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthContext'
import { canAccessModule, isRouteAllowed, getDefaultRoute } from '@/lib/auth/rolePermissions'
import {
  Ship,
  LandPlot,
  DollarSign,
  Users,
  FileText,
  Package,
  TrendingUp,
  Settings,
  BarChart3,
  Warehouse,
  Box,
  ClipboardList,
  Wrench,
  Upload,
  LogOut,
  User,
  Calendar,
  UserCheck,
  Fuel,
  Award,
  Bell,
  ChevronDown,
  Building2,
  RefreshCw,
  Plus,
  Menu,
  X
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Get user role for permissions
  const userRole = user?.role || user?.roles?.[0] || 'storekeeper'
  const isAdmin = user?.role === 'admin' || user?.roles?.includes('admin')

  // Redirect restricted roles away from unauthorized pages
  useEffect(() => {
    if (!user || loading || !pathname) return
    if (isAdmin) return

    if (!isRouteAllowed(userRole, pathname)) {
      router.replace(getDefaultRoute(userRole))
    }
  }, [user, loading, pathname, userRole, router, isAdmin])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  // Close drawer and dropdowns on route change
  useEffect(() => {
    setSidebarOpen(false)
    setShowUserMenu(false)
    setShowNotifications(false)
  }, [pathname])

  // Helper to check if user can access a module
  const canAccess = (modulePath: string[]) => {
    if (isAdmin) return true
    return canAccessModule(userRole, modulePath)
  }

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/')

  // Build bottom navigation items based on role
  const bottomNavItems = useMemo(() => {
    const items: { label: string; icon: typeof BarChart3; href: string; matchPrefix?: string }[] = []

    const isAdminRole = userRole === 'admin'
    const checkAccess = (path: string[]) => isAdminRole || canAccessModule(userRole, path)

    if (checkAccess(['dashboard'])) {
      items.push({ label: 'Home', icon: BarChart3, href: '/dashboard' })
    }

    if (userRole === 'storekeeper') {
      items.push({ label: 'Inventory', icon: Box, href: '/dashboard/marine/inventory', matchPrefix: '/dashboard/marine/inventory' })
    } else {
      if (checkAccess(['marine', 'vessels'])) {
        items.push({ label: 'Marine', icon: Ship, href: '/dashboard/marine/vessels', matchPrefix: '/dashboard/marine' })
      }
    }

    if (checkAccess(['finance', 'expenses'])) {
      items.push({ label: 'Finance', icon: DollarSign, href: '/dashboard/finance/invoices', matchPrefix: '/dashboard/finance' })
    }

    if (checkAccess(['hr', 'employees'])) {
      items.push({ label: 'HR', icon: Users, href: '/dashboard/hr/employees', matchPrefix: '/dashboard/hr' })
    }

    return items.slice(0, 4)
  }, [userRole])

  // Render sidebar navigation items (shared between desktop sidebar and mobile drawer)
  const renderNavItems = (onNavigate?: () => void) => (
    <>
      {canAccess(['dashboard']) && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Main
          </h3>
          <Link href="/dashboard" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${pathname === '/dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <BarChart3 className="mr-3 h-5 w-5" />
            Dashboard
          </Link>
          <Link href="/dashboard/companies" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/companies') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <Building2 className="mr-3 h-5 w-5" />
            Companies
          </Link>
          {isAdmin && (
            <>
              <Link href="/dashboard/admin/sync-expenses" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/admin/sync-expenses') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
                <RefreshCw className="mr-3 h-5 w-5" />
                Sync Expenses
              </Link>
              <Link href="/dashboard/admin/sync-tonnage" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/admin/sync-tonnage') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
                <RefreshCw className="mr-3 h-5 w-5" />
                Sync Tonnage
              </Link>
            </>
          )}
        </div>
      )}

      {/* Storekeeper: Inventory-only sidebar */}
      {userRole === 'storekeeper' && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Inventory
          </h3>
          <Link href="/dashboard/marine/inventory" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/marine/inventory') && !pathname?.includes('bulk-upload') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <Box className="mr-3 h-5 w-5" />
            Inventory
          </Link>
          <Link href="/dashboard/marine/inventory/bulk-upload" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ml-6 ${isActive('/dashboard/marine/inventory/bulk-upload') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <Upload className="mr-3 h-4 w-4" />
            Bulk Upload
          </Link>
        </div>
      )}

      {canAccess(['marine', 'vessels']) && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Marine Services
          </h3>
          <Link href="/dashboard/marine/vessels" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/marine/vessels') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <Ship className="mr-3 h-5 w-5" />
            Vessels
          </Link>
          {canAccess(['warehouse', 'warehouses']) && (
            <Link href="/dashboard/marine/warehouses" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/marine/warehouses') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
              <Warehouse className="mr-3 h-5 w-5" />
              Warehouses
            </Link>
          )}
          {canAccess(['warehouse', 'inventory']) && (
            <>
              <Link href="/dashboard/marine/inventory" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/marine/inventory') && !pathname?.includes('bulk-upload') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
                <Box className="mr-3 h-5 w-5" />
                Inventory
              </Link>
              <Link href="/dashboard/marine/inventory/bulk-upload" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ml-6 ${isActive('/dashboard/marine/inventory/bulk-upload') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
                <Upload className="mr-3 h-4 w-4" />
                Bulk Upload
              </Link>
            </>
          )}
          {canAccess(['warehouse', 'equipment']) && (
            <Link href="/dashboard/marine/equipment-tracking" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/marine/equipment-tracking') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
              <Wrench className="mr-3 h-5 w-5" />
              Equipment
            </Link>
          )}
          <Link href="/dashboard/marine/requisitions" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/marine/requisitions') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <ClipboardList className="mr-3 h-5 w-5" />
            Requisitions
          </Link>
          <Link href="/dashboard/marine/overhauls" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/marine/overhauls') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <Settings className="mr-3 h-5 w-5" />
            Overhauls
          </Link>
          <Link href="/dashboard/marine/maintenance" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/marine/maintenance') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <Wrench className="mr-3 h-5 w-5" />
            Maintenance
          </Link>
          <Link href="/dashboard/marine/fuel" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/marine/fuel') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <Fuel className="mr-3 h-5 w-5" />
            Fuel Records
          </Link>
        </div>
      )}

      {canAccess(['marine', 'rentals']) && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Vessel Rentals
          </h3>
          <Link href="/dashboard/rentals" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${pathname === '/dashboard/rentals' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <Calendar className="mr-3 h-5 w-5" />
            Bookings
          </Link>
          <Link href="/dashboard/rentals/customers" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/rentals/customers') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <Building2 className="mr-3 h-5 w-5" />
            Customers
          </Link>
          <Link href="/dashboard/rentals/payments" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/rentals/payments') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <DollarSign className="mr-3 h-5 w-5" />
            Payments
          </Link>
        </div>
      )}

      {canAccess(['hr', 'employees']) && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Crew Management
          </h3>
          <Link href="/dashboard/crew" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${pathname === '/dashboard/crew' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <UserCheck className="mr-3 h-5 w-5" />
            Assignments
          </Link>
          <Link href="/dashboard/crew/certifications" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/crew/certifications') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <Award className="mr-3 h-5 w-5" />
            Certifications
          </Link>
        </div>
      )}

      {canAccess(['scrap', 'lands']) && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Scrap Services
          </h3>
          <Link href="/dashboard/scrap/lands" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/scrap/lands') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <LandPlot className="mr-3 h-5 w-5" />
            Land Purchases
          </Link>
          <Link href="/dashboard/scrap/equipment" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/scrap/equipment') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <Package className="mr-3 h-5 w-5" />
            Equipment
          </Link>
        </div>
      )}

      {canAccess(['finance', 'expenses']) && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Finance
          </h3>
          <Link href="/dashboard/finance/quick-entry" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/finance/quick-entry') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <Plus className="mr-3 h-5 w-5" />
            Quick Entry
          </Link>
          <Link href="/dashboard/finance/bank-accounts" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/finance/bank-accounts') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <Building2 className="mr-3 h-5 w-5" />
            Bank Accounts
          </Link>
          <Link href="/dashboard/finance/invoices" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/finance/invoices') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <FileText className="mr-3 h-5 w-5" />
            Invoices
          </Link>
          <Link href="/dashboard/finance/expenses" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/finance/expenses') && !pathname?.includes('import') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <DollarSign className="mr-3 h-5 w-5" />
            Expenses
          </Link>
          <Link href="/dashboard/finance/expenses/import" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ml-6 ${isActive('/dashboard/finance/expenses/import') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <Upload className="mr-3 h-4 w-4" />
            Import Expenses
          </Link>
          <Link href="/dashboard/finance/reports" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/finance/reports') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <TrendingUp className="mr-3 h-5 w-5" />
            Reports
          </Link>
        </div>
      )}

      {canAccess(['hr', 'employees']) && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            HR
          </h3>
          <Link href="/dashboard/hr/employees" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/hr/employees') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <Users className="mr-3 h-5 w-5" />
            Employees
          </Link>
          <Link href="/dashboard/hr/salaries" onClick={onNavigate} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg ${isActive('/dashboard/hr/salaries') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}>
            <DollarSign className="mr-3 h-5 w-5" />
            Salaries
          </Link>
        </div>
      )}

      {/* Settings & Profile in drawer */}
      {onNavigate && (
        <div className="pt-4 mt-2 border-t border-gray-200">
          <Link href="/dashboard/settings" onClick={onNavigate} className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200">
            <Settings className="mr-3 h-5 w-5" />
            Settings
          </Link>
          <Link href="/dashboard/profile" onClick={onNavigate} className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200">
            <User className="mr-3 h-5 w-5" />
            Profile
          </Link>
          <button
            onClick={() => { setSidebarOpen(false); logout() }}
            className="w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 active:bg-red-100"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </button>
        </div>
      )}
    </>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Drawer Overlay */}
      <div className={`fixed inset-0 z-[60] lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setSidebarOpen(false)}
        />
        {/* Drawer Panel */}
        <div className={`fixed inset-y-0 left-0 w-[280px] bg-white shadow-2xl transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200">
            <div className="flex items-center">
              <Ship className="h-6 w-6 text-blue-600 mr-2" />
              <span className="text-lg font-bold text-blue-600">OSS Marine</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 -mr-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {user.full_name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.roles?.[0] || user.role}</p>
              </div>
            </div>
          </div>
          {/* Drawer Navigation */}
          <nav className="px-3 py-4 space-y-1 overflow-y-auto overscroll-contain" style={{ maxHeight: 'calc(100vh - 8.5rem)' }}>
            {renderNavItems(() => setSidebarOpen(false))}
          </nav>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 lg:h-16">
            <div className="flex items-center">
              {/* Hamburger button - visible on mobile/tablet */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-1 mr-1 sm:mr-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Ship className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-blue-600 mr-1.5 lg:mr-2" />
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">OSS Marine</h1>
            </div>

            {/* Desktop header navigation - only visible on lg+ */}
            <nav className="hidden lg:flex space-x-6">
              {canAccess(['dashboard']) && (
                <Link href="/dashboard" className={`px-3 py-2 text-sm font-medium ${isActive('/dashboard') && pathname === '/dashboard' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}>
                  Dashboard
                </Link>
              )}
              {canAccess(['marine', 'vessels']) && (
                <Link href="/dashboard/marine/vessels" className={`px-3 py-2 text-sm font-medium ${isActive('/dashboard/marine') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}>
                  Marine
                </Link>
              )}
              {canAccess(['marine', 'rentals']) && (
                <Link href="/dashboard/rentals" className={`px-3 py-2 text-sm font-medium ${isActive('/dashboard/rentals') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}>
                  Rentals
                </Link>
              )}
              {canAccess(['scrap', 'lands']) && (
                <Link href="/dashboard/scrap/lands" className={`px-3 py-2 text-sm font-medium ${isActive('/dashboard/scrap') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}>
                  Scrap
                </Link>
              )}
              {canAccess(['hr', 'employees']) && (
                <Link href="/dashboard/hr/employees" className={`px-3 py-2 text-sm font-medium ${isActive('/dashboard/hr') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}>
                  HR
                </Link>
              )}
              {canAccess(['finance', 'expenses']) && (
                <Link href="/dashboard/finance/invoices" className={`px-3 py-2 text-sm font-medium ${isActive('/dashboard/finance') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}>
                  Finance
                </Link>
              )}
              {userRole === 'storekeeper' && (
                <Link href="/dashboard/marine/inventory" className={`px-3 py-2 text-sm font-medium ${isActive('/dashboard/marine/inventory') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}>
                  Inventory
                </Link>
              )}
            </nav>

            <div className="flex items-center space-x-1 sm:space-x-3">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false) }}
                  className="p-2 text-gray-500 hover:text-gray-700 active:bg-gray-100 rounded-lg relative"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <div className="px-4 py-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer">
                        <p className="text-sm text-gray-900">New rental request received</p>
                        <p className="text-xs text-gray-500 mt-1">2 minutes ago</p>
                      </div>
                      <div className="px-4 py-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer">
                        <p className="text-sm text-gray-900">Low stock alert: Engine Oil</p>
                        <p className="text-xs text-gray-500 mt-1">1 hour ago</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu - hidden on small mobile (use drawer instead) */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false) }}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {user.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.roles?.[0] || user.role}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500 hidden lg:block" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <Link href="/dashboard/settings" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100">
                      <Settings className="h-4 w-4 mr-3" />
                      Settings
                    </Link>
                    <Link href="/dashboard/profile" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100">
                      <User className="h-4 w-4 mr-3" />
                      Profile
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 active:bg-red-100"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {renderNavItems()}
          </nav>
        </aside>

        {/* Main content - extra bottom padding on mobile for bottom nav */}
        <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Bottom Navigation Bar - Mobile/Tablet only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 lg:hidden z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {bottomNavItems.map((item) => {
            const Icon = item.icon
            const active = item.matchPrefix
              ? pathname?.startsWith(item.matchPrefix)
              : pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${active ? 'text-blue-600' : 'text-gray-400 active:text-gray-600'}`}
              >
                <Icon className={`h-5 w-5 ${active ? 'scale-110' : ''} transition-transform`} />
                <span className={`text-[10px] mt-1 ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 active:text-gray-600 transition-colors"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">More</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
