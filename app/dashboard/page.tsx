import { createClient } from '@/lib/supabase/server'
import { DollarSign, Ship, LandPlot, Users, TrendingUp, TrendingDown, Package, Wrench, Calendar, Anchor } from 'lucide-react'
import Link from 'next/link'

async function getDashboardData() {
  const supabase = await createClient()
  
  // ============================================
  // INCOME CALCULATIONS (All Revenue Sources)
  // ============================================
  
  // Vessel Equipment Sales Income
  const { data: equipmentSalesData } = await supabase
    .from('vessel_equipment_sales')
    .select('sale_price')
  const totalEquipmentSales = equipmentSalesData?.reduce((sum, s) => sum + (s.sale_price || 0), 0) || 0
  
  // Vessel Scrap Sales Income
  const { data: vesselScrapData } = await supabase
    .from('vessel_scrap_sales')
    .select('total_amount')
  const totalVesselScrap = vesselScrapData?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0
  
  // Land Scrap Sales Income
  const { data: landScrapData } = await supabase
    .from('land_scrap_sales')
    .select('total_amount')
  const totalLandScrap = landScrapData?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0
  
  // Warehouse Sales Income
  const { data: warehouseSalesData } = await supabase
    .from('warehouse_sales')
    .select('total_amount')
  const totalWarehouseSales = warehouseSalesData?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0
  
  // Vessel Rental Income (only active/completed rentals with paid status)
  const { data: rentalIncomeData } = await supabase
    .from('vessel_rentals')
    .select('total_amount, status')
    .eq('payment_status', 'paid')
    .in('status', ['active', 'completed'])
  const totalRentalIncome = rentalIncomeData?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0
  
  // Total Income from all sources
  const totalIncome = totalEquipmentSales + totalVesselScrap + totalLandScrap + totalWarehouseSales + totalRentalIncome
  
  // ============================================
  // EXPENSE CALCULATIONS (All Cost Sources)
  // ============================================
  
  // Vessel Purchase Costs
  const { data: vesselPurchasesData } = await supabase
    .from('vessels')
    .select('purchase_price')
  const totalVesselPurchases = vesselPurchasesData?.reduce((sum, v) => sum + (v.purchase_price || 0), 0) || 0
  
  // Employee Salaries
  const { data: salariesData } = await supabase
    .from('salary_payments')
    .select('amount')
  const totalSalaries = salariesData?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0
  
  // General Expenses (includes overhauls, maintenance, etc.)
  const { data: expenseData } = await supabase
    .from('expenses')
    .select('amount')
  const totalExpenses = expenseData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
  
  // Total Expenses from all sources
  const totalExpensesAll = totalVesselPurchases + totalSalaries + totalExpenses
  
  // Get overhaul expenses breakdown
  const { data: overhaulExpenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('project_type', 'vessel')
  const totalOverhaulExpenses = overhaulExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
  
  // ============================================
  // COUNTS AND LISTS
  // ============================================
  
  // Get vessels count and stats
  const { count: vesselsCount } = await supabase
    .from('vessels')
    .select('*', { count: 'exact', head: true })
  
  const { count: activeVesselsCount } = await supabase
    .from('vessels')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  
  // Get lands count
  const { count: landsCount } = await supabase
    .from('land_purchases')
    .select('*', { count: 'exact', head: true })
  
  // Get employees count
  const { count: employeesCount } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  
  // Get active rentals
  const { data: activeRentals, count: activeRentalsCount } = await supabase
    .from('vessel_rentals')
    .select('*, vessels(name)', { count: 'exact' })
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(5)
  
  // Get active overhaul projects
  const { data: activeOverhauls, count: activeOverhaulsCount } = await supabase
    .from('vessel_overhaul_projects')
    .select('*, vessels(name)', { count: 'exact' })
    .eq('status', 'in_progress')
    .order('start_date', { ascending: false })
    .limit(5)
  
  // Get marine inventory count
  const { count: inventoryCount } = await supabase
    .from('marine_inventory')
    .select('*', { count: 'exact', head: true })
    .gt('quantity_in_stock', 0)
  
  // Get low stock items
  const { data: lowStockItems } = await supabase
    .from('marine_inventory')
    .select('equipment_name, quantity_in_stock, minimum_stock_level')
    .not('minimum_stock_level', 'is', null)
    .order('quantity_in_stock', { ascending: true })
    .limit(10)
  
  // Filter low stock items where quantity < minimum
  const filteredLowStock = lowStockItems?.filter(item => 
    item.quantity_in_stock < (item.minimum_stock_level || 10)
  ).slice(0, 5) || []
  
  // Get recent vessels
  const { data: recentVessels } = await supabase
    .from('vessels')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  
  // Get recent lands
  const { data: recentLands } = await supabase
    .from('land_purchases')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  
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
    vesselsCount: vesselsCount || 0,
    activeVesselsCount: activeVesselsCount || 0,
    landsCount: landsCount || 0,
    employeesCount: employeesCount || 0,
    activeRentals: activeRentals || [],
    activeRentalsCount: activeRentalsCount || 0,
    activeOverhauls: activeOverhauls || [],
    activeOverhaulsCount: activeOverhaulsCount || 0,
    inventoryCount: inventoryCount || 0,
    lowStockItems: filteredLowStock,
    recentVessels: recentVessels || [],
    recentLands: recentLands || []
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  
  const netProfit = data.totalIncome - data.totalExpenses

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of OSS Group operations</p>
      </div>

      {/* Key Metrics - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="w-full">
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {data.totalIncome.toLocaleString()} AED
              </p>
              <div className="text-xs text-gray-500 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Rentals:</span>
                  <span className="font-medium">{data.totalRentalIncome.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Equipment Sales:</span>
                  <span className="font-medium">{data.totalEquipmentSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vessel Scrap:</span>
                  <span className="font-medium">{data.totalVesselScrap.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Land Scrap:</span>
                  <span className="font-medium">{data.totalLandScrap.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Warehouse:</span>
                  <span className="font-medium">{data.totalWarehouseSales.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="bg-green-100 rounded-full p-3 self-start">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="w-full">
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {data.totalExpenses.toLocaleString()} AED
              </p>
              <div className="text-xs text-gray-500 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Vessel Purchases:</span>
                  <span className="font-medium">{data.totalVesselPurchases.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Salaries:</span>
                  <span className="font-medium">{data.totalSalaries.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Overhauls:</span>
                  <span className="font-medium">{data.totalOverhaulExpenses.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="bg-red-100 rounded-full p-3 self-start">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Profit</p>
              <p className={`text-2xl font-bold mt-2 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netProfit.toLocaleString()} AED
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {netProfit >= 0 ? 'Profitable' : 'Loss'}
              </p>
            </div>
            <div className={`rounded-full p-3 ${netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <DollarSign className={`h-6 w-6 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Employees</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {data.employeesCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total workforce</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Operations Metrics - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/dashboard/marine/vessels" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vessels</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {data.vesselsCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {data.activeVesselsCount} active
              </p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Ship className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Link>

        <Link href="/dashboard/rentals" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Rentals</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">
                {data.activeRentalsCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">Currently rented</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <Anchor className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Link>

        <Link href="/dashboard/marine/overhauls" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overhaul Projects</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">
                {data.activeOverhaulsCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">In progress</p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <Wrench className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Link>

        <Link href="/dashboard/marine/inventory" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inventory Items</p>
              <p className="text-2xl font-bold text-teal-600 mt-2">
                {data.inventoryCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">In stock</p>
            </div>
            <div className="bg-teal-100 rounded-full p-3">
              <Package className="h-6 w-6 text-teal-600" />
            </div>
          </div>
        </Link>
      </div>

      {/* Company Assets Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">OSS Marine Services</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Ship className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm text-gray-600">Total Vessels</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{data.vesselsCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Anchor className="h-5 w-5 text-purple-600 mr-2" />
                <span className="text-sm text-gray-600">Active Rentals</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{data.activeRentalsCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Wrench className="h-5 w-5 text-orange-600 mr-2" />
                <span className="text-sm text-gray-600">Overhaul Projects</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{data.activeOverhaulsCount}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center">
                <Package className="h-5 w-5 text-teal-600 mr-2" />
                <span className="text-sm text-gray-600">Inventory Items</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{data.inventoryCount}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">OSS Scrap Services</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <LandPlot className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm text-gray-600">Total Lands</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{data.landsCount}</span>
            </div>
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-gray-500">Focus on land acquisitions and scrap metal operations</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Active Vessel Rentals</h2>
            <Link href="/dashboard/rentals" className="text-sm text-blue-600 hover:text-blue-700">
              View All
            </Link>
          </div>
          <div className="p-6">
            {data.activeRentals.length > 0 ? (
              <div className="space-y-4">
                {data.activeRentals.map((rental: any) => (
                  <div key={rental.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{rental.vessels?.name || 'Unknown Vessel'}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(rental.start_date).toLocaleDateString()} - {rental.end_date ? new Date(rental.end_date).toLocaleDateString() : 'Ongoing'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-green-600">
                        {rental.total_amount?.toLocaleString() || '0'} AED
                      </span>
                      <p className="text-xs text-gray-500">{rental.payment_status || 'N/A'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No active rentals</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Active Overhaul Projects</h2>
            <Link href="/dashboard/marine/overhauls" className="text-sm text-blue-600 hover:text-blue-700">
              View All
            </Link>
          </div>
          <div className="p-6">
            {data.activeOverhauls.length > 0 ? (
              <div className="space-y-4">
                {data.activeOverhauls.map((project: any) => (
                  <Link 
                    href={`/dashboard/marine/overhauls/${project.id}`}
                    key={project.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{project.project_name}</p>
                      <p className="text-xs text-gray-500">
                        {project.vessels?.name || 'Unknown Vessel'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 capitalize">
                        {project.status || 'in_progress'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No active overhaul projects</p>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts & Recent Vessels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h2>
            <Link href="/dashboard/marine/inventory" className="text-sm text-blue-600 hover:text-blue-700">
              View Inventory
            </Link>
          </div>
          <div className="p-6">
            {data.lowStockItems.length > 0 ? (
              <div className="space-y-3">
                {data.lowStockItems.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.equipment_name}</p>
                      <p className="text-xs text-gray-500">
                        Min: {item.minimum_stock_level || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-red-600">
                        {item.quantity_in_stock}
                      </span>
                      <p className="text-xs text-gray-500">in stock</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">All items sufficiently stocked</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Vessels</h2>
            <Link href="/dashboard/marine/vessels" className="text-sm text-blue-600 hover:text-blue-700">
              View All
            </Link>
          </div>
          <div className="p-6">
            {data.recentVessels.length > 0 ? (
              <div className="space-y-4">
                {data.recentVessels.map((vessel: any) => (
                  <Link
                    href={`/dashboard/marine/vessels/${vessel.id}`}
                    key={vessel.id}
                    className="flex items-center justify-between hover:bg-gray-50 p-2 rounded transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{vessel.name}</p>
                      <p className="text-xs text-gray-500">{vessel.status} • {vessel.vessel_type || 'N/A'}</p>
                    </div>
                    <span className="text-sm text-gray-600">
                      {vessel.purchase_price?.toLocaleString() || 'N/A'} AED
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No vessels yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Lands */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Recent Land Purchases</h2>
          <Link href="/dashboard/scrap/lands" className="text-sm text-blue-600 hover:text-blue-700">
            View All
          </Link>
        </div>
        <div className="p-6">
          {data.recentLands.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.recentLands.map((land: any) => (
                <div key={land.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{land.land_name}</p>
                      <p className="text-xs text-gray-500 mt-1">{land.location}</p>
                      <p className="text-xs text-gray-400 mt-1">{land.area_sqm} sqm</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      land.status === 'active' ? 'bg-green-100 text-green-700' : 
                      land.status === 'sold' ? 'bg-red-100 text-red-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {land.status}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-sm font-semibold text-gray-900">
                      {land.purchase_price?.toLocaleString() || 'N/A'} AED
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No land purchases yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
