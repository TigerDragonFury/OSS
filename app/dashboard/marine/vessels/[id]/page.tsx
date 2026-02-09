'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Settings, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

export default function VesselPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const supabase = createClient()

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

  // Get financial summary from view
  const { data: financialSummary } = useQuery({
    queryKey: ['vessel_financial_summary', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_financial_summary')
        .select('*')
        .eq('id', resolvedParams.id)
        .single()
      if (error) console.error('Financial summary error:', error)
      return data || {
        total_equipment_sales: 0,
        total_scrap_sales: 0,
        total_rental_income: 0,
        total_expenses: 0,
        total_overhaul_expenses: 0,
        net_profit_loss: 0
      }
    }
  })

  if (!vessel) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const totalRevenue = (financialSummary?.total_equipment_sales || 0) + 
                      (financialSummary?.total_scrap_sales || 0) + 
                      (financialSummary?.total_rental_income || 0)
  const totalCosts = (vessel.purchase_price || 0) + 
                     (financialSummary?.total_expenses || 0) + 
                     (financialSummary?.total_overhaul_expenses || 0)
  const netProfitLoss = totalRevenue - totalCosts

  return (
    <div className="space-y-6">
      <Link href="/dashboard/marine/vessels" className="inline-flex items-center text-blue-600 hover:text-blue-700">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Vessels
      </Link>

      {/* Vessel Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{vessel.name}</h1>
            <p className="text-gray-600 mt-1">{vessel.vessel_type}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            vessel.status === 'active' ? 'bg-green-100 text-green-800' :
            vessel.status === 'scrapping' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {vessel.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Location</p>
            <p className="text-lg font-semibold">{vessel.current_location || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Tonnage</p>
            <p className="text-lg font-semibold">{vessel.tonnage || 'N/A'} tons</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Year Built</p>
            <p className="text-lg font-semibold">{vessel.year_built || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Classification</p>
            <p className="text-lg font-semibold">{vessel.classification_status || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <DollarSign className="h-5 w-5" />
            <p className="text-sm font-medium">Purchase Price</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {vessel.purchase_price?.toLocaleString() || 0} AED
          </p>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <TrendingUp className="h-5 w-5" />
            <p className="text-sm font-medium">Total Revenue</p>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {totalRevenue.toLocaleString()} AED
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Equipment: {(financialSummary?.total_equipment_sales || 0).toLocaleString()} | 
            Scrap: {(financialSummary?.total_scrap_sales || 0).toLocaleString()} | 
            Rentals: {(financialSummary?.total_rental_income || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-red-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <TrendingDown className="h-5 w-5" />
            <p className="text-sm font-medium">Total Costs</p>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {totalCosts.toLocaleString()} AED
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Purchase + Operations + Overhauls
          </p>
        </div>

        <div className={`rounded-lg shadow p-6 ${netProfitLoss >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className={`h-5 w-5 ${netProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            <p className={`text-sm font-medium ${netProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Net Profit/Loss
            </p>
          </div>
          <p className={`text-2xl font-bold ${netProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {netProfitLoss >= 0 ? '+' : ''}{netProfitLoss.toLocaleString()} AED
          </p>
        </div>
      </div>

      {/* Main Call-to-Action */}
      <Link 
        href={`/dashboard/marine/vessels/${vessel.id}/operations`}
        className="block bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 text-white hover:from-blue-700 hover:to-blue-800 transition-all"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Vessel Operations Center</h2>
            <p className="text-blue-100">
              Manage maintenance, crew, tasks, inventory, logs, documents, and all vessel operations
            </p>
          </div>
          <Settings className="h-12 w-12" />
        </div>
      </Link>

      {/* Quick Info */}
      {vessel.notes && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
          <p className="text-gray-700">{vessel.notes}</p>
        </div>
      )}
    </div>
  )
}
