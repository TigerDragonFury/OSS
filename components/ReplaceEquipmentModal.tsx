'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AlertTriangle, Package, Wrench, X } from 'lucide-react'

interface ReplaceEquipmentModalProps {
  isOpen: boolean
  onClose: () => void
  vesselId: string
  vesselName: string
  maintenanceScheduleId?: string
  overhaulProjectId?: string
  onSuccess?: () => void
}

export default function ReplaceEquipmentModal({
  isOpen,
  onClose,
  vesselId,
  vesselName,
  maintenanceScheduleId,
  overhaulProjectId,
  onSuccess
}: ReplaceEquipmentModalProps) {
  const [formData, setFormData] = useState({
    old_equipment_name: '',
    failure_reason: '',
    failure_date: new Date().toISOString().split('T')[0],
    new_equipment_source: 'inventory' as 'inventory' | 'purchase' | 'repair',
    inventory_id: '',
    replacement_cost: 0,
    labor_cost: 0,
    old_equipment_disposition: 'sent_to_warehouse' as 'scrapped' | 'sent_to_warehouse' | 'repaired' | 'sold' | 'disposed',
    warehouse_id: '',
    notes: ''
  })

  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: inventory } = useQuery({
    queryKey: ['available_inventory_for_replacement'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marine_inventory')
        .select('*')
        .gt('quantity', 0)
        .in('status', ['in_stock', 'low_stock'])
        .order('equipment_name')
      if (error) throw error
      return data
    },
    enabled: isOpen && formData.new_equipment_source === 'inventory'
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('status', 'active')
        .order('name')
      if (error) throw error
      return data
    },
    enabled: isOpen && formData.old_equipment_disposition === 'sent_to_warehouse'
  })

  const replaceEquipmentMutation = useMutation({
    mutationFn: async (replacementData: any) => {
      // First, create the equipment replacement record
      const { data: replacement, error: replError } = await supabase
        .from('equipment_replacements')
        .insert({
          vessel_id: vesselId,
          old_equipment_name: replacementData.old_equipment_name,
          failure_reason: replacementData.failure_reason,
          failure_date: replacementData.failure_date,
          new_equipment_source: replacementData.new_equipment_source,
          inventory_id: replacementData.inventory_id || null,
          replacement_date: new Date().toISOString().split('T')[0],
          replacement_cost: replacementData.replacement_cost,
          labor_cost: replacementData.labor_cost,
          old_equipment_disposition: replacementData.old_equipment_disposition,
          warehouse_id: replacementData.warehouse_id || null,
          maintenance_schedule_id: maintenanceScheduleId || null,
          overhaul_project_id: overhaulProjectId || null,
          notes: replacementData.notes
        })
        .select()
        .single()

      if (replError) throw replError

      // If old equipment sent to warehouse, optionally create a land_equipment record
      if (replacementData.old_equipment_disposition === 'sent_to_warehouse' && replacementData.warehouse_id) {
        await supabase
          .from('land_equipment')
          .insert({
            equipment_name: replacementData.old_equipment_name,
            warehouse_id: replacementData.warehouse_id,
            condition: 'poor',
            status: 'in_warehouse',
            estimated_value: replacementData.replacement_cost * 0.1, // 10% of replacement cost as salvage value
            description: `Removed from ${vesselName}: ${replacementData.failure_reason}`
          })
      }

      return replacement
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marine_inventory'] })
      queryClient.invalidateQueries({ queryKey: ['equipment_replacements'] })
      queryClient.invalidateQueries({ queryKey: ['land_equipment'] })
      setFormData({
        old_equipment_name: '',
        failure_reason: '',
        failure_date: new Date().toISOString().split('T')[0],
        new_equipment_source: 'inventory',
        inventory_id: '',
        replacement_cost: 0,
        labor_cost: 0,
        old_equipment_disposition: 'sent_to_warehouse',
        warehouse_id: '',
        notes: ''
      })
      onSuccess?.()
      onClose()
    },
    onError: (error: any) => {
      alert(`Error: ${error.message || 'Failed to record equipment replacement'}`)
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.old_equipment_name || !formData.failure_reason) {
      alert('Please fill in all required fields')
      return
    }

    if (formData.new_equipment_source === 'inventory' && !formData.inventory_id) {
      alert('Please select an inventory item for replacement')
      return
    }

    if (formData.old_equipment_disposition === 'sent_to_warehouse' && !formData.warehouse_id) {
      alert('Please select a warehouse for the old equipment')
      return
    }

    replaceEquipmentMutation.mutate(formData)
  }

  const selectedInventoryItem = inventory?.find((item: any) => item.id === formData.inventory_id)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-red-50">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Replace Equipment</h2>
              <p className="text-gray-600">Vessel: {vesselName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Old Equipment Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Failed Equipment
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Equipment Name *
              </label>
              <input
                type="text"
                required
                value={formData.old_equipment_name}
                onChange={(e) => setFormData({...formData, old_equipment_name: e.target.value})}
                placeholder="e.g., Main Engine, Generator #2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Failure Reason *
              </label>
              <textarea
                required
                value={formData.failure_reason}
                onChange={(e) => setFormData({...formData, failure_reason: e.target.value})}
                placeholder="Describe why the equipment failed..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Failure Date
              </label>
              <input
                type="date"
                value={formData.failure_date}
                onChange={(e) => setFormData({...formData, failure_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What happened to old equipment? *
              </label>
              <select
                value={formData.old_equipment_disposition}
                onChange={(e) => setFormData({...formData, old_equipment_disposition: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="sent_to_warehouse">Sent to Warehouse</option>
                <option value="scrapped">Scrapped</option>
                <option value="repaired">Sent for Repair</option>
                <option value="sold">Sold</option>
                <option value="disposed">Disposed</option>
              </select>
            </div>

            {formData.old_equipment_disposition === 'sent_to_warehouse' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Warehouse *
                </label>
                <select
                  required
                  value={formData.warehouse_id}
                  onChange={(e) => setFormData({...formData, warehouse_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Warehouse --</option>
                  {warehouses?.map((warehouse: any) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} - {warehouse.location}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* New Equipment Section */}
          <div className="space-y-4 pt-6 border-t">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Replacement Equipment
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Replacement Source *
              </label>
              <select
                value={formData.new_equipment_source}
                onChange={(e) => setFormData({...formData, new_equipment_source: e.target.value as any, inventory_id: ''})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="inventory">From Inventory</option>
                <option value="purchase">New Purchase</option>
                <option value="repair">Repaired Old Equipment</option>
              </select>
            </div>

            {formData.new_equipment_source === 'inventory' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Inventory Item *
                </label>
                <select
                  required
                  value={formData.inventory_id}
                  onChange={(e) => {
                    const item = inventory?.find((i: any) => i.id === e.target.value)
                    setFormData({
                      ...formData, 
                      inventory_id: e.target.value,
                      replacement_cost: parseFloat(item?.unit_price || 0)
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Item --</option>
                  {inventory?.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.equipment_name} (Stock: {item.quantity}, ৳{parseFloat(item.unit_price || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
                {selectedInventoryItem && (
                  <p className="text-sm text-blue-600 mt-1">
                    ✓ {selectedInventoryItem.equipment_name} - Category: {selectedInventoryItem.category}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Replacement Cost (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.replacement_cost}
                  onChange={(e) => setFormData({...formData, replacement_cost: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Labor Cost (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.labor_cost}
                  onChange={(e) => setFormData({...formData, labor_cost: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Replacement Cost:</p>
              <p className="text-2xl font-bold text-gray-900">
                ৳{(formData.replacement_cost + formData.labor_cost).toLocaleString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Any additional details..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={replaceEquipmentMutation.isPending}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {replaceEquipmentMutation.isPending ? 'Recording...' : (
                <>
                  <AlertTriangle className="h-5 w-5" />
                  Record Replacement
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
