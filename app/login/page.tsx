'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Ship, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react'

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
      // First try to get user with basic fields (works without auth-schema.sql)
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (userError) {
        console.error('User query error:', userError)
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      if (!user) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      // Check password - support both password_hash field and simple password check
      const storedPassword = user.password_hash || user.password
      if (storedPassword && storedPassword !== password) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      // If no password is set, allow login for demo purposes
      if (!storedPassword) {
        console.log('No password set for user, allowing demo login')
      }

      // Check if is_active field exists and is false
      if (user.is_active === false) {
        setError('Account is inactive. Please contact administrator.')
        setLoading(false)
        return
      }

      // Store user in localStorage
      const userData = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role || 'viewer',
        roles: [user.role || 'viewer'],
        permissions: user.role === 'admin' ? { all: true } : {}
      }

      localStorage.setItem('oss_user', JSON.stringify(userData))

      // Try to update last login (will fail silently if column doesn't exist)
      try {
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', user.id)
      } catch (e) {
        // Ignore if last_login column doesn't exist
      }

      router.push('/dashboard')
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
            <Ship className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-white">OSS Marine</h1>
          <p className="text-blue-200 mt-2">Vessel Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Welcome Back</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@ossgroup.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center mb-3">Demo Credentials (run auth-schema.sql first)</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-50 rounded p-2">
                <p className="font-medium text-gray-700">Admin</p>
                <p className="text-gray-500">admin@ossgroup.com</p>
                <p className="text-gray-500">admin123</p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="font-medium text-gray-700">HR Manager</p>
                <p className="text-gray-500">hr@ossgroup.com</p>
                <p className="text-gray-500">hr123</p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="font-medium text-gray-700">Store Keeper</p>
                <p className="text-gray-500">store@ossgroup.com</p>
                <p className="text-gray-500">store123</p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="font-medium text-gray-700">Accountant</p>
                <p className="text-gray-500">accounts@ossgroup.com</p>
                <p className="text-gray-500">accounts123</p>
              </div>
            </div>
            <p className="text-xs text-blue-600 text-center mt-3">
              Or use any existing user email from your database
            </p>
          </div>
        </div>

        <p className="text-center text-blue-200 text-sm mt-6">
          &copy; 2024 OSS Group. All rights reserved.
        </p>
      </div>
    </div>
  )
}
