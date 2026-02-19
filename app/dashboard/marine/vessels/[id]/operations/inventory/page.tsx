'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { hasModulePermission } from '@/lib/auth/rolePermissions'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use } from 'react'
import { Plus, Edit2, Trash2, Package, Wrench, Archive, RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react'
import React from 'react'
import UseInventoryModal from '@/components/UseInventoryModal'
import ReplaceEquipmentModal from '@/components/ReplaceEquipmentModal'

export default function InventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [activeTab, setActiveTab] = useState<'usage' | 'replacements' | 'spares'>('usage')
  const [showUseInventory, setShowUseInventory] = useState(false)
  const [showReplaceEquipment, setShowReplaceEquipment] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [returningReplacement, setReturningReplacement] = useState<any>(null)
  const [returnReason, setReturnReason] = useState('')
  
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { user } = useAuth()
  
  // Get user role and permissions
  const userRole = user?.role || user?.roles?.[0] || 'storekeeper'
  const canEdit = hasModulePermission(userRole, ['marine', 'vessels'], 'edit')
  const canDelete = hasModulePermission(userRole, ['marine', 'vessels'], 'delete')
  const canCreate = hasModulePermission(userRole, ['marine', 'vessels'], 'create')

  // Vessel Data
  const { data: vessel } = useQuery({
    queryKey: ['vessel', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessels')
        .select('*')
        .eq('id', resolvedParams.id)
        .single()
      if (error) throw error
      return data
    }
  })

  // Inventory Usage Query  
  const { data: inventoryUsage } = useQuery({
    queryKey: ['vessel_inventory_usage', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_usage')
        .select(`
          *,
          marine_inventory(equipment_name, category, unit),
          vessel_overhaul_projects(project_name)
        `)
        .eq('vessel_id', resolvedParams.id)
        .order('usage_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  // Equipment Replacements Query
  const { data: equipmentReplacements } = useQuery({
    queryKey: ['vessel_equipment_replacements', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_replacements')
        .select(`
          *,
          warehouses(name, location),
          marine_inventory(equipment_name),
          vessel_overhaul_projects(project_name)
        `)
        .eq('vessel_id', resolvedParams.id)
        .order('replacement_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  // Spares Inventory Query (from new schema)
  const { data: sparesInventory } = useQuery({
    queryKey: ['vessel_spares_inventory', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_spares_inventory')
        .select('*')
        .eq('vessel_id', resolvedParams.id)
        .order('part_name', { ascending: true })
      if (error) {
        console.error('Spares inventory error:', error)
        return []
      }
      return data
    }
  })

  // Delete Inventory Usage — restores stock to marine_inventory
  const deleteInventoryUsage = useMutation({
    mutationFn: async (id: string) => {
      // 1. Fetch the usage row so we know how much to restore
      const { data: usage, error: fetchError } = await supabase
        .from('inventory_usage')
        .select('inventory_id, quantity_used, expense_ref')
        .eq('id', id)
        .single()
      if (fetchError) throw fetchError

      // 2. Restore quantity in marine_inventory
      if (usage?.inventory_id && usage?.quantity_used) {
        const { data: inv } = await supabase
          .from('marine_inventory')
          .select('quantity, reorder_level')
          .eq('id', usage.inventory_id)
          .single()

        if (inv) {
          const newQty = (inv.quantity || 0) + usage.quantity_used
          await supabase
            .from('marine_inventory')
            .update({
              quantity: newQty,
              status: newQty <= 0 ? 'out_of_stock'
                     : newQty <= (inv.reorder_level || 10) ? 'low_stock'
                     : 'in_stock',
              updated_at: new Date().toISOString(),
            })
            .eq('id', usage.inventory_id)
        }
      }

      // 3. Void the auto-created expense if it was linked
      if (usage?.expense_ref) {
        await supabase.from('expenses').delete().eq('id', usage.expense_ref)
      }

      // 4. Delete the usage record
      const { error } = await supabase.from('inventory_usage').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_inventory_usage', resolvedParams.id] })
      queryClient.invalidateQueries({ queryKey: ['marine_inventory'] })
      queryClient.invalidateQueries({ queryKey: ['available_inventory'] })
      queryClient.invalidateQueries({ queryKey: ['vessel_all_expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    }
  })

  // Delete Equipment Replacement
  const deleteReplacement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('equipment_replacements')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_equipment_replacements', resolvedParams.id] })
    }
  })

  // Return Part (mismatch / wrong fit) — restores inventory quantity & voids expense
  const returnPartMutation = useMutation({
    mutationFn: async ({ replacement, reason }: { replacement: any; reason: string }) => {
      // 1. Restore inventory stock if the new part came from marine_inventory
      if (replacement.inventory_id && replacement.new_equipment_source === 'inventory') {
        const { data: inv } = await supabase
          .from('marine_inventory')
          .select('quantity, reorder_level')
          .eq('id', replacement.inventory_id)
          .single()
        if (inv) {
          const newQty = (inv.quantity || 0) + 1
          await supabase
            .from('marine_inventory')
            .update({
              quantity: newQty,
              status: newQty <= 0 ? 'out_of_stock' : newQty <= (inv.reorder_level || 10) ? 'low_stock' : 'in_stock',
              updated_at: new Date().toISOString(),
            })
            .eq('id', replacement.inventory_id)
        }
      }

      // 2. Mark replacement as returned
      await supabase
        .from('equipment_replacements')
        .update({
          status: 'returned',
          return_reason: reason,
          returned_at: new Date().toISOString(),
        })
        .eq('id', replacement.id)

      // 3. Void the auto-created expense if it exists
      if (replacement.expense_ref) {
        await supabase.from('expenses').delete().eq('id', replacement.expense_ref)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_equipment_replacements', resolvedParams.id] })
      queryClient.invalidateQueries({ queryKey: ['vessel_all_expenses'] })
      queryClient.invalidateQueries({ queryKey: ['marine_inventory'] })
      queryClient.invalidateQueries({ queryKey: ['available_inventory'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setReturningReplacement(null)
      setReturnReason('')
    },
    onError: (error: any) => {
      alert(`Failed to return part: ${error.message}`)
    }
  })

  const totalInventoryCost = inventoryUsage?.reduce((sum, item) => sum + (item.quantity_used * item.unit_cost), 0) || 0
  const totalReplacementCost = equipmentReplacements?.reduce((sum, item) => sum + (item.replacement_cost || 0) + (item.labor_cost || 0), 0) || 0
  const totalSparesValue = sparesInventory?.reduce((sum, spare) => sum + (spare.quantity * spare.unit_cost), 0) || 0
  const lowStockItems = sparesInventory?.filter(spare => spare.quantity <= spare.min_quantity).length || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parts & Inventory</h1>
          <p className="text-gray-600">Track parts usage, equipment replacements, and spares inventory</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowUseInventory(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Package className="h-5 w-5" />
            Use Inventory
          </button>
          <button
            onClick={() => setShowReplaceEquipment(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Wrench className="h-5 w-5" />
            Replace Equipment
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Inventory Usage Cost</p>
              <p className="text-2xl font-bold text-gray-900">{totalInventoryCost.toLocaleString()} Đ</p>
              <p className="text-sm text-gray-500 mt-1">{inventoryUsage?.length || 0} transactions</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <Wrench className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-sm text-gray-600">Replacement Cost</p>
              <p className="text-2xl font-bold text-gray-900">{totalReplacementCost.toLocaleString()} Đ</p>
              <p className="text-sm text-gray-500 mt-1">{equipmentReplacements?.length || 0} replacements</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <Archive className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Spares Inventory Value</p>
              <p className="text-2xl font-bold text-gray-900">{totalSparesValue.toLocaleString()} Đ</p>
              <p className="text-sm text-gray-500 mt-1">{sparesInventory?.length || 0} items</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-sm text-gray-600">Low Stock Alerts</p>
              <p className="text-2xl font-bold text-orange-600">{lowStockItems}</p>
              <p className="text-sm text-gray-500 mt-1">Items below minimum</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('usage')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'usage'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Parts Used
              </div>
            </button>
            <button
              onClick={() => setActiveTab('replacements')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'replacements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Equipment Replaced
              </div>
            </button>
            <button
              onClick={() => setActiveTab('spares')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'spares'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4" />
                Spares Inventory
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'usage' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Parts Used</h3>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inventoryUsage?.map((usage) => (
                      <tr key={usage.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(usage.usage_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{usage.marine_inventory?.equipment_name || 'N/A'}</p>
                            <p className="text-sm text-gray-500">{usage.marine_inventory?.category || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {usage.vessel_overhaul_projects?.project_name || 'General Use'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {usage.quantity_used} {usage.marine_inventory?.unit || 'pcs'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {usage.unit_cost.toLocaleString()} AED
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-red-600">
                            {(usage.quantity_used * usage.unit_cost).toLocaleString()} AED
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              if (confirm('Delete this inventory usage record?')) {
                                deleteInventoryUsage.mutate(usage.id)
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
                {(!inventoryUsage || inventoryUsage.length === 0) && (
                  <div className="text-center py-12 text-gray-500">
                    No inventory usage recorded yet
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'replacements' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Equipment Replaced</h3>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Old Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Replacement Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Labor Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {equipmentReplacements?.map((replacement) => (
                      <React.Fragment key={replacement.id}>
                        <tr key={replacement.id} className={`hover:bg-gray-50 ${replacement.status === 'returned' ? 'opacity-60 bg-gray-50' : ''}`}>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {new Date(replacement.replacement_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{replacement.old_equipment_name || 'N/A'}</p>
                              <p className="text-sm text-gray-500">{replacement.reason || replacement.failure_reason || 'N/A'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{replacement.marine_inventory?.equipment_name || replacement.new_equipment_source || 'N/A'}</p>
                              <p className="text-sm text-gray-500">{replacement.warehouses?.name || '—'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {replacement.vessel_overhaul_projects?.project_name || 'General'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {(replacement.replacement_cost || 0).toLocaleString()} Đ
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {(replacement.labor_cost || 0).toLocaleString()} Đ
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-red-600">
                              {((replacement.replacement_cost || 0) + (replacement.labor_cost || 0)).toLocaleString()} Đ
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {replacement.status === 'returned' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                <RotateCcw className="h-3 w-3" />
                                Returned
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3" />
                                Confirmed
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {/* Return Part button — only for confirmed replacements from inventory */}
                              {(!replacement.status || replacement.status === 'confirmed') && replacement.inventory_id && (
                                <button
                                  onClick={() => {
                                    setReturningReplacement(replacement)
                                    setReturnReason('')
                                  }}
                                  className="flex items-center gap-1 text-xs px-2 py-1 text-orange-700 bg-orange-50 hover:bg-orange-100 rounded border border-orange-200"
                                  title="Return part to inventory (mismatch / wrong fit)"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Return Part
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => {
                                    if (confirm('Delete this replacement record?')) {
                                      deleteReplacement.mutate(replacement.id)
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {/* Inline return reason form */}
                        {returningReplacement?.id === replacement.id && (
                          <tr key={`${replacement.id}-return`} className="bg-orange-50">
                            <td colSpan={9} className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-orange-800 mb-2">
                                    Return "{replacement.marine_inventory?.equipment_name}" to inventory (mismatch / wrong fit)
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      placeholder="Reason for return (e.g. wrong size, incompatible)..."
                                      value={returnReason}
                                      onChange={e => setReturnReason(e.target.value)}
                                      className="flex-1 px-3 py-1.5 text-sm border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-400"
                                    />
                                    <button
                                      disabled={!returnReason.trim() || returnPartMutation.isPending}
                                      onClick={() => returnPartMutation.mutate({ replacement, reason: returnReason })}
                                      className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    >
                                      {returnPartMutation.isPending ? 'Returning...' : 'Confirm Return'}
                                    </button>
                                    <button
                                      onClick={() => setReturningReplacement(null)}
                                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                  <p className="text-xs text-orange-600 mt-1">
                                    This will restore 1 unit to marine inventory and void the associated expense.
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                {(!equipmentReplacements || equipmentReplacements.length === 0) && (
                  <div className="text-center py-12 text-gray-500">
                    No equipment replacements recorded yet
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'spares' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Spares Inventory</h3>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled
                >
                  <Plus className="h-5 w-5" />
                  Add Spare Part (Coming Soon)
                </button>
              </div>

              {!sparesInventory ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">
                    ⚠️ The <code>vessel_spares_inventory</code> table needs to be created. Please run <code>vessel-operations-schema.sql</code> in Supabase.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sparesInventory?.map((spare) => {
                        const isLowStock = spare.quantity <= spare.min_quantity
                        return (
                          <tr key={spare.id} className={`${isLowStock ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">{spare.part_name}</p>
                                {isLowStock && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                                    Low Stock
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{spare.part_number || 'N/A'}</td>
                            <td className="px- 6 py-4 text-sm text-gray-900">{spare.category}</td>
                            <td className="px-6 py-4">
                              <span className={`text-sm font-semibold ${isLowStock ? 'text-orange-600' : 'text-gray-900'}`}>
                                {spare.quantity} {spare.unit}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{spare.min_quantity}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{spare.unit_cost.toLocaleString()} Đ</td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                              {(spare.quantity * spare.unit_cost).toLocaleString()} AED
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{spare.location_onboard || 'N/A'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {sparesInventory?.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      No spares inventory tracked yet
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showUseInventory && (
        <UseInventoryModal
          isOpen={showUseInventory}
          vesselId={resolvedParams.id}
          onClose={() => setShowUseInventory(false)}
        />
      )}

      {showReplaceEquipment && (
        <ReplaceEquipmentModal
          isOpen={showReplaceEquipment}
          vesselId={resolvedParams.id}
          vesselName={vessel?.name || 'Unknown Vessel'}
          onClose={() => setShowReplaceEquipment(false)}
        />
      )}
    </div>
  )
}
