// Owner Equity Ledger Page - Track contributions by each owner
import { createClient } from '@/lib/supabase/server'
import { DollarSign, Users, TrendingUp, Ship, Receipt, Wallet } from 'lucide-react'
import Link from 'next/link'

async function getOwnerEquityData() {
  const supabase = await createClient()
  
  const [
    ownersRes,
    equitySummaryRes,
    vesselPurchasesRes,
    expensesRes,
    salariesRes,
    contributionsRes,
    withdrawalsRes
  ] = await Promise.all([
    supabase.from('owners').select('*').eq('status', 'active').order('name'),
    supabase.from('owner_equity_summary').select('*'),
    supabase.from('vessels').select('id, name, purchase_price, purchase_date, paid_by_owner_id, owners(name)').order('purchase_date', { ascending: false }),
    supabase.from('expenses').select('id, expense_type, amount, date, description, paid_by_owner_id, owners(name)').order('date', { ascending: false }).limit(50),
    supabase.from('salary_payments').select('id, payment_date, total_amount, paid_by_owner_id, owners(name), employees(name)').order('payment_date', { ascending: false }).limit(50),
    supabase.from('capital_contributions').select('*, owners(name)').order('contribution_date', { ascending: false }),
    supabase.from('capital_withdrawals').select('*, owners(name)').order('withdrawal_date', { ascending: false })
  ])
  
  return {
    owners: ownersRes.data || [],
    equitySummary: equitySummaryRes.data || [],
    vesselPurchases: vesselPurchasesRes.data || [],
    expenses: expensesRes.data || [],
    salaries: salariesRes.data || [],
    contributions: contributionsRes.data || [],
    withdrawals: withdrawalsRes.data || []
  }
}

export default async function OwnerEquityPage() {
  const data = await getOwnerEquityData()
  
  // Calculate total company investment
  const totalInvestment = data.equitySummary.reduce((sum, owner) => sum + (owner.total_invested || 0), 0)
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Owner Equity Ledger</h1>
          <p className="text-gray-600 mt-1">Track capital contributions and expenses by owner</p>
        </div>
        <Link
          href="/dashboard/finance/owner-equity/manage"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Wallet className="h-4 w-4" />
          Manage Owners
        </Link>
      </div>
      
      {/* Owner Equity Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.equitySummary.map((owner) => (
          <div key={owner.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{owner.name}</h3>
                <p className="text-sm text-gray-600">{owner.ownership_percentage}% ownership</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Total Invested</span>
                <span className="font-bold text-green-600">${owner.total_invested?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Withdrawals</span>
                <span className="font-medium text-red-600">${owner.net_withdrawals?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between items-center py-2 bg-blue-50 rounded px-2">
                <span className="text-sm font-medium text-gray-900">Current Equity</span>
                <span className="font-bold text-blue-600">${owner.current_equity?.toLocaleString() || '0'}</span>
              </div>
            </div>
            
            {/* Breakdown */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium text-gray-500 mb-2">Investment Breakdown</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Vessel Purchases</span>
                  <span className="font-medium">${owner.vessel_purchases_paid?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Operating Expenses</span>
                  <span className="font-medium">${owner.expenses_paid?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Salaries</span>
                  <span className="font-medium">${owner.salaries_paid?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Capital Contributions</span>
                  <span className="font-medium">${owner.total_contributions?.toLocaleString() || '0'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Total Company Investment Summary */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Total Investment</h3>
              <p className="text-sm text-blue-100">All owners combined</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
          <p className="text-3xl font-bold">${totalInvestment.toLocaleString()}</p>
          <div className="mt-4 pt-4 border-t border-blue-500">
            <p className="text-sm text-blue-100">
              Fair split: ${(totalInvestment / data.owners.length).toLocaleString()} per owner
            </p>
          </div>
        </div>
      </div>
      
      {/* Equity Balance Alert */}
      {data.equitySummary.length === 2 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-900">Equity Balance Status</h4>
              <p className="text-sm text-yellow-700 mt-1">
                {Math.abs((data.equitySummary[0]?.current_equity || 0) - (data.equitySummary[1]?.current_equity || 0)) < 1000 
                  ? 'Owners are balanced - contributions are approximately equal.' 
                  : `Difference: $${Math.abs((data.equitySummary[0]?.current_equity || 0) - (data.equitySummary[1]?.current_equity || 0)).toLocaleString()} - Consider balancing contributions.`}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Recent Transactions Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        
        {/* Vessel Purchases */}
        <div className="p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Ship className="h-5 w-5 text-blue-600" />
            Vessel Purchases
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vessel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid By</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.vesselPurchases.map((vessel) => (
                  <tr key={vessel.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/marine/vessels/${vessel.id}`} className="text-blue-600 hover:underline">
                        {vessel.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {vessel.purchase_date ? new Date(vessel.purchase_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ${vessel.purchase_price?.toLocaleString() || '0'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        vessel.paid_by_owner_id ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {vessel.owners?.name || 'Unassigned'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Expenses */}
        <div className="p-6 border-t">
          <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-purple-600" />
            Operating Expenses (Last 50)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid By</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{expense.expense_type || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{expense.description?.substring(0, 50) || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {expense.date ? new Date(expense.date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ${expense.amount?.toLocaleString() || '0'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        expense.paid_by_owner_id ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {expense.owners?.name || 'Unassigned'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Capital Contributions */}
        {data.contributions.length > 0 && (
          <div className="p-6 border-t">
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Capital Contributions
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.contributions.map((contrib) => (
                    <tr key={contrib.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{contrib.owners?.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {contrib.contribution_date ? new Date(contrib.contribution_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{contrib.contribution_type}</td>
                      <td className="px-4 py-3 text-sm font-medium text-green-600">
                        +${contrib.amount?.toLocaleString() || '0'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{contrib.description || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
