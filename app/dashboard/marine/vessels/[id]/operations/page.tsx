'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { use, useState } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, Wrench, Users, BookOpen, FileText, Bell, 
  Package, Anchor, AlertCircle, Calendar, Phone, Heart,
  DollarSign, ClipboardList, Clock
} from 'lucide-react'

export default function VesselOperationsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const supabase = createClient()

  const { data: vessel } = useQuery({
    queryKey: ['vessel', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessels')
        .select('*')
        .eq('id', resolvedParams.id)
        .single()
      if (error) throw error
      return data
    }
  })

  // Get counts for dashboard cards
  const { data: maintenanceCounts } = useQuery({
    queryKey: ['maintenance_counts', resolvedParams.id],
    queryFn: async () => {
      const [open, overdue, crew, tasks, reminders, documents] = await Promise.all([
        supabase.from('vessel_maintenance_issues').select('*', { count: 'exact', head: true })
          .eq('vessel_id', resolvedParams.id).in('status', ['reported', 'assigned', 'in_progress']),
        supabase.from('vessel_service_schedules').select('*', { count: 'exact', head: true })
          .eq('vessel_id', resolvedParams.id).eq('status', 'overdue'),
        supabase.from('vessel_crew_assignments').select('*', { count: 'exact', head: true })
          .eq('vessel_id', resolvedParams.id).eq('status', 'active'),
        supabase.from('vessel_tasks').select('*', { count: 'exact', head: true })
          .eq('vessel_id', resolvedParams.id).in('status', ['pending', 'in_progress']),
        supabase.from('vessel_reminders').select('*', { count: 'exact', head: true })
          .eq('vessel_id', resolvedParams.id).eq('status', 'active').lte('due_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('vessel_documents').select('*', { count: 'exact', head: true })
          .eq('vessel_id', resolvedParams.id)
      ])
      
      return {
        openIssues: open.count || 0,
        overdueServices: overdue.count || 0,
        activeCrew: crew.count || 0,
        activeTasks: tasks.count || 0,
        upcomingReminders: reminders.count || 0,
        totalDocuments: documents.count || 0
      }
    }
  })

  if (!vessel) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const operationModules = [
    {
      title: 'Maintenance Issues',
      description: 'Track and manage all maintenance work orders',
      icon: Wrench,
      href: `/dashboard/marine/vessels/${vessel.id}/operations/maintenance`,
      color: 'orange',
      count: maintenanceCounts?.openIssues || 0,
      countLabel: 'Open Issues'
    },
    {
      title: 'Service Schedules',
      description: 'Schedule and track recurring services',
      icon: Calendar,
      href: `/dashboard/marine/vessels/${vessel.id}/operations/services`,
      color: 'blue',
      count: maintenanceCounts?.overdueServices || 0,
      countLabel: 'Overdue'
    },
    {
      title: 'Crew Management',
      description: 'Manage crew assignments and tasks',
      icon: Users,
      href: `/dashboard/marine/vessels/${vessel.id}/operations/crew`,
      color: 'purple',
      count: maintenanceCounts?.activeCrew || 0,
      countLabel: 'Active Crew'
    },
    {
      title: 'Task Assignments',
      description: 'Assign and track crew tasks',
      icon: ClipboardList,
      href: `/dashboard/marine/vessels/${vessel.id}/operations/tasks`,
      color: 'indigo',
      count: maintenanceCounts?.activeTasks || 0,
      countLabel: 'Active Tasks'
    },
    {
      title: 'Vessel Logs',
      description: 'Maintain vessel logbook entries',
      icon: BookOpen,
      href: `/dashboard/marine/vessels/${vessel.id}/operations/logs`,
      color: 'green',
      count: null,
      countLabel: null
    },
    {
      title: 'Incident Reports',
      description: 'First aid & accident reporting',
      icon: AlertCircle,
      href: `/dashboard/marine/vessels/${vessel.id}/operations/incidents`,
      color: 'red',
      count: null,
      countLabel: null
    },
    {
      title: 'Spares Inventory',
      description: 'Track spare parts and supplies',
      icon: Package,
      href: `/dashboard/marine/vessels/${vessel.id}/operations/spares`,
      color: 'teal',
      count: null,
      countLabel: null
    },
    {
      title: 'Provisions',
      description: 'Manage food, beverages, and supplies',
      icon: Anchor,
      href: `/dashboard/marine/vessels/${vessel.id}/operations/provisions`,
      color: 'cyan',
      count: null,
      countLabel: null
    },
    {
      title: 'Documents & Manuals',
      description: 'Store and access vessel documentation',
      icon: FileText,
      href: `/dashboard/marine/vessels/${vessel.id}/operations/documents`,
      color: 'gray',
      count: maintenanceCounts?.totalDocuments || 0,
      countLabel: 'Documents'
    },
    {
      title: 'Reminders',
      description: 'Automated maintenance & certification reminders',
      icon: Bell,
      href: `/dashboard/marine/vessels/${vessel.id}/operations/reminders`,
      color: 'yellow',
      count: maintenanceCounts?.upcomingReminders || 0,
      countLabel: 'Upcoming'
    },
    {
      title: 'Contacts Directory',
      description: 'Essential contacts and emergency numbers',
      icon: Phone,
      href: `/dashboard/marine/vessels/${vessel.id}/operations/contacts`,
      color: 'pink',
      count: null,
      countLabel: null
    },
    {
      title: 'Guest Preferences',
      description: 'Charter guest preference sheets',
      icon: Heart,
      href: `/dashboard/marine/vessels/${vessel.id}/operations/guests`,
      color: 'rose',
      count: null,
      countLabel: null
    },
    {
      title: 'Operational Costs',
      description: 'Track all vessel operational expenses',
      icon: DollarSign,
      href: `/dashboard/marine/vessels/${vessel.id}/operations/costs`,
      color: 'emerald',
      count: null,
      countLabel: null
    },
    {
      title: 'Time Tracking',
      description: 'Track time spent on repairs and work',
      icon: Clock,
      href: `/dashboard/marine/vessels/${vessel.id}/operations/time-tracking`,
      color: 'amber',
      count: null,
      countLabel: null
    }
  ]

  const colorMap: { [key: string]: { bg: string, text: string, border: string } } = {
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
    pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' }
  }

  return (
    <div className="space-y-6">
      <Link href={`/dashboard/marine/vessels/${vessel.id}`} className="inline-flex items-center text-blue-600 hover:text-blue-700">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Vessel Details
      </Link>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{vessel.name} - Operations</h1>
            <p className="text-gray-600 mt-1">Comprehensive vessel operations management system</p>
          </div>
          <div className="px-4 py-2 bg-blue-100 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">{vessel.vessel_type || 'Vessel'}</p>
            <p className="text-xs text-blue-500">{vessel.status}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {operationModules.map((module) => {
          const colors = colorMap[module.color]
          const Icon = module.icon
          
          return (
            <Link
              key={module.title}
              href={module.href}
              className={`block bg-white rounded-lg shadow border-2 ${colors.border} hover:shadow-lg transition-all duration-200 hover:-translate-y-1`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className={`${colors.bg} rounded-lg p-3`}>
                    <Icon className={`h-6 w-6 ${colors.text}`} />
                  </div>
                  {module.count !== null && (
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${colors.text}`}>{module.count}</div>
                      <div className="text-xs text-gray-500">{module.countLabel}</div>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mt-4">{module.title}</h3>
                <p className="text-sm text-gray-600 mt-2">{module.description}</p>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 rounded-full p-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">New Operations Management System</h3>
            <p className="text-sm text-blue-700 mt-1">
              Comprehensive vessel management including maintenance tracking, crew assignments, logs, 
              inventory, documents, reminders, and more. Clickany module above to get started.
            </p>
            <p className="text-xs text-blue-600 mt-2">
              💡 Tip: Run <code className="bg-blue-100 px-2 py-1 rounded">vessel-operations-schema.sql</code> in Supabase to enable all features
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
