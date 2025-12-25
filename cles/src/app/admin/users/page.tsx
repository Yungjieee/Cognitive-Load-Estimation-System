'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@/lib/database'

interface Subtopic {
  id: number
  key: string
  name: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [subtopics, setSubtopics] = useState<Subtopic[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [viewingUser, setViewingUser] = useState<User | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch regular users only (exclude admins)
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .or('role.eq.user,role.is.null')
          .order('created_at', { ascending: false })

        if (usersError) throw usersError

        // Fetch subtopics for profile display
        const { data: subtopicsData, error: subtopicsError } = await supabase
          .from('subtopics')
          .select('id, key, name')

        if (subtopicsError) throw subtopicsError

        setUsers(usersData || [])
        setSubtopics(subtopicsData || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete user "${userEmail}"? This action cannot be undone and will delete all their data including sessions, responses, and SWOT analysis.`
    )

    if (!confirmed) return

    setDeleting(userId)

    try {
      // Get access token from session
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        alert('Session expired. Please log in again.')
        setDeleting(null)
        return
      }

      const response = await fetch('/api/admin/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          accessToken: session.access_token
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

      // Remove from local state
      setUsers(users.filter((u) => u.id !== userId))
      alert(`User "${userEmail}" has been deleted successfully.`)
    } catch (error: any) {
      console.error('Error deleting user:', error)
      alert(`Failed to delete user: ${error.message}`)
    } finally {
      setDeleting(null)
    }
  }

  const getSubtopicName = (key: string): string => {
    return subtopics.find(s => s.key === key)?.name || key
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-purple-600 dark:text-purple-400 font-medium">Loading users...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Users</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View all users and manage their accounts. Total users: {users.length}
        </p>
      </div>

      {/* Users Table */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-200/30 dark:border-purple-800/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-700 border-b border-purple-200/30 dark:border-purple-800/30">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Profile
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-100 dark:divide-gray-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isDeletingThis = deleting === user.id

                  return (
                    <tr key={user.id} className="hover:bg-purple-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.email}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            user.profile_completed
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                          }`}
                        >
                          {user.profile_completed ? 'Completed' : 'Incomplete'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setViewingUser(user)}
                            className="px-4 py-2 rounded-xl font-medium transition-all duration-300 gradient-bg text-white shadow-lg hover:shadow-xl"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            disabled={isDeletingThis}
                            className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                              isDeletingThis
                                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-wait'
                                : 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl'
                            }`}
                          >
                            {isDeletingThis ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile Modal */}
      {viewingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="gradient-bg text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">User Profile</h2>
                <p className="text-sm opacity-90">{viewingUser.email}</p>
              </div>
              <button
                onClick={() => setViewingUser(null)}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Profile Status */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Profile Status</h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                      viewingUser.profile_completed
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    }`}
                  >
                    {viewingUser.profile_completed ? '✓ Profile Completed' : '⚠ Profile Incomplete'}
                  </span>
                </div>
              </div>

              {/* Prior Knowledge */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Prior Knowledge</h3>
                {Object.keys(viewingUser.profile_prior_knowledge).length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(viewingUser.profile_prior_knowledge).map(([key, level]) => (
                      <div
                        key={key}
                        className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3"
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{getSubtopicName(key)}</div>
                        <div className="text-xs text-purple-600 dark:text-purple-400 mt-1 capitalize">{level}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No prior knowledge recorded</p>
                )}
              </div>

              {/* Experience */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Experience</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Taken Course:</span>
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                      {viewingUser.profile_experience_taken_course || 'Not specified'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Hands-on Experience:</span>
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                      {viewingUser.profile_experience_hands_on?.replace(/_/g, ' ') || 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grades */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Grades</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Math Grade:</span>
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                      {viewingUser.profile_math_grade || 'Not specified'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Programming Grade:</span>
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                      {viewingUser.profile_programming_grade || 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Interest Subtopics */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Interest Subtopics</h3>
                {viewingUser.profile_interest_subtopics.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {viewingUser.profile_interest_subtopics.map((key) => (
                      <span
                        key={key}
                        className="px-3 py-1 text-sm font-medium rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300"
                      >
                        {getSubtopicName(key)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No interests selected</p>
                )}
              </div>

              {/* Account Info */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Account Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">User ID:</span>
                    <span className="text-gray-900 dark:text-white font-mono text-xs">{viewingUser.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Created:</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(viewingUser.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(viewingUser.updated_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Settings Mode:</span>
                    <span className="text-gray-900 dark:text-white capitalize">{viewingUser.settings_mode}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
