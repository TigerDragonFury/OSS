'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Anchor, Lock, Mail, Eye, EyeOff, AlertCircle, Ship, Waves } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (userError || !user) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      const storedPassword = user.password_hash || user.password
      if (storedPassword && storedPassword !== password) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      if (user.is_active === false) {
        setError('Account is inactive. Please contact administrator.')
        setLoading(false)
        return
      }

      const userData = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role || 'viewer',
        roles: [user.role || 'viewer'],
        permissions: user.role === 'admin' ? { all: true } : {}
      }
      localStorage.setItem('oss_user', JSON.stringify(userData))

      try {
        await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id)
      } catch (_) {}

      const role = user.role || 'viewer'
      const redirectMap: Record<string, string> = {
        admin:       '/dashboard',
        accountant:  '/dashboard/finance/quick-entry',
        hr:          '/dashboard/hr/employees',
        storekeeper: '/dashboard/marine/inventory',
      }
      router.push(redirectMap[role] ?? '/dashboard/finance/quick-entry')
    } catch (err: any) {
      setError(err.message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* Left panel  brand */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-12 overflow-hidden bg-[#0f172a]">
        {/* Background subtle pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, #3b82f6 0%, transparent 50%),
                            radial-gradient(circle at 75% 75%, #1d4ed8 0%, transparent 50%)`
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 opacity-60" />

        {/* Top logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900">
            <Anchor className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">OSS Marine</p>
            <p className="text-[#475569] text-xs mt-0.5">Operations System</p>
          </div>
        </div>

        {/* Center hero */}
        <div className="relative space-y-8">
          <div>
            <h1 className="text-4xl font-extrabold text-white leading-tight">
              Operational<br />
              <span className="text-blue-400">Command Center</span>
            </h1>
            <p className="mt-4 text-[#94a3b8] text-base leading-relaxed max-w-sm">
              Manage vessels, crew, rentals, inventory, and finances from a single unified platform.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-xs">
            {[
              { label: 'Fleet Management', desc: 'Track vessels & maintenance' },
              { label: 'Finance & Billing', desc: 'Invoices, expenses & reports' },
              { label: 'Crew & HR', desc: 'Assignments & certifications' },
              { label: 'Inventory', desc: 'Warehouse & equipment' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-[#1e293b] border border-[#334155] px-3.5 py-3">
                <p className="text-xs font-semibold text-[#e2e8f0]">{item.label}</p>
                <p className="text-[11px] text-[#64748b] mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative">
          <p className="text-[#334155] text-xs">&copy; {new Date().getFullYear()} OSS Marine. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel  form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg mb-3">
            <Anchor className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">OSS Marine</h1>
        </div>

        <div className="w-full max-w-[380px]">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder=""
                  className="w-full pl-10 pr-11 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-all duration-150 shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            Need access?{' '}
            <span className="text-blue-600 font-medium cursor-pointer hover:underline">Contact your administrator</span>
          </p>
        </div>
      </div>
    </div>
  )
}
