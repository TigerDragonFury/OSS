'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use } from 'react'
import { ArrowLeft, Plus, Package, TrendingUp, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function LandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [activeTab, setActiveTab] = useState('overview')
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: land } = useQuery({
    queryKey: ['land_purchase', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('land_purchases')
        .select('*')
        .eq('id', resolvedParams.id)
        .single()
      if (error) throw error
      return data
    }
  })

  const { data: equipmentSales } = useQuery({
    queryKey: ['land_equipment', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('land_equipment')
        .select('*')
        .eq('land_id', resolvedParams.id)
        .order('extraction_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: scrapSales } = useQuery({
    queryKey: ['land_scrap_sales', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('land_scrap_sales')
        .select('*')
        .eq('land_id', resolvedParams.id)
        .order('sale_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: expenses } = useQuery({
    queryKey: ['land_expenses', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('project_id', resolvedParams.id)
        .eq('project_type', 'land')
        .order('date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  if (!land) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const totalEquipmentValue = equipmentSales?.reduce((sum, sale) => sum + (sale.value || 0), 0) || 0
  const totalScrapSales = scrapSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
  const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0
  const netProfitLoss = totalEquipmentValue + totalScrapSales - (land.purchase_price || 0) - totalExpenses

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'equipment', name: 'Equipment' },
    { id: 'scrap', name: 'Scrap Sales' },
    { id: 'expenses', name: 'Expenses' }
  ]

  return (
    <div className="space-y-6">
      <Link href="/dashboard/scrap/lands" className="inline-flex items-center text-blue-600 hover:text-blue-700">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Land Purchases
      </Link>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{land.land_name}</h1>
            <p className="text-gray-600 mt-1">{land.location || 'No location specified'}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            land.status === 'active' ? 'bg-green-100 text-green-800' :
            land.status === 'partially_cleared' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {land.status?.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Purchase Price</p>
            <p className="text-2xl font-bold text-blue-900 mt-2">
              {land.purchase_price?.toLocaleString() || 0} AED
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {land.purchase_date ? new Date(land.purchase_date).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Total Revenue</p>
            <p className="text-2xl font-bold text-green-900 mt-2">
              {(totalEquipmentValue + totalScrapSales).toLocaleString()} AED
            </p>
            <p className="text-xs text-green-600 mt-1">
              Equipment + Scrap
            </p>
          </div>
          <div className={`${netProfitLoss >= 0 ? 'bg-green-50' : 'bg-red-50'} rounded-lg p-4`}>
            <p className={`text-sm font-medium ${netProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Net Profit/Loss
            </p>
            <p className={`text-2xl font-bold mt-2 ${netProfitLoss >= 0 ? 'text-green-900' : 'text-red-900'}`}>
              {netProfitLoss.toLocaleString()} AED
            </p>
            <p className={`text-xs mt-1 ${netProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netProfitLoss >= 0 ? 'Profit' : 'Loss'}
            </p>
          </div>
        </div>
      </div>

      {/* Tonnage Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tonnage Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600">Estimated Tonnage</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {land.estimated_tonnage?.toLocaleString() || 0} tons
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Remaining Tonnage</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {land.remaining_tonnage?.toLocaleString() || 0} tons
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Extracted</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {((land.estimated_tonnage || 0) - (land.remaining_tonnage || 0)).toLocaleString()} tons
            </p>
            {land.estimated_tonnage > 0 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${((land.estimated_tonnage - land.remaining_tonnage) / land.estimated_tonnage) * 100}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {(((land.estimated_tonnage - land.remaining_tonnage) / land.estimated_tonnage) * 100).toFixed(1)}% extracted
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Land Details</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Land Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{land.land_name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Location</dt>
                    <dd className="mt-1 text-sm text-gray-900">{land.location || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Purchase Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {land.purchase_date ? new Date(land.purchase_date).toLocaleDateString() : 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">
                      {land.status?.replace('_', ' ')}
                    </dd>
                  </div>
                </dl>
              </div>

              {land.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Notes</h4>
                  <p className="text-sm text-gray-900 bg-gray-50 p-4 rounded-lg">{land.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Financial Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Purchase Price:</span>
                      <span className="font-medium">{land.purchase_price?.toLocaleString() || 0} AED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Equipment Sales:</span>
                      <span className="font-medium text-green-600">{totalEquipmentValue.toLocaleString()} AED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Scrap Sales:</span>
                      <span className="font-medium text-green-600">{totalScrapSales.toLocaleString()} AED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Expenses:</span>
                      <span className="font-medium text-red-600">{totalExpenses.toLocaleString()} AED</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-300">
                      <span className="text-gray-900 font-semibold">Net Profit/Loss:</span>
                      <span className={`font-bold ${netProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {netProfitLoss.toLocaleString()} AED
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Activity Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Equipment Items:</span>
                      <span className="font-medium">{equipmentSales?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Scrap Sales:</span>
                      <span className="font-medium">{scrapSales?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expense Records:</span>
                      <span className="font-medium">{expenses?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Equipment Tab */}
          {activeTab === 'equipment' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Equipment Extracted</h3>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Equipment
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipment Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Extraction Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {equipmentSales?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <Package className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No equipment records</h3>
                          <p className="mt-1 text-sm text-gray-500">Start by adding equipment extracted from this land.</p>
                        </td>
                      </tr>
                    ) : (
                      equipmentSales?.map((equipment) => (
                        <tr key={equipment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {equipment.equipment_type}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {equipment.description || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {equipment.extraction_date ? new Date(equipment.extraction_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {equipment.quantity || 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {equipment.value?.toLocaleString() || 0} AED
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              equipment.status === 'sold' ? 'bg-green-100 text-green-800' :
                              equipment.status === 'in_stock' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {equipment.status?.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Scrap Sales Tab */}
          {activeTab === 'scrap' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Scrap Sales</h3>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Scrap Sale
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity (kg)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price/kg</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scrapSales?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No scrap sales</h3>
                          <p className="mt-1 text-sm text-gray-500">Start by recording scrap sales from this land.</p>
                        </td>
                      </tr>
                    ) : (
                      scrapSales?.map((sale) => (
                        <tr key={sale.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {sale.material_type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {sale.quantity_kg?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {sale.price_per_kg?.toFixed(2) || 0} AED
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {sale.total_amount?.toLocaleString() || 0} AED
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {sale.buyer_name || 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expenses Tab */}
          {activeTab === 'expenses' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Expenses</h3>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expenses?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses</h3>
                          <p className="mt-1 text-sm text-gray-500">Start by recording expenses for this land.</p>
                        </td>
                      </tr>
                    ) : (
                      expenses?.map((expense) => (
                        <tr key={expense.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {expense.date ? new Date(expense.date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                            {expense.category?.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {expense.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                            {expense.amount?.toLocaleString() || 0} AED
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                            {expense.payment_method?.replace('_', ' ')}
                          </td>
                        </tr>
                      ))
                    )}
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
