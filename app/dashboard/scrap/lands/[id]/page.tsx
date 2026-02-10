'use client'

import React from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use } from 'react'
import { ArrowLeft, Plus, Package, TrendingUp, DollarSign, UserCircle, X } from 'lucide-react'
import Link from 'next/link'

export default function LandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [activeTab, setActiveTab] = useState('overview')
  const [showScrapForm, setShowScrapForm] = useState(false)
  const [showEquipmentForm, setShowEquipmentForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [recordingDistributionFor, setRecordingDistributionFor] = useState<string | null>(null)
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
        .order('created_at', { ascending: false })
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

  // Fetch owners for distribution form
  const { data: owners } = useQuery({
    queryKey: ['owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owners')
        .select('*')
        .eq('status', 'active')
        .order('name')
      if (error) throw error
      return data
    }
  })

  // Fetch distributions to show how much has been taken from each sale
  const { data: saleDistributions } = useQuery({
    queryKey: ['sale_distributions', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owner_distributions')
        .select('source_id, amount')
        .eq('source_type', 'scrap_sale')
      if (error) throw error
      
      // Group by source_id and sum amounts
      const grouped = data.reduce((acc: any, curr: any) => {
        if (curr.source_id) {
          acc[curr.source_id] = (acc[curr.source_id] || 0) + parseFloat(curr.amount)
        }
        return acc
      }, {})
      
      return grouped
    }
  })

  // Helper function to get distribution info for a sale
  const getDistributionInfo = (saleId: string, saleAmount: number) => {
    const taken = saleDistributions?.[saleId] || 0
    const remaining = saleAmount - taken
    const isFullyDistributed = remaining <= 0
    return { taken, remaining, isFullyDistributed }
  }

  if (!land) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const totalEquipmentValue = equipmentSales?.reduce((sum, sale) => sum + (sale.sale_price || sale.estimated_value || 0), 0) || 0
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
                <button
                  onClick={() => setShowEquipmentForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Equipment
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipment Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estimated Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale Info</th>
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
                            {equipment.equipment_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {equipment.description || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                            {equipment.condition || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {equipment.estimated_value?.toLocaleString() || 0} AED
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              equipment.status === 'sold_as_is' ? 'bg-green-100 text-green-800' :
                              equipment.status === 'available' ? 'bg-blue-100 text-blue-800' :
                              equipment.status === 'scrapped' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {equipment.status?.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {equipment.sale_price ? (
                              <div>
                                <div className="font-medium text-green-600">{equipment.sale_price.toLocaleString()} AED</div>
                                <div className="text-xs text-gray-500">
                                  {equipment.sale_date ? new Date(equipment.sale_date).toLocaleDateString() : ''}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">Not sold</span>
                            )}
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
                <button
                  onClick={() => setShowScrapForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm"
                >
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity (tons)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price/ton</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scrapSales?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No scrap sales</h3>
                          <p className="mt-1 text-sm text-gray-500">Start by recording scrap sales from this land.</p>
                        </td>
                      </tr>
                    ) : (
                      scrapSales?.map((sale) => {
                        const distInfo = getDistributionInfo(sale.id, sale.total_amount || 0)
                        return (
                        <React.Fragment key={sale.id}>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {sale.material_type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {sale.quantity_tons?.toLocaleString() || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {sale.price_per_ton?.toFixed(2) || 0} AED
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                              {sale.total_amount?.toLocaleString() || 0} AED
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {recordingDistributionFor === sale.id ? (
                                <button
                                  onClick={() => setRecordingDistributionFor(null)}
                                  className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"
                                >
                                  <X className="h-3 w-3" /> Cancel
                                </button>
                              ) : distInfo.isFullyDistributed ? (
                                <div className="text-xs text-gray-400">
                                  <div className="font-medium">Fully Distributed</div>
                                  <div>{distInfo.taken.toLocaleString()} AED taken</div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <button
                                    onClick={() => setRecordingDistributionFor(sale.id)}
                                    className={`text-xs px-3 py-1 rounded flex items-center gap-1 ${
                                      distInfo.taken > 0 
                                        ? 'bg-purple-50 text-purple-600 hover:bg-purple-100' 
                                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                    }`}
                                    title="Record that a partner took this money"
                                  >
                                    <UserCircle className="h-3 w-3" /> 
                                    {distInfo.taken > 0 ? `${distInfo.taken.toLocaleString()} taken` : 'Partner Took This'}
                                  </button>
                                  {distInfo.taken > 0 && (
                                    <div className="text-xs text-gray-500">
                                      {distInfo.remaining.toLocaleString()} AED remaining
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                          {recordingDistributionFor === sale.id && (
                            <tr>
                              <td colSpan={6} className="px-6 py-4 bg-purple-50">
                                <DistributionForm
                                  saleAmount={distInfo.remaining > 0 ? distInfo.remaining : sale.total_amount}
                                  sourceType="scrap_sale"
                                  sourceId={sale.id}
                                  saleDate={sale.sale_date}
                                  owners={owners || []}
                                  onClose={() => setRecordingDistributionFor(null)}
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                        )
                      })
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
                <button
                  onClick={() => setShowExpenseForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm"
                >
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

      {/* Scrap Sale Form Modal */}
      {showScrapForm && (
        <ScrapSaleForm
          landId={resolvedParams.id}
          onClose={() => setShowScrapForm(false)}
        />
      )}

      {/* Equipment Form Modal */}
      {showEquipmentForm && (
        <EquipmentForm
          landId={resolvedParams.id}
          onClose={() => setShowEquipmentForm(false)}
        />
      )}

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <ExpenseForm
          landId={resolvedParams.id}
          onClose={() => setShowExpenseForm(false)}
        />
      )}
    </div>
  )
}

// Scrap Sale Form Component
function ScrapSaleForm({ landId, onClose }: { landId: string, onClose: () => void }) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    sale_date: new Date().toISOString().split('T')[0],
    material_type: '',
    quantity_tons: '',
    price_per_ton: '',
    buyer_company_id: '',
    notes: ''
  })

  // Fetch companies for dropdown (all except parent)
  const { data: scrapBuyers } = useQuery({
    queryKey: ['companies', 'non_parent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, type')
        .neq('type', 'parent')
        .order('name', { ascending: true })
      if (error) throw error
      return data
    }
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('land_scrap_sales')
        .insert([{
          land_id: landId,
          ...data,
          quantity_tons: parseFloat(data.quantity_tons),
          price_per_ton: parseFloat(data.price_per_ton),
          total_amount: parseFloat(data.quantity_tons) * parseFloat(data.price_per_ton)
        }])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['land_scrap_sales', landId] })
      onClose()
    }
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Add Scrap Sale</h2>
          
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData) }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date *</label>
                <input
                  type="date"
                  required
                  value={formData.sale_date}
                  onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Type *</label>
                <input
                  type="text"
                  required
                  value={formData.material_type}
                  onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                  placeholder="e.g., Steel, Copper, Aluminum"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (tons) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.quantity_tons}
                  onChange={(e) => setFormData({ ...formData, quantity_tons: e.target.value })}
                  placeholder="Enter tonnage"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per ton (AED) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.price_per_ton}
                  onChange={(e) => setFormData({ ...formData, price_per_ton: e.target.value })}
                  placeholder="Enter price per ton"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {formData.quantity_tons && formData.price_per_ton && (
                <div className="col-span-2 bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Total Amount</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {(parseFloat(formData.quantity_tons) * parseFloat(formData.price_per_ton)).toLocaleString()} AED
                  </p>
                </div>
              )}

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Company</label>
                <select
                  value={formData.buyer_company_id}
                  onChange={(e) => setFormData({ ...formData, buyer_company_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a company (Optional)</option>
                  {scrapBuyers?.map((buyer) => (
                    <option key={buyer.id} value={buyer.id}>
                      {buyer.name} ({buyer.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
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
                {mutation.isPending ? 'Saving...' : 'Add Scrap Sale'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Equipment Form Component
function EquipmentForm({ landId, onClose }: { landId: string, onClose: () => void }) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    equipment_name: '',
    description: '',
    condition: 'good',
    estimated_value: '',
    warehouse_id: '',
    status: 'available'
  })

  // Fetch warehouses for dropdown
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, location')
        .order('name', { ascending: true })
      if (error) throw error
      return data
    }
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('land_equipment')
        .insert([{
          land_id: landId,
          ...data,
          estimated_value: parseFloat(data.estimated_value)
        }])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['land_equipment', landId] })
      onClose()
    }
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Add Equipment</h2>
          
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData) }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Name *</label>
                <input
                  type="text"
                  required
                  value={formData.equipment_name}
                  onChange={(e) => setFormData({ ...formData, equipment_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition *</label>
                <select
                  required
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="scrap">Scrap</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Value (AED) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.estimated_value}
                  onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Location *</label>
                <select
                  required
                  value={formData.warehouse_id}
                  onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses?.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} - {warehouse.location}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="available">Available</option>
                  <option value="in_warehouse">In Warehouse</option>
                  <option value="scrapped">Scrapped</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
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
                {mutation.isPending ? 'Saving...' : 'Add Equipment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Expense Form Component
function ExpenseForm({ landId, onClose }: { landId: string, onClose: () => void }) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: '',
    payment_method: 'bank_transfer'
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('expenses')
        .insert([{
          project_id: landId,
          project_type: 'land',
          ...data,
          amount: parseFloat(data.amount)
        }])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['land_expenses', landId] })
      onClose()
    }
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Add Expense</h2>
          
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData) }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  <option value="labor">Labor</option>
                  <option value="equipment">Equipment</option>
                  <option value="transportation">Transportation</option>
                  <option value="permits">Permits & Fees</option>
                  <option value="utilities">Utilities</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (AED) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                <select
                  required
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
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
                {mutation.isPending ? 'Saving...' : 'Add Expense'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Distribution Form Component - Record when partner took money from sale
function DistributionForm({ 
  saleAmount, 
  sourceType, 
  sourceId, 
  saleDate,
  owners, 
  onClose 
}: { 
  saleAmount: number
  sourceType: string
  sourceId: string
  saleDate: string
  owners: any[]
  onClose: () => void
}) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    owner_id: '',
    amount: saleAmount.toString(),
    distribution_date: saleDate || new Date().toISOString().split('T')[0],
    description: `Took money from ${sourceType.replace('_', ' ')}`
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('owner_distributions')
        .insert([{
          ...data,
          amount: parseFloat(data.amount),
          source_type: sourceType,
          source_id: sourceId,
          status: 'taken'
        }])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner_distributions'] })
      queryClient.invalidateQueries({ queryKey: ['owner_account_statement'] })
      queryClient.invalidateQueries({ queryKey: ['sale_distributions'] })
      onClose()
    }
  })

  return (
    <form 
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData) }} 
      className="space-y-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <UserCircle className="h-5 w-5 text-purple-600" />
        <h4 className="font-semibold text-gray-900">Record Partner Distribution</h4>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Partner *</label>
          <select
            required
            value={formData.owner_id}
            onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Select Partner</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Amount (AED) *</label>
          <input
            type="number"
            required
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
          <input
            type="date"
            required
            value={formData.distribution_date}
            onChange={(e) => setFormData({ ...formData, distribution_date: e.target.value })}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional notes about this distribution"
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Recording...' : 'Record Distribution'}
        </button>
      </div>
    </form>
  )
}
