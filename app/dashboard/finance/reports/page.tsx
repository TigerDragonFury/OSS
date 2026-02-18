'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Ship, LandPlot, ArrowDownCircle, ArrowUpCircle, Download, Filter, X, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { shouldHideTotals, hasModulePermission } from '@/lib/auth/rolePermissions'
import Pagination from '@/components/Pagination'
import * as XLSX from 'xlsx'

interface CashflowEvent {
  id: string
  date: string
  amount: number
  description: string
  direction: 'in' | 'out'
  income_type?: string
}

export default function ReportsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  
  // Filter form states (what user is typing)
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formFilterType, setFormFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [formExpenseCategory, setFormExpenseCategory] = useState<string>('all')
  
  // Applied filter states (what's being used for display)
  const [appliedStartDate, setAppliedStartDate] = useState('')
  const [appliedEndDate, setAppliedEndDate] = useState('')
  const [appliedFilterType, setAppliedFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [appliedExpenseCategory, setAppliedExpenseCategory] = useState<string>('all')
  
  const [showFilters, setShowFilters] = useState(false)

  const supabase = createClient()
  const { user } = useAuth()
  
  // Check if user should see all-time totals
  const userRole = user?.role || user?.roles?.[0] || 'storekeeper'
  const hideTotals = shouldHideTotals(userRole, ['finance', 'reports'])
  const canDelete = hasModulePermission(userRole, ['finance', 'expenses'], 'delete')

  useEffect(() => {
    fetchData(formStartDate || appliedStartDate, formEndDate || appliedEndDate)
  }, [])

  const fetchData = async (startDateParam: string, endDateParam: string) => {
    try {
      setLoading(true)
      const today = new Date()
      const last30Days = new Date(today)
      last30Days.setDate(today.getDate() - 30)
      const defaultStartDate = last30Days.toISOString().split('T')[0]
      const defaultEndDate = today.toISOString().split('T')[0]

      const finalStartDate = startDateParam || defaultStartDate
      const finalEndDate = endDateParam || defaultEndDate

      // Set form dates on initial load
      if (!appliedStartDate && !formStartDate) {
        setFormStartDate(finalStartDate)
        setAppliedStartDate(finalStartDate)
      }
      if (!appliedEndDate && !formEndDate) {
        setFormEndDate(finalEndDate)
        setAppliedEndDate(finalEndDate)
      }

      // Get vessel financial summary
      const { data: vesselFinancials } = await supabase
        .from('vessel_financial_summary')
        .select('*')

      // Get land financial summary
      const { data: landFinancials } = await supabase
        .from('land_financial_summary')
        .select('*')

      // Cashflow data with applied date range
      const { data: cashIn } = await supabase
        .from('income_records')
        .select('id, income_date, amount, description, source_type, income_type')
        .gte('income_date', finalStartDate)
        .lte('income_date', finalEndDate)
        .order('income_date', { ascending: false })

      const { data: cashOut } = await supabase
        .from('expenses')
        .select('id, date, amount, description, expense_type, category')
        .eq('status', 'paid')
        .gte('date', finalStartDate)
        .lte('date', finalEndDate)
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
      })
    } catch (error) {
      console.error('Error fetching reports data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilters = () => {
    setAppliedStartDate(formStartDate)
    setAppliedEndDate(formEndDate)
    setAppliedFilterType(formFilterType)
    setAppliedExpenseCategory(formExpenseCategory)
    setCurrentPage(1)
    fetchData(formStartDate, formEndDate)
    setShowFilters(false)
  }

  const handleResetFilters = () => {
    const today = new Date()
    const last30Days = new Date(today)
    last30Days.setDate(today.getDate() - 30)
    const defaultStartDate = last30Days.toISOString().split('T')[0]
    const defaultEndDate = today.toISOString().split('T')[0]

    setFormStartDate(defaultStartDate)
    setFormEndDate(defaultEndDate)
    setFormFilterType('all')
    setFormExpenseCategory('all')
    setAppliedStartDate(defaultStartDate)
    setAppliedEndDate(defaultEndDate)
    setAppliedFilterType('all')
    setAppliedExpenseCategory('all')
    setCurrentPage(1)
    fetchData(defaultStartDate, defaultEndDate)
  }

  if (loading) {
    return <div className="p-6 text-center">Loading financial reports...</div>
  }

  if (!data) {
    return <div className="p-6 text-center">Failed to load financial reports</div>
  }
  
  const handleDeleteIncome = async (id: string, incomeType: string) => {
    const label = incomeType === 'vessel_rental' ? 'rental income'
      : incomeType === 'equipment_sale' ? 'equipment sale (this will also restore the equipment as available)'
      : 'income record'
    if (!confirm(`Delete this ${label} from reports? This cannot be undone.`)) return
    const supabaseClient = createClient()

    if (incomeType === 'equipment_sale') {
      // Get the income record to find the reference_id (= warehouse_sales.id)
      const { data: incomeRecord } = await supabaseClient
        .from('income_records')
        .select('reference_id')
        .eq('id', id)
        .single()

      if (incomeRecord?.reference_id) {
        // Get the warehouse sale to find the equipment id
        const { data: warehouseSale } = await supabaseClient
          .from('warehouse_sales')
          .select('land_equipment_id')
          .eq('id', incomeRecord.reference_id)
          .single()

        // Restore equipment status back to in_warehouse
        if (warehouseSale?.land_equipment_id) {
          await supabaseClient
            .from('land_equipment')
            .update({ status: 'in_warehouse' })
            .eq('id', warehouseSale.land_equipment_id)
        }

        // Delete the warehouse sale record
        await supabaseClient
          .from('warehouse_sales')
          .delete()
          .eq('id', incomeRecord.reference_id)
      }
    }

    await supabaseClient.from('income_records').delete().eq('id', id)
    fetchData(appliedStartDate, appliedEndDate)
  }

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Delete this expense from reports? This cannot be undone.')) return
    const supabaseClient = createClient()
    await supabaseClient.from('expenses').delete().eq('id', id)
    fetchData(appliedStartDate, appliedEndDate)
  }

  // Calculate totals
  const totalIncome = data.cashInAll.reduce((sum: number, entry: any) => sum + (entry.amount || 0), 0)
  const totalExpenses = data.cashOutAll.reduce((sum: number, entry: any) => sum + (entry.amount || 0), 0)
  const netProfit = totalIncome - totalExpenses

  // Build filtered cashflow events
  let cashflowEvents = [
    ...data.cashIn.map((entry: any) => ({
      id: entry.id,
      date: entry.income_date,
      amount: entry.amount || 0,
      description: entry.description || entry.source_type || 'Income',
      direction: 'in' as const,
      income_type: entry.income_type,
    })),
    ...data.cashOut.map((entry: any) => ({
      id: entry.id,
      date: entry.date,
      amount: entry.amount || 0,
      description: entry.description || entry.expense_type || entry.category || 'Expense',
      direction: 'out' as const
    }))
  ]

  // Apply transaction type filter
  if (appliedFilterType !== 'all') {
    cashflowEvents = cashflowEvents.filter(event => {
      if (appliedFilterType === 'income' && event.direction !== 'in') return false
      if (appliedFilterType === 'expense' && event.direction !== 'out') return false
      return true
    })
  }

  // Apply expense category filter
  if (appliedExpenseCategory !== 'all') {
    cashflowEvents = cashflowEvents.filter(event => {
      if (event.direction !== 'out') return true // Keep all income
      const expenseRecord = data.cashOut.find((e: any) => e.id === event.id)
      if (!expenseRecord) return false
      
      const category = (expenseRecord.category || '').toLowerCase()
      const expenseType = (expenseRecord.expense_type || '').toLowerCase()
      
      switch(appliedExpenseCategory) {
        case 'vessel':
          return category.includes('vessel') || expenseType.includes('vessel') || 
                 category.includes('ship') || expenseType.includes('ship') ||
                 category.includes('overhaul') || expenseType.includes('overhaul')
        case 'overhaul':
          return category.includes('overhaul') || expenseType.includes('overhaul') ||
                 category.includes('repair') || expenseType.includes('repair') ||
                 category.includes('maintenance') || expenseType.includes('maintenance')
        case 'land':
          return category.includes('land') || expenseType.includes('land') || 
                 category.includes('scrap') || expenseType.includes('scrap')
        case 'salary':
          return category.includes('salary') || expenseType.includes('salary') ||
                 category.includes('payroll') || expenseType.includes('payroll') ||
                 category.includes('wage') || expenseType.includes('wage')
        case 'operational':
          return category.includes('operational') || expenseType.includes('operational') ||
                 category.includes('overhead') || expenseType.includes('overhead') ||
                 category.includes('admin') || expenseType.includes('admin')
        case 'equipment':
          return category.includes('equipment') || expenseType.includes('equipment') ||
                 category.includes('machinery') || expenseType.includes('machinery')
        default:
          return true
      }
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
      [`Period: ${appliedStartDate} to ${appliedEndDate}`],
      [''],
      ['SUMMARY'],
      ['Total Cash In', filteredCashInTotal.toLocaleString(), 'AED'],
      ['Total Cash Out', filteredCashOutTotal.toLocaleString(), 'AED'],
      ['Net Cash', filteredCashNet.toLocaleString(), 'AED'],
      [''],
      ['TRANSACTIONS'],
      ['Date', 'Description', 'Type', 'Amount (Đ)'],
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
    XLSX.writeFile(wb, `cashflow_report_${appliedStartDate}_to_${appliedEndDate}.xlsx`)
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
      `Period: ${appliedStartDate} to ${appliedEndDate}`,
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
    link.download = `cashflow_report_${appliedStartDate}_to_${appliedEndDate}.txt`
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

      {/* Overall Summary - Hidden for non-admin roles */}
      {!hideTotals && (
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
      )}

      {/* Cashflow Summary */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Cashflow Analysis</h2>
              <p className="text-sm text-gray-600 mt-1">
                Filtered by: {appliedStartDate} to {appliedEndDate} | 
                {appliedFilterType === 'all' ? 'All Transactions' : appliedFilterType === 'income' ? 'Income Only' : 'Expenses Only'}
                {appliedExpenseCategory !== 'all' && appliedFilterType !== 'income' && (
                  <span className="ml-1">| Category: {appliedExpenseCategory.charAt(0).toUpperCase() + appliedExpenseCategory.slice(1)}</span>
                )}
              </p>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                  <select
                    value={formFilterType}
                    onChange={(e) => setFormFilterType(e.target.value as 'all' | 'income' | 'expense')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Transactions</option>
                    <option value="income">Income Only</option>
                    <option value="expense">Expenses Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expense Category</label>
                  <select
                    value={formExpenseCategory}
                    onChange={(e) => setFormExpenseCategory(e.target.value)}
                    disabled={formFilterType === 'income'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="all">All Categories</option>
                    <option value="vessel">Vessel/Ship Related</option>
                    <option value="overhaul">Overhaul/Repair/Maintenance</option>
                    <option value="land">Land/Scrap Related</option>
                    <option value="salary">Salary/Payroll</option>
                    <option value="operational">Operational/Overhead</option>
                    <option value="equipment">Equipment/Machinery</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleApplyFilters}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Apply Filters
                </button>
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg"
                >
                  Reset to Default
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
                  <p className="text-2xl font-bold text-green-700 mt-1">{filteredCashInTotal.toLocaleString()} Đ</p>
                </div>
                <ArrowDownCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Cash Out (Period)</p>
                  <p className="text-2xl font-bold text-red-700 mt-1">{filteredCashOutTotal.toLocaleString()} Đ</p>
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
                      {canDelete && <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>}
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
                        {canDelete && (
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() =>
                                entry.direction === 'in'
                                  ? handleDeleteIncome(entry.id, (entry as any).income_type)
                                  : handleDeleteExpense(entry.id)
                              }
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Delete / void this entry"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
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
                  {data.vesselFinancials.map((vessel: any) => (
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
                  {data.landFinancials.map((land: any) => (
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
