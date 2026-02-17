'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Package, AlertTriangle, Search, Edit2, Trash2, ClipboardList } from 'lucide-react'
import Pagination from '@/components/Pagination'

export default function InventoryPage() {
  const [isAdding, setIsAdding] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [ledgerItem, setLedgerItem] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterWarehouse, setFilterWarehouse] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterVessel, setFilterVessel] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['marine_inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marine_inventory')
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
    queryKey: ['warehouses_active'],
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

  const { data: ledgerEntries, isLoading: isLedgerLoading } = useQuery({
    queryKey: ['inventory_ledger', ledgerItem?.id],
    enabled: !!ledgerItem,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_ledger_view')
        .select('*')
        .eq('inventory_id', ledgerItem.id)
        .order('occurred_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data
    }
  })

  // Get vessels that have inventory items
  const vesselsWithInventory = inventory
    ? [...new Set(inventory.filter((item: any) => item.vessel_id).map((item: any) => item.vessel_id))]
    : []

  const filteredVessels = vessels?.filter((v: any) => vesselsWithInventory.includes(v.id)) || []

  // Get unique categories from inventory
  const categories = inventory
    ? [...new Set(inventory.map((item: any) => item.category).filter(Boolean))]
    : []

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marine_inventory')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marine_inventory'] })
    },
    onError: (error: any) => {
      alert(`Error: ${error.message || 'Failed to delete item'}`)
    }
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('marine_inventory')
        .delete()
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      setSelectedItems(new Set())
      queryClient.invalidateQueries({ queryKey: ['marine_inventory'] })
    },
    onError: (error: any) => {
      alert(`Error: ${error.message || 'Failed to delete items'}`)
    }
  })

  const handleDelete = (item: any) => {
    if (confirm(`Are you sure you want to delete "${item.equipment_name}"?`)) {
      deleteMutation.mutate(item.id)
    }
  }

  const handleBulkDelete = () => {
    const count = selectedItems.size
    if (count === 0) {
      alert('Please select items to delete')
      return
    }
    if (confirm(`Are you sure you want to delete ${count} selected item(s)?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedItems))
    }
  }

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredInventory?.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredInventory?.map((item: any) => item.id) || []))
    }
  }

  const filteredInventory = inventory?.filter((item: any) => {
    const matchesSearch = item.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesWarehouse = !filterWarehouse || item.warehouse_id === filterWarehouse
    const matchesStatus = !filterStatus || item.status === filterStatus
    const matchesVessel = !filterVessel || item.vessel_id === filterVessel
    const matchesCategory = !filterCategory || item.category === filterCategory
    return matchesSearch && matchesWarehouse && matchesStatus && matchesVessel && matchesCategory
  })

  // Pagination
  const totalPages = Math.ceil((filteredInventory?.length || 0) / itemsPerPage)
  const paginatedInventory = filteredInventory?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const lowStockItems = inventory?.filter((item: any) => 
    item.quantity <= (item.reorder_level || 0) && item.status === 'in_stock'
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Marine Inventory</h1>
          <p className="text-gray-600 mt-1">Track equipment, spare parts, and materials across warehouses</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center w-full sm:w-auto justify-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Item
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Total Items</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{inventory?.length || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">In Stock</p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {inventory?.filter((i: any) => i.status === 'in_stock').length || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Low Stock</p>
          <p className="text-2xl font-bold text-yellow-600 mt-2">{lowStockItems?.length || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600 mt-2">
            {inventory?.filter((i: any) => i.status === 'out_of_stock').length || 0}
          </p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems && lowStockItems.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
            <div>
              <p className="font-medium text-yellow-800">Low Stock Alert</p>
              <p className="text-sm text-yellow-700 mt-1">
                {lowStockItems.length} item(s) need reordering
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700 font-medium">
              {selectedItems.size} item(s) selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="relative md:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
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
            {filteredVessels.map((v: any) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat: string) => (
              <option key={cat} value={cat}>{cat.replace('_', ' ').toUpperCase()}</option>
            ))}
          </select>

          <select
            value={filterWarehouse}
            onChange={(e) => setFilterWarehouse(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Warehouses</option>
            {warehouses?.map((wh: any) => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="in_maintenance">In Maintenance</option>
            <option value="on_vessel">On Vessel</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('')
              setFilterWarehouse('')
              setFilterStatus('')
              setFilterVessel('')
              setFilterCategory('')
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Inventory List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === filteredInventory?.length && filteredInventory?.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SL No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedInventory?.map((item: any) => {
                const isLowStock = item.quantity <= (item.reorder_level || 0)
                return (
                  <tr key={item.id} className={isLowStock ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleSelectItem(item.id)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.sl_no || '-'}</td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.equipment_name}</div>
                        {item.category && (
                          <div className="text-xs text-gray-500">{item.category}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.item_code || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{item.description || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-semibold ${
                        isLowStock ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {item.quantity}
                        {isLowStock && <AlertTriangle className="inline h-4 w-4 ml-1" />}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.unit || 'pcs'}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="space-y-1">
                        {item.location && (
                          <div className="text-gray-900 font-medium">{item.location}</div>
                        )}
                        {item.location_1 && (
                          <div className="text-gray-600 text-xs">Box: {item.location_1}</div>
                        )}
                        {item.location_2 && (
                          <div className="text-gray-500 text-xs">Warehouse: {item.location_2}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.ref_no || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.status === 'in_stock' ? 'bg-green-100 text-green-800' :
                        item.status === 'low_stock' ? 'bg-yellow-100 text-yellow-800' :
                        item.status === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                        item.status === 'in_maintenance' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setLedgerItem(item)}
                          className="text-gray-600 hover:text-gray-800"
                          title="Ledger"
                        >
                          <ClipboardList className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingItem(item)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>

          {filteredInventory?.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No inventory items found.</p>
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredInventory?.length}
            itemsPerPage={itemsPerPage}
          />
        </div>
      )}

      {editingItem && (
        <InventoryForm 
          onClose={() => setEditingItem(null)} 
          warehouses={warehouses || []}
          vessels={vessels || []}
          item={editingItem}
        />
      )}

      {isAdding && (
        <InventoryForm 
          onClose={() => setIsAdding(false)} 
          warehouses={warehouses || []}
          vessels={vessels || []}
        />
      )}

      {ledgerItem && (
        <InventoryLedgerModal
          item={ledgerItem}
          entries={ledgerEntries || []}
          isLoading={isLedgerLoading}
          onClose={() => setLedgerItem(null)}
        />
      )}
    </div>
  )
}

function InventoryForm({ onClose, warehouses, vessels, item }: { onClose: () => void, warehouses: any[], vessels: any[], item?: any }) {
  const [formData, setFormData] = useState({
    sl_no: item?.sl_no || '',
    equipment_name: item?.equipment_name || '',
    item_code: item?.item_code || '',
    description: item?.description || '',
    category: item?.category || 'spare_parts',
    warehouse_id: item?.warehouse_id || '',
    vessel_id: item?.vessel_id || '',
    quantity: item?.quantity?.toString() || '',
    unit: item?.unit || 'pcs',
    reorder_level: item?.reorder_level?.toString() || '',
    unit_price: item?.unit_price?.toString() || '',
    status: item?.status || 'in_stock',
    location: item?.location || '',
    location_1: item?.location_1 || '',
    location_2: item?.location_2 || '',
    ref_no: item?.ref_no || '',
    remarks: item?.remarks || ''
  })

  const queryClient = useQueryClient()
  const supabase = createClient()

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const cleanData = {
        ...data,
        quantity: parseFloat(data.quantity) || 0,
        reorder_level: data.reorder_level ? parseFloat(data.reorder_level) : null,
        unit_price: data.unit_price ? parseFloat(data.unit_price) : null,
        vessel_id: data.vessel_id || null,
        warehouse_id: data.warehouse_id || null,
        sl_no: data.sl_no || null,
        item_code: data.item_code || null,
        description: data.description || null,
        location: data.location || null,
        location_1: data.location_1 || null,
        location_2: data.location_2 || null,
        ref_no: data.ref_no || null,
        remarks: data.remarks || null
      }
      
      if (item) {
        // Update existing item
        const { error } = await supabase
          .from('marine_inventory')
          .update(cleanData)
          .eq('id', item.id)
        if (error) throw error
      } else {
        // Insert new item
        const { error } = await supabase
          .from('marine_inventory')
          .insert([cleanData])
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marine_inventory'] })
      onClose()
    },
    onError: (error: any) => {
      alert(`Error: ${error.message || 'Failed to save item'}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">{item ? 'Edit' : 'Add'} Inventory Item</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SL No.</label>
                <input
                  type="text"
                  value={formData.sl_no}
                  onChange={(e) => setFormData({ ...formData, sl_no: e.target.value })}
                  placeholder="e.g., 001, 002"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Name *</label>
                <input
                  type="text"
                  required
                  value={formData.equipment_name}
                  onChange={(e) => setFormData({ ...formData, equipment_name: e.target.value })}
                  placeholder="e.g., Main Engine Generator"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Code</label>
                <input
                  type="text"
                  value={formData.item_code}
                  onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                  placeholder="e.g., GEN-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="spare_parts">Spare Parts</option>
                  <option value="equipment">Equipment</option>
                  <option value="tools">Tools</option>
                  <option value="consumables">Consumables</option>
                  <option value="safety_equipment">Safety Equipment</option>
                  <option value="electrical">Electrical</option>
                  <option value="mechanical">Mechanical</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Detailed description of the item"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  placeholder="pcs, kg, liters, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.reorder_level}
                  onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                  placeholder="Min. quantity"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Location Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., CB (Cutting Box)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">CB, WB, etc.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location - 1</label>
                  <input
                    type="text"
                    value={formData.location_1}
                    onChange={(e) => setFormData({ ...formData, location_1: e.target.value })}
                    placeholder="e.g., WB (Wooden Box)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Box/Container</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location - 2</label>
                  <input
                    type="text"
                    value={formData.location_2}
                    onChange={(e) => setFormData({ ...formData, location_2: e.target.value })}
                    placeholder="e.g., Warehouse A"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Warehouse name</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse (Optional)</label>
                <select
                  value={formData.warehouse_id}
                  onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Not linked to warehouse</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name} - {wh.location}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vessel (Optional)</label>
                <select
                  value={formData.vessel_id}
                  onChange={(e) => setFormData({ ...formData, vessel_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Not on vessel</option>
                  {vessels.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ref. No.</label>
                <input
                  type="text"
                  value={formData.ref_no}
                  onChange={(e) => setFormData({ ...formData, ref_no: e.target.value })}
                  placeholder="Reference number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (AED)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
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
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                  <option value="in_maintenance">In Maintenance</option>
                  <option value="on_vessel">On Vessel</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={2}
                placeholder="Additional notes or remarks"
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
                {mutation.isPending ? 'Saving...' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function InventoryLedgerModal({
  item,
  entries,
  isLoading,
  onClose
}: {
  item: any
  entries: any[]
  isLoading: boolean
  onClose: () => void
}) {
  const formatQuantity = (value: any) => {
    if (value === null || value === undefined) {
      return '-'
    }
    return Number(value).toLocaleString()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Inventory Ledger</h2>
            <p className="text-sm text-gray-600 mt-1">
              {item.equipment_name}{item.item_code ? ` (${item.item_code})` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Close
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Current Quantity</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{Number(item.quantity || 0).toLocaleString()} {item.unit || 'pcs'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Category</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{item.category || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Status</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{item.status?.replace('_', ' ') || 'N/A'}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No ledger entries yet.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">In</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Out</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.map((entry: any) => (
                    <tr key={entry.id} className="text-sm text-gray-700">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {entry.occurred_at ? new Date(entry.occurred_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {entry.movement_type ? entry.movement_type.replace(/_/g, ' ') : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-green-700">
                        {formatQuantity(entry.quantity_in)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-700">
                        {formatQuantity(entry.quantity_out)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatQuantity(entry.running_balance)}
                      </td>
                      <td className="px-4 py-3">
                        {entry.warehouse_name || entry.vessel_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                        {entry.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
