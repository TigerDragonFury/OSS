import { createClient } from '@/lib/supabase/server'
import { DollarSign, Ship, LandPlot, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'

async function getReportsData() {
  const supabase = await createClient()
  const today = new Date()
  const last30Days = new Date(today)
  last30Days.setDate(today.getDate() - 30)
  const startDate = last30Days.toISOString().split('T')[0]
  
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

  // Cashflow (last 30 days)
  const { data: cashIn } = await supabase
    .from('income_records')
    .select('id, income_date, amount, description, source_type')
    .gte('income_date', startDate)
    .order('income_date', { ascending: false })

  const { data: cashOut } = await supabase
    .from('expenses')
    .select('id, date, amount, description, expense_type, category')
    .eq('status', 'paid')
    .gte('date', startDate)
    .order('date', { ascending: false })

  // All-time cash in/out totals
  const { data: cashInAll } = await supabase
    .from('income_records')
    .select('amount')

  const { data: cashOutAll } = await supabase
    .from('expenses')
    .select('amount')
    .eq('status', 'paid')
  
  return {
    vesselFinancials: vesselFinancials || [],
    landFinancials: landFinancials || [],
    expenses: expenses || [],
    invoices: invoices || [],
    cashIn: cashIn || [],
    cashOut: cashOut || [],
    cashInAll: cashInAll || [],
    cashOutAll: cashOutAll || [],
    cashStartDate: startDate
  }
}

export default async function ReportsPage() {
  const data = await getReportsData()
  
  const totalIncome = data.cashInAll.reduce((sum, entry) => sum + (entry.amount || 0), 0)
  const totalExpenses = data.cashOutAll.reduce((sum, entry) => sum + (entry.amount || 0), 0)
  const netProfit = totalIncome - totalExpenses
  const cashInTotal = data.cashIn.reduce((sum, entry) => sum + (entry.amount || 0), 0)
  const cashOutTotal = data.cashOut.reduce((sum, entry) => sum + (entry.amount || 0), 0)
  const cashNet = cashInTotal - cashOutTotal
  const cashflowEvents = [
    ...data.cashIn.map((entry) => ({
      id: entry.id,
      date: entry.income_date,
      amount: entry.amount || 0,
      description: entry.description || entry.source_type || 'Income',
      direction: 'in'
    })),
    ...data.cashOut.map((entry) => ({
      id: entry.id,
      date: entry.date,
      amount: entry.amount || 0,
      description: entry.description || entry.expense_type || entry.category || 'Expense',
      direction: 'out'
    }))
  ].sort((a, b) => (a.date || '').localeCompare(b.date || '')).reverse()

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
              <p className="text-sm font-medium text-gray-600">All-Time Cash In</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {totalIncome.toLocaleString()} AED
              </p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <ArrowDownCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">All-Time Cash Out</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {totalExpenses.toLocaleString()} AED
              </p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <ArrowUpCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">All-Time Net Profit</p>
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

      {/* Cashflow Summary */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Cashflow (Last 30 Days)</h2>
          <p className="text-sm text-gray-600 mt-1">From {data.cashStartDate} to today</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Cash In</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">{cashInTotal.toLocaleString()} AED</p>
                </div>
                <ArrowDownCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Cash Out</p>
                  <p className="text-2xl font-bold text-red-700 mt-1">{cashOutTotal.toLocaleString()} AED</p>
                </div>
                <ArrowUpCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Net Cash</p>
                  <p className={`text-2xl font-bold mt-1 ${cashNet >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {cashNet >= 0 ? '+' : ''}{cashNet.toLocaleString()} AED
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-gray-600" />
              </div>
            </div>
          </div>

          {cashflowEvents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No cashflow activity in the last 30 days</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cashflowEvents.slice(0, 20).map((entry) => (
                    <tr key={`${entry.direction}-${entry.id}`}>
                      <td className="px-4 py-3 text-sm text-gray-700">{entry.date || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{entry.description}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          entry.direction === 'in'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {entry.direction === 'in' ? 'Cash In' : 'Cash Out'}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-semibold ${
                        entry.direction === 'in' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {entry.direction === 'in' ? '+' : '-'}{entry.amount.toLocaleString()} AED
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                        +{((vessel.total_equipment_sales || 0) + (vessel.total_scrap_sales || 0) + (vessel.total_rental_income || 0)).toLocaleString()} AED
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-600">
                        -{((vessel.purchase_price || 0) + (vessel.total_expenses || 0) + 
                          (vessel.total_overhaul_expenses || 0)).toLocaleString()} AED
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-bold ${(((vessel.total_equipment_sales || 0) + (vessel.total_scrap_sales || 0) + (vessel.total_rental_income || 0)) - ((vessel.purchase_price || 0) + (vessel.total_expenses || 0) + (vessel.total_overhaul_expenses || 0))) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(((vessel.total_equipment_sales || 0) + (vessel.total_scrap_sales || 0) + (vessel.total_rental_income || 0)) - ((vessel.purchase_price || 0) + (vessel.total_expenses || 0) + (vessel.total_overhaul_expenses || 0))) >= 0 ? '+' : ''}{(((vessel.total_equipment_sales || 0) + (vessel.total_scrap_sales || 0) + (vessel.total_rental_income || 0)) - ((vessel.purchase_price || 0) + (vessel.total_expenses || 0) + (vessel.total_overhaul_expenses || 0))).toLocaleString()} AED
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
                        +{((land.total_equipment_sales || 0) + (land.total_scrap_sales || 0)).toLocaleString()} AED
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-600">
                        -{(land.total_expenses || 0).toLocaleString()} AED
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-bold ${land.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {land.net_profit >= 0 ? '+' : ''}{land.net_profit?.toLocaleString() || 0} AED
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
