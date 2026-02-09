'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { use } from 'react'
import { DollarSign, TrendingUp, TrendingDown, Receipt, Wrench, Package, Ship, Users } from 'lucide-react'

export default function FinancialOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const supabase = createClient()

  // Vessel Data
  const { data: vessel } = useQuery({
    queryKey: ['vessel', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessels')
        .select('*')
        .eq('id', resolvedParams.id)
        .single()
      if (error) throw error
      return data
    }
  })

  // Financial Summary from View
  const { data: financialSummary } = useQuery({
    queryKey: ['vessel_financial_summary', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_financial_summary')
        .select('*')
        .eq('vessel_id', resolvedParams.id)
        .single()
      if (error) {
        console.error('Financial summary error:', error)
        return {
          total_equipment_sales: 0,
          total_scrap_sales: 0,
          total_rental_income: 0,
          total_expenses: 0,
          total_overhaul_expenses: 0,
          net_profit_loss: 0
        }
      }
      return data
    }
  })

  // All Expenses
  const { data: allExpenses } = useQuery({
    queryKey: ['vessel_all_expenses', resolvedParams.id],
    queryFn: async () => {
      // Get direct vessel expenses
      const { data: vesselExpenses, error: vesselError } = await supabase
        .from('expenses')
        .select('*')
        .eq('project_id', resolvedParams.id)
        .eq('project_type', 'vessel')
        .order('date', { ascending: false })
      
      // Get alle overhaul project IDs for this vessel
      const { data: projects } = await supabase
        .from('vessel_overhaul_projects')
        .select('id, project_name')
        .eq('vessel_id', resolvedParams.id)
      
      let overhaulExpenses: any[] = []
      if (projects && projects.length > 0) {
        const projectIds = projects.map(p => p.id)
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .in('project_id', projectIds)
          .order('date', { ascending: false })
        
        if (!error && data) {
          overhaulExpenses = data.map((exp: any) => ({
            ...exp,
            project_context: projects.find(p => p.id === exp.project_id)?.project_name || 'Unknown Project'
          }))
        }
      }
      
      return {
        vessel: vesselExpenses || [],
        overhaul: overhaulExpenses,
        all: [...(vesselExpenses || []), ...overhaulExpenses]
      }
    }
  })

  // Movements
  const { data: movements } = useQuery({
    queryKey: ['vessel_movements', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_movements')
        .select('*')
        .eq('vessel_id', resolvedParams.id)
        .order('movement_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  // Calculate totals
  const purchasePrice = vessel?.purchase_price || 0
  const equipmentRevenue = financialSummary?.total_equipment_sales || 0
  const scrapRevenue = financialSummary?.total_scrap_sales || 0
  const rentalIncome = financialSummary?.total_rental_income || 0
  const totalRevenue = equipmentRevenue + scrapRevenue + rentalIncome
  
  const vesselExpensesTotal = allExpenses?.vessel?.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0) || 0
  const overhaulExpensesTotal = allExpenses?.overhaul?.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0) || 0
  const movementCosts = movements?.reduce((sum, mov) => sum + (mov.cost || 0), 0) || 0
  const totalOperationalExpenses = vesselExpensesTotal + overhaulExpensesTotal + movementCosts
  
  const totalCosts = purchasePrice + totalOperationalExpenses
  const netProfitLoss = totalRevenue - totalCosts
  const roi = purchasePrice > 0 ? ((netProfitLoss / purchasePrice) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Overview</h1>
        <p className="text-gray-600">Complete financial breakdown for {vessel?.name}</p>
      </div>

      {/* Top-Level Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <Ship className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Purchase Price</p>
              <p className="text-2xl font-bold text-gray-900">{purchasePrice.toLocaleString()} AED</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">{totalRevenue.toLocaleString()} AED</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <TrendingDown className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-sm text-gray-600">Total Costs</p>
              <p className="text-2xl font-bold text-red-600">{totalCosts.toLocaleString()} AED</p>
            </div>
          </div>
        </div>

        <div className={`rounded-lg shadow p-6 ${netProfitLoss >= 0 ? 'bg-emerald-50' : 'bg-red-100'}`}>
          <div className="flex items-center gap-3">
            <DollarSign className={`h-8 w-8 ${netProfitLoss >= 0 ? 'text-emerald-600' : 'text-red-700'}`} />
            <div>
              <p className={`text-sm font-medium ${netProfitLoss >= 0 ? 'text-gray-600' : 'text-red-900'}`}>Net Profit/Loss</p>
              <p className={`text-2xl font-bold ${netProfitLoss >= 0 ? 'text-emerald-600' : 'text-red-700'}`}>
                {netProfitLoss >= 0 ? '+' : ''}{netProfitLoss.toLocaleString()} AED
              </p>
              <p className="text-xs text-gray-500 mt-1">ROI: {roi.toFixed(2)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Revenue Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-gray-700">Equipment Sales</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{equipmentRevenue.toLocaleString()} AED</p>
            <p className="text-xs text-gray-500 mt-1">{((equipmentRevenue / (totalRevenue || 1)) * 100).toFixed(1)}% of total revenue</p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-gray-700">Scrap Sales</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{scrapRevenue.toLocaleString()} AED</p>
            <p className="text-xs text-gray-500 mt-1">{((scrapRevenue / (totalRevenue || 1)) * 100).toFixed(1)}% of total revenue</p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Ship className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-gray-700">Rental Income</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{rentalIncome.toLocaleString()} AED</p>
            <p className="text-xs text-gray-500 mt-1">{((rentalIncome / (totalRevenue || 1)) * 100).toFixed(1)}% of total revenue</p>
          </div>
        </div>
      </div>

      {/* Costs Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-red-600" />
          Costs & Expenses Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Ship className="h-5 w-5 text-gray-600" />
              <p className="text-sm font-medium text-gray-700">Purchase Price</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{purchasePrice.toLocaleString()} AED</p>
            <p className="text-xs text-gray-500 mt-1">{((purchasePrice / (totalCosts || 1)) * 100).toFixed(1)}% of total costs</p>
          </div>

          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="h-5 w-5 text-red-600" />
              <p className="text-sm font-medium text-gray-700">Vessel Expenses</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{vesselExpensesTotal.toLocaleString()} AED</p>
            <p className="text-xs text-gray-500 mt-1">{allExpenses?.vessel?.length || 0} transactions</p>
          </div>

          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="h-5 w-5 text-red-600" />
              <p className="text-sm font-medium text-gray-700">Overhaul Costs</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{overhaulExpensesTotal.toLocaleString()} AED</p>
            <p className="text-xs text-gray-500 mt-1">{allExpenses?.overhaul?.length || 0} transactions</p>
          </div>

          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <Ship className="h-5 w-5 text-red-600" />
              <p className="text-sm font-medium text-gray-700">Movement Costs</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{movementCosts.toLocaleString()} AED</p>
            <p className="text-xs text-gray-500 mt-1">{movements?.length || 0} movements</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-red-100 rounded-lg border border-red-300">
          <div className="flex justify-between items-center">
            <p className="font-semibold text-red-900">Total Operational Expenses:</p>
            <p className="text-xl font-bold text-red-900">{totalOperationalExpenses.toLocaleString()} AED</p>
          </div>
        </div>
      </div>

      {/* Vessel Expenses Detail */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Vessel Expenses (Direct)</h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allExpenses?.vessel?.map((expense: any) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{expense.description}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{expense.vendor || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-red-600">
                        {expense.amount?.toLocaleString()} AED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!allExpenses?.vessel || allExpenses.vessel.length === 0) && (
              <div className="text-center py-12 text-gray-500">
                No direct vessel expenses recorded
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overhaul Expenses Detail */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Overhaul Project Expenses</h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allExpenses?.overhaul?.map((expense: any) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {expense.project_context || 'Unknown Project'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{expense.description}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{expense.vendor || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-red-600">
                        {expense.amount?.toLocaleString()} AED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!allExpenses?.overhaul || allExpenses.overhaul.length === 0) && (
              <div className="text-center py-12 text-gray-500">
                No overhaul expenses recorded
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Vessel Movements</h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Movement Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movements?.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(movement.movement_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{movement.from_location || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{movement.to_location || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{movement.purpose || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-red-600">
                        {movement.cost ? `${movement.cost.toLocaleString()} AED` : 'No cost'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!movements || movements.length === 0) && (
              <div className="text-center py-12 text-gray-500">
                No movements recorded
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
