'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Building2, Plus, Search, Filter } from 'lucide-react'

type CompanyType = 'parent' | 'contractor' | 'vendor' | 'scrap_buyer' | 'equipment_dealer' | 'marine' | 'scrap'

export default function CompaniesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<CompanyType | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingCompany, setEditingCompany] = useState<any>(null)
  
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies', typeFilter],
    queryFn: async () => {
      let query = supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true })
      
      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data
    }
  })

  const filteredCompanies = companies?.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      parent: 'Parent Company',
      contractor: 'Contractor',
      vendor: 'Vendor',
      scrap_buyer: 'Scrap Buyer',
      equipment_dealer: 'Equipment Dealer',
      marine: 'Marine Services',
      scrap: 'Scrap Services'
    }
    return labels[type] || type
  }

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      parent: 'bg-purple-100 text-purple-800',
      contractor: 'bg-blue-100 text-blue-800',
      vendor: 'bg-green-100 text-green-800',
      scrap_buyer: 'bg-orange-100 text-orange-800',
      equipment_dealer: 'bg-yellow-100 text-yellow-800',
      marine: 'bg-cyan-100 text-cyan-800',
      scrap: 'bg-gray-100 text-gray-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Companies & Vendors</h1>
          <p className="text-gray-600 mt-1">Manage contractors, vendors, buyers, and dealers</p>
        </div>
        <button
          onClick={() => { setEditingCompany(null); setShowForm(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Company
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Companies</p>
              <p className="text-2xl font-bold text-gray-900">{companies?.length || 0}</p>
            </div>
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Contractors</p>
              <p className="text-2xl font-bold text-gray-900">
                {companies?.filter(c => c.type === 'contractor').length || 0}
              </p>
            </div>
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Vendors</p>
              <p className="text-2xl font-bold text-gray-900">
                {companies?.filter(c => c.type === 'vendor').length || 0}
              </p>
            </div>
            <Building2 className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Scrap Buyers</p>
              <p className="text-2xl font-bold text-gray-900">
                {companies?.filter(c => c.type === 'scrap_buyer').length || 0}
              </p>
            </div>
            <Building2 className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="contractor">Contractors</option>
              <option value="vendor">Vendors</option>
              <option value="scrap_buyer">Scrap Buyers</option>
              <option value="equipment_dealer">Equipment Dealers</option>
              <option value="parent">Parent Companies</option>
              <option value="marine">Marine Services</option>
              <option value="scrap">Scrap Services</option>
            </select>
          </div>
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCompanies?.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No companies</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new company.</p>
                </td>
              </tr>
            ) : (
              filteredCompanies?.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building2 className="h-5 w-5 text-gray-400 mr-3" />
                      <div className="text-sm font-medium text-gray-900">{company.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeBadgeColor(company.type)}`}>
                      {getTypeLabel(company.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {company.created_at ? new Date(company.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => { setEditingCompany(company); setShowForm(true); }}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('Delete this company?')) {
                          await supabase.from('companies').delete().eq('id', company.id)
                          queryClient.invalidateQueries({ queryKey: ['companies'] })
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Company Form Modal */}
      {showForm && (
        <CompanyForm
          company={editingCompany}
          onClose={() => { setShowForm(false); setEditingCompany(null); }}
        />
      )}
    </div>
  )
}

// Company Form Component
function CompanyForm({ company, onClose }: { company?: any, onClose: () => void }) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: company?.name || '',
    type: company?.type || 'contractor' as CompanyType
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (company?.id) {
        const { error } = await supabase
          .from('companies')
          .update(data)
          .eq('id', company.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('companies')
          .insert([data])
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      onClose()
    }
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            {company ? 'Edit Company' : 'Add New Company'}
          </h2>
          
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData) }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., ABC Marine Contractors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Type *</label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as CompanyType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="contractor">Contractor</option>
                <option value="vendor">Vendor</option>
                <option value="scrap_buyer">Scrap Buyer</option>
                <option value="equipment_dealer">Equipment Dealer</option>
                <option value="parent">Parent Company</option>
                <option value="marine">Marine Services</option>
                <option value="scrap">Scrap Services</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Select the primary business type for this company
              </p>
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
                {mutation.isPending ? 'Saving...' : (company ? 'Update Company' : 'Add Company')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
