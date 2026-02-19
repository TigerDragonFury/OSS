'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Package, Plus, X, Search } from 'lucide-react'

interface UseInventoryModalProps {
  isOpen: boolean
  onClose: () => void
  vesselId?: string
  maintenanceScheduleId?: string
  overhaulProjectId?: string
  onSuccess?: () => void
}

export default function UseInventoryModal({
  isOpen,
  onClose,
  vesselId,
  maintenanceScheduleId,
  overhaulProjectId,
  onSuccess
}: UseInventoryModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState<Array<{
    inventory_id: string
    equipment_name: string
    available_quantity: number
    quantity_used: number
    unit_cost: number
    purpose: string
    notes: string
  }>>([])
  
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: inventory } = useQuery({
    queryKey: ['available_inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marine_inventory')
        .select(`
          *,
          warehouses (
            name,
            location
          )
        `)
        .gt('quantity', 0)
        .in('status', ['in_stock', 'low_stock'])
        .order('equipment_name')
      if (error) throw error
      return data
    },
    enabled: isOpen
  })

  const filteredInventory = inventory?.filter((item: any) =>
    item.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const addItemToList = (item: any) => {
    if (!selectedItems.find(si => si.inventory_id === item.id)) {
      setSelectedItems([...selectedItems, {
        inventory_id: item.id,
        equipment_name: item.equipment_name,
        available_quantity: item.quantity,
        quantity_used: 1,
        unit_cost: parseFloat(item.unit_price) || 0,
        purpose: maintenanceScheduleId ? 'maintenance' : 'overhaul',
        notes: ''
      }])
    }
  }

  const removeItemFromList = (inventory_id: string) => {
    setSelectedItems(selectedItems.filter(item => item.inventory_id !== inventory_id))
  }

  const updateItemQuantity = (inventory_id: string, quantity_used: number) => {
    setSelectedItems(selectedItems.map(item =>
      item.inventory_id === inventory_id
        ? { ...item, quantity_used: Math.max(0, Math.min(quantity_used, item.available_quantity)) }
        : item
    ))
  }

  const updateItemNotes = (inventory_id: string, notes: string) => {
    setSelectedItems(selectedItems.map(item =>
      item.inventory_id === inventory_id ? { ...item, notes } : item
    ))
  }

  const useInventoryMutation = useMutation({
    mutationFn: async (usageData: any[]) => {
      // 1. Insert all inventory_usage rows
      const { data: usageRows, error: usageError } = await supabase
        .from('inventory_usage')
        .insert(usageData)
        .select()
      if (usageError) throw usageError

      // 2. Auto-create a single expense record for the total cost (if tied to a vessel)
      if (vesselId) {
        const totalCost = usageData.reduce((sum, row) => sum + (row.quantity_used * row.unit_cost), 0)
        const itemNames = selectedItems.map(i => i.equipment_name).join(', ')

        const { data: expRow, error: expError } = await supabase
          .from('expenses')
          .insert({
            description: `Parts Used: ${itemNames}`,
            expense_type: 'parts_usage',
            category: 'parts',
            amount: totalCost,
            date: new Date().toISOString().split('T')[0],
            project_id: vesselId,
            project_type: 'vessel',
            status: 'paid',
            payment_method: 'from_inventory',
          })
          .select()
          .single()

        // Soft-link expense back to each usage row (best-effort, ignore error)
        if (!expError && expRow && usageRows?.length) {
          const ids = (usageRows as any[]).map((r: any) => r.id)
          await supabase
            .from('inventory_usage')
            .update({ expense_ref: expRow.id })
            .in('id', ids)
        }
      }

      return usageRows
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marine_inventory'] })
      queryClient.invalidateQueries({ queryKey: ['available_inventory'] })
      queryClient.invalidateQueries({ queryKey: ['vessel_all_expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setSelectedItems([])
      onSuccess?.()
      onClose()
    },
    onError: (error: any) => {
      alert(`Error: ${error.message || 'Failed to record inventory usage'}`)
    }
  })

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      alert('Please select at least one item')
      return
    }

    const usageData = selectedItems.map(item => ({
      inventory_id: item.inventory_id,
      quantity_used: item.quantity_used,
      maintenance_schedule_id: maintenanceScheduleId || null,
      overhaul_project_id: overhaulProjectId || null,
      vessel_id: vesselId || null,
      purpose: item.purpose,
      notes: item.notes,
      unit_cost: item.unit_cost,
      usage_date: new Date().toISOString()
    }))

    useInventoryMutation.mutate(usageData)
  }

  const totalCost = selectedItems.reduce((sum, item) => 
    sum + (item.quantity_used * item.unit_cost), 0
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Use Inventory Items</h2>
            <p className="text-gray-600 mt-1">Select spare parts and supplies to use</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Inventory */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Inventory</h3>
            
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Inventory List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredInventory?.map((item: any) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => addItemToList(item)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.equipment_name}</p>
                      <p className="text-sm text-gray-600">{item.category || 'N/A'}</p>
                      <p className="text-sm text-gray-500">
                        Stock: {item.quantity} {item.unit || 'pcs'} | ৳{parseFloat(item.unit_price || 0).toLocaleString()}/unit
                      </p>
                      {item.warehouses && (
                        <p className="text-xs text-gray-500">📍 {item.warehouses.name}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        addItemToList(item)
                      }}
                      className="p-1 hover:bg-blue-100 rounded"
                    >
                      <Plus className="h-5 w-5 text-blue-600" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredInventory?.length === 0 && (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No inventory items found</p>
                </div>
              )}
            </div>
          </div>

          {/* Selected Items */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Selected Items ({selectedItems.length})
            </h3>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {selectedItems.map((item) => (
                <div key={item.inventory_id} className="border rounded-lg p-3 bg-blue-50">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-gray-900">{item.equipment_name}</p>
                    <button
                      onClick={() => removeItemFromList(item.inventory_id)}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm text-gray-600">Quantity to use</label>
                      <input
                        type="number"
                        min="1"
                        max={item.available_quantity}
                        value={item.quantity_used}
                        onChange={(e) => updateItemQuantity(item.inventory_id, parseFloat(e.target.value))}
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Available: {item.available_quantity} | Cost: ৳{(item.quantity_used * item.unit_cost).toLocaleString()}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-600">Notes (optional)</label>
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => updateItemNotes(item.inventory_id, e.target.value)}
                        placeholder="e.g., Replaced damaged part"
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {selectedItems.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No items selected</p>
                  <p className="text-sm text-gray-400">Click items on the left to add them</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Total Items: {selectedItems.length}</p>
              <p className="text-lg font-bold text-gray-900">Total Cost: ৳{totalCost.toLocaleString()}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={selectedItems.length === 0 || useInventoryMutation.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {useInventoryMutation.isPending ? 'Recording...' : 'Record Usage'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
