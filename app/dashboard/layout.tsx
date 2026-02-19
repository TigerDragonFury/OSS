'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthContext'
import { canAccessModule } from '@/lib/auth/rolePermissions'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import {
  Ship, LandPlot, DollarSign, Users, FileText, Package, TrendingUp, Settings,
  BarChart3, Warehouse, Box, ClipboardList, Wrench, Upload, LogOut, User,
  Calendar, UserCheck, Fuel, Award, Bell, ChevronDown, Building2, RefreshCw,
  Plus, ClipboardCheck, ArrowDownCircle, Anchor, ChevronRight, Truck,
} from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'

function NavItem({ href, icon: Icon, label, active }: {
  href: string; icon: any; label: string; active: boolean
}) {
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
        active
          ? 'bg-[#1e3a5f] text-[#93c5fd]'
          : 'text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#e2e8f0]'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-400 rounded-r-full" />
      )}
      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-400' : 'text-[#64748b] group-hover:text-[#94a3b8]'}`} />
      <span>{label}</span>
    </Link>
  )
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const rawRole = user?.role || user?.roles?.[0] || 'storekeeper'
  // Normalize legacy/alternate role names
  const ROLE_ALIASES: Record<string, string> = { operator: 'storekeeper' }
  const userRole = ROLE_ALIASES[rawRole] ?? rawRole
  const isAdmin = rawRole === 'admin' || user?.roles?.includes('admin')

  const supabaseLayout = createClient()
  const { data: dbRolePerms } = useQuery({
    queryKey: ['role_permissions_db'],
    queryFn: async () => {
      const { data } = await supabaseLayout.from('role_permissions').select('role, permissions')
      const map: Record<string, Record<string, string>> = {}
      for (const row of data || []) map[row.role] = row.permissions
      return map
    },
    staleTime: 5 * 60 * 1000, // cache 5 min
  })

  const canAccess = useCallback((modulePath: string[]) => {
    if (user?.role === 'admin' || user?.roles?.includes('admin')) return true
    const key = modulePath.join('.')
    // If DB has a row for this role, use it exclusively (missing key = blocked)
    if (dbRolePerms?.[userRole] !== undefined) {
      const dbLevel = dbRolePerms[userRole][key]
      return (dbLevel ?? 'none') !== 'none'
    }
    // No DB row yet → fall back to static ROLE_PERMISSIONS
    return canAccessModule(userRole, modulePath)
  }, [user, userRole, dbRolePerms])

  const canAccessAny = useCallback((...keys: string[][]) =>
    keys.some(k => canAccess(k)), [canAccess])

  // Redirect non-admin users away from the /dashboard overview page
  useEffect(() => {
    if (loading || !user) return
    if (pathname !== '/dashboard') return
    if (userRole === 'admin') return
    const redirectMap: Record<string, string> = {
      accountant:  '/dashboard/finance/quick-entry',
      hr:          '/dashboard/hr/employees',
      storekeeper: '/dashboard/marine/inventory',
    }
    router.replace(redirectMap[userRole] ?? '/dashboard/marine/inventory')
  }, [loading, user, userRole, pathname, router])

  const is = (path: string) => pathname === path || pathname?.startsWith(path + '/')
  const exact = (path: string) => pathname === path

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading</p>
        </div>
      </div>
    )
  }

  if (!user) return null
  if (pathname?.includes('/print')) return <>{children}</>

  const initials = user.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">

      {/* Sidebar */}
      <aside
        className={`flex flex-col shrink-0 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:static inset-y-0 left-0 z-40 lg:z-auto w-64 bg-[#0f172a] border-r border-[#1e293b]`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-[60px] shrink-0 border-b border-[#1e293b]">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
            <Anchor className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">OSS Marine</p>
            <p className="text-[10px] text-[#64748b] mt-0.5">Operations System</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavSection label="General">
            {isAdmin && (
              <NavItem href="/dashboard" icon={BarChart3} label="Dashboard" active={exact('/dashboard')} />
            )}
            {canAccess(['companies']) && (
              <NavItem href="/dashboard/companies" icon={Building2} label="Companies" active={is('/dashboard/companies')} />
            )}
            {isAdmin && (
              <>
                <NavItem href="/dashboard/admin/sync-expenses" icon={RefreshCw} label="Sync Expenses" active={is('/dashboard/admin/sync-expenses')} />
                <NavItem href="/dashboard/admin/sync-tonnage" icon={RefreshCw} label="Sync Tonnage" active={is('/dashboard/admin/sync-tonnage')} />
              </>
            )}
          </NavSection>

          {canAccessAny(['marine','vessels'], ['marine','warehouses'], ['marine','inventory'], ['marine','equipment'], ['marine','requisitions'], ['marine','overhauls'], ['marine','maintenance'], ['marine','fuel'], ['marine','customers'], ['marine','rentals']) && (
            <NavSection label="Marine">
              {canAccess(['marine', 'vessels']) && (
                <NavItem href="/dashboard/marine/vessels" icon={Ship} label="Vessels" active={is('/dashboard/marine/vessels')} />
              )}
              {canAccess(['marine', 'warehouses']) && (
                <NavItem href="/dashboard/marine/warehouses" icon={Warehouse} label="Warehouses" active={is('/dashboard/marine/warehouses')} />
              )}
              {canAccess(['marine', 'inventory']) && (
                <NavItem href="/dashboard/marine/inventory" icon={Box} label="Inventory" active={is('/dashboard/marine/inventory')} />
              )}
              {canAccess(['marine', 'equipment']) && (
                <NavItem href="/dashboard/marine/equipment-tracking" icon={Wrench} label="Equipment" active={is('/dashboard/marine/equipment-tracking')} />
              )}
              {canAccess(['marine', 'requisitions']) && (
                <NavItem href="/dashboard/marine/requisitions" icon={ClipboardList} label="Requisitions" active={is('/dashboard/marine/requisitions')} />
              )}
              {canAccess(['marine', 'overhauls']) && (
                <NavItem href="/dashboard/marine/overhauls" icon={Settings} label="Overhauls" active={is('/dashboard/marine/overhauls')} />
              )}
              {canAccess(['marine', 'maintenance']) && (
                <NavItem href="/dashboard/marine/maintenance" icon={Wrench} label="Maintenance" active={is('/dashboard/marine/maintenance')} />
              )}
              {canAccess(['marine', 'fuel']) && (
                <NavItem href="/dashboard/marine/fuel" icon={Fuel} label="Fuel Records" active={is('/dashboard/marine/fuel')} />
              )}
            </NavSection>
          )}

          {canAccessAny(['rentals','bookings'], ['rentals','customers'], ['rentals','payments']) && (
            <NavSection label="Rentals">
              {canAccess(['rentals', 'bookings']) && (
                <NavItem href="/dashboard/rentals" icon={Calendar} label="Bookings" active={exact('/dashboard/rentals')} />
              )}
              {canAccess(['rentals', 'customers']) && (
                <NavItem href="/dashboard/rentals/customers" icon={Building2} label="Customers" active={is('/dashboard/rentals/customers')} />
              )}
              {canAccess(['rentals', 'payments']) && (
                <NavItem href="/dashboard/rentals/payments" icon={DollarSign} label="Payments" active={is('/dashboard/rentals/payments')} />
              )}
            </NavSection>
          )}

          {canAccessAny(['scrap','lands'], ['scrap','equipment']) && (
            <NavSection label="Scrap">
              {canAccess(['scrap', 'lands']) && (
                <NavItem href="/dashboard/scrap/lands" icon={LandPlot} label="Land Purchases" active={is('/dashboard/scrap/lands')} />
              )}
              {canAccess(['scrap', 'equipment']) && (
                <NavItem href="/dashboard/scrap/equipment" icon={Package} label="Equipment" active={is('/dashboard/scrap/equipment')} />
              )}
            </NavSection>
          )}

          {canAccess(['trailers']) && (
            <NavSection label="Logistics">
              <NavItem href="/dashboard/trailers" icon={Truck} label="Trailers" active={is('/dashboard/trailers')} />
            </NavSection>
          )}

          {canAccessAny(['finance','quickEntry'], ['finance','quotations'], ['finance','invoices'], ['finance','income'], ['finance','expenses'], ['finance','bankAccounts'], ['finance','reports']) && (
            <NavSection label="Finance">
              {canAccess(['finance', 'quickEntry']) && (
                <NavItem href="/dashboard/finance/quick-entry" icon={Plus} label="Quick Entry" active={is('/dashboard/finance/quick-entry')} />
              )}
              {canAccess(['finance', 'quotations']) && (
                <NavItem href="/dashboard/finance/quotations" icon={ClipboardCheck} label="Quotations" active={is('/dashboard/finance/quotations')} />
              )}
              {canAccess(['finance', 'invoices']) && (
                <NavItem href="/dashboard/finance/invoices" icon={FileText} label="Invoices" active={is('/dashboard/finance/invoices')} />
              )}
              {canAccess(['finance', 'income']) && (
                <NavItem href="/dashboard/finance/income" icon={ArrowDownCircle} label="Income" active={is('/dashboard/finance/income')} />
              )}
              {canAccess(['finance', 'expenses']) && (
                <NavItem href="/dashboard/finance/expenses" icon={DollarSign} label="Expenses" active={is('/dashboard/finance/expenses') && !pathname?.includes('import')} />
              )}
              {canAccess(['finance', 'bankAccounts']) && (
                <NavItem href="/dashboard/finance/bank-accounts" icon={Building2} label="Bank Accounts" active={is('/dashboard/finance/bank-accounts')} />
              )}
              {canAccess(['finance', 'reports']) && (
                <NavItem href="/dashboard/finance/reports" icon={TrendingUp} label="Reports" active={is('/dashboard/finance/reports')} />
              )}
            </NavSection>
          )}

          {canAccessAny(['crew','assignments'], ['crew','certifications'], ['hr','employees'], ['hr','salaries']) && (
            <NavSection label="Crew & HR">
              {canAccess(['crew', 'assignments']) && (
                <NavItem href="/dashboard/crew" icon={UserCheck} label="Assignments" active={exact('/dashboard/crew')} />
              )}
              {canAccess(['crew', 'certifications']) && (
                <NavItem href="/dashboard/crew/certifications" icon={Award} label="Certifications" active={is('/dashboard/crew/certifications')} />
              )}
              {canAccess(['hr', 'employees']) && (
                <NavItem href="/dashboard/hr/employees" icon={Users} label="Employees" active={is('/dashboard/hr/employees')} />
              )}
              {canAccess(['hr', 'salaries']) && (
                <NavItem href="/dashboard/hr/salaries" icon={DollarSign} label="Salaries" active={is('/dashboard/hr/salaries')} />
              )}
            </NavSection>
          )}
        </nav>

        {/* User footer */}
        <div className="shrink-0 border-t border-[#1e293b] p-3">
          <div
            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#1e293b] transition-colors cursor-pointer group"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#e2e8f0] truncate leading-none">{user.full_name}</p>
              <p className="text-[11px] text-[#64748b] capitalize mt-0.5 truncate">{user.roles?.[0] || user.role}</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-[#475569] group-hover:text-[#94a3b8] shrink-0" />
          </div>
          {showUserMenu && (
            <div className="mt-1.5 rounded-lg overflow-hidden border border-[#1e293b] bg-[#1e293b]">
              <Link href="/dashboard/profile" className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#94a3b8] hover:bg-[#0f172a] hover:text-[#e2e8f0] transition-colors" onClick={() => setShowUserMenu(false)}>
                <User className="h-3.5 w-3.5" /> Profile
              </Link>
              <Link href="/dashboard/settings" className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#94a3b8] hover:bg-[#0f172a] hover:text-[#e2e8f0] transition-colors" onClick={() => setShowUserMenu(false)}>
                <Settings className="h-3.5 w-3.5" /> Settings
              </Link>
              <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-[#0f172a] hover:text-red-300 transition-colors">
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Right side */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Header */}
        <header className="shrink-0 flex items-center justify-between px-6 h-[60px] bg-white border-b border-[#e2e8f0] z-20">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" onClick={() => setSidebarOpen(true)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <Breadcrumb pathname={pathname || ''} />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-white" />
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                    <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">Mark all read</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {[
                      { title: 'New rental request received', time: '2 min ago', dot: 'bg-blue-500' },
                      { title: 'Low stock alert: Engine Oil', time: '1 hour ago', dot: 'bg-amber-500' },
                    ].map((n, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.dot}`} />
                        <div>
                          <p className="text-sm text-gray-800">{n.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 pl-2 ml-1 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-gray-800 leading-none">{user.full_name?.split(' ')[0]}</p>
                <p className="text-[10px] text-gray-400 capitalize mt-0.5">{user.roles?.[0] || user.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-7">
          {children}
        </main>
      </div>
    </div>
  )
}

function Breadcrumb({ pathname }: { pathname: string }) {
  const parts = pathname.replace('/dashboard', '').split('/').filter(Boolean)
  const label = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

  if (parts.length === 0) {
    return <span className="text-sm font-semibold text-gray-800">Dashboard</span>
  }

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors text-xs">Dashboard</Link>
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3 text-gray-300" />
          {i === parts.length - 1
            ? <span className="font-semibold text-gray-800 text-xs">{label(part)}</span>
            : <Link href={'/dashboard/' + parts.slice(0, i + 1).join('/')} className="text-gray-400 hover:text-gray-600 transition-colors text-xs">{label(part)}</Link>
          }
        </span>
      ))}
    </div>
  )
}
