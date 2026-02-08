'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Package, MapPin, AlertCircle, Wrench, TrendingUp } from 'lucide-react'
import Pagination from '@/components/Pagination'

export default function EquipmentTrackingPage() {
  const [isAdding, setIsAdding] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment_tracking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_tracking')
        .select(`
          *,
          warehouses (
            name,
            location
          ),
          vessels (
            name
          )
        `)
        .order('equipment_name')
      if (error) throw error
      return data
    }
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('status', 'active')
        .order('name')
      if (error) throw error
      return data
    }
  })

  const { data: vessels } = useQuery({
    queryKey: ['vessels_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessels')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data
    }
  })

  const filteredEquipment = equipment?.filter((item: any) => {
    const matchesSearch = item.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.equipment_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || item.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Pagination
  const totalPages = Math.ceil((filteredEquipment?.length || 0) / itemsPerPage)
  const paginatedEquipment = filteredEquipment?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const statusCounts = {
    in_use: equipment?.filter((e: any) => e.status === 'in_use').length || 0,
    in_warehouse: equipment?.filter((e: any) => e.status === 'in_warehouse').length || 0,
    in_maintenance: equipment?.filter((e: any) => e.status === 'in_maintenance').length || 0,
    retired: equipment?.filter((e: any) => e.status === 'retired').length || 0,
    sold: equipment?.filter((e: any) => e.status === 'sold').length || 0,
    scrapped: equipment?.filter((e: any) => e.status === 'scrapped').length || 0
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Equipment Tracking</h1>
          <p className="text-gray-600 mt-1">Track individual equipment lifecycle from purchase to disposal</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Equipment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs font-medium text-gray-600">In Use</p>
          <p className="text-xl font-bold text-green-600 mt-1">{statusCounts.in_use}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs font-medium text-gray-600">Warehouse</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{statusCounts.in_warehouse}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs font-medium text-gray-600">Maintenance</p>
          <p className="text-xl font-bold text-yellow-600 mt-1">{statusCounts.in_maintenance}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs font-medium text-gray-600">Retired</p>
          <p className="text-xl font-bold text-gray-600 mt-1">{statusCounts.retired}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs font-medium text-gray-600">Sold</p>
          <p className="text-xl font-bold text-purple-600 mt-1">{statusCounts.sold}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs font-medium text-gray-600">Scrapped</p>
          <p className="text-xl font-bold text-red-600 mt-1">{statusCounts.scrapped}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by name, code, or serial..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="in_use">In Use</option>
            <option value="in_warehouse">In Warehouse</option>
            <option value="in_maintenance">In Maintenance</option>
            <option value="retired">Retired</option>
            <option value="sold">Sold</option>
            <option value="scrapped">Scrapped</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('')
              setFilterStatus('')
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Equipment List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEquipment?.map((item: any) => (
            <div key={item.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-start">
                    <div className="bg-blue-100 rounded-lg p-3">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{item.equipment_name}</h3>
                      <div className="text-sm text-gray-600 space-y-1 mt-1">
                        {item.equipment_code && <p>Code: {item.equipment_code}</p>}
                        {item.serial_number && <p>S/N: {item.serial_number}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Category</p>
                      <p className="font-medium text-gray-900">{item.category || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Manufacturer</p>
                      <p className="font-medium text-gray-900">{item.manufacturer || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center text-sm">
                      <MapPin className="h-4 w-4 text-gray-600 mr-2" />
                      <div className="flex-1">
                        {item.status === 'in_warehouse' && item.warehouses && (
                          <div>
                            <span className="font-medium">{item.warehouses.name}</span>
                            <span className="text-gray-600"> - {item.warehouses.location}</span>
                            {item.location_details && (
                              <p className="text-xs text-gray-500 mt-1">{item.location_details}</p>
                            )}
                          </div>
                        )}
                        {item.status === 'in_use' && item.vessels && (
                          <span className="font-medium">On Vessel: {item.vessels.name}</span>
                        )}
                        {item.status === 'in_maintenance' && (
                          <span className="font-medium text-yellow-600">Under Maintenance</span>
                        )}
                        {(item.status === 'sold' || item.status === 'scrapped' || item.status === 'retired') && (
                          <span className="font-medium text-gray-600">
                            {item.status === 'sold' ? 'Sold' : item.status === 'scrapped' ? 'Scrapped' : 'Retired'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Info */}
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    {item.purchase_price && (
                      <div>
                        <p className="text-gray-600">Purchase Price</p>
                        <p className="font-semibold text-gray-900">{item.purchase_price.toLocaleString()} AED</p>
                      </div>
                    )}
                    {item.sale_price && (
                      <div>
                        <p className="text-gray-600">Sale Price</p>
                        <p className="font-semibold text-green-600">{item.sale_price.toLocaleString()} AED</p>
                      </div>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="mt-3 text-xs text-gray-600">
                    <p>Purchased: {item.purchase_date || 'N/A'}</p>
                    {item.last_maintenance_date && (
                      <p>Last Maintenance: {item.last_maintenance_date}</p>
                    )}
                    {item.sale_date && <p>Sold: {item.sale_date}</p>}
                  </div>
                </div>

                {/* Status Badge */}
                <span className={`ml-4 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  item.status === 'in_use' ? 'bg-green-100 text-green-800' :
                  item.status === 'in_warehouse' ? 'bg-blue-100 text-blue-800' :
                  item.status === 'in_maintenance' ? 'bg-yellow-100 text-yellow-800' :
                  item.status === 'retired' ? 'bg-gray-100 text-gray-800' :
                  item.status === 'sold' ? 'bg-purple-100 text-purple-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {item.status?.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {item.notes && (
                <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                  {item.notes}
                </div>
              )}
            </div>
          ))}

          {filteredEquipment?.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No equipment found.</p>
            </div>
          )}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredEquipment?.length}
            itemsPerPage={itemsPerPage}
          />        </div>
      )}

      {isAdding && (
        <EquipmentForm 
          onClose={() => setIsAdding(false)}
          warehouses={warehouses || []}
          vessels={vessels || []}
        />
      )}
    </div>
  )
}

function EquipmentForm({ onClose, warehouses, vessels }: { onClose: () => void, warehouses: any[], vessels: any[] }) {
  const [formData, setFormData] = useState({
    equipment_name: '',
    equipment_code: '',
    serial_number: '',
    category: 'generator',
    manufacturer: '',
    model: '',
    purchase_date: '',
    purchase_price: '',
    warranty_expiry: '',
    status: 'in_warehouse',
    warehouse_id: '',
    vessel_id: '',
    location_details: '',
    notes: ''
  })

  const queryClient = useQueryClient()
  const supabase = createClient()

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const cleanData = {
        ...data,
        purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : null,
        purchase_date: data.purchase_date || null,
        warranty_expiry: data.warranty_expiry || null,
        warehouse_id: data.status === 'in_warehouse' ? data.warehouse_id : null,
        vessel_id: data.status === 'in_use' ? data.vessel_id : null,
        equipment_code: data.equipment_code || null,
        serial_number: data.serial_number || null,
        manufacturer: data.manufacturer || null,
        model: data.model || null,
        location_details: data.location_details || null,
        notes: data.notes || null
      }
      const { error } = await supabase
        .from('equipment_tracking')
        .insert([cleanData])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment_tracking'] })
      onClose()
    },
    onError: (error: any) => {
      alert(`Error: ${error.message || 'Failed to save equipment'}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Add Equipment</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Name *</label>
                <input
                  type="text"
                  required
                  value={formData.equipment_name}
                  onChange={(e) => setFormData({ ...formData, equipment_name: e.target.value })}
                  placeholder="e.g., Main Generator"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Code</label>
                <input
                  type="text"
                  value={formData.equipment_code}
                  onChange={(e) => setFormData({ ...formData, equipment_code: e.target.value })}
                  placeholder="e.g., GEN-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                <input
                  type="text"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="generator">Generator</option>
                  <option value="engine">Engine</option>
                  <option value="pump">Pump</option>
                  <option value="compressor">Compressor</option>
                  <option value="crane">Crane</option>
                  <option value="navigation">Navigation Equipment</option>
                  <option value="communication">Communication</option>
                  <option value="safety">Safety Equipment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price (AED)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Expiry</label>
                <input
                  type="date"
                  value={formData.warranty_expiry}
                  onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="in_warehouse">In Warehouse</option>
                  <option value="in_use">In Use (On Vessel)</option>
                  <option value="in_maintenance">In Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
            </div>

            {formData.status === 'in_warehouse' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse *</label>
                <select
                  required
                  value={formData.warehouse_id}
                  onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name} - {wh.location}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.status === 'in_use' && (
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
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location Details</label>
              <input
                type="text"
                value={formData.location_details}
                onChange={(e) => setFormData({ ...formData, location_details: e.target.value })}
                placeholder="e.g., Shelf A3, Engine Room"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
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
                {mutation.isPending ? 'Saving...' : 'Add Equipment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
