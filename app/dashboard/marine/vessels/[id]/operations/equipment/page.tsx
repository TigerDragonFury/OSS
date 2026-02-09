'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use } from 'react'
import { Plus, Edit2, Trash2, Package, Recycle, Settings } from 'lucide-react'

export default function EquipmentAssetsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [activeTab, setActiveTab] = useState<'sales' | 'scrap' | 'installed'>('sales')
  const [showEquipmentSaleForm, setShowEquipmentSaleForm] = useState(false)
  const [showScrapSaleForm, setShowScrapSaleForm] = useState(false)
  const [showInstalledForm, setShowInstalledForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  
  const queryClient = useQueryClient()
  const supabase = createClient()

  // Equipment Sales Query
  const { data: equipmentSales } = useQuery({
    queryKey: ['vessel_equipment_sales', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_equipment_sales')
        .select('*')
        .eq('vessel_id', resolvedParams.id)
        .order('sale_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  // Scrap Sales Query
  const { data: scrapSales } = useQuery({
    queryKey: ['vessel_scrap_sales', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_scrap_sales')
        .select('*')
        .eq('vessel_id', resolvedParams.id)
        .order('sale_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  // Installed Equipment Query
  const { data: installedEquipment } = useQuery({
    queryKey: ['vessel_equipment', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_equipment')
        .select('*')
        .eq('vessel_id', resolvedParams.id)
        .order('installation_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  // Companies Query (non-parent companies for buyer dropdown)
  const { data: companies } = useQuery({
    queryKey: ['companies_non_parent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, type')
        .neq('type', 'parent')
        .order('name')
      if (error) throw error
      return data
    }
  })

  // Delete Equipment Sale Mutation
  const deleteEquipmentSale = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vessel_equipment_sales')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_equipment_sales', resolvedParams.id] })
    }
  })

  // Delete Scrap Sale Mutation
  const deleteScrapSale = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vessel_scrap_sales')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_scrap_sales', resolvedParams.id] })
    }
  })

  // Delete Installed Equipment Mutation
  const deleteInstalledEquipment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vessel_equipment')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_equipment', resolvedParams.id] })
    }
  })

  const totalEquipmentRevenue = equipmentSales?.reduce((sum, sale) => sum + (sale.sale_price || 0), 0) || 0
  const totalScrapRevenue = scrapSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
  const totalAssetValue = installedEquipment?.reduce((sum, eq) => sum + (eq.installation_cost || 0), 0) || 0

  // Create/Update Equipment Sale Mutation
  const saveEquipmentSale = useMutation({
    mutationFn: async (data: any) => {
      if (editingItem?.id) {
        const { error } = await supabase
          .from('vessel_equipment_sales')
          .update(data)
          .eq('id', editingItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('vessel_equipment_sales')
          .insert([{ ...data, vessel_id: resolvedParams.id }])
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_equipment_sales', resolvedParams.id] })
      setShowEquipmentSaleForm(false)
      setEditingItem(null)
    }
  })

  // Create/Update Scrap Sale Mutation
  const saveScrapSale = useMutation({
    mutationFn: async (data: any) => {
      if (editingItem?.id) {
        const { error } = await supabase
          .from('vessel_scrap_sales')
          .update(data)
          .eq('id', editingItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('vessel_scrap_sales')
          .insert([{ ...data, vessel_id: resolvedParams.id }])
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_scrap_sales', resolvedParams.id] })
      setShowScrapSaleForm(false)
      setEditingItem(null)
    }
  })

  // Create/Update Installed Equipment Mutation
  const saveInstalledEquipment = useMutation({
    mutationFn: async (data: any) => {
      if (editingItem?.id) {
        const { error } = await supabase
          .from('vessel_equipment')
          .update(data)
          .eq('id', editingItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('vessel_equipment')
          .insert([{ ...data, vessel_id: resolvedParams.id }])
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_equipment', resolvedParams.id] })
      setShowInstalledForm(false)
      setEditingItem(null)
    }
  })

  const handleSubmitEquipmentSale = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      equipment_name: formData.get('equipment_name'),
      description: formData.get('description'),
      sale_date: formData.get('sale_date'),
      sale_price: parseFloat(formData.get('sale_price') as string),
      buyer_name: formData.get('buyer_name'),
      notes: formData.get('notes')
    }
    saveEquipmentSale.mutate(data)
  }

  const handleSubmitScrapSale = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const tonnage = parseFloat(formData.get('tonnage') as string)
    const pricePerTon = parseFloat(formData.get('price_per_ton') as string)
    const data = {
      sale_date: formData.get('sale_date'),
      tonnage: tonnage,
      price_per_ton: pricePerTon,
      total_amount: tonnage * pricePerTon,
      buyer_name: formData.get('buyer_name'),
      notes: formData.get('notes')
    }
    saveScrapSale.mutate(data)
  }

  const handleSubmitInstalledEquipment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      equipment_name: formData.get('equipment_name'),
      equipment_type: formData.get('equipment_type'),
      manufacturer: formData.get('manufacturer'),
      serial_number: formData.get('serial_number'),
      installation_date: formData.get('installation_date'),
      installation_cost: parseFloat(formData.get('installation_cost') as string) || null,
      status: formData.get('status'),
      notes: formData.get('notes')
    }
    saveInstalledEquipment.mutate(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipment & Assets</h1>
          <p className="text-gray-600">Manage equipment sales, scrap sales, and installed equipment</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Equipment Sales Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{totalEquipmentRevenue.toLocaleString()} AED</p>
              <p className="text-sm text-gray-500 mt-1">{equipmentSales?.length || 0} sales</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <Recycle className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-600">Scrap Sales Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{totalScrapRevenue.toLocaleString()} AED</p>
              <p className="text-sm text-gray-500 mt-1">{scrapSales?.length || 0} sales</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Installed Equipment Value</p>
              <p className="text-2xl font-bold text-gray-900">{totalAssetValue.toLocaleString()} AED</p>
              <p className="text-sm text-gray-500 mt-1">{installedEquipment?.length || 0} items</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('sales')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sales'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Equipment Sales
              </div>
            </button>
            <button
              onClick={() => setActiveTab('scrap')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'scrap'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Recycle className="h-4 w-4" />
                Scrap Sales
              </div>
            </button>
            <button
              onClick={() => setActiveTab('installed')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'installed'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Installed Equipment
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Equipment Sales</h3>
                <button
                  onClick={() => {
                    setEditingItem(null)
                    setShowEquipmentSaleForm(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-6 00 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-5 w-5" />
                  Add Equipment Sale
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {equipmentSales?.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{sale.equipment_name}</p>
                            <p className="text-sm text-gray-500">{sale.description || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{sale.buyer_name || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(sale.sale_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-green-600">
                            {sale.sale_price?.toLocaleString()} AED
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingItem(sale)
                                setShowEquipmentSaleForm(true)
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this equipment sale?')) {
                                  deleteEquipmentSale.mutate(sale.id)
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!equipmentSales || equipmentSales.length === 0) && (
                  <div className="text-center py-12 text-gray-500">
                    No equipment sales recorded yet
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'scrap' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Scrap Sales</h3>
                <button
                  onClick={() => {
                    setEditingItem(null)
                    setShowScrapSaleForm(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  <Plus className="h-5 w-5" />
                  Add Scrap Sale
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tonnage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price/Ton</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scrapSales?.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(sale.sale_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{sale.buyer_name || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{sale.tonnage?.toLocaleString()} tons</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{sale.price_per_ton?.toLocaleString()} AED</td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-green-600">
                            {sale.total_amount?.toLocaleString()} AED
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingItem(sale)
                                setShowScrapSaleForm(true)
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this scrap sale?')) {
                                  deleteScrapSale.mutate(sale.id)
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!scrapSales || scrapSales.length === 0) && (
                  <div className="text-center py-12 text-gray-500">
                    No scrap sales recorded yet
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'installed' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Installed Equipment</h3>
                <button
                  onClick={() => {
                    setEditingItem(null)
                    setShowInstalledForm(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-5 w-5" />
                  Add Equipment
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manufacturer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Installation Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Installation Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {installedEquipment?.map((equipment) => (
                      <tr key={equipment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{equipment.equipment_name}</p>
                            <p className="text-sm text-gray-500">{equipment.equipment_type || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{equipment.manufacturer || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{equipment.serial_number || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {equipment.installation_date ? new Date(equipment.installation_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {equipment.installation_cost?.toLocaleString()} AED
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            equipment.status === 'operational' ? 'bg-green-100 text-green-800' :
                            equipment.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                            equipment.status === 'defective' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {equipment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingItem(equipment)
                                setShowInstalledForm(true)
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this equipment record?')) {
                                  deleteInstalledEquipment.mutate(equipment.id)
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!installedEquipment || installedEquipment.length === 0) && (
                  <div className="text-center py-12 text-gray-500">
                    No installed equipment recorded yet
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Equipment Sale Form Modal */}
      {showEquipmentSaleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingItem ? 'Edit Equipment Sale' : 'Add Equipment Sale'}
              </h2>
            </div>
            <form onSubmit={handleSubmitEquipmentSale} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Name *</label>
                <input
                  type="text"
                  name="equipment_name"
                  defaultValue={editingItem?.equipment_name || ''}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  defaultValue={editingItem?.description || ''}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date *</label>
                  <input
                    type="date"
                    name="sale_date"
                    defaultValue={editingItem?.sale_date || new Date().toISOString().split('T')[0]}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price (AED) *</label>
                  <input
                    type="number"
                    name="sale_price"
                    step="0.01"
                    defaultValue={editingItem?.sale_price || ''}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Company</label>
                <select
                  name="buyer_name"
                  defaultValue={editingItem?.buyer_name || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a company...</option>
                  {companies?.map((company) => (
                    <option key={company.id} value={company.name}>
                      {company.name} ({company.type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  defaultValue={editingItem?.notes || ''}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saveEquipmentSale.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {saveEquipmentSale.isPending ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEquipmentSaleForm(false)
                    setEditingItem(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scrap Sale Form Modal */}
      {showScrapSaleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingItem ? 'Edit Scrap Sale' : 'Add Scrap Sale'}
              </h2>
            </div>
            <form onSubmit={handleSubmitScrapSale} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date *</label>
                <input
                  type="date"
                  name="sale_date"
                  defaultValue={editingItem?.sale_date || new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tonnage *</label>
                  <input
                    type="number"
                    name="tonnage"
                    step="0.01"
                    defaultValue={editingItem?.tonnage || ''}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price per Ton (AED) *</label>
                  <input
                    type="number"
                    name="price_per_ton"
                    step="0.01"
                    defaultValue={editingItem?.price_per_ton || ''}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Company</label>
                <select
                  name="buyer_name"
                  defaultValue={editingItem?.buyer_name || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                >
                  <option value="">Select a company...</option>
                  {companies?.map((company) => (
                    <option key={company.id} value={company.name}>
                      {company.name} ({company.type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  defaultValue={editingItem?.notes || ''}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saveScrapSale.isPending}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400"
                >
                  {saveScrapSale.isPending ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowScrapSaleForm(false)
                    setEditingItem(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Installed Equipment Form Modal */}
      {showInstalledForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingItem ? 'Edit Equipment' : 'Add Equipment'}
              </h2>
            </div>
            <form onSubmit={handleSubmitInstalledEquipment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Name *</label>
                <input
                  type="text"
                  name="equipment_name"
                  defaultValue={editingItem?.equipment_name || ''}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Type</label>
                  <input
                    type="text"
                    name="equipment_type"
                    defaultValue={editingItem?.equipment_type || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    name="manufacturer"
                    defaultValue={editingItem?.manufacturer || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                  <input
                    type="text"
                    name="serial_number"
                    defaultValue={editingItem?.serial_number || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Installation Date</label>
                  <input
                    type="date"
                    name="installation_date"
                    defaultValue={editingItem?.installation_date || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Installation Cost (AED)</label>
                  <input
                    type="number"
                    name="installation_cost"
                    step="0.01"
                    defaultValue={editingItem?.installation_cost || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={editingItem?.status || 'operational'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="operational">Operational</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="defective">Defective</option>
                    <option value="decommissioned">Decommissioned</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  defaultValue={editingItem?.notes || ''}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saveInstalledEquipment.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {saveInstalledEquipment.isPending ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInstalledForm(false)
                    setEditingItem(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
