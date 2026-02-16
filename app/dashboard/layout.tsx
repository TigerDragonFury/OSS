'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthContext'
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
  RefreshCw
} from 'lucide-react'
import { useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout, loading } = useAuth()
  const pathname = usePathname()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/')

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
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Ship className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-blue-600">OSS Marine</h1>
            </div>
            <nav className="hidden md:flex space-x-6">
              <Link href="/dashboard" className={`px-3 py-2 text-sm font-medium ${isActive('/dashboard') && pathname === '/dashboard' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}>
                Dashboard
              </Link>
              <Link href="/dashboard/marine/vessels" className={`px-3 py-2 text-sm font-medium ${isActive('/dashboard/marine') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}>
                Marine
              </Link>
              <Link href="/dashboard/rentals" className={`px-3 py-2 text-sm font-medium ${isActive('/dashboard/rentals') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}>
                Rentals
              </Link>
              <Link href="/dashboard/scrap/lands" className={`px-3 py-2 text-sm font-medium ${isActive('/dashboard/scrap') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}>
                Scrap
              </Link>
              <Link href="/dashboard/hr/employees" className={`px-3 py-2 text-sm font-medium ${isActive('/dashboard/hr') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}>
                HR
              </Link>
              <Link href="/dashboard/finance/invoices" className={`px-3 py-2 text-sm font-medium ${isActive('/dashboard/finance') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}>
                Finance
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-gray-500 hover:text-gray-700 relative"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                        <p className="text-sm text-gray-900">New rental request received</p>
                        <p className="text-xs text-gray-500 mt-1">2 minutes ago</p>
                      </div>
                      <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                        <p className="text-sm text-gray-900">Low stock alert: Engine Oil</p>
                        <p className="text-xs text-gray-500 mt-1">1 hour ago</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.roles?.[0] || user.role}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <Link href="/dashboard/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <Settings className="h-4 w-4 mr-3" />
                      Settings
                    </Link>
                    <Link href="/dashboard/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <User className="h-4 w-4 mr-3" />
                      Profile
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
        {/* Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Main
              </h3>
              <Link href="/dashboard" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${pathname === '/dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <BarChart3 className="mr-3 h-5 w-5" />
                Dashboard
              </Link>
              <Link href="/dashboard/companies" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/companies') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Building2 className="mr-3 h-5 w-5" />
                Companies
              </Link>
              <Link href="/dashboard/admin/sync-expenses" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/admin/sync-expenses') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <RefreshCw className="mr-3 h-5 w-5" />
                Sync Expenses
              </Link>
              <Link href="/dashboard/admin/sync-tonnage" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/admin/sync-tonnage') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <RefreshCw className="mr-3 h-5 w-5" />
                Sync Tonnage
              </Link>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Marine Services
              </h3>
              <Link href="/dashboard/marine/vessels" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/marine/vessels') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Ship className="mr-3 h-5 w-5" />
                Vessels
              </Link>
              <Link href="/dashboard/marine/warehouses" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/marine/warehouses') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Warehouse className="mr-3 h-5 w-5" />
                Warehouses
              </Link>
              <Link href="/dashboard/marine/inventory" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/marine/inventory') && !pathname?.includes('bulk-upload') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Box className="mr-3 h-5 w-5" />
                Inventory
              </Link>
              <Link href="/dashboard/marine/inventory/bulk-upload" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ml-6 ${isActive('/dashboard/marine/inventory/bulk-upload') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Upload className="mr-3 h-4 w-4" />
                Bulk Upload
              </Link>
              <Link href="/dashboard/marine/equipment-tracking" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/marine/equipment-tracking') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Wrench className="mr-3 h-5 w-5" />
                Equipment
              </Link>
              <Link href="/dashboard/marine/requisitions" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/marine/requisitions') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <ClipboardList className="mr-3 h-5 w-5" />
                Requisitions
              </Link>
              <Link href="/dashboard/marine/overhauls" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/marine/overhauls') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Settings className="mr-3 h-5 w-5" />
                Overhauls
              </Link>
              <Link href="/dashboard/marine/maintenance" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/marine/maintenance') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Wrench className="mr-3 h-5 w-5" />
                Maintenance
              </Link>
              <Link href="/dashboard/marine/fuel" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/marine/fuel') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Fuel className="mr-3 h-5 w-5" />
                Fuel Records
              </Link>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Vessel Rentals
              </h3>
              <Link href="/dashboard/rentals" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${pathname === '/dashboard/rentals' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Calendar className="mr-3 h-5 w-5" />
                Bookings
              </Link>
              <Link href="/dashboard/rentals/customers" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/rentals/customers') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Building2 className="mr-3 h-5 w-5" />
                Customers
              </Link>
              <Link href="/dashboard/rentals/payments" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/rentals/payments') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <DollarSign className="mr-3 h-5 w-5" />
                Payments
              </Link>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Crew Management
              </h3>
              <Link href="/dashboard/crew" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${pathname === '/dashboard/crew' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <UserCheck className="mr-3 h-5 w-5" />
                Assignments
              </Link>
              <Link href="/dashboard/crew/certifications" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/crew/certifications') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Award className="mr-3 h-5 w-5" />
                Certifications
              </Link>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Scrap Services
              </h3>
              <Link href="/dashboard/scrap/lands" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/scrap/lands') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <LandPlot className="mr-3 h-5 w-5" />
                Land Purchases
              </Link>
              <Link href="/dashboard/scrap/equipment" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/scrap/equipment') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Package className="mr-3 h-5 w-5" />
                Equipment
              </Link>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Finance
              </h3>
              <Link href="/dashboard/finance/invoices" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/finance/invoices') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <FileText className="mr-3 h-5 w-5" />
                Invoices
              </Link>
              <Link href="/dashboard/finance/expenses" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/finance/expenses') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <DollarSign className="mr-3 h-5 w-5" />
                Expenses
              </Link>
              <Link href="/dashboard/finance/reports" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/finance/reports') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <TrendingUp className="mr-3 h-5 w-5" />
                Reports
              </Link>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                HR
              </h3>
              <Link href="/dashboard/hr/employees" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/hr/employees') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Users className="mr-3 h-5 w-5" />
                Employees
              </Link>
              <Link href="/dashboard/hr/salaries" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/hr/salaries') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <DollarSign className="mr-3 h-5 w-5" />
                Salaries
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
