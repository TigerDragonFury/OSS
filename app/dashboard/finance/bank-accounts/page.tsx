'use client'

import { useEffect, useState } from 'react'
import { DollarSign, CreditCard, TrendingUp, TrendingDown, AlertCircle, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { hasModulePermission } from '@/lib/auth/rolePermissions'

interface BankAccount {
  account_id: string
  account_name: string
  bank_name: string
  account_number: string
  currency: string
  opening_balance: number
  opening_date: string
  status: string
  total_income: number
  total_expenses: number
  total_withdrawals: number
  total_transfers_in: number
  calculated_balance: number
  latest_manual_balance: number | null
  last_reconciled_date: string | null
  variance: number
}

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [showReconcile, setShowReconcile] = useState<string | null>(null)
  const [showWithdrawal, setShowWithdrawal] = useState(false)
  const [newBalance, setNewBalance] = useState('')
  const { user } = useAuth()
  
  // Get user role and permissions
  const userRole = user?.role || user?.roles?.[0] || 'storekeeper'
  const canCreate = hasModulePermission(userRole, ['finance', 'bank_accounts'], 'create')
  const canEdit = hasModulePermission(userRole, ['finance', 'bank_accounts'], 'edit')
  
  const [withdrawalForm, setWithdrawalForm] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    withdrawal_type: 'transfer',
  })

  const supabase = createClient()

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_account_reconciliation')
        .select('*')
        .eq('status', 'active')
        .order('account_name')

      if (error) throw error
      setAccounts(data || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      const { error } = await supabase.from('bank_accounts').insert([
        {
          account_name: formData.get('account_name'),
          bank_name: formData.get('bank_name'),
          account_number: formData.get('account_number'),
          account_type: formData.get('account_type'),
          opening_balance: parseFloat(formData.get('opening_balance') as string) || 0,
          opening_date: formData.get('opening_date'),
        }
      ])

      if (error) throw error
      
      setShowNewAccount(false)
      fetchAccounts()
      ;(e.target as HTMLFormElement).reset()
    } catch (error) {
      console.error('Error adding account:', error)
      alert('Failed to add account')
    }
  }

  const handleReconcile = async (accountId: string) => {
    if (!newBalance) {
      alert('Please enter the manual balance')
      return
    }

    try {
      const { error } = await supabase.from('bank_balance_records').insert([
        {
          bank_account_id: accountId,
          recorded_date: new Date().toISOString().split('T')[0],
          manual_balance: parseFloat(newBalance)
        }
      ])

      if (error) throw error
      
      setShowReconcile(null)
      setNewBalance('')
      fetchAccounts()
    } catch (error) {
      console.error('Error recording balance:', error)
      alert('Failed to record balance')
    }
  }

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!withdrawalForm.from_account_id) {
      alert('Please select source account')
      return
    }
    if (!withdrawalForm.amount) {
      alert('Please enter amount')
      return
    }

    try {
      const { error } = await supabase.from('bank_withdrawals').insert([
        {
          from_account_id: withdrawalForm.from_account_id,
          to_account_id: withdrawalForm.to_account_id || null,
          amount: parseFloat(withdrawalForm.amount),
          withdrawal_date: withdrawalForm.date,
          description: withdrawalForm.description,
          withdrawal_type: withdrawalForm.withdrawal_type,
        }
      ])

      if (error) throw error
      
      alert('Withdrawal recorded successfully!')
      setWithdrawalForm({
        from_account_id: '',
        to_account_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        withdrawal_type: 'transfer',
      })
      setShowWithdrawal(false)
      fetchAccounts()
    } catch (error) {
      console.error('Error recording withdrawal:', error)
      alert('Failed to record withdrawal')
    }
  }

  if (loading) {
    return <div className="p-6 text-center">Loading bank accounts...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bank Accounts</h1>
          <p className="text-gray-600 mt-1">Manage accounts and reconcile balances</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowWithdrawal(!showWithdrawal)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium"
          >
            <DollarSign className="h-4 w-4" />
            Record Withdrawal
          </button>
          <button
            onClick={() => setShowNewAccount(!showNewAccount)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            <Plus className="h-4 w-4" />
            New Account
          </button>
        </div>
      </div>

      {/* New Account Form */}
      {showNewAccount && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Bank Account</h2>
          <form onSubmit={handleAddAccount} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                <input
                  type="text"
                  name="account_name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Main Operating Account"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  name="bank_name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Emirates NBD"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input
                  type="text"
                  name="account_number"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Account number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                <select
                  name="account_type"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="business">Business</option>
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label>
                <input
                  type="number"
                  name="opening_balance"
                  step="0.01"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opening Date</label>
                <input
                  type="date"
                  name="opening_date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {canCreate ? (
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Create Account
                </button>
              ) : (
                <div className="text-sm text-gray-600">You don't have permission to create accounts</div>
              )}
              <button
                type="button"
                onClick={() => setShowNewAccount(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Withdrawal/Transfer Form */}
      {showWithdrawal && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Cash Withdrawal or Transfer</h2>
          <form onSubmit={handleWithdrawal} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Withdraw From *</label>
                <select
                  value={withdrawalForm.from_account_id}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, from_account_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select account...</option>
                  {accounts.map((acc) => (
                    <option key={acc.account_id} value={acc.account_id}>
                      {acc.account_name} (Balance: {acc.calculated_balance?.toLocaleString() || 0})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal Type *</label>
                <select
                  value={withdrawalForm.withdrawal_type}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, withdrawal_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="transfer">Transfer to Another Account</option>
                  <option value="cash_withdrawal">Cash Withdrawal</option>
                  <option value="petty_cash">Petty Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {withdrawalForm.withdrawal_type === 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transfer To *</label>
                  <select
                    value={withdrawalForm.to_account_id}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, to_account_id: e.target.value })}
                    required={withdrawalForm.withdrawal_type === 'transfer'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select account...</option>
                    {accounts.filter(acc => acc.account_id !== withdrawalForm.from_account_id).map((acc) => (
                      <option key={acc.account_id} value={acc.account_id}>
                        {acc.account_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Đ) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={withdrawalForm.amount}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={withdrawalForm.date}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, date: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={withdrawalForm.description}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, description: e.target.value })}
                  placeholder="e.g., Petty cash for office supplies"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {canEdit ? (
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium"
                >
                  Record Withdrawal
                </button>
              ) : (
                <div className="text-sm text-gray-600">You don't have permission to record withdrawals</div>
              )}
              <button
                type="button"
                onClick={() => setShowWithdrawal(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bank Accounts Grid */}
      <div className="grid grid-cols-1 gap-6">
        {accounts.map((account) => {
          const isReconciled = account.variance === 0
          const hasVariance = account.variance !== 0 && account.latest_manual_balance !== null

          return (
            <div key={account.account_id} className="bg-white rounded-lg shadow p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{account.account_name}</h2>
                  <p className="text-sm text-gray-600">{account.bank_name} - {account.account_number}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isReconciled ? 'bg-green-100 text-green-700' : 
                  hasVariance ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {isReconciled ? 'Reconciled' : hasVariance ? 'Variance' : 'Pending'}
                </div>
              </div>

              {/* Balance Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-600 uppercase">Opening Balance</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{account.opening_balance.toLocaleString()} {account.currency}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <p className="text-xs font-medium text-green-600 uppercase">Total Income</p>
                  </div>
                  <p className="text-2xl font-bold text-green-700 mt-2">+{account.total_income.toLocaleString()} {account.currency}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <p className="text-xs font-medium text-blue-600 uppercase">Transfers In</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-700 mt-2">+{account.total_transfers_in.toLocaleString()} {account.currency}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <p className="text-xs font-medium text-red-600 uppercase">Total Expenses</p>
                  </div>
                  <p className="text-2xl font-bold text-red-700 mt-2">-{account.total_expenses.toLocaleString()} {account.currency}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-orange-600" />
                    <p className="text-xs font-medium text-orange-600 uppercase">Withdrawals</p>
                  </div>
                  <p className="text-2xl font-bold text-orange-700 mt-2">-{account.total_withdrawals.toLocaleString()} {account.currency}</p>
                </div>
              </div>

              {/* Calculated Balance Display */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 border border-blue-200">
                <p className="text-xs font-medium text-blue-600 uppercase">Current Calculated Balance</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{account.calculated_balance.toLocaleString()} {account.currency}</p>
                <p className="text-xs text-blue-700 mt-1">= Opening + Income + Transfers In - Expenses - Withdrawals</p>
              </div>

              {/* Reconciliation Section */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Bank Reconciliation</h3>
                
                {account.latest_manual_balance !== null ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs font-medium text-gray-600 uppercase">Manual Balance</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{account.latest_manual_balance.toLocaleString()} {account.currency}</p>
                      <p className="text-xs text-gray-500 mt-1">As of {account.last_reconciled_date}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs font-medium text-gray-600 uppercase">Calculated Balance</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{account.calculated_balance.toLocaleString()} {account.currency}</p>
                    </div>
                    <div className={`rounded-lg p-4 ${
                      account.variance === 0 
                        ? 'bg-green-50' 
                        : 'bg-red-50'
                    }`}>
                      <p className={`text-xs font-medium uppercase ${
                        account.variance === 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {account.variance === 0 ? 'Variance' : 'Discrepancy'}
                      </p>
                      <p className={`text-2xl font-bold mt-1 ${
                        account.variance === 0 
                          ? 'text-green-700' 
                          : 'text-red-700'
                      }`}>
                        {account.variance === 0 ? '✓ 0' : account.variance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-yellow-900">No manual balance recorded</p>
                        <p className="text-sm text-yellow-700 mt-1">Current calculated balance is {account.calculated_balance.toLocaleString()} {account.currency}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  {showReconcile === account.account_id ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Enter current bank balance"
                        value={newBalance}
                        onChange={(e) => setNewBalance(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => handleReconcile(account.account_id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                      >
                        Record Balance
                      </button>
                      <button
                        onClick={() => {
                          setShowReconcile(null)
                          setNewBalance('')
                        }}
                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowReconcile(account.account_id)}
                      className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium text-sm"
                    >
                      Record Current Balance
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {accounts.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No bank accounts found</p>
          <button
            onClick={() => setShowNewAccount(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Create First Account
          </button>
        </div>
      )}
    </div>
  )
}
