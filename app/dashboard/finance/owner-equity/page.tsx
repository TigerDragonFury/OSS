// Owner Equity Ledger Page - Track contributions by each owner
import { createClient } from '@/lib/supabase/server'
import { DollarSign, Users, TrendingUp, Ship, Receipt, Wallet, ArrowRightLeft } from 'lucide-react'
import Link from 'next/link'

async function getOwnerEquityData() {
  const supabase = await createClient()
  
  const [
    ownersRes,
    accountStatementRes,
    vesselPurchasesRes,
    expensesRes,
    salariesRes,
    contributionsRes,
    withdrawalsRes,
    distributionsRes,
    transfersRes,
    informalContribsRes
  ] = await Promise.all([
    supabase.from('owners').select('*').eq('status', 'active').order('name'),
    supabase.from('owner_account_statement').select('*'),
    supabase.from('vessels').select('id, name, purchase_price, purchase_date, paid_by_owner_id, owners(name)').order('purchase_date', { ascending: false }),
    supabase.from('expenses').select('id, expense_type, amount, date, description, paid_by_owner_id, owners(name)').order('date', { ascending: false }).limit(50),
    supabase.from('salary_payments').select('id, payment_date, total_amount, paid_by_owner_id, owners(name), employees(full_name)').order('payment_date', { ascending: false }).limit(50),
    supabase.from('capital_contributions').select('*, owners(name)').order('contribution_date', { ascending: false }),
    supabase.from('capital_withdrawals').select('*, owners(name)').order('withdrawal_date', { ascending: false }),
    supabase.from('owner_distributions').select('*, owners(name)').order('distribution_date', { ascending: false }).limit(20),
    supabase.from('partner_transfers').select('*, from_owner:owners!partner_transfers_from_owner_id_fkey(name), to_owner:owners!partner_transfers_to_owner_id_fkey(name)').order('transfer_date', { ascending: false }).limit(20),
    supabase.from('informal_contributions').select('*, owners(name)').order('contribution_date', { ascending: false }).limit(20)
  ])
  
  return {
    owners: ownersRes.data || [],
    accountStatement: accountStatementRes.data || [],
    vesselPurchases: vesselPurchasesRes.data || [],
    expenses: expensesRes.data || [],
    salaries: salariesRes.data || [],
    contributions: contributionsRes.data || [],
    withdrawals: withdrawalsRes.data || [],
    distributions: distributionsRes.data || [],
    transfers: transfersRes.data || [],
    informalContributions: informalContribsRes.data || []
  }
}

export default async function OwnerEquityPage() {
  const data = await getOwnerEquityData()
  
  // Calculate total company investment (using equity_balance which excludes partner transfers)
  const totalInvestment = data.accountStatement.reduce((sum, owner) => sum + (owner.equity_balance || 0), 0)
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Owner Equity Ledger</h1>
          <p className="text-gray-600 mt-1">Track capital contributions and expenses by owner</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/finance/partner-transactions"
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Partner Transactions
          </Link>
          <Link
            href="/dashboard/finance/owner-equity/manage"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Wallet className="h-4 w-4" />
            Manage Owners
          </Link>
        </div>
      </div>
      
      {/* Owner Equity Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.accountStatement.map((owner) => (
          <div key={owner.owner_id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{owner.owner_name}</h3>
                <p className="text-sm text-gray-600">{owner.ownership_percentage}% ownership</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Money In</span>
                <span className="font-bold text-green-600">${owner.total_money_in?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Money Out</span>
                <span className="font-medium text-red-600">${owner.total_money_out?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Partner Transfers</span>
                <span className={`font-medium ${(owner.net_partner_transfers || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(owner.net_partner_transfers || 0) >= 0 ? '+' : ''}{owner.net_partner_transfers?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 bg-blue-50 rounded px-2">
                <span className="text-sm font-medium text-gray-900">Equity Position</span>
                <span className="font-bold text-blue-600">${owner.equity_balance?.toLocaleString() || '0'}</span>
              </div>
            </div>
            
            {/* Breakdown */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium text-gray-500 mb-2">Money In Breakdown</p>
              <div className="space-y-1 text-xs">
                {owner.initial_capital > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Initial Capital</span>
                    <span className="font-medium">${owner.initial_capital?.toLocaleString()}</span>
                  </div>
                )}
                {owner.formal_contributions > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Formal Contributions</span>
                    <span className="font-medium">${owner.formal_contributions?.toLocaleString()}</span>
                  </div>
                )}
                {owner.informal_contributions > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Informal Contributions</span>
                    <span className="font-medium">${owner.informal_contributions?.toLocaleString()}</span>
                  </div>
                )}
                {owner.expenses_paid > 0 && (
                  <div className="flex justify-between pl-4">
                    <span className="text-gray-500">• Expense Payments</span>
                    <span className="text-gray-500">${owner.expenses_paid?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Direct Payments</span>
                  <span className="font-medium">${owner.direct_payments?.toLocaleString()}</span>
                </div>
                <div className="pl-4 space-y-1 text-xs text-gray-500">
                  {owner.payment_splits_total > 0 && (
                    <div className="flex justify-between">
                      <span>• Payment Splits</span>
                      <span>${owner.payment_splits_total?.toLocaleString()}</span>
                    </div>
                  )}
                  {owner.vessels_paid > 0 && (
                    <div className="flex justify-between">
                      <span>• Vessels (legacy)</span>
                      <span>${owner.vessels_paid?.toLocaleString()}</span>
                    </div>
                  )}
                  {owner.lands_paid > 0 && (
                    <div className="flex justify-between">
                      <span>• Lands (legacy)</span>
                      <span>${owner.lands_paid?.toLocaleString()}</span>
                    </div>
                  )}
                  {owner.salaries_paid > 0 && (
                    <div className="flex justify-between">
                      <span>• Salaries (legacy)</span>
                      <span>${owner.salaries_paid?.toLocaleString()}</span>
                    </div>
                  )}
                  {owner.movements_paid > 0 && (
                    <div className="flex justify-between">
                      <span>• Movements (legacy)</span>
                      <span>${owner.movements_paid?.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-xs font-medium text-gray-500 mb-2 mt-3">Money Out Breakdown</p>
              <div className="space-y-1 text-xs">
                {owner.formal_withdrawals > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Formal Withdrawals</span>
                    <span className="font-medium">${owner.formal_withdrawals?.toLocaleString()}</span>
                  </div>
                )}
                {owner.distributions_taken > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Distributions Taken</span>
                    <span className="font-medium">${owner.distributions_taken?.toLocaleString()}</span>
                  </div>
                )}
                {!owner.formal_withdrawals && !owner.distributions_taken && (
                  <div className="text-xs text-gray-400 italic">No withdrawals or distributions</div>
                )}
              </div>
              
              {(owner.transfers_received > 0 || owner.transfers_given > 0) && (
                <>
                  <p className="text-xs font-medium text-gray-500 mb-2 mt-3">Partner Transfers Breakdown</p>
                  <div className="space-y-1 text-xs">
                    {owner.transfers_received > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Received from partner</span>
                        <span className="font-medium text-green-600">+${owner.transfers_received?.toLocaleString()}</span>
                      </div>
                    )}
                    {owner.transfers_given > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Given to partner</span>
                        <span className="font-medium text-red-600">-${owner.transfers_given?.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
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
      {data.accountStatement.length === 2 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-900">Equity Balance Status</h4>
              <p className="text-sm text-yellow-700 mt-1">
                {Math.abs((data.accountStatement[0]?.equity_balance || 0) - (data.accountStatement[1]?.equity_balance || 0)) < 1000 
                  ? 'Partners are balanced - contributions are approximately equal.' 
                  : `Difference: $${Math.abs((data.accountStatement[0]?.equity_balance || 0) - (data.accountStatement[1]?.equity_balance || 0)).toLocaleString()} - ${(data.accountStatement[0]?.equity_balance || 0) > (data.accountStatement[1]?.equity_balance || 0) ? data.accountStatement[0]?.owner_name : data.accountStatement[1]?.owner_name} is ahead. Consider balancing or recording transfers.`}
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
                        {(vessel.owners as any)?.name || 'Unassigned'}
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
                        {(expense.owners as any)?.name || 'Unassigned'}
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
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{(contrib.owners as any)?.name}</td>
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
        
        {/* Distributions Taken (Recent 20) */}
        {data.distributions.length > 0 && (
          <div className="p-6 border-t">
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-600" />
              Distributions Taken (Last 20)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.distributions.map((dist) => (
                    <tr key={dist.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{(dist.owners as any)?.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {dist.distribution_date ? new Date(dist.distribution_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{dist.source_type?.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600">
                        -${dist.amount?.toLocaleString() || '0'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{dist.description || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Partner Transfers (Recent 20) */}
        {data.transfers.length > 0 && (
          <div className="p-6 border-t">
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
              Partner Transfers (Last 20)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.transfers.map((transfer) => (
                    <tr key={transfer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {transfer.transfer_date ? new Date(transfer.transfer_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600">{(transfer.from_owner as any)?.name}</td>
                      <td className="px-4 py-3 text-sm font-medium text-green-600">{(transfer.to_owner as any)?.name}</td>
                      <td className="px-4 py-3 text-sm font-medium text-blue-600">
                        ${transfer.amount?.toLocaleString() || '0'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{transfer.reason || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Informal Contributions (Recent 20) */}
        {data.informalContributions.length > 0 && (
          <div className="p-6 border-t">
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-purple-600" />
              Informal Contributions (Last 20)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.informalContributions.map((contrib) => (
                    <tr key={contrib.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{(contrib.owners as any)?.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {contrib.contribution_date ? new Date(contrib.contribution_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{contrib.transaction_type?.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-sm font-medium text-green-600">
                        +${contrib.amount?.toLocaleString() || '0'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{contrib.source_of_funds?.replace('_', ' ') || 'N/A'}</td>
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
