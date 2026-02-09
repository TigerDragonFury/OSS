'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use } from 'react'
import { Plus, Edit2, Trash2, FileText, Download, Upload, Calendar as CalendarIcon } from 'lucide-react'

const DOCUMENT_CATEGORIES = [
  'Certificates',
  'Manuals',
  'Insurance',
  'Surveys',
  'Drawings',
  'Safety',
  'Compliance',
  'Contracts',
  'Other'
]

export default function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [showDocumentForm, setShowDocumentForm] = useState(false)
  const [editingDocument, setEditingDocument] = useState<any>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  
  const queryClient = useQueryClient()
  const supabase = createClient()

  // Vessel Documents Query (from new schema)
  const { data: documents } = useQuery({
    queryKey: ['vessel_documents', resolvedParams.id, filterCategory],
    queryFn: async () => {
      let query = supabase
        .from('vessel_documents')
        .select('*')
        .eq('vessel_id', resolvedParams.id)
      
      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) {
        console.error('Vessel documents error:', error)
        return []
      }
      return data
    }
  })

  // Delete Document
  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vessel_documents')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_documents', resolvedParams.id] })
    }
  })

  const totalDocuments = documents?.length || 0
  const expiringSoon = documents?.filter(doc => {
    if (!doc.expiry_date) return false
    const expiryDate = new Date(doc.expiry_date)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date()
  }).length || 0
  const expired = documents?.filter(doc => {
    if (!doc.expiry_date) return false
    return new Date(doc.expiry_date) < new Date()
  }).length || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents & Manuals</h1>
          <p className="text-gray-600">Manage vessel certificates, manuals, and documentation</p>
        </div>
        <button
          onClick={() => {
            setEditingDocument(null)
            setShowDocumentForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Add Document
        </button>
      </div>

      {!documents ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800 font-medium mb-2">⚠️ Database Schema Required</p>
          <p className="text-yellow-700">
            The <code className="bg-yellow-100 px-2 py-1 rounded">vessel_documents</code> table doesn't exist yet. 
            Please run <code className="bg-yellow-100 px-2 py-1 rounded">vessel-operations-schema.sql</code> in Supabase SQL Editor.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Documents</p>
                  <p className="text-2xl font-bold text-gray-900">{totalDocuments}</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Expiring Soon (30 days)</p>
                  <p className="text-2xl font-bold text-orange-600">{expiringSoon}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Expired Documents</p>
                  <p className="text-2xl font-bold text-red-600">{expired}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Expiry Warnings */}
          {(expiringSoon > 0 || expired > 0) && (
            <div className={`border-l-4 p-4 rounded ${
              expired > 0 ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-500'
            }`}>
              <div className="flex items-center gap-2">
                <CalendarIcon className={`h-5 w-5 ${expired > 0 ? 'text-red-600' : 'text-orange-600'}`} />
                <p className={`font-medium ${expired > 0 ? 'text-red-800' : 'text-orange-800'}`}>
                  {expired > 0 && `${expired} document${expired !== 1 ? 's' : ''} expired! `}
                  {expiringSoon > 0 && `${expiringSoon} document${expiringSoon !== 1 ? 's' : ''} expiring within 30 days.`}
                </p>
              </div>
            </div>
          )}

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
              {DOCUMENT_CATEGORIES.map((category) => (
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

          {/* Documents Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {documents?.map((doc) => {
                      const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date()
                      const isExpiringSoon = doc.expiry_date && !isExpired && new Date(doc.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                      
                      return (
                        <tr key={doc.id} className={`hover:bg-gray-50 ${
                          isExpired ? 'bg-red-50' : isExpiringSoon ? 'bg-orange-50' : ''
                        }`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <p className="font-medium text-gray-900">{doc.document_name}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              {doc.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{doc.document_number || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {doc.issue_date ? new Date(doc.issue_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {doc.expiry_date ? (
                              <span className={isExpired ? 'text-red-600 font-semibold' : isExpiringSoon ? 'text-orange-600 font-semibold' : 'text-gray-900'}>
                                {new Date(doc.expiry_date).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-gray-500">No expiry</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              isExpired ? 'bg-red-100 text-red-800' :
                              isExpiringSoon ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Valid'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {doc.file_url && (
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600 hover:text-green-800"
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              )}
                              <button
                                onClick={() => {
                                  setEditingDocument(doc)
                                  setShowDocumentForm(true)
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this document?')) {
                                    deleteDocument.mutate(doc.id)
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
                {documents?.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No documents uploaded yet. Click "Add Document" to start organizing vessel documentation.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Document Categories Reference */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Categories</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {DOCUMENT_CATEGORIES.map((category) => (
                <div key={category} className="text-sm text-gray-700">• {category}</div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* TODO: Add Document Form Modal with file upload */}
    </div>
  )
}
