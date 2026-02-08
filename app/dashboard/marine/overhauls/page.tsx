'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import Pagination from '@/components/Pagination'

export default function OverhaulsPage() {
  const [isAdding, setIsAdding] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: projects, isLoading } = useQuery({
    queryKey: ['vessel_overhaul_projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_overhaul_projects')
        .select(`
          *,
          vessels (
            name,
            vessel_type
          )
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: vessels } = useQuery({
    queryKey: ['vessels_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessels')
        .select('*')
        .in('status', ['active', 'under_overhaul'])
        .order('name')
      if (error) throw error
      return data
    }
  })

  // Pagination
  const totalPages = Math.ceil((projects?.length || 0) / itemsPerPage)
  const paginatedProjects = projects?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Overhaul Projects</h1>
          <p className="text-gray-600 mt-1">Manage vessel overhaul and repair projects</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Project
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {paginatedProjects?.map((project: any) => {
            const progressPercent = project.total_budget > 0 
              ? ((project.total_spent || 0) / project.total_budget) * 100 
              : 0

            return (
              <div key={project.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <Link href={`/dashboard/marine/overhauls/${project.id}`}>
                        <h3 className="text-xl font-semibold text-gray-900 hover:text-blue-600 cursor-pointer">
                          {project.project_name}
                        </h3>
                      </Link>
                      <span className={`ml-3 px-3 py-1 rounded-full text-xs font-medium ${
                        project.status === 'completed' ? 'bg-green-100 text-green-800' :
                        project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">
                      Vessel: {project.vessels?.name || 'N/A'}
                    </p>

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Start Date</p>
                        <p className="font-medium">{project.start_date || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">End Date</p>
                        <p className="font-medium">{project.end_date || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Budget</p>
                        <p className="font-medium">{project.total_budget?.toLocaleString() || 0} AED</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Spent</p>
                        <p className="font-medium text-red-600">{project.total_spent?.toLocaleString() || 0} AED</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Budget Progress</span>
                        <span className="font-medium">{progressPercent.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${progressPercent > 100 ? 'bg-red-600' : progressPercent > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {project.notes && (
                      <p className="text-sm text-gray-600 mt-3">{project.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {projects?.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">No overhaul projects yet. Click "New Project" to get started.</p>
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={projects?.length}
            itemsPerPage={itemsPerPage}
          />
        </div>
      )}

      {isAdding && <ProjectForm onClose={() => setIsAdding(false)} vessels={vessels || []} />}
    </div>
  )
}

function ProjectForm({ onClose, vessels }: { onClose: () => void, vessels: any[] }) {
  const [formData, setFormData] = useState({
    vessel_id: '',
    project_name: '',
    start_date: '',
    end_date: '',
    status: 'planning',
    total_budget: '',
    notes: ''
  })

  const queryClient = useQueryClient()
  const supabase = createClient()

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const cleanData = {
        ...data,
        total_budget: data.total_budget ? parseFloat(data.total_budget) : null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        notes: data.notes || null
      }
      const { error } = await supabase
        .from('vessel_overhaul_projects')
        .insert([cleanData])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_overhaul_projects'] })
      onClose()
    },
    onError: (error: any) => {
      alert(`Error: ${error.message || 'Failed to save project'}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">New Overhaul Project</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vessel *</label>
                <select
                  required
                  value={formData.vessel_id}
                  onChange={(e) => setFormData({ ...formData, vessel_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Vessel</option>
                  {vessels.map((vessel) => (
                    <option key={vessel.id} value={vessel.id}>{vessel.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  placeholder="e.g., Major Engine Overhaul"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Budget (AED)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total_budget}
                  onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="planning">Planning</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
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
                {mutation.isPending ? 'Saving...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
