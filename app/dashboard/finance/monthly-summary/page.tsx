'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react'

export default function MonthlySummaryPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const supabase = createClient()

  const { data: monthlyData, isLoading } = useQuery({
    queryKey: ['monthly_summary', selectedYear],
    queryFn: async () => {
      // Get all income for the year
      const { data: income } = await supabase
        .from('income_records')
        .select('income_date, amount')
        .gte('income_date', `${selectedYear}-01-01`)
        .lte('income_date', `${selectedYear}-12-31`)
      
      // Get all expenses for the year
      const { data: expenses } = await supabase
        .from('expenses')
        .select('date, amount')
        .gte('date', `${selectedYear}-01-01`)
        .lte('date', `${selectedYear}-12-31`)
      
      // Group by month
      const monthlyStats: { [key: string]: { income: number; expenses: number; profit: number } } = {}
      
      // Initialize all months
      for (let month = 1; month <= 12; month++) {
        const key = `${selectedYear}-${String(month).padStart(2, '0')}`
        monthlyStats[key] = { income: 0, expenses: 0, profit: 0 }
      }
      
      // Sum income by month
      income?.forEach(record => {
        const monthKey = record.income_date.substring(0, 7)
        if (monthlyStats[monthKey]) {
          monthlyStats[monthKey].income += record.amount || 0
        }
      })
      
      // Sum expenses by month
      expenses?.forEach(record => {
        const monthKey = record.date.substring(0, 7)
        if (monthlyStats[monthKey]) {
          monthlyStats[monthKey].expenses += record.amount || 0
        }
      })
      
      // Calculate profit
      Object.keys(monthlyStats).forEach(month => {
        monthlyStats[month].profit = monthlyStats[month].income - monthlyStats[month].expenses
      })
      
      return monthlyStats
    }
  })

  const yearlyTotals = monthlyData ? Object.values(monthlyData).reduce(
    (acc, month) => ({
      income: acc.income + month.income,
      expenses: acc.expenses + month.expenses,
      profit: acc.profit + month.profit
    }),
    { income: 0, expenses: 0, profit: 0 }
  ) : { income: 0, expenses: 0, profit: 0 }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Monthly Financial Summary</h1>
          <p className="text-gray-600 mt-1">Detailed month-by-month breakdown of income and expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-600" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Yearly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income ({selectedYear})</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {yearlyTotals.income.toLocaleString()} AED
              </p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses ({selectedYear})</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {yearlyTotals.expenses.toLocaleString()} AED
              </p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Profit ({selectedYear})</p>
              <p className={`text-3xl font-bold mt-2 ${yearlyTotals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {yearlyTotals.profit >= 0 ? '+' : ''}{yearlyTotals.profit.toLocaleString()} AED
              </p>
            </div>
            <div className={`rounded-full p-3 ${yearlyTotals.profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <DollarSign className={`h-8 w-8 ${yearlyTotals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Monthly Breakdown - {selectedYear}</h2>
        </div>
        
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Income
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expenses
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Profit/Loss
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margin %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {months.map((monthName, index) => {
                  const monthKey = `${selectedYear}-${String(index + 1).padStart(2, '0')}`
                  const data = monthlyData?.[monthKey] || { income: 0, expenses: 0, profit: 0 }
                  const marginPercent = data.income > 0 ? ((data.profit / data.income) * 100).toFixed(1) : '0.0'
                  
                  return (
                    <tr key={monthKey} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {monthName} {selectedYear}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                        {data.income.toLocaleString()} AED
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-red-600">
                        {data.expenses.toLocaleString()} AED
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                        data.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {data.profit >= 0 ? '+' : ''}{data.profit.toLocaleString()} AED
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${
                        parseFloat(marginPercent) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {marginPercent}%
                      </td>
                    </tr>
                  )
                })}
                <tr className="bg-gray-100 font-bold">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    TOTAL
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                    {yearlyTotals.income.toLocaleString()} AED
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                    {yearlyTotals.expenses.toLocaleString()} AED
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                    yearlyTotals.profit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {yearlyTotals.profit >= 0 ? '+' : ''}{yearlyTotals.profit.toLocaleString()} AED
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                    yearlyTotals.income > 0 && ((yearlyTotals.profit / yearlyTotals.income) * 100) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {yearlyTotals.income > 0 ? ((yearlyTotals.profit / yearlyTotals.income) * 100).toFixed(1) : '0.0'}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Visual Chart Section - Simple bar representation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Visual Comparison</h2>
        <div className="space-y-4">
          {months.map((monthName, index) => {
            const monthKey = `${selectedYear}-${String(index + 1).padStart(2, '0')}`
            const data = monthlyData?.[monthKey] || { income: 0, expenses: 0, profit: 0 }
            const maxValue = Math.max(yearlyTotals.income / 12, yearlyTotals.expenses / 12) || 1
            const incomeWidth = (data.income / maxValue) * 100
            const expenseWidth = (data.expenses / maxValue) * 100
            
            return (
              <div key={monthKey}>
                <div className="text-sm font-medium text-gray-700 mb-1">{monthName}</div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <div className="h-8 bg-green-100 rounded relative overflow-hidden">
                      <div 
                        className="h-full bg-green-500 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(incomeWidth, 5)}%` }}
                      >
                        <span className="text-xs text-white font-semibold">
                          {data.income > 0 ? `${data.income.toLocaleString()}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="h-8 bg-red-100 rounded relative overflow-hidden">
                      <div 
                        className="h-full bg-red-500 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(expenseWidth, 5)}%` }}
                      >
                        <span className="text-xs text-white font-semibold">
                          {data.expenses > 0 ? `${data.expenses.toLocaleString()}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-8 mt-6 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-600">Expenses</span>
          </div>
        </div>
      </div>
    </div>
  )
}
