'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { hasModulePermission } from '@/lib/auth/rolePermissions'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'

export default function EquipmentPage() {
  const [isAdding,    setIsAdding]    = useState(false)
  const [editing,     setEditing]     = useState<any>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType,   setFilterType]   = useState('all')
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { user } = useAuth()
  
  const userRole  = user?.role || user?.roles?.[0] || 'storekeeper'
  const canCreate = hasModulePermission(userRole, ['scrap', 'equipment'], 'create')
  const canEdit   = hasModulePermission(userRole, ['scrap', 'equipment'], 'edit')
  const canDelete = hasModulePermission(userRole, ['scrap', 'equipment'], 'delete')

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['land_equipment', filterStatus, filterType],
    queryFn: async () => {
      let q = supabase
        .from('land_equipment')
        .select('*, land_purchases(land_name, location), warehouses(name, location)')
        .order('created_at', { ascending: false })
      if (filterStatus !== 'all') q = q.eq('status', filterStatus)
      if (filterType   !== 'all') q = q.eq('item_type', filterType)
      const { data, error } = await q
      if (error) throw error
      return data
    }
  })

  const { data: lands } = useQuery({
    queryKey: ['land_purchases'],
    queryFn: async () => {
      const { data } = await supabase.from('land_purchases').select('*').order('land_name')
      return data || []
    }
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data } = await supabase.from('warehouses').select('id, name, location').order('name')
      return data || []
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('land_equipment').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['land_equipment'] })
  })

  const totalValue = equipment?.filter(e => ['available', 'in_warehouse'].includes(e.status))
    .reduce((sum, item) => sum + (item.estimated_value || 0), 0) || 0

  const availableCount = equipment?.filter(e => ['available', 'in_warehouse'].includes(e.status)).length || 0
  const soldCount      = equipment?.filter(e => e.status === 'sold').length || 0

  const TYPE_COLORS: Record<string, string> = {
    equipment:  'bg-blue-100 text-blue-700',
    spare_part: 'bg-purple-100 text-purple-700',
    tool:       'bg-orange-100 text-orange-700',
    material:   'bg-yellow-100 text-yellow-700',
    vehicle:    'bg-teal-100 text-teal-700',
    other:      'bg-gray-100 text-gray-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Equipment & Parts Inventory</h1>
          <p className="text-gray-600 mt-1">All warehouse items — equipment, spare parts, tools and materials</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Item
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Total Items</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{equipment?.length || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Available / In Warehouse</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">{availableCount} &nbsp;·&nbsp; {totalValue.toLocaleString()} Đ</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Sold</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{soldCount} items</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="available">Available</option>
          <option value="in_warehouse">In Warehouse</option>
          <option value="reserved">Reserved</option>
          <option value="sold">Sold</option>
          <option value="scrapped">Scrapped</option>
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="all">All Types</option>
          <option value="equipment">Equipment</option>
          <option value="spare_part">Spare Part</option>
          <option value="tool">Tool</option>
          <option value="material">Material</option>
          <option value="vehicle">Vehicle</option>
          <option value="other">Other</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Est. Value</th>
                {(canEdit || canDelete) && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {equipment?.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{item.equipment_name}</div>
                    {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_COLORS[item.item_type] || 'bg-gray-100 text-gray-700'}`}>
                      {item.item_type?.replace('_', ' ') || 'equipment'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {item.land_purchases?.land_name
                      ? <span className="text-blue-700">{item.land_purchases.land_name}</span>
                      : <span className="text-gray-400 italic capitalize">{item.acquisition_source?.replace('_', ' ') || '—'}</span>
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {item.warehouses?.name || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.quantity || 1} {item.unit || 'unit'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.condition === 'good' ? 'bg-green-100 text-green-800' :
                      item.condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                      item.condition === 'poor' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>{item.condition || '—'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.status === 'available'   ? 'bg-green-100 text-green-800' :
                      item.status === 'in_warehouse' ? 'bg-blue-100 text-blue-800' :
                      item.status === 'sold'         ? 'bg-purple-100 text-purple-800' :
                      item.status === 'reserved'     ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>{item.status?.replace('_', ' ') || '—'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">
                    {item.estimated_value?.toLocaleString() || '—'} AED
                  </td>
                  {(canEdit || canDelete) && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <button onClick={() => setEditing(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && item.status !== 'sold' && (
                          <button
                            onClick={() => confirm(`Delete "${item.equipment_name}"?`) && deleteMutation.mutate(item.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {equipment?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No items recorded yet. Click "Add Item" to get started.</p>
            </div>
          )}
        </div>
      )}

      {(isAdding || editing) && (
        <EquipmentForm
          item={editing || undefined}
          lands={lands || []}
          warehouses={warehouses || []}
          onClose={() => { setIsAdding(false); setEditing(null) }}
        />
      )}
    </div>
  )
}


function EquipmentForm({
  item,
  lands,
  warehouses,
  onClose,
}: {
  item?: any
  lands: any[]
  warehouses: any[]
  onClose: () => void
}) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    land_id:            item?.land_id            || '',
    warehouse_id:       item?.warehouse_id       || '',
    equipment_name:     item?.equipment_name     || '',
    item_type:          item?.item_type          || 'equipment',
    acquisition_source: item?.acquisition_source || 'land_purchase',
    description:        item?.description        || '',
    condition:          item?.condition          || 'good',
    estimated_value:    item?.estimated_value?.toString() || '',
    quantity:           item?.quantity?.toString()    || '1',
    unit:               item?.unit               || 'unit',
    status:             item?.status             || 'in_warehouse',
    supplier_name:      item?.supplier_name      || '',
    purchase_date:      item?.purchase_date      || '',
    purchase_price:     item?.purchase_price?.toString() || '',
    notes:              item?.notes              || '',
  })

  const set = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }))

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (item?.id) {
        const { error } = await supabase.from('land_equipment').update(data).eq('id', item.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('land_equipment').insert([data])
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['land_equipment'] })
      onClose()
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = {
      equipment_name:     formData.equipment_name,
      item_type:          formData.item_type,
      acquisition_source: formData.acquisition_source,
      description:        formData.description || null,
      condition:          formData.condition,
      estimated_value:    formData.estimated_value ? parseFloat(formData.estimated_value) : null,
      quantity:           formData.quantity ? parseFloat(formData.quantity) : 1,
      unit:               formData.unit || 'unit',
      status:             formData.status,
      notes:              formData.notes || null,
      land_id:            formData.acquisition_source === 'land_purchase' && formData.land_id ? formData.land_id : null,
      warehouse_id:       formData.warehouse_id || null,
      supplier_name:      formData.acquisition_source === 'direct_purchase' && formData.supplier_name ? formData.supplier_name : null,
      purchase_date:      formData.acquisition_source === 'direct_purchase' && formData.purchase_date ? formData.purchase_date : null,
      purchase_price:     formData.acquisition_source === 'direct_purchase' && formData.purchase_price ? parseFloat(formData.purchase_price) : null,
    }
    mutation.mutate(payload)
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">{item ? 'Edit Item' : 'Add Item'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1 – Name + Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Item Name *</label>
                <input type="text" required value={formData.equipment_name}
                  onChange={e => set('equipment_name', e.target.value)}
                  placeholder="e.g., Crane, Spare Pump, Steel Pipe"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Item Type</label>
                <select value={formData.item_type} onChange={e => set('item_type', e.target.value)} className={inputCls}>
                  <option value="equipment">Equipment</option>
                  <option value="spare_part">Spare Part</option>
                  <option value="tool">Tool</option>
                  <option value="material">Material</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Acquisition source */}
            <div>
              <label className={labelCls}>Acquisition Source</label>
              <select value={formData.acquisition_source} onChange={e => set('acquisition_source', e.target.value)} className={inputCls}>
                <option value="existing">Already had it (existing)</option>
                <option value="land_purchase">From a scrap land purchase</option>
                <option value="direct_purchase">Directly purchased</option>
                <option value="transfer">Transferred from another site</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Conditional: land selector */}
            {formData.acquisition_source === 'land_purchase' && (
              <div>
                <label className={labelCls}>Land</label>
                <select value={formData.land_id} onChange={e => set('land_id', e.target.value)} className={inputCls}>
                  <option value="">— Select land —</option>
                  {lands.map(l => <option key={l.id} value={l.id}>{l.land_name}</option>)}
                </select>
              </div>
            )}

            {/* Conditional: direct purchase fields */}
            {formData.acquisition_source === 'direct_purchase' && (
              <div className="grid grid-cols-3 gap-4 bg-blue-50 p-3 rounded-lg">
                <div>
                  <label className={labelCls}>Supplier</label>
                  <input type="text" value={formData.supplier_name} onChange={e => set('supplier_name', e.target.value)}
                    placeholder="Supplier name" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Purchase Date</label>
                  <input type="date" value={formData.purchase_date} onChange={e => set('purchase_date', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Purchase Price (Đ)</label>
                  <input type="number" step="0.01" value={formData.purchase_price} onChange={e => set('purchase_price', e.target.value)} className={inputCls} />
                </div>
              </div>
            )}

            {/* Row – Warehouse */}
            <div>
              <label className={labelCls}>Warehouse</label>
              <select value={formData.warehouse_id} onChange={e => set('warehouse_id', e.target.value)} className={inputCls}>
                <option value="">— No warehouse assigned —</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}{w.location ? ` (${w.location})` : ''}</option>)}
              </select>
            </div>

            {/* Row – Qty + Unit + Condition + Status */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={labelCls}>Quantity</label>
                <input type="number" step="0.001" min="0" value={formData.quantity}
                  onChange={e => set('quantity', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Unit</label>
                <input type="text" value={formData.unit} onChange={e => set('unit', e.target.value)}
                  placeholder="unit / kg / m / pcs" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Condition</label>
                <select value={formData.condition} onChange={e => set('condition', e.target.value)} className={inputCls}>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="scrap">Scrap</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select value={formData.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                  <option value="available">Available</option>
                  <option value="in_warehouse">In Warehouse</option>
                  <option value="reserved">Reserved</option>
                  <option value="sold">Sold</option>
                  <option value="scrapped">Scrapped</option>
                </select>
              </div>
            </div>

            {/* Estimated value */}
            <div>
              <label className={labelCls}>Estimated Value (Đ)</label>
              <input type="number" step="0.01" value={formData.estimated_value}
                onChange={e => set('estimated_value', e.target.value)} className={inputCls} />
            </div>

            {/* Description */}
            <div>
              <label className={labelCls}>Description</label>
              <textarea value={formData.description} onChange={e => set('description', e.target.value)}
                rows={2} placeholder="Specifications, dimensions, etc." className={inputCls} />
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls}>Notes</label>
              <textarea value={formData.notes} onChange={e => set('notes', e.target.value)}
                rows={2} className={inputCls} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm">
                Cancel
              </button>
              <button type="submit" disabled={mutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                {mutation.isPending ? 'Saving…' : item ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
