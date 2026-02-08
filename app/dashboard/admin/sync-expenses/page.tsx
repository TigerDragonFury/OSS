'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw } from 'lucide-react'

export default function SyncExpensesPage() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<{
    expensesCreated: number
    totalAmount: number
    projectsUpdated: number
    error?: string
  } | null>(null)

  const syncExpenses = async () => {
    setSyncing(true)
    setResult(null)

    try {
      const supabase = createClient()

      // Get all completed tasks that need expenses
      const { data: completedTasks, error: tasksError } = await supabase
        .from('overhaul_tasks')
        .select('*')
        .eq('status', 'completed')
        .or('actual_cost.gt.0,estimated_cost.gt.0')

      if (tasksError) throw tasksError

      let expensesCreated = 0
      let totalAmount = 0

      // Create expenses for each completed task that doesn't have one
      for (const task of completedTasks || []) {
        // Check if expense already exists
        const { data: existingExpense } = await supabase
          .from('expenses')
          .select('id')
          .eq('project_id', task.project_id)
          .ilike('description', `%${task.task_name}%`)
          .single()

        if (!existingExpense) {
          const amount = task.actual_cost || task.estimated_cost || 0
          if (amount > 0) {
            const description = `${task.component_type?.replace(/_/g, ' ')} - ${task.task_name}${
              task.actual_cost ? ' (Completed)' : ' (Auto-generated)'
            }`

            const { error: insertError } = await supabase.from('expenses').insert({
              project_id: task.project_id,
              project_type: 'vessel',
              date: task.end_date || task.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
              category: task.repair_type || 'maintenance',
              description,
              amount,
              vendor_name: task.contractor_name,
              status: 'paid',
              company_id: task.company_id,
              payment_method: 'cash'
            })

            if (!insertError) {
              expensesCreated++
              totalAmount += amount
            }
          }
        }
      }

      // Get all unique project IDs to update
      const projectIds = [...new Set((completedTasks || []).map(t => t.project_id))]
      
      // Update total_spent for each project
      for (const projectId of projectIds) {
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('project_id', projectId)
          .in('project_type', ['vessel', 'overhaul'])

        const total = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

        await supabase
          .from('vessel_overhaul_projects')
          .update({ total_spent: total, updated_at: new Date().toISOString() })
          .eq('id', projectId)
      }

      setResult({
        expensesCreated,
        totalAmount,
        projectsUpdated: projectIds.length
      })
    } catch (error: any) {
      setResult({
        expensesCreated: 0,
        totalAmount: 0,
        projectsUpdated: 0,
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
          <h1 className="text-3xl font-bold text-gray-900">Sync Expenses</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create expenses for completed overhaul tasks and update project totals
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">What this does:</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Finds all completed overhaul tasks without expenses</li>
              <li>Creates expense records for them automatically</li>
              <li>Updates the total_spent for all affected projects</li>
              <li>Safe to run multiple times (won't create duplicates)</li>
            </ul>
          </div>

          <button
            onClick={syncExpenses}
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
                Sync Expenses Now
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
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded p-3">
                      <p className="text-xs text-gray-600">Expenses Created</p>
                      <p className="text-2xl font-bold text-gray-900">{result.expensesCreated}</p>
                    </div>
                    <div className="bg-white rounded p-3">
                      <p className="text-xs text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${result.totalAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white rounded p-3">
                      <p className="text-xs text-gray-600">Projects Updated</p>
                      <p className="text-2xl font-bold text-gray-900">{result.projectsUpdated}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">⚠️ When to use this:</h4>
        <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
          <li>After importing historical data</li>
          <li>When you notice expenses are missing for completed work</li>
          <li>To backfill expenses after schema changes</li>
        </ul>
      </div>
    </div>
  )
}
