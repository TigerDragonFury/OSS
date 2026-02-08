'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface User {
  id: string
  email: string
  full_name: string
  role: string
  phone?: string
  company_name?: string
  roles: string[]
  permissions: Record<string, any>
}

interface AuthContextType {
  user: User | null
  loading: boolean
  logout: () => void
  hasPermission: (permission: string) => boolean
  hasRole: (role: string) => boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Check localStorage for user
  const checkUser = () => {
    const storedUser = localStorage.getItem('oss_user')
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        setUser(parsed)
        return parsed
      } catch {
        localStorage.removeItem('oss_user')
      }
    }
    return null
  }

  useEffect(() => {
    setMounted(true)
    checkUser()
    setLoading(false)

    // Listen for storage changes (login/logout from other tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'oss_user') {
        checkUser()
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Re-check user when pathname changes (handles navigation after login)
  useEffect(() => {
    if (mounted) {
      checkUser()
    }
  }, [pathname, mounted])

  useEffect(() => {
    // Redirect logic - only after mounted and not loading
    if (mounted && !loading) {
      const publicPaths = ['/login', '/forgot-password', '/reset-password']
      const isPublicPath = publicPaths.some(path => pathname?.startsWith(path))

      // Re-check localStorage before redirecting
      const currentUser = localStorage.getItem('oss_user')

      if (!currentUser && !isPublicPath) {
        router.push('/login')
      } else if (currentUser && pathname === '/login') {
        router.push('/dashboard')
      }
    }
  }, [user, loading, pathname, router, mounted])

  const logout = () => {
    localStorage.removeItem('oss_user')
    setUser(null)
    router.push('/login')
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    if (user.permissions?.all === true) return true // Admin has all permissions

    const [resource, action] = permission.split('.')
    const resourcePerm = user.permissions?.[resource]

    if (resourcePerm === true) return true
    if (Array.isArray(resourcePerm)) {
      return action ? resourcePerm.includes(action) : resourcePerm.length > 0
    }
    return false
  }

  const hasRole = (role: string): boolean => {
    if (!user) return false
    return user.roles?.includes(role) || user.role === role
  }

  const isAdmin = user?.roles?.includes('admin') || user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, loading, logout, hasPermission, hasRole, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
