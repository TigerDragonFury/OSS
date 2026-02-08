'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Package, Warehouse, MapPin, Phone, User, DollarSign, Calendar, AlertCircle, Search, Filter } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import Pagination from '@/components/Pagination'

export default function WarehouseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const warehouseId = params.id as string
  const supabase = createClient()
  
  // Pagination and filter states
  const [marineSearchTerm, setMarineSearchTerm] = useState('')
  const [marineFilterCategory, setMarineFilterCategory] = useState('')
  const [marineFilterStatus, setMarineFilterStatus] = useState('')
  const [marinePage, setMarinePage] = useState(1)
  const marineItemsPerPage = 10

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

  // Fetch equipment stored in this warehouse
  const { data: equipment, isLoading: equipmentLoading } = useQuery({
    queryKey: ['warehouse-equipment', warehouseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('land_equipment')
        .select(`
          *,
          land_purchases(
            id,
            land_name,
            location
          )
        `)
        .eq('warehouse_id', warehouseId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
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
  
  const totalValue = landEquipmentValue + marineInventoryValue
  const equipmentCount = landEquipmentCount + marineInventoryCount

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
              <p className="text-2xl font-bold text-gray-900 mt-1">৳{totalValue.toLocaleString()}</p>
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

      {/* Land Equipment List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Land Equipment</h2>
          <p className="text-gray-600 mt-1">Equipment from land purchases ({landEquipmentCount} items, ৳{landEquipmentValue.toLocaleString()})</p>
        </div>

        {equipmentLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : equipment && equipment.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipment Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source Land
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Condition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estimated Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Added
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {equipment.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.equipment_name || 'Unnamed Equipment'}</div>
                          {item.description && (
                            <div className="text-sm text-gray-500">{item.description.substring(0, 50)}...</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.land_purchases ? (
                        <Link
                          href={`/dashboard/scrap/lands/${item.land_purchases.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <div className="text-sm font-medium">{item.land_purchases.land_name}</div>
                          <div className="text-sm text-gray-500">{item.land_purchases.location}</div>
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getConditionBadge(item.condition)}`}>
                        {item.condition?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(item.status)}`}>
                        {item.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ৳{parseFloat(item.estimated_value || 0).toLocaleString()}
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
        ) : (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Equipment Found</h3>
            <p className="text-gray-600">
              This warehouse doesn't have any equipment stored yet.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Equipment will appear here when you assign it to this warehouse from the land purchases page.
            </p>
          </div>
        )}
      </div>

      {/* Marine Inventory List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Marine Inventory</h2>
          <p className="text-gray-600 mt-1">Operational supplies and spare parts ({filteredMarineInventory?.length || 0} items, ৳{marineInventoryValue.toLocaleString()})</p>
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
                        ৳{parseFloat(item.unit_price || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ৳{((parseFloat(item.unit_price) || 0) * (parseFloat(item.quantity) || 0)).toLocaleString()}
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
    </div>
  )
}
