'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, DollarSign, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import PaymentSplitsInput from '@/components/PaymentSplitsInput'

export default function LandsPage() {
  const [isAdding, setIsAdding] = useState(false)
  const [editingLand, setEditingLand] = useState<any>(null)
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  const deleteMutation = useMutation({
    mutationFn: async (landId: string) => {
      const { error } = await supabase
        .from('land_purchases')
        .delete()
        .eq('id', landId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['land_purchases'] })
      queryClient.invalidateQueries({ queryKey: ['land_financial_summary'] })
    },
    onError: (error: any) => {
      alert(`Error deleting land: ${error.message}`)
    }
  })
  
  const handleDelete = (land: any) => {
    if (confirm(`Are you sure you want to delete "${land.land_name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(land.id)
    }
  }

  const { data: lands, isLoading } = useQuery({
    queryKey: ['land_purchases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('land_purchases')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: landFinancials } = useQuery({
    queryKey: ['land_financial_summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('land_financial_summary')
        .select('*')
      if (error) throw error
      return data
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Land Purchases</h1>
          <p className="text-gray-600 mt-1">Manage scrap land operations</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Land
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {lands?.map((land) => {
            const financial = landFinancials?.find(l => l.id === land.id)
            return (
              <div key={land.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <Link href={`/dashboard/scrap/lands/${land.id}`}>
                        <h3 className="text-xl font-semibold text-gray-900 hover:text-blue-600 cursor-pointer">
                          {land.land_name}
                        </h3>
                      </Link>
                      <span className={`ml-3 px-3 py-1 rounded-full text-xs font-medium ${
                        land.status === 'active' ? 'bg-green-100 text-green-800' :
                        land.status === 'partially_cleared' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {land.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Location</p>
                        <p className="font-medium">{land.location || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Purchase Price</p>
                        <p className="font-medium">{land.purchase_price?.toLocaleString() || 'N/A'} AED</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Estimated Tonnage</p>
                        <p className="font-medium">{land.estimated_tonnage || 'N/A'} tons</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Remaining Tonnage</p>
                        <p className="font-medium">{land.remaining_tonnage || 'N/A'} tons</p>
                      </div>
                    </div>

                    {financial && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Financial Summary</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Equipment Sales</p>
                            <p className="font-semibold text-green-600">
                              +{financial.total_equipment_sales?.toLocaleString() || 0} AED
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Scrap Sales</p>
                            <p className="font-semibold text-green-600">
                              +{financial.total_scrap_sales?.toLocaleString() || 0} AED
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Total Expenses</p>
                            <p className="font-semibold text-red-600">
                              -{financial.total_expenses?.toLocaleString() || 0} AED
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Net Profit/Loss</p>
                            <p className={`font-bold ${financial.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {financial.net_profit >= 0 ? '+' : ''}{financial.net_profit?.toLocaleString() || 0} AED
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {land.notes && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600">{land.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex gap-2">
                    <Link 
                      href={`/dashboard/scrap/lands/${land.id}`}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="View Details"
                    >
                      <DollarSign className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => setEditingLand(land)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded"
                      title="Edit Land"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(land)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete Land"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {lands?.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">No land purchases yet. Click "Add Land" to get started.</p>
            </div>
          )}
        </div>
      )}

      {isAdding && <LandForm onClose={() => setIsAdding(false)} />}
      
      {editingLand && (
        <LandForm 
          land={editingLand}
          onClose={() => setEditingLand(null)} 
        />
      )}
    </div>
  )
}

function LandForm({ onClose, land }: { onClose: () => void, land?: any }) {
  const [formData, setFormData] = useState({
    land_name: land?.land_name || '',
    location: land?.location || '',
    purchase_price: land?.purchase_price || '',
    purchase_date: land?.purchase_date || '',
    estimated_tonnage: land?.estimated_tonnage || '',
    remaining_tonnage: land?.remaining_tonnage || land?.estimated_tonnage || '',
    status: land?.status || 'active',
    notes: land?.notes || '',
    paid_by_owner_id: land?.paid_by_owner_id || ''
  })
  
  const [paymentSplits, setPaymentSplits] = useState<any[]>([])

  const queryClient = useQueryClient()
  const supabase = createClient()
  
  // Fetch owners
  const { data: owners = [] } = useQuery({
    queryKey: ['owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owners')
        .select('id, name')
        .eq('status', 'active')
        .order('name')
      if (error) throw error
      return data
    }
  })
  
  // Fetch existing payment splits if editing
  const { data: existingSplits = [] } = useQuery({
    queryKey: ['payment_splits', land?.id],
    enabled: !!land?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_splits')
        .select('*, owners(name)')
        .eq('land_purchase_id', land.id)
      if (error) throw error
      return data.map(split => ({
        owner_id: split.owner_id,
        owner_name: (split.owners as any)?.name,
        amount_paid: split.amount_paid,
        source_of_funds: split.source_of_funds || 'personal_savings'
      }))
    }
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      let landId = land?.id
      
      if (land) {
        // Update existing land
        const { error } = await supabase
          .from('land_purchases')
          .update(data.landData)
          .eq('id', land.id)
        if (error) throw error
      } else {
        // Insert new land
        const { data: result, error } = await supabase
          .from('land_purchases')
          .insert([data.landData])
          .select()
        if (error) throw error
        landId = result[0].id
      }
      
      // Handle payment splits if provided
      if (data.paymentSplits && data.paymentSplits.length > 0 && landId) {
        // Delete existing splits
        await supabase
          .from('payment_splits')
          .delete()
          .eq('land_purchase_id', landId)
        
        // Insert new splits
        const splitsData = data.paymentSplits.map((split: any) => ({
          land_purchase_id: landId,
          owner_id: split.owner_id,
          amount_paid: split.amount_paid,
          payment_date: data.landData.purchase_date || new Date().toISOString().split('T')[0],
          source_of_funds: split.source_of_funds || 'personal_savings'
        }))
        
        const { error: splitsError } = await supabase
          .from('payment_splits')
          .insert(splitsData)
        
        if (splitsError) throw splitsError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['land_purchases'] })
      queryClient.invalidateQueries({ queryKey: ['land_financial_summary'] })
      queryClient.invalidateQueries({ queryKey: ['payment_splits'] })
      queryClient.invalidateQueries({ queryKey: ['owner_equity_summary'] })
      onClose()
    },
    onError: (error: any) => {
      alert(`Error: ${error.message || 'Failed to save land'}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const cleanData = {
      ...formData,
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      estimated_tonnage: formData.estimated_tonnage ? parseFloat(formData.estimated_tonnage) : null,
      remaining_tonnage: formData.remaining_tonnage ? parseFloat(formData.remaining_tonnage) : null,
      purchase_date: formData.purchase_date || null,
      location: formData.location || null,
      notes: formData.notes || null,
      paid_by_owner_id: formData.paid_by_owner_id || null
    }
    
    mutation.mutate({
      landData: cleanData,
      paymentSplits: paymentSplits.length > 0 ? paymentSplits : null
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            {land ? 'Edit Land Purchase' : 'Add New Land Purchase'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Land Name *</label>
                <input
                  type="text"
                  required
                  value={formData.land_name}
                  onChange={(e) => setFormData({ ...formData, land_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Payment Information Section */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h3>
              
              {/* Simple single owner payment */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paid By (Single Owner) - Optional
                </label>
                <select
                  value={formData.paid_by_owner_id}
                  onChange={(e) => setFormData({ ...formData, paid_by_owner_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">-- Select Owner (if single payer) --</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>{owner.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Use this if one owner paid the full amount
                </p>
              </div>

              {/* Split payments between multiple owners */}
              {formData.purchase_price && parseFloat(formData.purchase_price) > 0 && (
                <PaymentSplitsInput
                  owners={owners}
                  totalAmount={parseFloat(formData.purchase_price)}
                  existingSplits={existingSplits}
                  onChange={setPaymentSplits}
                />
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4 mt-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Tonnage</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.estimated_tonnage}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    estimated_tonnage: e.target.value,
                    remaining_tonnage: formData.remaining_tonnage || e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remaining Tonnage</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.remaining_tonnage}
                  onChange={(e) => setFormData({ ...formData, remaining_tonnage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="partially_cleared">Partially Cleared</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
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
                {mutation.isPending ? 'Saving...' : land ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
