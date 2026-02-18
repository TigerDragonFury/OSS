'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Package, Warehouse, MapPin, Phone, User, DollarSign, AlertCircle, Search, Plus, Trash2, Edit2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import Pagination from '@/components/Pagination'

export default function WarehouseDetailPage() {
  const params   = useParams()
  const router   = useRouter()
  const warehouseId = params.id as string
  const supabase = createClient()
  const queryClient = useQueryClient()

  // UI state
  const [isAddingItem,   setIsAddingItem]   = useState(false)
  const [editingItem,    setEditingItem]    = useState<any>(null)
  const [marineSearchTerm,      setMarineSearchTerm]      = useState('')
  const [marineFilterCategory,  setMarineFilterCategory]  = useState('')
  const [marineFilterStatus,    setMarineFilterStatus]    = useState('')
  const [marinePage,    setMarinePage]    = useState(1)
  const [equipSearchTerm,  setEquipSearchTerm]  = useState('')
  const [equipFilterType,  setEquipFilterType]  = useState('')
  const [equipFilterStatus, setEquipFilterStatus] = useState('')
  const [equipPage,     setEquipPage]     = useState(1)
  const marineItemsPerPage = 10
  const equipItemsPerPage  = 10

  // Fetch warehouse details
  const { data: warehouse, isLoading: warehouseLoading } = useQuery({
    queryKey: ['warehouse', warehouseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('id', warehouseId)
        .single()
      if (error) throw error
      return data
    }
  })

  // Fetch all lands (for the add-item form)
  const { data: lands } = useQuery({
    queryKey: ['land_purchases_list'],
    queryFn: async () => {
      const { data } = await supabase.from('land_purchases').select('id, land_name').order('land_name')
      return data || []
    }
  })

  // Fetch equipment stored in this warehouse
  const { data: equipment, isLoading: equipmentLoading } = useQuery({
    queryKey: ['warehouse-equipment', warehouseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('land_equipment')
        .select('*, land_purchases(id, land_name, location)')
        .eq('warehouse_id', warehouseId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  // Delete equipment item
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('land_equipment').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouse-equipment', warehouseId] })
  })

  // Fetch marine inventory stored in this warehouse
  const { data: marineInventory, isLoading: marineInventoryLoading } = useQuery({
    queryKey: ['warehouse-marine-inventory', warehouseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marine_inventory')
        .select('*')
        .eq('warehouse_id', warehouseId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  if (warehouseLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!warehouse) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Warehouse not found</h2>
        <p className="text-gray-600 mt-2">The warehouse you're looking for doesn't exist.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Go Back
        </button>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      available: 'bg-green-100 text-green-800',
      in_warehouse: 'bg-blue-100 text-blue-800',
      scrapped: 'bg-gray-100 text-gray-800',
      reserved: 'bg-yellow-100 text-yellow-800'
    }
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
  }

  const getConditionBadge = (condition: string) => {
    const styles = {
      excellent: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      fair: 'bg-yellow-100 text-yellow-800',
      poor: 'bg-orange-100 text-orange-800',
      scrap: 'bg-red-100 text-red-800'
    }
    return styles[condition as keyof typeof styles] || 'bg-gray-100 text-gray-800'
  }

  const landEquipmentValue = equipment?.reduce((sum, item) => sum + (parseFloat(item.estimated_value) || 0), 0) || 0
  const landEquipmentCount = equipment?.length || 0
  
  const marineInventoryValue = marineInventory?.reduce((sum, item) => sum + ((parseFloat(item.unit_price) || 0) * (parseFloat(item.quantity) || 0)), 0) || 0
  const marineInventoryCount = marineInventory?.length || 0
  
  const totalValue    = landEquipmentValue + marineInventoryValue
  const equipmentCount = landEquipmentCount + marineInventoryCount

  // Equipment filtering
  const filteredEquipment = equipment?.filter((item: any) => {
    const matchSearch = !equipSearchTerm ||
      item.equipment_name?.toLowerCase().includes(equipSearchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(equipSearchTerm.toLowerCase()) ||
      item.supplier_name?.toLowerCase().includes(equipSearchTerm.toLowerCase())
    const matchType   = !equipFilterType   || item.item_type === equipFilterType
    const matchStatus = !equipFilterStatus || item.status    === equipFilterStatus
    return matchSearch && matchType && matchStatus
  })

  const equipTotalPages = Math.ceil((filteredEquipment?.length || 0) / equipItemsPerPage)
  const paginatedEquipment = filteredEquipment?.slice(
    (equipPage - 1) * equipItemsPerPage,
    equipPage * equipItemsPerPage
  )

  // Marine inventory filtering and pagination
  const filteredMarineInventory = marineInventory?.filter((item: any) => {
    const matchesSearch = item.equipment_name?.toLowerCase().includes(marineSearchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(marineSearchTerm.toLowerCase())
    const matchesCategory = !marineFilterCategory || item.category === marineFilterCategory
    const matchesStatus = !marineFilterStatus || item.status === marineFilterStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  const marineCategories = marineInventory
    ? [...new Set(marineInventory.map((item: any) => item.category).filter(Boolean))]
    : []

  const marineTotalPages = Math.ceil((filteredMarineInventory?.length || 0) / marineItemsPerPage)
  const paginatedMarineInventory = filteredMarineInventory?.slice(
    (marinePage - 1) * marineItemsPerPage,
    marinePage * marineItemsPerPage
  )

  const truncateText = (text: string, maxLength: number = 30) => {
    if (!text) return 'N/A'
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{warehouse.name}</h1>
            <p className="text-gray-600 mt-1">
              {warehouse.warehouse_type?.replace('_', ' ').toUpperCase()} Warehouse
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsAddingItem(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Item
        </button>
      </div>

      {/* Warehouse Details Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {warehouse.location && (
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 rounded-lg p-2">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-semibold text-gray-900">{warehouse.location}</p>
                {warehouse.address && (
                  <p className="text-sm text-gray-600 mt-1">{warehouse.address}</p>
                )}
              </div>
            </div>
          )}

          {warehouse.capacity && (
            <div className="flex items-start space-x-3">
              <div className="bg-purple-100 rounded-lg p-2">
                <Warehouse className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Capacity</p>
                <p className="font-semibold text-gray-900">{warehouse.capacity} m²</p>
              </div>
            </div>
          )}

          {warehouse.contact_person && (
            <div className="flex items-start space-x-3">
              <div className="bg-green-100 rounded-lg p-2">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Contact Person</p>
                <p className="font-semibold text-gray-900">{warehouse.contact_person}</p>
                {warehouse.contact_phone && (
                  <p className="text-sm text-gray-600 flex items-center mt-1">
                    <Phone className="h-3 w-3 mr-1" />
                    {warehouse.contact_phone}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-start space-x-3">
            <div className="bg-yellow-100 rounded-lg p-2">
              <Package className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Equipment Count</p>
              <p className="font-semibold text-gray-900">{equipmentCount} items</p>
            </div>
          </div>
        </div>

        {warehouse.notes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">Notes</p>
            <p className="text-gray-900 mt-1">{warehouse.notes}</p>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Equipment</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{equipmentCount}</p>
            </div>
            <div className="bg-blue-100 rounded-lg p-3">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Estimated Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">Đ{totalValue.toLocaleString()}</p>
            </div>
            <div className="bg-green-100 rounded-lg p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Available Items</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {(equipment?.filter(e => e.status === 'available' || e.status === 'in_warehouse').length || 0) + 
                 (marineInventory?.filter(i => i.status === 'in_stock').length || 0)}
              </p>
            </div>
            <div className="bg-purple-100 rounded-lg p-3">
              <Warehouse className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Land Equipment / Warehouse Items List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Warehouse Items</h2>
            <p className="text-gray-600 mt-1">
              Equipment, parts and materials stored here ({landEquipmentCount} items · {landEquipmentValue.toLocaleString()} Đ)
            </p>
          </div>
          <button
            onClick={() => setIsAddingItem(true)}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" /> Add Item
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gray-50 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search items..."
              value={equipSearchTerm}
              onChange={e => { setEquipSearchTerm(e.target.value); setEquipPage(1) }}
              className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <select
            value={equipFilterType}
            onChange={e => { setEquipFilterType(e.target.value); setEquipPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Types</option>
            <optgroup label="Marine">
              <option value="anchor">Anchor</option>
              <option value="chain">Chain / Mooring Chain</option>
              <option value="rope">Rope / Mooring Line</option>
              <option value="buoy">Buoy / Float</option>
              <option value="life_saving">Life Saving Equipment</option>
              <option value="navigation">Navigation Equipment</option>
              <option value="fire_fighting">Fire Fighting Equipment</option>
              <option value="diving">Diving Equipment</option>
              <option value="deck_equipment">Deck Equipment</option>
              <option value="engine_part">Engine / Machinery Part</option>
              <option value="pump">Pump</option>
              <option value="valve">Valve / Fitting</option>
              <option value="electrical">Electrical / Electronics</option>
              <option value="paint">Paint / Coating</option>
              <option value="fuel_lubricant">Fuel / Lubricant</option>
            </optgroup>
            <optgroup label="General">
              <option value="equipment">Equipment</option>
              <option value="spare_part">Spare Part</option>
              <option value="tool">Tool</option>
              <option value="material">Material</option>
              <option value="vehicle">Vehicle</option>
              <option value="consumable">Consumable</option>
              <option value="other">Other</option>
            </optgroup>
          </select>
          <select
            value={equipFilterStatus}
            onChange={e => { setEquipFilterStatus(e.target.value); setEquipPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="in_warehouse">In Warehouse</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
            <option value="scrapped">Scrapped</option>
          </select>
        </div>

        {equipmentLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : paginatedEquipment && paginatedEquipment.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedEquipment.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{item.equipment_name}</div>
                        {item.description && (
                          <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                        )}
                        {item.supplier_name && (
                          <div className="text-xs text-gray-400 mt-0.5">Supplier: {item.supplier_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          item.item_type === 'equipment'     ? 'bg-blue-100 text-blue-700'    :
                          item.item_type === 'spare_part'    ? 'bg-purple-100 text-purple-700' :
                          item.item_type === 'tool'          ? 'bg-orange-100 text-orange-700' :
                          item.item_type === 'material'      ? 'bg-yellow-100 text-yellow-700' :
                          item.item_type === 'vehicle'       ? 'bg-teal-100 text-teal-700'    :
                          item.item_type === 'anchor'        ? 'bg-gray-200 text-gray-800'    :
                          item.item_type === 'chain'         ? 'bg-gray-200 text-gray-800'    :
                          item.item_type === 'rope'          ? 'bg-amber-100 text-amber-700'  :
                          item.item_type === 'buoy'          ? 'bg-cyan-100 text-cyan-700'    :
                          item.item_type === 'life_saving'   ? 'bg-red-100 text-red-700'      :
                          item.item_type === 'navigation'    ? 'bg-indigo-100 text-indigo-700':
                          item.item_type === 'fire_fighting' ? 'bg-red-200 text-red-800'      :
                          item.item_type === 'diving'        ? 'bg-sky-100 text-sky-700'      :
                          item.item_type === 'deck_equipment'? 'bg-blue-200 text-blue-800'    :
                          item.item_type === 'engine_part'   ? 'bg-slate-100 text-slate-700'  :
                          item.item_type === 'pump'          ? 'bg-violet-100 text-violet-700':
                          item.item_type === 'valve'         ? 'bg-zinc-100 text-zinc-700'    :
                          item.item_type === 'electrical'    ? 'bg-yellow-200 text-yellow-800':
                          item.item_type === 'paint'         ? 'bg-pink-100 text-pink-700'    :
                          item.item_type === 'fuel_lubricant'? 'bg-stone-100 text-stone-700'  :
                          item.item_type === 'consumable'    ? 'bg-lime-100 text-lime-700'    :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.item_type?.replace('_', ' ') || 'equipment'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.land_purchases ? (
                          <Link href={`/dashboard/scrap/lands/${item.land_purchases.id}`} className="text-blue-600 hover:underline">
                            {item.land_purchases.land_name}
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-500 italic capitalize">
                            {item.acquisition_source?.replace('_', ' ') || 'direct'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.quantity || 1} {item.unit || 'unit'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getConditionBadge(item.condition)}`}>
                          {item.condition || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(item.status)}`}>
                          {item.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">
                        {parseFloat(item.estimated_value || 0).toLocaleString()} AED
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {item.status !== 'sold' && (
                            <button
                              onClick={() => {
                                if (confirm(`Delete "${item.equipment_name}"?`)) {
                                  deleteItemMutation.mutate(item.id)
                                }
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {equipTotalPages > 1 && (
              <div className="p-4 border-t">
                <Pagination currentPage={equipPage} totalPages={equipTotalPages} onPageChange={setEquipPage} />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Items Found</h3>
            <p className="text-gray-500">
              {equipSearchTerm || equipFilterType || equipFilterStatus
                ? 'Try adjusting your filters.'
                : 'Click "Add Item" to add equipment, parts or materials to this warehouse.'}
            </p>
          </div>
        )}
      </div>

      {/* Marine Inventory List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Marine Inventory</h2>
          <p className="text-gray-600 mt-1">Operational supplies and spare parts ({filteredMarineInventory?.length || 0} items, Đ{marineInventoryValue.toLocaleString()})</p>
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search equipment..."
                value={marineSearchTerm}
                onChange={(e) => {
                  setMarineSearchTerm(e.target.value)
                  setMarinePage(1) // Reset to first page on search
                }}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select 
              value={marineFilterCategory}
              onChange={(e) => {
                setMarineFilterCategory(e.target.value)
                setMarinePage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {marineCategories.map((cat: string) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select 
              value={marineFilterStatus}
              onChange={(e) => {
                setMarineFilterStatus(e.target.value)
                setMarinePage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>

        {marineInventoryLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : paginatedMarineInventory && paginatedMarineInventory.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Equipment Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Added
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedMarineInventory.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900" title={item.equipment_name}>
                          {truncateText(item.equipment_name, 30)}
                        </div>
                        {item.description && (
                          <div className="text-sm text-gray-500" title={item.description}>
                            {truncateText(item.description, 40)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.category || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.quantity} {item.unit || 'pcs'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Đ{parseFloat(item.unit_price || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Đ{((parseFloat(item.unit_price) || 0) * (parseFloat(item.quantity) || 0)).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          item.status === 'in_stock' ? 'bg-green-100 text-green-800' : 
                          item.status === 'low_stock' ? 'bg-yellow-100 text-yellow-800' : 
                          item.status === 'out_of_stock' ? 'bg-red-100 text-red-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {marineTotalPages > 1 && (
              <div className="p-4 border-t">
                <Pagination
                  currentPage={marinePage}
                  totalPages={marineTotalPages}
                  onPageChange={setMarinePage}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {marineSearchTerm || marineFilterCategory || marineFilterStatus 
                ? 'No items match your filters' 
                : 'No Marine Inventory Found'}
            </h3>
            <p className="text-gray-600">
              {marineSearchTerm || marineFilterCategory || marineFilterStatus
                ? 'Try adjusting your search or filter criteria.'
                : 'This warehouse doesn\'t have any marine inventory stored yet.'}
            </p>
            {!marineSearchTerm && !marineFilterCategory && !marineFilterStatus && (
              <p className="text-sm text-gray-500 mt-2">
                Marine inventory includes operational supplies and spare parts for vessels.
              </p>
            )}
          </div>
        )}
      </div>
      {/* Modals */}
      {(isAddingItem || editingItem) && (
        <WarehouseItemForm
          warehouseId={warehouseId}
          item={editingItem || undefined}
          lands={lands || []}
          onClose={() => { setIsAddingItem(false); setEditingItem(null) }}
        />
      )}
    </div>
  )
}

// ─── Add / Edit Item Form ─────────────────────────────────────────────────────

function WarehouseItemForm({
  warehouseId,
  item,
  lands,
  onClose,
}: {
  warehouseId: string
  item?: any
  lands: any[]
  onClose: () => void
}) {
  const supabase    = createClient()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    equipment_name:     item?.equipment_name     || '',
    item_type:          item?.item_type          || 'equipment',
    description:        item?.description        || '',
    condition:          item?.condition          || 'good',
    status:             item?.status             || 'in_warehouse',
    estimated_value:    item?.estimated_value?.toString()   || '',
    quantity:           item?.quantity?.toString()          || '1',
    unit:               item?.unit               || 'unit',
    acquisition_source: item?.acquisition_source || 'existing',
    land_id:            item?.land_id            || '',
    supplier_name:      item?.supplier_name      || '',
    purchase_date:      item?.purchase_date      || '',
    purchase_price:     item?.purchase_price?.toString()    || '',
    notes:              item?.notes              || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: any = {
        warehouse_id:       warehouseId,
        equipment_name:     form.equipment_name,
        item_type:          form.item_type,
        description:        form.description         || null,
        condition:          form.condition,
        status:             form.status,
        estimated_value:    parseFloat(form.estimated_value) || null,
        quantity:           parseFloat(form.quantity)        || 1,
        unit:               form.unit,
        acquisition_source: form.acquisition_source,
        land_id:            form.land_id             || null,
        supplier_name:      form.supplier_name       || null,
        purchase_date:      form.purchase_date       || null,
        purchase_price:     parseFloat(form.purchase_price) || null,
        notes:              form.notes               || null,
      }

      if (item) {
        const { error } = await supabase.from('land_equipment').update(payload).eq('id', item.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('land_equipment').insert([payload])
        if (error) throw error
      }

      queryClient.invalidateQueries({ queryKey: ['warehouse-equipment', warehouseId] })
      queryClient.invalidateQueries({ queryKey: ['land_equipment'] })
      onClose()
    } catch (err: any) {
      console.error('Save error:', err)
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const showLandField     = form.acquisition_source === 'land_purchase'
  const showPurchaseFields = form.acquisition_source === 'direct_purchase'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {item ? 'Edit Item' : 'Add Item to Warehouse'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name + Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                <input
                  type="text" required
                  value={form.equipment_name}
                  onChange={e => setForm({ ...form, equipment_name: e.target.value })}
                  placeholder="e.g. Hydraulic Pump, Engine Part..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Type *</label>
                <select
                  value={form.item_type}
                  onChange={e => setForm({ ...form, item_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <optgroup label="Marine">
                    <option value="anchor">Anchor</option>
                    <option value="chain">Chain / Mooring Chain</option>
                    <option value="rope">Rope / Mooring Line</option>
                    <option value="buoy">Buoy / Float</option>
                    <option value="life_saving">Life Saving Equipment</option>
                    <option value="navigation">Navigation Equipment</option>
                    <option value="fire_fighting">Fire Fighting Equipment</option>
                    <option value="diving">Diving Equipment</option>
                    <option value="deck_equipment">Deck Equipment</option>
                    <option value="engine_part">Engine / Machinery Part</option>
                    <option value="pump">Pump</option>
                    <option value="valve">Valve / Fitting</option>
                    <option value="electrical">Electrical / Electronics</option>
                    <option value="paint">Paint / Coating</option>
                    <option value="fuel_lubricant">Fuel / Lubricant</option>
                  </optgroup>
                  <optgroup label="General">
                    <option value="equipment">Equipment (machine / unit)</option>
                    <option value="spare_part">Spare Part</option>
                    <option value="tool">Tool / Hand Tool</option>
                    <option value="material">Raw Material</option>
                    <option value="vehicle">Vehicle</option>
                    <option value="consumable">Consumable</option>
                    <option value="other">Other</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Acquisition Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Where did this come from?</label>
              <select
                value={form.acquisition_source}
                onChange={e => setForm({ ...form, acquisition_source: e.target.value, land_id: '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="existing">Already had it (pre-existing)</option>
                <option value="land_purchase">From a scrap land purchase</option>
                <option value="direct_purchase">Direct purchase / bought separately</option>
                <option value="transfer">Transferred from another warehouse</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Land selector (only for land_purchase source) */}
            {showLandField && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Land Purchase</label>
                <select
                  value={form.land_id}
                  onChange={e => setForm({ ...form, land_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select land...</option>
                  {lands.map(l => (
                    <option key={l.id} value={l.id}>{l.land_name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Purchase fields (only for direct_purchase) */}
            {showPurchaseFields && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <input
                    type="text"
                    value={form.supplier_name}
                    onChange={e => setForm({ ...form, supplier_name: e.target.value })}
                    placeholder="Supplier name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={form.purchase_date}
                    onChange={e => setForm({ ...form, purchase_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price (Đ)</label>
                  <input
                    type="number" step="0.01"
                    value={form.purchase_price}
                    onChange={e => setForm({ ...form, purchase_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Qty + Unit + Condition + Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number" step="0.001" min="0"
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input
                  type="text"
                  value={form.unit}
                  onChange={e => setForm({ ...form, unit: e.target.value })}
                  placeholder="unit / pcs / kg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                  value={form.condition}
                  onChange={e => setForm({ ...form, condition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="scrap">Scrap</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="in_warehouse">In Warehouse</option>
                  <option value="available">Available for Sale</option>
                  <option value="reserved">Reserved</option>
                  <option value="scrapped">Scrapped</option>
                </select>
              </div>
            </div>

            {/* Estimated Value + Description */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Value (Đ)</label>
                <input
                  type="number" step="0.01"
                  value={form.estimated_value}
                  onChange={e => setForm({ ...form, estimated_value: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Serial number, model, specs..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : item ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
