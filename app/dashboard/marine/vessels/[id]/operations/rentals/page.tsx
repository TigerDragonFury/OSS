'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use } from 'react'
import { Plus, Edit2, Trash2, DollarSign, Calendar, CheckCircle, Clock } from 'lucide-react'

export default function RentalsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [showRentalForm, setShowRentalForm] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [selectedRental, setSelectedRental] = useState<any>(null)
  const [editingItem, setEditingItem] = useState<any>(null)
  
  const queryClient = useQueryClient()
  const supabase = createClient()

  // Vessel Rentals Query
  const { data: vesselRentals } = useQuery({
    queryKey: ['vessel_rentals', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_rentals')
        .select('*')
        .eq('vessel_id', resolvedParams.id)
        .order('start_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  // Rental Payments Query
  const { data: allPayments } = useQuery({
    queryKey: ['vessel_rental_payments', resolvedParams.id],
    queryFn: async () => {
      // Get all rental IDs for this vessel
      const { data: rentals } = await supabase
        .from('vessel_rentals')
        .select('id')
        .eq('vessel_id', resolvedParams.id)
      
      if (!rentals || rentals.length === 0) return []
      
      const rentalIds = rentals.map(r => r.id)
      
      // Get payments for those rentals
      const { data, error } = await supabase
        .from('rental_payments')
        .select('*, vessel_rentals(customer_name)')
        .in('rental_id', rentalIds)
        .order('payment_date', { ascending: false })
      if (error) throw error
      return data || []
    }
  })

  // Delete Rental Mutation
  const deleteRental = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vessel_rentals')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_rentals', resolvedParams.id] })
    }
  })

  // Delete Payment Mutation
  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rental_payments')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_rental_payments', resolvedParams.id] })
    }
  })

  const activeRentals = vesselRentals?.filter(r => r.status === 'active').length || 0
  const completedPayments = allPayments?.filter(p => p.status === 'completed').length || 0
  const totalRentalIncome = allPayments?.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0) || 0
  const pendingPayments = allPayments?.filter(p => p.status === 'pending').length || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rentals & Income</h1>
          <p className="text-gray-600">Track vessel rentals, customers, and rental payments</p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null)
            setShowRentalForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          New Rental
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Active Rentals</p>
              <p className="text-2xl font-bold text-gray-900">{activeRentals}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Completed Payments</p>
              <p className="text-2xl font-bold text-gray-900">{completedPayments}</p>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-sm text-gray-600">Total Rental Income</p>
              <p className="text-2xl font-bold text-emerald-600">{totalRentalIncome.toLocaleString()} AED</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-sm text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-orange-600">{pendingPayments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Vessel Rentals Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Vessel Rentals</h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Daily Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vesselRentals?.map((rental) => (
                  <tr key={rental.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{rental.customer_name}</p>
                        <p className="text-sm text-gray-500">{rental.customer_contact || 'No contact'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{rental.rental_purpose || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(rental.start_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {rental.end_date ? new Date(rental.end_date).toLocaleDateString() : 'Ongoing'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {rental.daily_rate?.toLocaleString()} AED
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-green-600">
                        {rental.total_amount?.toLocaleString()} AED
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        rental.status === 'active' ? 'bg-green-100 text-green-800' :
                        rental.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {rental.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedRental(rental)
                            setShowPaymentForm(true)
                          }}
                          className="text-green-600 hover:text-green-800"
                          title="Add Payment"
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingItem(rental)
                            setShowRentalForm(true)
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this rental record?')) {
                              deleteRental.mutate(rental.id)
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!vesselRentals || vesselRentals.length === 0) && (
              <div className="text-center py-12 text-gray-500">
                No rental records yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rental Payments Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Rental Payments</h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allPayments?.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {payment.vessel_rentals?.customer_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-green-600">
                        {payment.amount?.toLocaleString()} AED
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{payment.payment_method || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{payment.reference_number || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          if (confirm('Delete this payment record?')) {
                            deletePayment.mutate(payment.id)
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!allPayments || allPayments.length === 0) && (
              <div className="text-center py-12 text-gray-500">
                No payment records yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TODO: Add Rental Form Modal */}
      {/* TODO: Add Payment Form Modal */}
    </div>
  )
}
