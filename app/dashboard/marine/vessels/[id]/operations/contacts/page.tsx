'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { hasModulePermission } from '@/lib/auth/rolePermissions'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use } from 'react'
import { Plus, Edit2, Trash2, Users, Phone, Mail, MapPin, Building } from 'lucide-react'

const CONTACT_CATEGORIES = [
  'Port Authority',
  'Agent',
  'Supplier',
  'Contractor',
  'Emergency',
  'Insurance',
  'Classification Society',
  'Charterer',
  'Owner Representative',
  'Other'
]

export default function ContactsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [showContactForm, setShowContactForm] = useState(false)
  const [editingContact, setEditingContact] = useState<any>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { user } = useAuth()
  
  // Get user role and permissions
  const userRole = user?.role || user?.roles?.[0] || 'storekeeper'
  const canEdit = hasModulePermission(userRole, ['marine', 'vessels'], 'edit')
  const canDelete = hasModulePermission(userRole, ['marine', 'vessels'], 'delete')
  const canCreate = hasModulePermission(userRole, ['marine', 'vessels'], 'create')

  // Vessel Contacts Query (from new schema)
  const { data: contacts } = useQuery({
    queryKey: ['vessel_contacts', resolvedParams.id, filterCategory],
    queryFn: async () => {
      let query = supabase
        .from('vessel_contacts')
        .select('*')
        .eq('vessel_id', resolvedParams.id)
      
      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory)
      }
      
      const { data, error } = await query.order('company_name', { ascending: true })
      
      if (error) {
        console.error('Vessel contacts error:', error)
        return []
      }
      return data
    }
  })

  // Delete Contact
  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vessel_contacts')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_contacts', resolvedParams.id] })
    }
  })

  const totalContacts = contacts?.length || 0
  const emergencyContacts = contacts?.filter(c => c.category === 'Emergency').length || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts Directory</h1>
          <p className="text-gray-600">Manage vessel-related contacts, suppliers, and service providers</p>
        </div>
        <button
          onClick={() => {
            setEditingContact(null)
            setShowContactForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Add Contact
        </button>
      </div>

      {!contacts ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800 font-medium mb-2">⚠️ Database Schema Required</p>
          <p className="text-yellow-700">
            The <code className="bg-yellow-100 px-2 py-1 rounded">vessel_contacts</code> table doesn't exist yet. 
            Please run <code className="bg-yellow-100 px-2 py-1 rounded">vessel-operations-schema.sql</code> in Supabase SQL Editor.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Contacts</p>
                  <p className="text-2xl font-bold text-gray-900">{totalContacts}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <Phone className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Emergency Contacts</p>
                  <p className="text-2xl font-bold text-red-600">{emergencyContacts}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filter by Category */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Category:</span>
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  filterCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {CONTACT_CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setFilterCategory(category)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    filterCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Contacts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contacts?.map((contact) => (
              <div key={contact.id} className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow ${
                contact.category === 'Emergency' ? 'border-2 border-red-300' : ''
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <Building className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{contact.company_name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        contact.category === 'Emergency' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {contact.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingContact(contact)
                        setShowContactForm(true)
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this contact?')) {
                          deleteContact.mutate(contact.id)
                        }
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {contact.contact_person && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>{contact.contact_person}</span>
                    </div>
                  )}

                  {contact.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <a href={`tel:${contact.phone}`} className="hover:text-blue-600">
                        {contact.phone}
                      </a>
                      {contact.phone_2 && (
                        <span className="text-gray-500">/ {contact.phone_2}</span>
                      )}
                    </div>
                  )}

                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a href={`mailto:${contact.email}`} className="hover:text-blue-600 truncate">
                        {contact.email}
                      </a>
                    </div>
                  )}

                  {contact.address && (
                    <div className="flex items-start gap-2 text-sm text-gray-700">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <span className="line-clamp-2">{contact.address}</span>
                    </div>
                  )}

                  {contact.notes && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600 line-clamp-2">{contact.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {contacts?.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              No contacts added yet. Click "Add Contact" to start building your vessel contacts directory.
            </div>
          )}

          {/* Contact Categories Reference */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Categories</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {CONTACT_CATEGORIES.map((category) => (
                <div key={category} className="text-sm text-gray-700">• {category}</div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* TODO: Add Contact Form Modal */}
    </div>
  )
}
