'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SwotAnalysis } from '@/lib/database'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface SwotWithUser extends SwotAnalysis {
  users?: {
    email: string
  }
}

export default function AdminSwotDetailPage() {
  const router = useRouter()
  const params = useParams()
  const swotId = params?.id as string

  const [swotData, setSwotData] = useState<SwotWithUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (swotId) {
      fetchSwotAnalysis()
    }
  }, [swotId])

  const fetchSwotAnalysis = async () => {
    try {
      setLoading(true)
      setError('')

      const { data, error: fetchError } = await supabase
        .from('swot_analysis')
        .select(`
          *,
          users:user_id (
            email
          )
        `)
        .eq('id', swotId)
        .single()

      if (fetchError) throw fetchError

      setSwotData(data)
    } catch (err) {
      console.error('Error fetching SWOT analysis:', err)
      setError('Failed to load SWOT analysis')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    setTimeout(() => {
      window.print()
    }, 150)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const generated = new Date(timestamp)
    const diffMs = now.getTime() - generated.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'today'
    if (diffDays === 1) return '1 day ago'
    return `${diffDays} days ago`
  }

  const parseBullets = (markdown: string | undefined): string[] => {
    if (!markdown) return []
    return markdown
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('*') || line.startsWith('-'))
      .map(line => line.replace(/^[*\-]\s*/, '').trim())
      .filter(line => line.length > 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-purple-600 dark:text-purple-400 font-medium">Loading SWOT analysis...</div>
      </div>
    )
  }

  if (error || !swotData) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
          <p className="text-red-800 dark:text-red-300 font-medium">Error:</p>
          <p className="text-red-600 dark:text-red-400">{error || 'SWOT analysis not found'}</p>
        </div>
        <button
          onClick={() => router.push('/admin/swot')}
          className="px-6 py-3 gradient-bg text-white rounded-2xl hover:opacity-90 font-medium"
        >
          ← Back to SWOT List
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="no-print">
        <button
          onClick={() => router.push('/admin/swot')}
          className="px-6 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 rounded-2xl hover:border-purple-400 dark:hover:border-purple-500 font-medium shadow-lg border border-purple-200/30 dark:border-purple-800/30 transition-all"
        >
          ← Back to SWOT List
        </button>
      </div>

      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-200/30 dark:border-purple-800/30 p-8">
        <div className="text-center">
          <div className="text-5xl mb-3">🎯</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            SWOT Analysis
          </h1>
          <p className="text-lg text-purple-600 dark:text-purple-400 font-medium mb-2">
            {swotData.users?.email || 'Unknown User'}
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Last generated: <span className="font-medium">{getTimeAgo(swotData.generated_at)}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Based on {swotData.total_sessions_analyzed} total sessions
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            ✨ Powered by Google Gemini AI
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-6 no-print">
          <button
            onClick={handlePrint}
            className="px-6 py-3 gradient-bg text-white rounded-2xl hover:opacity-90 font-medium shadow-lg"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* 2x2 SWOT Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border-t-4 border-green-500 p-6">
          <h3 className="text-xl font-bold text-green-700 dark:text-green-400 mb-4 flex items-center">
            <span className="text-2xl mr-2">💪</span>
            STRENGTHS
          </h3>
          <ul className="space-y-2.5">
            {parseBullets(swotData.swot_strengths).map((bullet, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                <span className="text-green-500 dark:text-green-400 mt-1 flex-shrink-0">•</span>
                <span className="leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border-t-4 border-yellow-500 p-6">
          <h3 className="text-xl font-bold text-yellow-700 dark:text-yellow-400 mb-4 flex items-center">
            <span className="text-2xl mr-2">⚠️</span>
            WEAKNESSES
          </h3>
          <ul className="space-y-2.5">
            {parseBullets(swotData.swot_weaknesses).map((bullet, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                <span className="text-yellow-500 dark:text-yellow-400 mt-1 flex-shrink-0">•</span>
                <span className="leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Opportunities */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border-t-4 border-blue-500 p-6">
          <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400 mb-4 flex items-center">
            <span className="text-2xl mr-2">🎯</span>
            OPPORTUNITIES
          </h3>
          <ul className="space-y-2.5">
            {parseBullets(swotData.swot_opportunities).map((bullet, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                <span className="text-blue-500 dark:text-blue-400 mt-1 flex-shrink-0">•</span>
                <span className="leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Threats */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border-t-4 border-red-500 p-6">
          <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-4 flex items-center">
            <span className="text-2xl mr-2">🚨</span>
            THREATS
          </h3>
          <ul className="space-y-2.5">
            {parseBullets(swotData.swot_threats).map((bullet, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                <span className="text-red-500 dark:text-red-400 mt-1 flex-shrink-0">•</span>
                <span className="leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-200/30 dark:border-purple-800/30 p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
          📊 Performance Comparison Across Topics
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
          6 NASA-TLX Dimensions (Scale: 0-20)
        </p>

        <RadarChartComponent radarData={swotData.radar_data} />

        {/* Radar Chart Explanation - only show if exists */}
        {swotData.radar_explanation && (
          <div className="mt-6 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center">
              <span className="mr-2">📖</span>
              Understanding This Chart
            </h3>
            <ul className="space-y-1.5">
              {parseBullets(swotData.radar_explanation).map((bullet, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-300">
                  <span className="text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-purple-600 dark:text-purple-400">Array</div>
            <div className="text-gray-600 dark:text-gray-400">Avg Score: {swotData.avg_score_array ?? 'N/A'}/10</div>
            <div className="text-gray-600 dark:text-gray-400">Avg Cognitive Load: {swotData.radar_data.array.cognitiveLoad}/20</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-pink-600 dark:text-pink-400">Linked List</div>
            <div className="text-gray-600 dark:text-gray-400">Avg Score: {swotData.avg_score_linked_list ?? 'N/A'}/10</div>
            <div className="text-gray-600 dark:text-gray-400">Avg Cognitive Load: {swotData.radar_data.linkedList.cognitiveLoad}/20</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-green-600 dark:text-green-400">Stack</div>
            <div className="text-gray-600 dark:text-gray-400">Avg Score: {swotData.avg_score_stack ?? 'N/A'}/10</div>
            <div className="text-gray-600 dark:text-gray-400">Avg Cognitive Load: {swotData.radar_data.stack.cognitiveLoad}/20</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Radar Chart Component
function RadarChartComponent({ radarData }: { radarData: SwotAnalysis['radar_data'] }) {
  const [visibleTopics, setVisibleTopics] = useState({
    array: true,
    linkedList: true,
    stack: true
  })

  const toggleTopic = (topic: 'array' | 'linkedList' | 'stack') => {
    setVisibleTopics(prev => ({
      ...prev,
      [topic]: !prev[topic]
    }))
  }

  const chartData = [
    {
      dimension: 'Mental',
      Array: radarData.array.mental,
      'Linked List': radarData.linkedList.mental,
      Stack: radarData.stack.mental,
    },
    {
      dimension: 'Physical',
      Array: radarData.array.physical,
      'Linked List': radarData.linkedList.physical,
      Stack: radarData.stack.physical,
    },
    {
      dimension: 'Time Pressure',
      Array: radarData.array.temporal,
      'Linked List': radarData.linkedList.temporal,
      Stack: radarData.stack.temporal,
    },
    {
      dimension: 'Task Success',
      Array: 20 - radarData.array.performance,
      'Linked List': 20 - radarData.linkedList.performance,
      Stack: 20 - radarData.stack.performance,
    },
    {
      dimension: 'Effort',
      Array: radarData.array.effort,
      'Linked List': radarData.linkedList.effort,
      Stack: radarData.stack.effort,
    },
    {
      dimension: 'Frustration',
      Array: radarData.array.frustration,
      'Linked List': radarData.linkedList.frustration,
      Stack: radarData.stack.frustration,
    },
  ]

  return (
    <>
      <ResponsiveContainer width="100%" height={500}>
        <RadarChart data={chartData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="dimension" />
          <PolarRadiusAxis angle={90} domain={[0, 20]} />

          {visibleTopics.array && (
            <Radar
              name="Array"
              dataKey="Array"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.3}
            />
          )}
          {visibleTopics.linkedList && (
            <Radar
              name="Linked List"
              dataKey="Linked List"
              stroke="#ec4899"
              fill="#ec4899"
              fillOpacity={0.3}
            />
          )}
          {visibleTopics.stack && (
            <Radar
              name="Stack"
              dataKey="Stack"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.3}
            />
          )}

          <Tooltip
            formatter={(value: number) => `${value}/20`}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            labelStyle={{
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: '#111827'
            }}
            itemStyle={{
              padding: '0.25rem 0'
            }}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Custom Interactive Legend */}
      <div className="flex justify-center gap-6 mt-4">
        <button
          onClick={() => toggleTopic('array')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            visibleTopics.array
              ? 'bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-500'
              : 'bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 opacity-50'
          }`}
        >
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }}></div>
          <span className={`font-medium ${visibleTopics.array ? 'text-purple-700 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}>
            Array
          </span>
        </button>

        <button
          onClick={() => toggleTopic('linkedList')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            visibleTopics.linkedList
              ? 'bg-pink-50 dark:bg-pink-900/30 border-2 border-pink-500'
              : 'bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 opacity-50'
          }`}
        >
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ec4899' }}></div>
          <span className={`font-medium ${visibleTopics.linkedList ? 'text-pink-700 dark:text-pink-300' : 'text-gray-500 dark:text-gray-400'}`}>
            Linked List
          </span>
        </button>

        <button
          onClick={() => toggleTopic('stack')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            visibleTopics.stack
              ? 'bg-green-50 dark:bg-green-900/30 border-2 border-green-500'
              : 'bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 opacity-50'
          }`}
        >
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
          <span className={`font-medium ${visibleTopics.stack ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
            Stack
          </span>
        </button>
      </div>
    </>
  )
}
