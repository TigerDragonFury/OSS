'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function VesselsPage() {
  const [isAddingVessel, setIsAddingVessel] = useState(false)
  const [editingVessel, setEditingVessel] = useState<any>(null)
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: vessels, isLoading } = useQuery({
    queryKey: ['vessels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessels')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: vesselFinancials } = useQuery({
    queryKey: ['vessel_financial_summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_financial_summary')
        .select('*')
      if (error) throw error
      return data
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (vesselId: string) => {
      const { error } = await supabase
        .from('vessels')
        .delete()
        .eq('id', vesselId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessels'] })
      queryClient.invalidateQueries({ queryKey: ['vessel_financial_summary'] })
    },
    onError: (error: any) => {
      alert(`Error deleting vessel: ${error.message}`)
    }
  })

  const handleDelete = (vessel: any) => {
    if (confirm(`Are you sure you want to delete "${vessel.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(vessel.id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vessels</h1>
          <p className="text-gray-600 mt-1">Manage your marine fleet</p>
        </div>
        <button
          onClick={() => setIsAddingVessel(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Vessel
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {vessels?.map((vessel) => {
            const financial = vesselFinancials?.find(v => v.id === vessel.id)
            return (
              <div key={vessel.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-xl font-semibold text-gray-900">{vessel.name}</h3>
                      <span className={`ml-3 px-3 py-1 rounded-full text-xs font-medium ${
                        vessel.status === 'active' ? 'bg-green-100 text-green-800' :
                        vessel.status === 'scrapping' ? 'bg-yellow-100 text-yellow-800' :
                        vessel.status === 'scrapped' ? 'bg-gray-100 text-gray-800' :
                        vessel.status === 'under_overhaul' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {vessel.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Type</p>
                        <p className="font-medium">{vessel.vessel_type || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Purchase Price</p>
                        <p className="font-medium">{vessel.purchase_price?.toLocaleString() || 'N/A'} AED</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Location</p>
                        <p className="font-medium">{vessel.current_location || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tonnage</p>
                        <p className="font-medium">{vessel.tonnage || 'N/A'} tons</p>
                      </div>
                    </div>

                    {financial && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Financial Summary</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Equipment Sales</p>
                            <p className="font-semibold text-green-600">
                              +{financial.equipment_sales?.toLocaleString() || 0} AED
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Scrap Sales</p>
                            <p className="font-semibold text-green-600">
                              +{financial.scrap_sales?.toLocaleString() || 0} AED
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Total Costs</p>
                            <p className="font-semibold text-red-600">
                              -{((financial.movement_costs || 0) + (financial.drydock_costs || 0) + 
                                (financial.overhaul_costs || 0) + (financial.other_expenses || 0)).toLocaleString()} AED
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Net Profit/Loss</p>
                            <p className={`font-bold ${financial.net_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {financial.net_profit_loss >= 0 ? '+' : ''}{financial.net_profit_loss?.toLocaleString() || 0} AED
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {vessel.notes && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600">{vessel.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex space-x-2">
                    <Link 
                      href={`/dashboard/marine/vessels/${vessel.id}`}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="View Details"
                    >
                      <DollarSign className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => setEditingVessel(vessel)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded"
                      title="Edit Vessel"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(vessel)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete Vessel"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {vessels?.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">No vessels yet. Click "Add Vessel" to get started.</p>
            </div>
          )}
        </div>
      )}

      {isAddingVessel && (
        <VesselForm onClose={() => setIsAddingVessel(false)} />
      )}

      {editingVessel && (
        <VesselForm 
          vessel={editingVessel} 
          onClose={() => setEditingVessel(null)} 
        />
      )}
    </div>
  )
}

function VesselForm({ onClose, vessel }: { onClose: () => void, vessel?: any }) {
  const [formData, setFormData] = useState({
    name: vessel?.name || '',
    vessel_type: vessel?.vessel_type || '',
    purchase_price: vessel?.purchase_price || '',
    purchase_date: vessel?.purchase_date || '',
    status: vessel?.status || 'active',
    current_location: vessel?.current_location || '',
    tonnage: vessel?.tonnage || '',
    year_built: vessel?.year_built || '',
    classification_status: vessel?.classification_status || '',
    notes: vessel?.notes || ''
  })

  const queryClient = useQueryClient()
  const supabase = createClient()

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Submitting vessel data:', data)
      if (vessel) {
        const { error } = await supabase
          .from('vessels')
          .update(data)
          .eq('id', vessel.id)
        if (error) {
          console.error('Update error:', error)
          throw error
        }
      } else {
        const { data: result, error } = await supabase
          .from('vessels')
          .insert([data])
          .select()
        if (error) {
          console.error('Insert error:', error)
          throw error
        }
        console.log('Insert successful:', result)
      }
    },
    onSuccess: () => {
      console.log('Mutation successful')
      queryClient.invalidateQueries({ queryKey: ['vessels'] })
      queryClient.invalidateQueries({ queryKey: ['vessel_financial_summary'] })
      onClose()
    },
    onError: (error: any) => {
      console.error('Mutation error:', error)
      alert(`Error: ${error.message || 'Failed to save vessel'}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clean up the data - convert empty strings to null for numeric fields
    const cleanData = {
      ...formData,
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      tonnage: formData.tonnage ? parseFloat(formData.tonnage) : null,
      year_built: formData.year_built ? parseInt(formData.year_built) : null,
      purchase_date: formData.purchase_date || null,
      vessel_type: formData.vessel_type || null,
      current_location: formData.current_location || null,
      classification_status: formData.classification_status || null,
      notes: formData.notes || null
    }
    
    mutation.mutate(cleanData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            {vessel ? 'Edit Vessel' : 'Add New Vessel'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vessel Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vessel Type
                </label>
                <input
                  type="text"
                  value={formData.vessel_type}
                  onChange={(e) => setFormData({ ...formData, vessel_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Price (AED)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="scrapping">Scrapping</option>
                  <option value="scrapped">Scrapped</option>
                  <option value="under_overhaul">Under Overhaul</option>
                  <option value="sold">Sold</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Location
                </label>
                <input
                  type="text"
                  value={formData.current_location}
                  onChange={(e) => setFormData({ ...formData, current_location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tonnage
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tonnage}
                  onChange={(e) => setFormData({ ...formData, tonnage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year Built
                </label>
                <input
                  type="number"
                  value={formData.year_built}
                  onChange={(e) => setFormData({ ...formData, year_built: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Classification Status
              </label>
              <input
                type="text"
                value={formData.classification_status}
                onChange={(e) => setFormData({ ...formData, classification_status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
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
                {mutation.isPending ? 'Saving...' : vessel ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
