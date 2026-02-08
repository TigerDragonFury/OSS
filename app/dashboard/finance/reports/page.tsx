import { createClient } from '@/lib/supabase/server'
import { DollarSign, TrendingUp, TrendingDown, Ship, LandPlot } from 'lucide-react'

async function getReportsData() {
  const supabase = await createClient()
  
  // Get profit/loss summary
  const { data: profitLoss } = await supabase
    .from('profit_loss_summary')
    .select('*')
  
  // Get vessel financial summary
  const { data: vesselFinancials } = await supabase
    .from('vessel_financial_summary')
    .select('*')
  
  // Get land financial summary
  const { data: landFinancials } = await supabase
    .from('land_financial_summary')
    .select('*')
  
  // Get recent expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('status', 'paid')
    .order('date', { ascending: false })
    .limit(10)
  
  // Get recent invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('status', 'paid')
    .order('date', { ascending: false })
    .limit(10)
  
  return {
    profitLoss: profitLoss || [],
    vesselFinancials: vesselFinancials || [],
    landFinancials: landFinancials || [],
    expenses: expenses || [],
    invoices: invoices || []
  }
}

export default async function ReportsPage() {
  const data = await getReportsData()
  
  const totalIncome = data.profitLoss.reduce((sum, company) => sum + (company.total_income || 0), 0)
  const totalExpenses = data.profitLoss.reduce((sum, company) => sum + (company.total_expenses || 0), 0)
  const netProfit = totalIncome - totalExpenses

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
        <p className="text-gray-600 mt-1">Comprehensive financial analysis and summaries</p>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {totalIncome.toLocaleString()} AED
              </p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {totalExpenses.toLocaleString()} AED
              </p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Profit/Loss</p>
              <p className={`text-3xl font-bold mt-2 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()} AED
              </p>
            </div>
            <div className={`rounded-full p-3 ${netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <DollarSign className={`h-8 w-8 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Company Breakdown */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Company Breakdown</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {data.profitLoss.map((company) => (
              <div key={company.company_id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">{company.company_name}</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Income</p>
                    <p className="text-lg font-semibold text-green-600">
                      {company.total_income?.toLocaleString() || 0} AED
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Expenses</p>
                    <p className="text-lg font-semibold text-red-600">
                      {company.total_expenses?.toLocaleString() || 0} AED
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Net Profit</p>
                    <p className={`text-lg font-bold ${company.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {company.net_profit >= 0 ? '+' : ''}{company.net_profit?.toLocaleString() || 0} AED
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vessel Performance */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Ship className="h-5 w-5 mr-2" />
            Vessel Performance
          </h2>
        </div>
        <div className="p-6">
          {data.vesselFinancials.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vessel</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Costs</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net P/L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.vesselFinancials.map((vessel) => (
                    <tr key={vessel.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{vessel.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {vessel.purchase_price?.toLocaleString() || 0} AED
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        +{((vessel.equipment_sales || 0) + (vessel.scrap_sales || 0)).toLocaleString()} AED
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-600">
                        -{((vessel.purchase_price || 0) + (vessel.movement_costs || 0) + 
                          (vessel.drydock_costs || 0) + (vessel.overhaul_costs || 0) + 
                          (vessel.other_expenses || 0)).toLocaleString()} AED
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-bold ${vessel.net_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {vessel.net_profit_loss >= 0 ? '+' : ''}{vessel.net_profit_loss?.toLocaleString() || 0} AED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No vessel data available</p>
          )}
        </div>
      </div>

      {/* Land Performance */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <LandPlot className="h-5 w-5 mr-2" />
            Land Performance
          </h2>
        </div>
        <div className="p-6">
          {data.landFinancials.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Land</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expenses</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net P/L</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.landFinancials.map((land) => (
                    <tr key={land.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{land.land_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {land.purchase_price?.toLocaleString() || 0} AED
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        +{((land.equipment_sales || 0) + (land.scrap_sales || 0)).toLocaleString()} AED
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-600">
                        -{(land.expenses || 0).toLocaleString()} AED
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-bold ${land.net_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {land.net_profit_loss >= 0 ? '+' : ''}{land.net_profit_loss?.toLocaleString() || 0} AED
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {land.remaining_tonnage?.toLocaleString() || 0} tons
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No land data available</p>
          )}
        </div>
      </div>
    </div>
  )
}
