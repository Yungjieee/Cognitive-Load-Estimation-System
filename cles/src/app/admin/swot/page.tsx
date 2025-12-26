'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { SwotAnalysis } from '@/lib/database'

interface SwotWithUser extends SwotAnalysis {
  users?: {
    email: string
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function AdminSwotPage() {
  const router = useRouter()
  const [swotAnalyses, setSwotAnalyses] = useState<SwotWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function fetchSwotAnalyses() {
      try {
        const { data, error } = await supabase
          .from('swot_analysis')
          .select(`
            *,
            users:user_id (
              email
            )
          `)
          .order('generated_at', { ascending: false })

        if (error) throw error

        setSwotAnalyses(data || [])
      } catch (error) {
        console.error('Error fetching SWOT analyses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSwotAnalyses()
  }, [])

  const filteredAnalyses = swotAnalyses.filter(swot => {
    const matchesSearch = searchQuery.trim() === '' ||
      swot.users?.email.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  const avgScoreTotal = filteredAnalyses.length > 0
    ? filteredAnalyses.reduce((sum, s) => {
        const avg = ((s.avg_score_array || 0) + (s.avg_score_linked_list || 0) + (s.avg_score_stack || 0)) / 3
        return sum + avg
      }, 0) / filteredAnalyses.length
    : 0

  const avgCognitiveLoad = filteredAnalyses.length > 0
    ? filteredAnalyses.reduce((sum, s) => {
        const avg = (s.radar_data.array.cognitiveLoad + s.radar_data.linkedList.cognitiveLoad + s.radar_data.stack.cognitiveLoad) / 3
        return sum + avg
      }, 0) / filteredAnalyses.length
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-purple-600 dark:text-purple-400 font-medium">Loading SWOT analyses...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">All SWOT Analyses</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View comprehensive SWOT analyses across all users
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Analyses</p>
              <p className="text-3xl font-bold gradient-text">{swotAnalyses.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
              <span className="text-white text-2xl">🎯</span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg User Score</p>
              <p className="text-3xl font-bold gradient-text">{avgScoreTotal.toFixed(1)}/10</p>
            </div>
            <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
              <span className="text-white text-2xl">⭐</span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg User Cognitive Load</p>
              <p className="text-3xl font-bold gradient-text">{avgCognitiveLoad.toFixed(1)}/20</p>
            </div>
            <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
              <span className="text-white text-2xl">🧠</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-200/30 dark:border-purple-800/30">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
            <span className="text-purple-500 dark:text-purple-400 text-xl">🔍</span>
          </div>
          <input
            type="text"
            placeholder="Search by user email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-4 rounded-2xl bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors z-10"
            >
              <span className="text-xl">✕</span>
            </button>
          )}
        </div>
      </div>

      {/* SWOT Table */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-200/30 dark:border-purple-800/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-700 border-b border-purple-200/30 dark:border-purple-800/30">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Total Sessions
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Avg Score
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Avg Cognitive Load
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Generated
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-100 dark:divide-gray-700">
              {filteredAnalyses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No SWOT analyses found
                  </td>
                </tr>
              ) : (
                filteredAnalyses.map((swot) => {
                  const avgScore = ((swot.avg_score_array || 0) + (swot.avg_score_linked_list || 0) + (swot.avg_score_stack || 0)) / 3
                  const avgCL = (swot.radar_data.array.cognitiveLoad + swot.radar_data.linkedList.cognitiveLoad + swot.radar_data.stack.cognitiveLoad) / 3

                  return (
                    <tr
                      key={swot.id}
                      className="hover:bg-purple-50/50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {swot.users?.email || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {swot.total_sessions_analyzed}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold gradient-text">
                          {avgScore.toFixed(1)}/10
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {avgCL.toFixed(1)}/20
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(swot.generated_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* View button - icon only */}
                        <button
                          onClick={() => router.push(`/admin/swot/${swot.id}`)}
                          className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                          title="View SWOT analysis details"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
