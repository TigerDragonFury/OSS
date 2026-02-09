'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import PaymentSplitsInput from '@/components/PaymentSplitsInput'

export default function ExpensesPage() {
  const [isAdding, setIsAdding] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('*')
      if (error) throw error
      return data
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    }
  })

  const handleDelete = async (expense: any) => {
    if (confirm(`Are you sure you want to delete this expense: ${expense.description || 'this expense'}?`)) {
      try {
        await deleteMutation.mutateAsync(expense.id)
      } catch (error) {
        console.error('Error deleting expense:', error)
        alert('Failed to delete expense')
      }
    }
  }

  const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0
  const paidExpenses = expenses?.filter(e => e.status === 'paid').reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0
  const pendingExpenses = expenses?.filter(e => e.status === 'pending').reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-600 mt-1">Track all company expenses</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600 mt-2">{totalExpenses.toLocaleString()} AED</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Paid</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{paidExpenses.toLocaleString()} AED</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-2">{pendingExpenses.toLocaleString()} AED</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type / Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses?.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{expense.expense_type || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{expense.category || ''}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {expense.description || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                    {expense.amount?.toLocaleString() || 0} AED
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      expense.status === 'paid' ? 'bg-green-100 text-green-800' :
                      expense.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      expense.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {expense.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingExpense(expense)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Edit expense"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete expense"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {expenses?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No expenses recorded.</p>
            </div>
          )}
        </div>
      )}

      {isAdding && <ExpenseForm onClose={() => setIsAdding(false)} companies={companies || []} />}
      {editingExpense && <ExpenseForm expense={editingExpense} onClose={() => setEditingExpense(null)} companies={companies || []} />}
    </div>
  )
}

function ExpenseForm({ expense, onClose, companies }: { expense?: any, onClose: () => void, companies: any[] }) {
  const [formData, setFormData] = useState({
    company_id: expense?.company_id || '',
    expense_type: expense?.expense_type || '',
    category: expense?.category || '',
    amount: expense?.amount || '',
    date: expense?.date || new Date().toISOString().split('T')[0],
    project_type: expense?.project_type || 'general',
    description: expense?.description || '',
    status: expense?.status || 'pending',
    paid_by_owner_id: expense?.paid_by_owner_id || ''
  })

  const [paymentSplits, setPaymentSplits] = useState<any[]>([])

  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: owners = [] } = useQuery({
    queryKey: ['owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owners')
        .select('id, name')
        .eq('status', 'active')
        .order('name')
      if (error) throw error
      return data || []
    }
  })

  const { data: existingSplits = [] } = useQuery({
    queryKey: ['payment_splits', expense?.id],
    enabled: !!expense?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_splits')
        .select('*, owners(name)')
        .eq('expense_id', expense.id)
      if (error) throw error
      return (data || []).map(split => ({
        owner_id: split.owner_id,
        owner_name: (split.owners as any)?.name,
        amount_paid: split.amount_paid
      }))
    }
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      let expenseId = expense?.id

      // Save expense (update or insert)
      if (expense) {
        const { error } = await supabase
          .from('expenses')
          .update(data.expenseData)
          .eq('id', expense.id)
        if (error) throw error
      } else {
        const { data: result, error } = await supabase
          .from('expenses')
          .insert([data.expenseData])
          .select()
        if (error) throw error
        expenseId = result[0].id
      }

      // Handle payment splits
      if (data.paymentSplits && data.paymentSplits.length > 0 && expenseId) {
        // Delete existing splits
        await supabase
          .from('payment_splits')
          .delete()
          .eq('expense_id', expenseId)

        // Insert new splits
        const splitsData = data.paymentSplits.map((split: any) => ({
          expense_id: expenseId,
          owner_id: split.owner_id,
          amount_paid: split.amount_paid,
          payment_date: data.expenseData.date
        }))

        const { error: splitsError } = await supabase
          .from('payment_splits')
          .insert(splitsData)
        if (splitsError) throw splitsError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['payment_splits'] })
      queryClient.invalidateQueries({ queryKey: ['owner_equity_summary'] })
      onClose()
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clean up formData - convert empty strings to null for UUID fields
    const cleanedData = {
      ...formData,
      paid_by_owner_id: formData.paid_by_owner_id || null,
      company_id: formData.company_id || null
    }
    
    mutation.mutate({
      expenseData: cleanedData,
      paymentSplits
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">{expense ? 'Edit Expense' : 'Add Expense'}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type</label>
                <input
                  type="text"
                  value={formData.expense_type}
                  onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
                  placeholder="e.g., Truck Rental, Labor, Equipment"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Operations, Maintenance"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (AED) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Type</label>
                <select
                  value={formData.project_type}
                  onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="general">General</option>
                  <option value="vessel">Vessel</option>
                  <option value="land">Land</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Payment Information */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-3">Payment Information</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paid By (Single Owner)
                </label>
                <select
                  value={formData.paid_by_owner_id}
                  onChange={(e) => setFormData({ ...formData, paid_by_owner_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">-- Select Owner (if single payer) --</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty if using split payments below
                </p>
              </div>

              {formData.amount && parseFloat(formData.amount) > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Split Payments (Optional)
                  </label>
                  <PaymentSplitsInput
                    owners={owners}
                    totalAmount={parseFloat(formData.amount)}
                    existingSplits={existingSplits}
                    onChange={setPaymentSplits}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use this if multiple owners are contributing to this expense
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {mutation.isPending ? 'Saving...' : expense ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
