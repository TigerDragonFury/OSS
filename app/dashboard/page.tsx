// Dashboard page - Main overview
import { createClient } from '@/lib/supabase/server'
import { DollarSign, Ship, LandPlot, Users, TrendingUp, TrendingDown, Package, Wrench, Calendar, Anchor } from 'lucide-react'
import Link from 'next/link'

async function getDashboardData() {
  const supabase = await createClient()
  
  // Run all queries in parallel for much faster loading
  const [
    // Income data
    equipmentSalesData,
    vesselScrapData,
    landScrapData,
    warehouseSalesData,
    rentalIncomeData,
    // Expense data
    vesselPurchasesData,
    salariesData,
    expensesData,
    overhaulExpensesData,
    // Counts
    vesselsCountRes,
    activeVesselsCountRes,
    landsCountRes,
    employeesCountRes,
    activeRentalsRes,
    activeOverhaulsRes,
    inventoryCountRes,
    lowStockItemsRes,
    recentVesselsRes,
    recentLandsRes
  ] = await Promise.all([
    // Income
    supabase.from('vessel_equipment_sales').select('sale_price'),
    supabase.from('vessel_scrap_sales').select('total_amount'),
    supabase.from('land_scrap_sales').select('total_amount'),
    supabase.from('warehouse_sales').select('total_amount'),
    supabase.from('vessel_rentals').select('total_amount').eq('payment_status', 'paid').in('status', ['active', 'completed']),
    
    // Expenses
    supabase.from('vessels').select('purchase_price'),
    supabase.from('salary_payments').select('total_amount'),
    supabase.from('expenses').select('amount'),
    supabase.from('expenses').select('amount').eq('project_type', 'vessel'),
    
    // Counts
    supabase.from('vessels').select('*', { count: 'exact', head: true }),
    supabase.from('vessels').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('land_purchases').select('*', { count: 'exact', head: true }),
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    
    // Lists
    supabase.from('vessel_rentals').select('*, vessels(name)', { count: 'exact' }).eq('status', 'active').order('start_date', { ascending: false }).limit(5),
    supabase.from('vessel_overhaul_projects').select('*, vessels(name)', { count: 'exact' }).eq('status', 'in_progress').order('start_date', { ascending: false }).limit(5),
    supabase.from('marine_inventory').select('*', { count: 'exact', head: true }).gt('quantity_in_stock', 0),
    supabase.from('marine_inventory').select('equipment_name, quantity_in_stock, minimum_stock_level').not('minimum_stock_level', 'is', null).order('quantity_in_stock', { ascending: true }).limit(10),
    supabase.from('vessels').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('land_purchases').select('*').order('created_at', { ascending: false }).limit(5)
  ])
  
  // Calculate totals
  const totalEquipmentSales = equipmentSalesData.data?.reduce((sum, s) => sum + (s.sale_price || 0), 0) || 0
  const totalVesselScrap = vesselScrapData.data?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0
  const totalLandScrap = landScrapData.data?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0
  const totalWarehouseSales = warehouseSalesData.data?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0
  const totalRentalIncome = rentalIncomeData.data?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0
  const totalVesselPurchases = vesselPurchasesData.data?.reduce((sum, v) => sum + (v.purchase_price || 0), 0) || 0
  const totalSalaries = salariesData.data?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0
  const totalExpenses = expensesData.data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
  const totalOverhaulExpenses = overhaulExpensesData.data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
  
  const totalIncome = totalEquipmentSales + totalVesselScrap + totalLandScrap + totalWarehouseSales + totalRentalIncome
  const totalExpensesAll = totalVesselPurchases + totalSalaries + totalExpenses
  
  // Filter low stock items
  const filteredLowStock = lowStockItemsRes.data?.filter(item => 
    item.quantity_in_stock < (item.minimum_stock_level || 10)
  ).slice(0, 5) || []
  
  return {
    totalIncome,
    totalExpenses: totalExpensesAll,
    totalRentalIncome,
    totalEquipmentSales,
    totalVesselScrap,
    totalLandScrap,
    totalWarehouseSales,
    totalVesselPurchases,
    totalSalaries,
    totalOverhaulExpenses,
    vesselsCount: vesselsCountRes.count || 0,
    activeVesselsCount: activeVesselsCountRes.count || 0,
    landsCount: landsCountRes.count || 0,
    employeesCount: employeesCountRes.count || 0,
    activeRentals: activeRentalsRes.data || [],
    activeRentalsCount: activeRentalsRes.count || 0,
    activeOverhauls: activeOverhaulsRes.data || [],
    activeOverhaulsCount: activeOverhaulsRes.count || 0,
    inventoryCount: inventoryCountRes.count || 0,
    lowStockItems: filteredLowStock,
    recentVessels: recentVesselsRes.data || [],
    recentLands: recentLandsRes.data || []
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  
  const netProfit = data.totalIncome - data.totalExpenses

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of OSS Group operations</p>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* Financial KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Income</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.totalIncome.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">AED</p>
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
            {[
              { label: 'Rentals', value: data.totalRentalIncome },
              { label: 'Equip. Sales', value: data.totalEquipmentSales },
              { label: 'Vessel Scrap', value: data.totalVesselScrap },
              { label: 'Land Scrap', value: data.totalLandScrap },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-[11px]">
                <span className="text-gray-400">{r.label}</span>
                <span className="font-semibold text-gray-600">{r.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Expenses</p>
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.totalExpenses.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">AED</p>
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
            {[
              { label: 'Vessel Purchases', value: data.totalVesselPurchases },
              { label: 'Salaries', value: data.totalSalaries },
              { label: 'Overhauls', value: data.totalOverhaulExpenses },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-[11px]">
                <span className="text-gray-400">{r.label}</span>
                <span className="font-semibold text-gray-600">{r.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Net Profit */}
        <div className={`rounded-xl border p-5 shadow-sm ${netProfit >= 0 ? 'bg-emerald-600 border-emerald-600' : 'bg-red-500 border-red-500'}`}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Net Profit</p>
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{netProfit.toLocaleString()}</p>
          <p className="text-xs text-white/60 mt-0.5">AED</p>
          <div className="mt-3 pt-3 border-t border-white/20">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md ${netProfit >= 0 ? 'bg-white/20 text-white' : 'bg-white/20 text-white'}`}>
              {netProfit >= 0 ? '▲ Profitable' : '▼ Net Loss'}
            </span>
          </div>
        </div>

        {/* Employees */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Workforce</p>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.employeesCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">Active employees</p>
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
            <div className="text-center p-1.5 rounded-lg bg-gray-50">
              <p className="text-sm font-bold text-gray-800">{data.vesselsCount}</p>
              <p className="text-[10px] text-gray-400">Vessels</p>
            </div>
            <div className="text-center p-1.5 rounded-lg bg-gray-50">
              <p className="text-sm font-bold text-gray-800">{data.landsCount}</p>
              <p className="text-[10px] text-gray-400">Land Plots</p>
            </div>
          </div>
        </div>
      </div>

      {/* Operations metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { href: '/dashboard/marine/vessels', icon: Ship, label: 'Vessels', value: data.vesselsCount, sub: `${data.activeVesselsCount} active`, color: 'text-blue-600', bg: 'bg-blue-50' },
          { href: '/dashboard/rentals', icon: Anchor, label: 'Active Rentals', value: data.activeRentalsCount, sub: 'Currently rented', color: 'text-violet-600', bg: 'bg-violet-50' },
          { href: '/dashboard/marine/overhauls', icon: Wrench, label: 'Overhauls', value: data.activeOverhaulsCount, sub: 'In progress', color: 'text-orange-600', bg: 'bg-orange-50' },
          { href: '/dashboard/marine/inventory', icon: Package, label: 'Inventory', value: data.inventoryCount, sub: 'Items in stock', color: 'text-teal-600', bg: 'bg-teal-50' },
        ].map(({ href, icon: Icon, label, value, sub, color, bg }) => (
          <Link key={href} href={href} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">{label}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Active Rentals */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Active Vessel Rentals</h2>
            <Link href="/dashboard/rentals" className="text-xs text-blue-600 hover:underline font-medium">View all</Link>
          </div>
          <div className="p-5">
            {data.activeRentals.length > 0 ? (
              <div className="space-y-2">
                {data.activeRentals.map((rental: any) => (
                  <div key={rental.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{rental.vessels?.name || 'Unknown Vessel'}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(rental.start_date).toLocaleDateString()} – {rental.end_date ? new Date(rental.end_date).toLocaleDateString() : 'Ongoing'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">{rental.total_amount?.toLocaleString() || '0'} AED</p>
                      <p className="text-[11px] text-gray-400 capitalize mt-0.5">{rental.payment_status || '–'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">No active rentals</p>
            )}
          </div>
        </div>

        {/* Active Overhauls */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Active Overhaul Projects</h2>
            <Link href="/dashboard/marine/overhauls" className="text-xs text-blue-600 hover:underline font-medium">View all</Link>
          </div>
          <div className="p-5">
            {data.activeOverhauls.length > 0 ? (
              <div className="space-y-2">
                {data.activeOverhauls.map((project: any) => (
                  <Link href={`/dashboard/marine/overhauls/${project.id}`} key={project.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{project.project_name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{project.vessels?.name || 'Unknown Vessel'}</p>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded-md bg-orange-100 text-orange-700 font-medium capitalize">
                      {project.status?.replace(/_/g, ' ') || 'in progress'}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">No active overhaul projects</p>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock & Recent Vessels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Low Stock */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Low Stock Alerts</h2>
            <Link href="/dashboard/marine/inventory" className="text-xs text-blue-600 hover:underline font-medium">View inventory</Link>
          </div>
          <div className="p-5">
            {data.lowStockItems.length > 0 ? (
              <div className="space-y-2">
                {data.lowStockItems.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-red-50 border border-red-100">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.equipment_name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Min required: {item.minimum_stock_level ?? 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{item.quantity_in_stock}</p>
                      <p className="text-[11px] text-gray-400">in stock</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">All items sufficiently stocked</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Vessels */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Recent Vessels</h2>
            <Link href="/dashboard/marine/vessels" className="text-xs text-blue-600 hover:underline font-medium">View all</Link>
          </div>
          <div className="p-5">
            {data.recentVessels.length > 0 ? (
              <div className="space-y-1">
                {data.recentVessels.map((vessel: any) => (
                  <Link href={`/dashboard/marine/vessels/${vessel.id}`} key={vessel.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{vessel.name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{vessel.status} · {vessel.vessel_type || 'N/A'}</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-600">{vessel.purchase_price?.toLocaleString() || '–'} AED</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">No vessels yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Land Purchases */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Recent Land Purchases</h2>
          <Link href="/dashboard/scrap/lands" className="text-xs text-blue-600 hover:underline font-medium">View all</Link>
        </div>
        <div className="p-5">
          {data.recentLands.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.recentLands.map((land: any) => (
                <div key={land.id} className="rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-sm font-semibold text-gray-800 truncate">{land.land_name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{land.location}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      land.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      land.status === 'sold' ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {land.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mb-2">{land.area_sqm?.toLocaleString() || '–'} sqm</p>
                  <p className="text-sm font-bold text-gray-900">{land.purchase_price?.toLocaleString() || '–'} AED</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">No land purchases yet</p>
          )}
        </div>
      </div>

    </div>
  )
}
