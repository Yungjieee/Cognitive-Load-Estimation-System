'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [userEmail, setUserEmail] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      // Get user role
      const { data: user } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', session.user.id)
        .single()

      if (!user || user.role !== 'admin') {
        router.push('/home')
        return
      }

      setUserEmail(user.email)
      setLoading(false)
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/sign-in')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-purple-600 dark:text-purple-400 font-medium">Loading...</div>
      </div>
    )
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/users', label: 'Manage Users', icon: '👥' },
    { href: '/admin/reports', label: 'View Reports', icon: '📈' },
    { href: '/admin/swot', label: 'View SWOT', icon: '🎯' },
    { href: '/admin/subtopics', label: 'Manage Subtopics', icon: '📚' },
    { href: '/admin/questions', label: 'Manage Questions', icon: '❓' },
  ]

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Sidebar */}
      <aside className="w-64 h-screen sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-r border-purple-200/30 dark:border-purple-800/30 flex flex-col">
        {/* Logo/Header */}
        <div className="p-4 border-b border-purple-200/30 dark:border-purple-800/30">
          <Image
            src="/logo.png"
            alt="CLES Logo"
            width={48}
            height={48}
            className="rounded-2xl mb-2"
          />
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">CLES Admin</h1>
          <p className="text-xs text-purple-600 dark:text-purple-400">Admin Panel</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                      isActive
                        ? 'gradient-bg text-white font-medium shadow-md'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User info & Logout */}
        <div className="p-3 border-t border-purple-200/30 dark:border-purple-800/30">
          <div className="mb-2">
            <p className="text-xs text-purple-600 dark:text-purple-400">Logged in as</p>
            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-xs text-white btn-primary rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
