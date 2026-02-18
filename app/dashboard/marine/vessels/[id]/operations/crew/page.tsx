'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { hasModulePermission } from '@/lib/auth/rolePermissions'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use } from 'react'
import { Plus, Edit2, Trash2, Users, UserCheck, UserX, Calendar } from 'lucide-react'

export default function CrewManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [showCrewForm, setShowCrewForm] = useState(false)
  const [editingCrew, setEditingCrew] = useState<any>(null)
  
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { user } = useAuth()
  
  // Get user role and permissions
  const userRole = user?.role || user?.roles?.[0] || 'storekeeper'
  const canEdit = hasModulePermission(userRole, ['marine', 'vessels'], 'edit')
  const canDelete = hasModulePermission(userRole, ['marine', 'vessels'], 'delete')
  const canCreate = hasModulePermission(userRole, ['marine', 'vessels'], 'create')

  // Crew Assignments Query (from new schema)
  const { data: crewAssignments } = useQuery({
    queryKey: ['vessel_crew_assignments', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_crew_assignments')
        .select('*, employees(full_name, email, phone)')
        .eq('vessel_id', resolvedParams.id)
        .order('assignment_start_date', { ascending: false })
      if (error) {
        console.error('Crew assignments error:', error)
        return []
      }
      return data
    }
  })

  // Delete Crew Assignment
  const deleteCrewAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vessel_crew_assignments')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_crew_assignments', resolvedParams.id] })
    }
  })

  // Mark Crew as Disembarked
  const disembarkCrew = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string }) => {
      const { error } = await supabase
        .from('vessel_crew_assignments')
        .update({ 
          assignment_end_date: date,
          status: 'completed'
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_crew_assignments', resolvedParams.id] })
    }
  })

  const activeCrew = crewAssignments?.filter(c => c.status === 'active').length || 0
  const onLeave = crewAssignments?.filter(c => c.status === 'on_leave').length || 0
  const totalAssignments = crewAssignments?.length || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crew Management</h1>
          <p className="text-gray-600">Manage vessel crew assignments, roles, and status</p>
        </div>
        <button
          onClick={() => {
            setEditingCrew(null)
            setShowCrewForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Assign Crew Member
        </button>
      </div>

      {!crewAssignments ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800 font-medium mb-2">⚠️ Database Schema Required</p>
          <p className="text-yellow-700">
            The <code className="bg-yellow-100 px-2 py-1 rounded">vessel_crew_assignments</code> table doesn't exist yet. 
            Please run <code className="bg-yellow-100 px-2 py-1 rounded">vessel-operations-schema.sql</code> in Supabase SQL Editor.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-blue-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <UserCheck className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Active Crew</p>
                  <p className="text-2xl font-bold text-gray-900">{activeCrew}</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">On Leave</p>
                  <p className="text-2xl font-bold text-gray-900">{onLeave}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <UserX className="h-8 w-8 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Assignments</p>
                  <p className="text-2xl font-bold text-gray-900">{totalAssignments}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Crew Capacity</p>
                  <p className="text-2xl font-bold text-gray-900">{activeCrew} / {activeCrew + 5}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Crew Assignments Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Crew Assignments</h2>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Crew Member</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role/Position</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignment Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {crewAssignments?.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {assignment.employees?.full_name}
                            </p>
                            <p className="text-sm text-gray-500">{assignment.employees?.email || 'No email'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{assignment.role}</p>
                          <p className="text-sm text-gray-500">{assignment.rank || 'No rank'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {assignment.department || 'General'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(assignment.assignment_start_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {assignment.assignment_end_date 
                            ? new Date(assignment.assignment_end_date).toLocaleDateString() 
                            : 'Active'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            assignment.status === 'active' ? 'bg-green-100 text-green-800' :
                            assignment.status === 'on_leave' ? 'bg-yellow-100 text-yellow-800' :
                            assignment.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {assignment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {assignment.status === 'active' && (
                              <button
                                onClick={() => {
                                  if (confirm('Mark this crew member as disembarked?')) {
                                    disembarkCrew.mutate({
                                      id: assignment.id,
                                      date: new Date().toISOString().split('T')[0]
                                    })
                                  }
                                }}
                                className="text-orange-600 hover:text-orange-800"
                                title="Disembark"
                              >
                                <UserX className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingCrew(assignment)
                                setShowCrewForm(true)
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this crew assignment?')) {
                                  deleteCrewAssignment.mutate(assignment.id)
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
                {crewAssignments?.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No crew assignments yet. Click "Assign Crew Member" to add crew.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Crew Notes Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Crew Management Notes</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>• <strong>Active Status:</strong> Currently serving on vessel</p>
              <p>• <strong>On Leave:</strong> Temporarily away from duty</p>
              <p>• <strong>Completed:</strong> Assignment ended (disembarked)</p>
              <p>• <strong>Department:</strong> Deck, Engine, Steward, Other</p>
            </div>
          </div>
        </>
      )}

      {/* TODO: Add Crew Assignment Form Modal */}
    </div>
  )
}
