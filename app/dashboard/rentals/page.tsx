'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Ship, Search, Edit2, Trash2, Calendar, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Pagination from '@/components/Pagination'

export default function RentalsPage() {
  const [isAdding, setIsAdding] = useState(false)
  const [editingRental, setEditingRental] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterVessel, setFilterVessel] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: rentals, isLoading } = useQuery({
    queryKey: ['vessel_rentals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_rentals')
        .select(`
          *,
          vessels (name),
          customers (company_name, contact_person)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: vessels } = useQuery({
    queryKey: ['vessels_for_rental'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessels')
        .select('id, name')
        .eq('status', 'active')
        .order('name')
      if (error) throw error
      return data
    }
  })

  const { data: customers } = useQuery({
    queryKey: ['customers_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name, contact_person')
        .eq('status', 'active')
        .order('company_name')
      if (error) throw error
      return data
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vessel_rentals')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_rentals'] })
    }
  })

  const filteredRentals = rentals?.filter((rental: any) => {
    const matchesSearch =
      rental.rental_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.vessels?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.customers?.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || rental.status === filterStatus
    const matchesVessel = !filterVessel || rental.vessel_id === filterVessel
    return matchesSearch && matchesStatus && matchesVessel
  })

  const totalPages = Math.ceil((filteredRentals?.length || 0) / itemsPerPage)
  const paginatedRentals = filteredRentals?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const totalRevenue = rentals?.filter((r: any) => r.status === 'completed' || r.status === 'active')
    .reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vessel Rentals</h1>
          <p className="text-gray-600 mt-1">Manage vessel bookings and rentals</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Booking
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Total Bookings</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{rentals?.length || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {rentals?.filter((r: any) => r.status === 'active').length || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-2">
            {rentals?.filter((r: any) => r.status === 'pending').length || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {rentals?.filter((r: any) => r.status === 'completed').length || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-purple-600 mt-2">
            AED {totalRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterVessel}
            onChange={(e) => setFilterVessel(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Vessels</option>
            {vessels?.map((v: any) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={() => { setSearchTerm(''); setFilterStatus(''); setFilterVessel(''); }}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Rentals List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vessel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedRentals?.map((rental: any) => (
                <tr key={rental.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{rental.rental_number}</div>
                        <div className="text-xs text-gray-500 capitalize">{rental.rental_type} rental</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Ship className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{rental.vessels?.name || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {rental.customers?.company_name || rental.customers?.contact_person || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {new Date(rental.start_date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      to {new Date(rental.end_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      AED {rental.total_amount?.toLocaleString() || '-'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {rental.daily_rate ? `AED ${rental.daily_rate}/day` : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      rental.status === 'active' ? 'bg-green-100 text-green-800' :
                      rental.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      rental.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      rental.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                      rental.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getStatusIcon(rental.status)}
                      <span className="ml-1">{rental.status?.toUpperCase()}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingRental(rental)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this rental?')) deleteMutation.mutate(rental.id)
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

          {filteredRentals?.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No rentals found.</p>
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredRentals?.length}
            itemsPerPage={itemsPerPage}
          />
        </div>
      )}

      {(isAdding || editingRental) && (
        <RentalForm
          onClose={() => { setIsAdding(false); setEditingRental(null); }}
          rental={editingRental}
          vessels={vessels || []}
          customers={customers || []}
        />
      )}
    </div>
  )
}

function RentalForm({ onClose, rental, vessels, customers }: { onClose: () => void; rental?: any; vessels: any[]; customers: any[] }) {
  const [formData, setFormData] = useState({
    rental_number: rental?.rental_number || '',
    vessel_id: rental?.vessel_id || '',
    customer_id: rental?.customer_id || '',
    rental_type: rental?.rental_type || 'daily',
    start_date: rental?.start_date || '',
    end_date: rental?.end_date || '',
    daily_rate: rental?.daily_rate?.toString() || '',
    total_amount: rental?.total_amount?.toString() || '',
    deposit_amount: rental?.deposit_amount?.toString() || '',
    deposit_paid: rental?.deposit_paid || false,
    status: rental?.status || 'pending',
    pickup_location: rental?.pickup_location || '',
    return_location: rental?.return_location || '',
    purpose: rental?.purpose || '',
    special_requirements: rental?.special_requirements || '',
    crew_included: rental?.crew_included || false,
    fuel_included: rental?.fuel_included || false,
    insurance_included: rental?.insurance_included || false,
    notes: rental?.notes || ''
  })

  const queryClient = useQueryClient()
  const supabase = createClient()

  // Auto-calculate total
  const calculateTotal = () => {
    if (formData.start_date && formData.end_date && formData.daily_rate) {
      const start = new Date(formData.start_date)
      const end = new Date(formData.end_date)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const total = days * parseFloat(formData.daily_rate)
      setFormData(prev => ({ ...prev, total_amount: total.toString() }))
    }
  }

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const cleanData = {
        ...data,
        daily_rate: data.daily_rate ? parseFloat(data.daily_rate) : null,
        total_amount: data.total_amount ? parseFloat(data.total_amount) : null,
        deposit_amount: data.deposit_amount ? parseFloat(data.deposit_amount) : 0,
        vessel_id: data.vessel_id || null,
        customer_id: data.customer_id || null,
        payment_status: data.payment_status || 'pending',
        status: data.status || 'pending'
      }

      if (rental) {
        const { error } = await supabase
          .from('vessel_rentals')
          .update(cleanData)
          .eq('id', rental.id)
        if (error) throw error
      } else {
        // Auto-generate rental number
        if (!cleanData.rental_number) {
          const year = new Date().getFullYear()
          const { data: lastRental } = await supabase
            .from('vessel_rentals')
            .select('rental_number')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          const lastNum = lastRental?.rental_number
            ? parseInt(lastRental.rental_number.split('-')[1]) || 0
            : 0
          cleanData.rental_number = `RNT-${String(lastNum + 1).padStart(5, '0')}`
        }
        const { error } = await supabase
          .from('vessel_rentals')
          .insert([cleanData])
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_rentals'] })
      onClose()
    },
    onError: (error: any) => {
      alert(`Error: ${error.message}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.vessel_id || !formData.customer_id || !formData.start_date || !formData.end_date) {
      alert('Please fill in required fields: Vessel, Customer, Start Date, End Date')
      return
    }
    mutation.mutate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">{rental ? 'Edit' : 'New'} Booking</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Booking Number</label>
                <input
                  type="text"
                  value={formData.rental_number}
                  onChange={(e) => setFormData({ ...formData, rental_number: e.target.value })}
                  placeholder="Auto-generated"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rental Type *</label>
                <select
                  value={formData.rental_type}
                  onChange={(e) => setFormData({ ...formData, rental_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="voyage">Voyage</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vessel *</label>
                <select
                  required
                  value={formData.vessel_id}
                  onChange={(e) => setFormData({ ...formData, vessel_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Vessel</option>
                  {vessels.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                <select
                  required
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.company_name || c.contact_person}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  onBlur={calculateTotal}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <input
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  onBlur={calculateTotal}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rate (AED)</label>
                <input
                  type="number"
                  value={formData.daily_rate}
                  onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })}
                  onBlur={calculateTotal}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (AED)</label>
                <input
                  type="number"
                  value={formData.total_amount}
                  onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deposit (AED)</label>
                <input
                  type="number"
                  value={formData.deposit_amount}
                  onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
                <input
                  type="text"
                  value={formData.pickup_location}
                  onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Return Location</label>
                <input
                  type="text"
                  value={formData.return_location}
                  onChange={(e) => setFormData({ ...formData, return_location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.crew_included}
                  onChange={(e) => setFormData({ ...formData, crew_included: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Crew Included</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.fuel_included}
                  onChange={(e) => setFormData({ ...formData, fuel_included: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Fuel Included</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.insurance_included}
                  onChange={(e) => setFormData({ ...formData, insurance_included: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Insurance Included</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.deposit_paid}
                  onChange={(e) => setFormData({ ...formData, deposit_paid: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Deposit Paid</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
              <textarea
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Requirements</label>
              <textarea
                value={formData.special_requirements}
                onChange={(e) => setFormData({ ...formData, special_requirements: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
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
                {mutation.isPending ? 'Saving...' : rental ? 'Update' : 'Create'} Booking
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
