'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw, CheckCircle } from 'lucide-react'

export default function SyncTonnagePage() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<{
    landsUpdated: number
    totalEstimated: number
    totalRemaining: number
    totalSold: number
    error?: string
  } | null>(null)

  const syncTonnage = async () => {
    setSyncing(true)
    setResult(null)

    try {
      const supabase = createClient()

      // Get all land purchases
      const { data: lands, error: landsError } = await supabase
        .from('land_purchases')
        .select('*')

      if (landsError) throw landsError

      let totalEstimated = 0
      let totalRemaining = 0
      let totalSold = 0

      // Update remaining tonnage for each land
      for (const land of lands || []) {
        // Get total sold tonnage from scrap sales
        const { data: sales } = await supabase
          .from('land_scrap_sales')
          .select('quantity_tons')
          .eq('land_id', land.id)

        const soldTonnage = sales?.reduce((sum, sale) => sum + (sale.quantity_tons || 0), 0) || 0
        const remaining = (land.estimated_tonnage || 0) - soldTonnage

        // Update the land purchase record
        await supabase
          .from('land_purchases')
          .update({ 
            remaining_tonnage: remaining,
            updated_at: new Date().toISOString() 
          })
          .eq('id', land.id)

        totalEstimated += land.estimated_tonnage || 0
        totalRemaining += remaining
        totalSold += soldTonnage
      }

      setResult({
        landsUpdated: lands?.length || 0,
        totalEstimated,
        totalRemaining,
        totalSold
      })
    } catch (error: any) {
      setResult({
        landsUpdated: 0,
        totalEstimated: 0,
        totalRemaining: 0,
        totalSold: 0,
        error: error.message
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sync Tonnage</h1>
          <p className="mt-2 text-sm text-gray-600">
            Recalculate remaining tonnage for all land purchases based on scrap sales
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">What this does:</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Calculates total scrap sold (in tons) for each land purchase</li>
              <li>Updates remaining_tonnage = estimated_tonnage - total sold</li>
              <li>Example: Bought 300 tons, sold 300 tons = 0 remaining</li>
              <li>Safe to run anytime to sync data</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-green-900 mb-1">Auto-sync enabled</h3>
                <p className="text-sm text-green-800">
                  After running the migration SQL, remaining tonnage updates automatically whenever you add/edit/delete scrap sales. 
                  Use this tool only if you need to manually recalculate or fix data inconsistencies.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={syncTonnage}
            disabled={syncing}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {syncing ? (
              <>
                <RefreshCw className="animate-spin mr-2 h-5 w-5" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-5 w-5" />
                Sync Tonnage Now
              </>
            )}
          </button>

          {result && (
            <div className={`rounded-lg p-4 ${result.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              {result.error ? (
                <div>
                  <h4 className="font-medium text-red-900 mb-2">Error:</h4>
                  <p className="text-sm text-red-800">{result.error}</p>
                </div>
              ) : (
                <div>
                  <h4 className="font-medium text-green-900 mb-3">Sync Complete!</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded p-3">
                      <p className="text-xs text-gray-600">Lands Updated</p>
                      <p className="text-2xl font-bold text-gray-900">{result.landsUpdated}</p>
                    </div>
                    <div className="bg-white rounded p-3">
                      <p className="text-xs text-gray-600">Total Estimated</p>
                      <p className="text-xl font-bold text-gray-900">{result.totalEstimated.toLocaleString()} tons</p>
                    </div>
                    <div className="bg-white rounded p-3">
                      <p className="text-xs text-gray-600">Total Sold</p>
                      <p className="text-xl font-bold text-orange-600">{result.totalSold.toLocaleString()} tons</p>
                    </div>
                    <div className="bg-white rounded p-3">
                      <p className="text-xs text-gray-600">Total Remaining</p>
                      <p className="text-xl font-bold text-blue-600">{result.totalRemaining.toLocaleString()} tons</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">📋 Migration Required</h4>
        <p className="text-sm text-yellow-800 mb-2">
          To enable automatic tonnage tracking, run <code className="bg-yellow-100 px-1 py-0.5 rounded">fix-scrap-sales-units.sql</code> in Supabase SQL Editor.
        </p>
        <p className="text-sm text-yellow-800">
          This will:
        </p>
        <ul className="text-sm text-yellow-800 mt-1 ml-4 list-disc">
          <li>Convert existing kg data to tons (if any)</li>
          <li>Create trigger for auto-updates</li>
          <li>Recalculate all remaining tonnages</li>
        </ul>
      </div>
    </div>
  )
}
