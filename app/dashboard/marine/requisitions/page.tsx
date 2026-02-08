'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, FileText, CheckCircle, XCircle, Clock } from 'lucide-react'
import Pagination from '@/components/Pagination'

export default function RequisitionsPage() {
  const [isAdding, setIsAdding] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: requisitions, isLoading } = useQuery({
    queryKey: ['purchase_requisitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_requisitions')
        .select(`
          *,
          employees (
            full_name,
            position
          ),
          vessels (
            name
          )
        `)
        .order('created_at', { ascending: false })
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

  const { data: vessels } = useQuery({
    queryKey: ['vessels_active'],
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

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase
        .from('purchase_requisitions')
        .update({ 
          status,
          approved_date: status === 'approved' ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requisitions'] })
    }
  })

  const filteredRequisitions = requisitions?.filter((req: any) => 
    !filterStatus || req.status === filterStatus
  )

  // Pagination
  const totalPages = Math.ceil((filteredRequisitions?.length || 0) / itemsPerPage)
  const paginatedRequisitions = filteredRequisitions?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const pendingCount = requisitions?.filter((r: any) => r.status === 'pending').length || 0
  const approvedCount = requisitions?.filter((r: any) => r.status === 'approved').length || 0
  const rejectedCount = requisitions?.filter((r: any) => r.status === 'rejected').length || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Purchase Requisitions</h1>
          <p className="text-gray-600 mt-1">Crew requests for materials and equipment</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Requisition
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Total Requisitions</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{requisitions?.length || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-2">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Approved</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{approvedCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Rejected</p>
          <p className="text-2xl font-bold text-red-600 mt-2">{rejectedCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="ordered">Ordered</option>
            <option value="received">Received</option>
          </select>
        </div>
      </div>

      {/* Requisitions List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedRequisitions?.map((req: any) => (
            <div key={req.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-6 w-6 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{req.item_name}</h3>
                      <p className="text-sm text-gray-600">
                        Requested by: {req.employees?.full_name} ({req.employees?.position})
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Quantity</p>
                      <p className="font-medium">{req.quantity} {req.unit || 'pcs'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Estimated Cost</p>
                      <p className="font-medium">{req.estimated_cost?.toLocaleString() || 'N/A'} AED</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Priority</p>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        req.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        req.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        req.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {req.priority?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Vessel</p>
                      <p className="font-medium">{req.vessels?.name || 'N/A'}</p>
                    </div>
                  </div>

                  {req.purpose && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-600">Purpose</p>
                      <p className="text-sm text-gray-900">{req.purpose}</p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center text-xs text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    Requested on {req.created_at?.split('T')[0]}
                    {req.required_date && ` • Needed by ${req.required_date}`}
                  </div>
                </div>

                <div className="ml-6 flex flex-col items-end space-y-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    req.status === 'approved' ? 'bg-green-100 text-green-800' :
                    req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    req.status === 'ordered' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {req.status?.toUpperCase()}
                  </span>

                  {req.status === 'pending' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateStatus.mutate({ id: req.id, status: 'approved' })}
                        className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg"
                        title="Approve"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => updateStatus.mutate({ id: req.id, status: 'rejected' })}
                        className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg"
                        title="Reject"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                  )}

                  {req.status === 'approved' && (
                    <button
                      onClick={() => updateStatus.mutate({ id: req.id, status: 'ordered' })}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Mark as Ordered
                    </button>
                  )}

                  {req.status === 'ordered' && (
                    <button
                      onClick={() => updateStatus.mutate({ id: req.id, status: 'received' })}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Mark as Received
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredRequisitions?.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No requisitions found.</p>
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredRequisitions?.length}
            itemsPerPage={itemsPerPage}
          />
        </div>
      )}

      {isAdding && (
        <RequisitionForm 
          onClose={() => setIsAdding(false)}
          employees={employees || []}
          vessels={vessels || []}
        />
      )}
    </div>
  )
}

function RequisitionForm({ onClose, employees, vessels }: { onClose: () => void, employees: any[], vessels: any[] }) {
  const [formData, setFormData] = useState({
    requested_by: '',
    vessel_id: '',
    item_name: '',
    quantity: '',
    unit: 'pcs',
    estimated_cost: '',
    purpose: '',
    priority: 'normal',
    required_date: '',
    supplier_suggestion: ''
  })

  const queryClient = useQueryClient()
  const supabase = createClient()

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const cleanData = {
        ...data,
        quantity: parseFloat(data.quantity) || 1,
        estimated_cost: data.estimated_cost ? parseFloat(data.estimated_cost) : null,
        vessel_id: data.vessel_id || null,
        required_date: data.required_date || null,
        supplier_suggestion: data.supplier_suggestion || null,
        status: 'pending'
      }
      const { error } = await supabase
        .from('purchase_requisitions')
        .insert([cleanData])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requisitions'] })
      onClose()
    },
    onError: (error: any) => {
      alert(`Error: ${error.message || 'Failed to save requisition'}`)
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
          <h2 className="text-2xl font-bold mb-6">New Purchase Requisition</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requested By *</label>
                <select
                  required
                  value={formData.requested_by}
                  onChange={(e) => setFormData({ ...formData, requested_by: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} - {emp.position}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vessel</label>
                <select
                  value={formData.vessel_id}
                  onChange={(e) => setFormData({ ...formData, vessel_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Vessel (Optional)</option>
                  {vessels.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
              <input
                type="text"
                required
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                placeholder="e.g., Main Engine Spare Parts"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost (AED)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.estimated_cost}
                  onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Required By</label>
                <input
                  type="date"
                  value={formData.required_date}
                  onChange={(e) => setFormData({ ...formData, required_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose *</label>
              <textarea
                required
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                rows={3}
                placeholder="Why is this item needed?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Suggestion</label>
              <input
                type="text"
                value={formData.supplier_suggestion}
                onChange={(e) => setFormData({ ...formData, supplier_suggestion: e.target.value })}
                placeholder="Recommended supplier (optional)"
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
                {mutation.isPending ? 'Submitting...' : 'Submit Requisition'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
