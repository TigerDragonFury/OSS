'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Ship, LandPlot, ArrowDownCircle, ArrowUpCircle, Download, Filter, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Pagination } from '@/components/Pagination'
import * as XLSX from 'xlsx'

interface CashflowEvent {
  id: string
  date: string
  amount: number
  description: string
  direction: 'in' | 'out'
}

export default function ReportsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  
  // Filter states
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [showFilters, setShowFilters] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date()
        const last30Days = new Date(today)
        last30Days.setDate(today.getDate() - 30)
        const defaultStartDate = last30Days.toISOString().split('T')[0]
        const defaultEndDate = today.toISOString().split('T')[0]

        setStartDate(defaultStartDate)
        setEndDate(defaultEndDate)

        // Get vessel financial summary
        const { data: vesselFinancials } = await supabase
          .from('vessel_financial_summary')
          .select('*')

        // Get land financial summary
        const { data: landFinancials } = await supabase
          .from('land_financial_summary')
          .select('*')

        // Cashflow data
        const { data: cashIn } = await supabase
          .from('income_records')
          .select('id, income_date, amount, description, source_type')
          .gte('income_date', defaultStartDate)
          .order('income_date', { ascending: false })

        const { data: cashOut } = await supabase
          .from('expenses')
          .select('id, date, amount, description, expense_type, category')
          .eq('status', 'paid')
          .gte('date', defaultStartDate)
          .order('date', { ascending: false })

        // All-time totals
        const { data: cashInAll } = await supabase
          .from('income_records')
          .select('amount')

        const { data: cashOutAll } = await supabase
          .from('expenses')
          .select('amount')
          .eq('status', 'paid')

        setData({
          vesselFinancials: vesselFinancials || [],
          landFinancials: landFinancials || [],
          cashIn: cashIn || [],
          cashOut: cashOut || [],
          cashInAll: cashInAll || [],
          cashOutAll: cashOutAll || [],
          cashStartDate: defaultStartDate
        })
      } catch (error) {
        console.error('Error fetching reports data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <div className="p-6 text-center">Loading financial reports...</div>
  }

  if (!data) {
    return <div className="p-6 text-center">Failed to load financial reports</div>
  }
  
  // Calculate totals
  const totalIncome = data.cashInAll.reduce((sum, entry) => sum + (entry.amount || 0), 0)
  const totalExpenses = data.cashOutAll.reduce((sum, entry) => sum + (entry.amount || 0), 0)
  const netProfit = totalIncome - totalExpenses

  // Build filtered cashflow events
  let cashflowEvents = [
    ...data.cashIn.map((entry) => ({
      id: entry.id,
      date: entry.income_date,
      amount: entry.amount || 0,
      description: entry.description || entry.source_type || 'Income',
      direction: 'in' as const
    })),
    ...data.cashOut.map((entry) => ({
      id: entry.id,
      date: entry.date,
      amount: entry.amount || 0,
      description: entry.description || entry.expense_type || entry.category || 'Expense',
      direction: 'out' as const
    }))
  ]

  // Apply filters
  if (startDate || endDate || filterType !== 'all') {
    cashflowEvents = cashflowEvents.filter(event => {
      const eventDate = event.date || ''
      
      if (startDate && eventDate < startDate) return false
      if (endDate && eventDate > endDate) return false
      if (filterType === 'income' && event.direction !== 'in') return false
      if (filterType === 'expense' && event.direction !== 'out') return false
      
      return true
    })
  }

  cashflowEvents.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  // Pagination
  const totalPages = Math.ceil(cashflowEvents.length / itemsPerPage)
  const startIdx = (currentPage - 1) * itemsPerPage
  const paginatedEvents = cashflowEvents.slice(startIdx, startIdx + itemsPerPage)

  // Filter period totals
  const filteredCashInTotal = cashflowEvents
    .filter(e => e.direction === 'in')
    .reduce((sum, e) => sum + e.amount, 0)
  const filteredCashOutTotal = cashflowEvents
    .filter(e => e.direction === 'out')
    .reduce((sum, e) => sum + e.amount, 0)
  const filteredCashNet = filteredCashInTotal - filteredCashOutTotal

  // Export functionality
  const exportToExcel = () => {
    // Prepare data for Excel export
    const exportData = [
      ['CASHFLOW REPORT'],
      [`Period: ${startDate} to ${endDate}`],
      [''],
      ['SUMMARY'],
      ['Total Cash In', filteredCashInTotal.toLocaleString(), 'AED'],
      ['Total Cash Out', filteredCashOutTotal.toLocaleString(), 'AED'],
      ['Net Cash', filteredCashNet.toLocaleString(), 'AED'],
      [''],
      ['TRANSACTIONS'],
      ['Date', 'Description', 'Type', 'Amount (AED)'],
      ...cashflowEvents.map(e => [
        e.date || '',
        e.description,
        e.direction === 'in' ? 'Cash In' : 'Cash Out',
        e.amount.toLocaleString()
      ])
    ]

    // Create workbook and worksheet
    const ws = XLSX.utils.aoa_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Cashflow')

    // Set column widths
    ws['!cols'] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 12 },
      { wch: 15 }
    ]

    // Generate file
    XLSX.writeFile(wb, `cashflow_report_${startDate}_to_${endDate}.xlsx`)
  }

  const exportToPDF = () => {
    // Generate formatted text content
    const timestamp = new Date().toLocaleString()
    const pdfContent = [
      '╔══════════════════════════════════════════════════════════════════╗',
      '║                       CASHFLOW REPORT                           ║',
      '╚══════════════════════════════════════════════════════════════════╝',
      '',
      `Report Generated: ${timestamp}`,
      `Period: ${startDate} to ${endDate}`,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'SUMMARY',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      `Total Cash In:     ${filteredCashInTotal.toLocaleString().padEnd(20)} AED`,
      `Total Cash Out:    ${filteredCashOutTotal.toLocaleString().padEnd(20)} AED`,
      `Net Cash:          ${filteredCashNet.toLocaleString().padEnd(20)} AED`,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'TRANSACTIONS',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      `${'Date'.padEnd(12)} | ${'Description'.padEnd(30)} | ${'Type'.padEnd(10)} | ${'Amount'.padEnd(15)}`,
      '─'.repeat(72),
      ...cashflowEvents.map(e => 
        `${(e.date || '-').padEnd(12)} | ${e.description.substring(0, 30).padEnd(30)} | ${(e.direction === 'in' ? 'Cash In' : 'Cash Out').padEnd(10)} | ${e.amount.toLocaleString().padStart(13)} AED`
      ),
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'End of Report',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    ].join('\n')

    // Create blob and download
    const blob = new Blob([pdfContent], { type: 'text/plain;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cashflow_report_${startDate}_to_${endDate}.txt`
    document.body.appendChild(link)
    link.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
        <p className="text-gray-600 mt-1">Comprehensive financial analysis and summaries</p>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">All-Time Cash In</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {totalIncome.toLocaleString()} AED
              </p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <ArrowDownCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">All-Time Cash Out</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {totalExpenses.toLocaleString()} AED
              </p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <ArrowUpCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">All-Time Net Profit</p>
              <p className={`text-3xl font-bold mt-2 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()} AED
              </p>
            </div>
            <div className={`rounded-full p-3 ${netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <DollarSign className={`h-8 w-8 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Cashflow Summary */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Cashflow Analysis</h2>
              <p className="text-sm text-gray-600 mt-1">Filtered by: {startDate} to {endDate}</p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value as 'all' | 'income' | 'expense')
                      setCurrentPage(1)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Transactions</option>
                    <option value="income">Income Only</option>
                    <option value="expense">Expenses Only</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStartDate(data.cashStartDate)
                    const today = new Date()
                    setEndDate(today.toISOString().split('T')[0])
                    setFilterType('all')
                    setCurrentPage(1)
                  }}
                  className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          {/* Filtered Period Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Cash In (Period)</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">{filteredCashInTotal.toLocaleString()} AED</p>
                </div>
                <ArrowDownCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Cash Out (Period)</p>
                  <p className="text-2xl font-bold text-red-700 mt-1">{filteredCashOutTotal.toLocaleString()} AED</p>
                </div>
                <ArrowUpCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Net Cash (Period)</p>
                  <p className={`text-2xl font-bold mt-1 ${filteredCashNet >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {filteredCashNet >= 0 ? '+' : ''}{filteredCashNet.toLocaleString()} AED
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-gray-600" />
              </div>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              <Download className="h-4 w-4" />
              Export to Excel
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
            >
              <Download className="h-4 w-4" />
              Export to TXT
            </button>
          </div>

          {/* Cashflow Table */}
          {cashflowEvents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No cashflow activity matching selected filters</p>
          ) : (
            <>
              <div className="overflow-x-auto" id="cashflow-table">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedEvents.map((entry) => (
                      <tr key={`${entry.direction}-${entry.id}`}>
                        <td className="px-4 py-3 text-sm text-gray-700">{entry.date || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{entry.description}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.direction === 'in'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {entry.direction === 'in' ? 'Cash In' : 'Cash Out'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-semibold ${
                          entry.direction === 'in' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {entry.direction === 'in' ? '+' : '-'}{entry.amount.toLocaleString()} AED
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Vessel Performance */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Ship className="h-5 w-5 mr-2" />
            Vessel Performance
          </h2>
        </div>
        <div className="p-6">
          {data.vesselFinancials.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vessel</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Costs</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net P/L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.vesselFinancials.map((vessel) => (
                    <tr key={vessel.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{vessel.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {vessel.purchase_price?.toLocaleString() || 0} AED
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        +{((vessel.total_equipment_sales || 0) + (vessel.total_scrap_sales || 0) + (vessel.total_rental_income || 0)).toLocaleString()} AED
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-600">
                        -{((vessel.purchase_price || 0) + (vessel.total_expenses || 0) + 
                          (vessel.total_overhaul_expenses || 0)).toLocaleString()} AED
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-bold ${(((vessel.total_equipment_sales || 0) + (vessel.total_scrap_sales || 0) + (vessel.total_rental_income || 0)) - ((vessel.purchase_price || 0) + (vessel.total_expenses || 0) + (vessel.total_overhaul_expenses || 0))) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(((vessel.total_equipment_sales || 0) + (vessel.total_scrap_sales || 0) + (vessel.total_rental_income || 0)) - ((vessel.purchase_price || 0) + (vessel.total_expenses || 0) + (vessel.total_overhaul_expenses || 0))) >= 0 ? '+' : ''}{(((vessel.total_equipment_sales || 0) + (vessel.total_scrap_sales || 0) + (vessel.total_rental_income || 0)) - ((vessel.purchase_price || 0) + (vessel.total_expenses || 0) + (vessel.total_overhaul_expenses || 0))).toLocaleString()} AED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No vessel data available</p>
          )}
        </div>
      </div>

      {/* Land Performance */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <LandPlot className="h-5 w-5 mr-2" />
            Land Performance
          </h2>
        </div>
        <div className="p-6">
          {data.landFinancials.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Land</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expenses</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net P/L</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.landFinancials.map((land) => (
                    <tr key={land.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{land.land_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {land.purchase_price?.toLocaleString() || 0} AED
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        +{((land.total_equipment_sales || 0) + (land.total_scrap_sales || 0)).toLocaleString()} AED
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-600">
                        -{(land.total_expenses || 0).toLocaleString()} AED
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-bold ${land.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {land.net_profit >= 0 ? '+' : ''}{land.net_profit?.toLocaleString() || 0} AED
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {land.remaining_tonnage?.toLocaleString() || 0} tons
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No land data available</p>
          )}
        </div>
      </div>
    </div>
  )
}
