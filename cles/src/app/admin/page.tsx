'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  totalUsers: number
  totalSessions: number
  totalSwotAnalyses: number
  recentSessionsCount: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalSessions: 0,
    totalSwotAnalyses: 0,
    recentSessionsCount: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        // Get total users (only regular users, exclude admins)
        const { count: usersCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .or('role.eq.user,role.is.null')

        // Get total sessions
        const { count: sessionsCount } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })

        // Get total SWOT analyses
        const { count: swotCount } = await supabase
          .from('swot_analysis')
          .select('*', { count: 'exact', head: true })

        // Get sessions from last 7 days
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { count: recentCount } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString())

        setStats({
          totalUsers: usersCount || 0,
          totalSessions: sessionsCount || 0,
          totalSwotAnalyses: swotCount || 0,
          recentSessionsCount: recentCount || 0,
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: '👥',
      link: '/admin/users',
    },
    {
      title: 'Total Sessions',
      value: stats.totalSessions,
      icon: '📝',
      link: '/admin/reports',
    },
    {
      title: 'SWOT Analyses',
      value: stats.totalSwotAnalyses,
      icon: '🎯',
      link: '/admin/swot',
    },
    {
      title: 'Recent Sessions (7d)',
      value: stats.recentSessionsCount,
      icon: '📈',
      link: '/admin/reports',
    },
  ]

  const quickActions = [
    {
      title: 'Manage Users',
      description: 'View and delete users',
      icon: '👥',
      href: '/admin/users',
    },
    {
      title: 'View Reports',
      description: 'Browse all user session reports',
      icon: '📈',
      href: '/admin/reports',
    },
    {
      title: 'View SWOT',
      description: 'Review user SWOT analyses',
      icon: '🎯',
      href: '/admin/swot',
    },
    {
      title: 'Manage Subtopics',
      description: 'Add, edit, or disable subtopics',
      icon: '📚',
      href: '/admin/subtopics',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome to the CLES admin panel. Manage users, view reports, and configure the system.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <Link
            key={card.title}
            href={card.link}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-200/30 dark:border-purple-800/30 p-6 hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 mb-1 font-medium">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-2xl shadow-lg">
                {card.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="gradient-bg text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl">{action.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold mb-1">{action.title}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
