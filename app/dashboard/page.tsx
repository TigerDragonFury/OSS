import { createClient } from '@/lib/supabase/server'
import { DollarSign, Ship, LandPlot, Users, TrendingUp, TrendingDown } from 'lucide-react'

async function getDashboardData() {
  const supabase = await createClient()
  
  // Get profit/loss summary
  const { data: profitLoss } = await supabase
    .from('profit_loss_summary')
    .select('*')
  
  // Get vessels count
  const { count: vesselsCount } = await supabase
    .from('vessels')
    .select('*', { count: 'exact', head: true })
  
  // Get lands count
  const { count: landsCount } = await supabase
    .from('land_purchases')
    .select('*', { count: 'exact', head: true })
  
  // Get employees count
  const { count: employeesCount } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  
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
    profitLoss: profitLoss || [],
    vesselsCount: vesselsCount || 0,
    landsCount: landsCount || 0,
    employeesCount: employeesCount || 0,
    recentVessels: recentVessels || [],
    recentLands: recentLands || []
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  
  const totalIncome = data.profitLoss.reduce((sum, company) => sum + (company.total_income || 0), 0)
  const totalExpenses = data.profitLoss.reduce((sum, company) => sum + (company.total_expenses || 0), 0)
  const netProfit = totalIncome - totalExpenses

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of OSS Group operations</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {totalIncome.toLocaleString()} AED
              </p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {totalExpenses.toLocaleString()} AED
              </p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
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
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Company Breakdown */}
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
            {data.profitLoss.find(c => c.company_name === 'OSS Marine Services') && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Income</span>
                  <span className="text-lg font-semibold text-green-600">
                    {(data.profitLoss.find(c => c.company_name === 'OSS Marine Services')?.total_income || 0).toLocaleString()} AED
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Expenses</span>
                  <span className="text-lg font-semibold text-red-600">
                    {(data.profitLoss.find(c => c.company_name === 'OSS Marine Services')?.total_expenses || 0).toLocaleString()} AED
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium text-gray-900">Net Profit</span>
                  <span className={`text-lg font-bold ${(data.profitLoss.find(c => c.company_name === 'OSS Marine Services')?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(data.profitLoss.find(c => c.company_name === 'OSS Marine Services')?.net_profit || 0).toLocaleString()} AED
                  </span>
                </div>
              </>
            )}
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
            {data.profitLoss.find(c => c.company_name === 'OSS Scrap Services') && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Income</span>
                  <span className="text-lg font-semibold text-green-600">
                    {(data.profitLoss.find(c => c.company_name === 'OSS Scrap Services')?.total_income || 0).toLocaleString()} AED
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Expenses</span>
                  <span className="text-lg font-semibold text-red-600">
                    {(data.profitLoss.find(c => c.company_name === 'OSS Scrap Services')?.total_expenses || 0).toLocaleString()} AED
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium text-gray-900">Net Profit</span>
                  <span className={`text-lg font-bold ${(data.profitLoss.find(c => c.company_name === 'OSS Scrap Services')?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(data.profitLoss.find(c => c.company_name === 'OSS Scrap Services')?.net_profit || 0).toLocaleString()} AED
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Vessels</h2>
          </div>
          <div className="p-6">
            {data.recentVessels.length > 0 ? (
              <div className="space-y-4">
                {data.recentVessels.map((vessel) => (
                  <div key={vessel.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{vessel.name}</p>
                      <p className="text-xs text-gray-500">{vessel.status}</p>
                    </div>
                    <span className="text-sm text-gray-600">
                      {vessel.purchase_price?.toLocaleString() || 'N/A'} AED
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No vessels yet</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Land Purchases</h2>
          </div>
          <div className="p-6">
            {data.recentLands.length > 0 ? (
              <div className="space-y-4">
                {data.recentLands.map((land) => (
                  <div key={land.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{land.land_name}</p>
                      <p className="text-xs text-gray-500">{land.status}</p>
                    </div>
                    <span className="text-sm text-gray-600">
                      {land.purchase_price?.toLocaleString() || 'N/A'} AED
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No land purchases yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
