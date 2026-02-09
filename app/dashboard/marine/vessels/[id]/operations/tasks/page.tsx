'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use } from 'react'
import { Plus, Edit2, Trash2, CheckSquare, Clock, AlertCircle, Calendar } from 'lucide-react'

export default function TaskAssignmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  
  const queryClient = useQueryClient()
  const supabase = createClient()

  // Vessel Tasks Query (from new schema)
  const { data: vesselTasks } = useQuery({
    queryKey: ['vessel_tasks', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_tasks')
        .select('*, employees(first_name, last_name)')
        .eq('vessel_id', resolvedParams.id)
        .order('due_date', { ascending: true })
      if (error) {
        console.error('Vessel tasks error:', error)
        return []
      }
      return data
    }
  })

  // Delete Task
  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vessel_tasks')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_tasks', resolvedParams.id] })
    }
  })

  // Mark Task as Complete
  const completeTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vessel_tasks')
        .update({ 
          status: 'completed',
          completion_date: new Date().toISOString()
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_tasks', resolvedParams.id] })
    }
  })

  const pendingTasks = vesselTasks?.filter(t => t.status === 'pending').length || 0
  const inProgressTasks = vesselTasks?.filter(t => t.status === 'in_progress').length || 0
  const completedTasks = vesselTasks?.filter(t => t.status === 'completed').length || 0
  const overdueTasks = vesselTasks?.filter(t => 
    t.status !== 'completed' && 
    t.due_date && 
    new Date(t.due_date) < new Date()
  ).length || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Assignments</h1>
          <p className="text-gray-600">Manage vessel tasks, assignments, and deadlines</p>
        </div>
        <button
          onClick={() => {
            setEditingTask(null)
            setShowTaskForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Create Task
        </button>
      </div>

      {!vesselTasks ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800 font-medium mb-2">⚠️ Database Schema Required</p>
          <p className="text-yellow-700">
            The <code className="bg-yellow-100 px-2 py-1 rounded">vessel_tasks</code> table doesn't exist yet. 
            Please run <code className="bg-yellow-100 px-2 py-1 rounded">vessel-operations-schema.sql</code> in Supabase SQL Editor.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-yellow-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingTasks}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{inProgressTasks}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{completedTasks}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{overdueTasks}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Overdue Tasks Warning */}
          {overdueTasks > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-medium">
                  You have {overdueTasks} overdue task{overdueTasks !== 1 ? 's' : ''} that need immediate attention!
                </p>
              </div>
            </div>
          )}

          {/* Tasks Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Tasks</h2>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vesselTasks?.map((task) => {
                      const isOverdue = task.status !== 'completed' && task.due_date && new Date(task.due_date) < new Date()
                      
                      return (
                        <tr key={task.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{task.task_name}</p>
                              <p className="text-sm text-gray-500">{task.description || 'No description'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {task.employees 
                              ? `${task.employees.first_name} ${task.employees.last_name}`
                              : 'Unassigned'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              task.priority === 'critical' ? 'bg-red-100 text-red-800' :
                              task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              {task.due_date ? (
                                <>
                                  <p className={isOverdue ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                                    {new Date(task.due_date).toLocaleDateString()}
                                  </p>
                                  {isOverdue && (
                                    <p className="text-xs text-red-500">Overdue!</p>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-500">No deadline</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              task.status === 'completed' ? 'bg-green-100 text-green-800' :
                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {task.status !== 'completed' && (
                                <button
                                  onClick={() => {
                                    if (confirm('Mark this task as completed?')) {
                                      completeTask.mutate(task.id)
                                    }
                                  }}
                                  className="text-green-600 hover:text-green-800"
                                  title="Complete Task"
                                >
                                  <CheckSquare className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setEditingTask(task)
                                  setShowTaskForm(true)
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this task?')) {
                                    deleteTask.mutate(task.id)
                                  }
                                }}
                                className="text-red-600 hover:text-red-800"
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
                {vesselTasks?.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No tasks created yet. Click "Create Task" to add a task.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* TODO: Add Task Form Modal */}
    </div>
  )
}
