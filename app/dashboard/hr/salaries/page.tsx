'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import Pagination from '@/components/Pagination'

export default function SalariesPage() {
  const [isAdding, setIsAdding] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: payments, isLoading } = useQuery({
    queryKey: ['salary_payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_payments')
        .select(`
          *,
          employees (
            employee_code,
            full_name,
            position,
            salary
          )
        `)
        .order('payment_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: employees } = useQuery({
    queryKey: ['employees_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active')
        .order('full_name')
      if (error) throw error
      return data
    }
  })

  const totalPaid = payments?.reduce((sum, payment) => sum + (payment.total_amount || 0), 0) || 0

  // Pagination
  const totalPages = Math.ceil((payments?.length || 0) / itemsPerPage)
  const paginatedPayments = payments?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Salary Payments</h1>
          <p className="text-gray-600 mt-1">Track and manage employee salary payments</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Record Payment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Total Payments</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{payments?.length || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Total Paid</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{totalPaid.toLocaleString()} AED</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Active Employees</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">{employees?.length || 0}</p>
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
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bonuses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deductions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedPayments?.map((payment: any) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {payment.employees?.full_name || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {payment.employees?.position || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {payment.period_start} to {payment.period_end}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {payment.base_amount?.toLocaleString() || 0} AED
                  </td>
                  <td className="px-6 py-4 text-sm text-green-600">
                    +{payment.bonuses?.toLocaleString() || 0} AED
                  </td>
                  <td className="px-6 py-4 text-sm text-red-600">
                    -{payment.deductions?.toLocaleString() || 0} AED
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {payment.total_amount?.toLocaleString() || 0} AED
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {payment.payment_date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {payments?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No salary payments recorded yet.</p>
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={payments?.length}
            itemsPerPage={itemsPerPage}
          />
        </div>
      )}

      {isAdding && <PaymentForm onClose={() => setIsAdding(false)} employees={employees || []} />}
    </div>
  )
}

function PaymentForm({ onClose, employees }: { onClose: () => void, employees: any[] }) {
  const [formData, setFormData] = useState({
    employee_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    period_start: '',
    period_end: '',
    base_amount: '',
    bonuses: '0',
    deductions: '0',
    payment_method: 'bank_transfer',
    notes: ''
  })

  const queryClient = useQueryClient()
  const supabase = createClient()

  const selectedEmployee = employees.find(e => e.id === formData.employee_id)

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const base = parseFloat(data.base_amount) || 0
      const bonuses = parseFloat(data.bonuses) || 0
      const deductions = parseFloat(data.deductions) || 0
      const total = base + bonuses - deductions

      const cleanData = {
        employee_id: data.employee_id,
        payment_date: data.payment_date,
        period_start: data.period_start,
        period_end: data.period_end,
        base_amount: base,
        bonuses: bonuses,
        deductions: deductions,
        total_amount: total,
        payment_method: data.payment_method,
        notes: data.notes || null
      }

      const { error } = await supabase
        .from('salary_payments')
        .insert([cleanData])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary_payments'] })
      onClose()
    },
    onError: (error: any) => {
      alert(`Error: ${error.message || 'Failed to save payment'}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Record Salary Payment</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
              <select
                required
                value={formData.employee_id}
                onChange={(e) => {
                  const emp = employees.find(emp => emp.id === e.target.value)
                  setFormData({ 
                    ...formData, 
                    employee_id: e.target.value,
                    base_amount: emp?.salary?.toString() || ''
                  })
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} - {employee.position}
                  </option>
                ))}
              </select>
              {selectedEmployee && (
                <p className="text-sm text-gray-600 mt-1">
                  Current Salary: {selectedEmployee.salary?.toLocaleString() || 0} AED ({selectedEmployee.salary_type})
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Start *</label>
                <input
                  type="date"
                  required
                  value={formData.period_start}
                  onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period End *</label>
                <input
                  type="date"
                  required
                  value={formData.period_end}
                  onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Amount (AED) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.base_amount}
                  onChange={(e) => setFormData({ ...formData, base_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bonuses (AED)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.bonuses}
                  onChange={(e) => setFormData({ ...formData, bonuses: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deductions (AED)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.deductions}
                  onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                </select>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total Payment:</span>
                <span className="text-xl font-bold text-blue-600">
                  {((parseFloat(formData.base_amount) || 0) + 
                    (parseFloat(formData.bonuses) || 0) - 
                    (parseFloat(formData.deductions) || 0)).toLocaleString()} AED
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {mutation.isPending ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
