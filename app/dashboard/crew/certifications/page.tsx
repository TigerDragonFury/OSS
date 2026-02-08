import { createClient } from '@/lib/supabase/server'
import { Award, Plus, Search, AlertTriangle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

async function getCertifications() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('crew_certifications')
    .select('*, employees(full_name, position)')
    .order('expiry_date', { ascending: true })
  
  if (error) {
    console.error('Error fetching certifications:', error)
    return []
  }
  
  return data || []
}

export default async function CertificationsPage() {
  const certifications = await getCertifications()
  
  const today = new Date()
  const expiringThirtyDays = new Date()
  expiringThirtyDays.setDate(today.getDate() + 30)
  
  const expiringCount = certifications.filter(c => {
    const expiryDate = new Date(c.expiry_date)
    return expiryDate > today && expiryDate <= expiringThirtyDays
  }).length
  
  const expiredCount = certifications.filter(c => 
    new Date(c.expiry_date) < today
  ).length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Crew Certifications</h1>
          <p className="text-gray-600 mt-1">Track and manage crew certifications and licenses</p>
        </div>
        <Link
          href="/dashboard/crew/certifications/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Certification
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Certifications</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{certifications.length}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Award className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expiring Soon (30 days)</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">{expiringCount}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{expiredCount}</p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Alert for expiring certifications */}
      {expiringCount > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <span className="font-medium">{expiringCount} certification(s)</span> are expiring within 30 days. Please take action to renew them.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search certifications..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">All Types</option>
            <option value="stcw">STCW</option>
            <option value="medical">Medical</option>
            <option value="safety">Safety</option>
            <option value="license">License</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">All Statuses</option>
            <option value="valid">Valid</option>
            <option value="expiring">Expiring Soon</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Certifications Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Crew Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Certification
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Issue Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expiry Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Certificate No.
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {certifications.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <Award className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No certifications</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by adding crew certifications.</p>
                </td>
              </tr>
            ) : (
              certifications.map((cert) => {
                const expiryDate = new Date(cert.expiry_date)
                const isExpired = expiryDate < today
                const isExpiringSoon = expiryDate > today && expiryDate <= expiringThirtyDays
                
                return (
                  <tr key={cert.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {cert.employees?.full_name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {cert.employees?.position || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{cert.certification_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">
                        {cert.certification_type}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(cert.issue_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expiryDate.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${isExpired ? 'bg-red-100 text-red-800' : ''}
                        ${isExpiringSoon ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${!isExpired && !isExpiringSoon ? 'bg-green-100 text-green-800' : ''}
                      `}>
                        {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Valid'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cert.certificate_number || 'N/A'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
