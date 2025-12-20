'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SwotAnalysis } from '@/lib/database'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ResponsiveContainer, Tooltip } from 'recharts'

type PageState = 'loading' | 'locked' | 'ready' | 'generating' | 'generated'

interface CompletionStatus {
  completed: boolean
  missing: string[]
  counts: {
    array: number
    linkedList: number
    stack: number
  }
}

export default function SwotAnalysisPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [swotData, setSwotData] = useState<SwotAnalysis | null>(null)
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus | null>(null)
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)
  const [error, setError] = useState('')

  // Get user ID on mount
  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.id) {
        // Not logged in - redirect to login
        window.location.href = '/auth/sign-in'
        return
      }

      setUserId(user.id)
    }

    initUser()
  }, [])

  // Fetch SWOT status when userId is available
  useEffect(() => {
    if (userId) {
      fetchSwotStatus()
    }
  }, [userId])

  const fetchSwotStatus = async () => {
    if (!userId) return

    try {
      setPageState('loading')
      setError('')

      const res = await fetch(`/api/swot-analysis?userId=${userId}`)
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        return
      }

      if (data.status === 'locked') {
        setPageState('locked')
        setCompletionStatus({
          completed: false,
          missing: data.missing,
          counts: data.counts
        })
      } else if (data.status === 'ready_to_generate') {
        setPageState('ready')
        setCompletionStatus({
          completed: true,
          missing: [],
          counts: data.counts
        })
      } else if (data.status === 'generated') {
        setPageState('generated')
        setSwotData(data.swot)
        setCompletionStatus({
          completed: true,
          missing: [],
          counts: data.counts
        })
      }
    } catch (err) {
      console.error('Failed to fetch SWOT status:', err)
      setError('Failed to load SWOT analysis status')
    }
  }

  const handleGenerate = async () => {
    if (!userId) return

    try {
      setPageState('generating')
      setError('')

      const res = await fetch('/api/swot-analysis/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      })

      const data = await res.json()

      if (data.error) {
        setError(data.error)
        setPageState('ready')
        return
      }

      // Refetch to get the generated SWOT
      await fetchSwotStatus()
    } catch (err) {
      console.error('Failed to generate SWOT:', err)
      setError('Failed to generate SWOT analysis')
      setPageState('ready')
    }
  }

  const handleRegenerateClick = () => {
    setShowRegenerateDialog(true)
  }

  const handleConfirmRegenerate = async () => {
    setShowRegenerateDialog(false)
    await handleGenerate()
  }

  const handlePrint = () => {
    // Small delay to ensure ResponsiveContainer calculates dimensions before print
    setTimeout(() => {
      window.print()
    }, 150)
  }

  // Calculate time ago from timestamp
  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const generated = new Date(timestamp)
    const diffMs = now.getTime() - generated.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'today'
    if (diffDays === 1) return '1 day ago'
    return `${diffDays} days ago`
  }

  // Format topic name
  const formatTopicName = (key: string) => {
    if (key === 'array') return 'Array'
    if (key === 'linked_list') return 'Linked List'
    if (key === 'stack') return 'Stack'
    return key
  }

  // Parse markdown bullets to array (matches report page pattern)
  const parseBullets = (markdown: string | undefined): string[] => {
    if (!markdown) return []
    return markdown
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('*') || line.startsWith('-'))
      .map(line => line.replace(/^[*\-]\s*/, '').trim())
      .filter(line => line.length > 0)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">Error:</p>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {pageState === 'loading' && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading SWOT analysis...</p>
            </div>
          </div>
        )}

        {/* Locked State */}
        {pageState === 'locked' && completionStatus && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🔒</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                SWOT Analysis Locked
              </h1>
              <p className="text-gray-600">
                Complete all 3 data structure topics to unlock your comprehensive SWOT analysis.
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <h2 className="text-lg font-semibold mb-4">Topic Completion Status:</h2>
              <div className="space-y-3">
                {/* Array */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {!completionStatus.missing.includes('array') ? (
                      <span className="text-2xl mr-3">✅</span>
                    ) : (
                      <span className="text-2xl mr-3">⏳</span>
                    )}
                    <span className="font-medium">Array</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {!completionStatus.missing.includes('array')
                      ? `${completionStatus.counts.array} sessions completed`
                      : 'Not started'}
                  </span>
                </div>

                {/* Linked List */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {!completionStatus.missing.includes('linked_list') ? (
                      <span className="text-2xl mr-3">✅</span>
                    ) : (
                      <span className="text-2xl mr-3">⏳</span>
                    )}
                    <span className="font-medium">Linked List</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {!completionStatus.missing.includes('linked_list')
                      ? `${completionStatus.counts.linkedList} sessions completed`
                      : 'Not started'}
                  </span>
                </div>

                {/* Stack */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {!completionStatus.missing.includes('stack') ? (
                      <span className="text-2xl mr-3">✅</span>
                    ) : (
                      <span className="text-2xl mr-3">⏳</span>
                    )}
                    <span className="font-medium">Stack</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {!completionStatus.missing.includes('stack')
                      ? `${completionStatus.counts.stack} sessions completed`
                      : 'Not started'}
                  </span>
                </div>
              </div>

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Your SWOT analysis will be available once you finish all topics.
                </p>
                <a
                  href="/home"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Start Next Topic
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Ready to Generate State */}
        {pageState === 'ready' && completionStatus && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎯</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Ready to Generate SWOT Analysis
              </h1>
              <p className="text-xl text-gray-600 mb-2">All topics completed! 🎉</p>
            </div>

            <div className="max-w-md mx-auto">
              <div className="space-y-3 mb-8">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">✅</span>
                    <span className="font-medium">Array</span>
                  </div>
                  <span className="text-sm text-green-700">
                    {completionStatus.counts.array} sessions completed
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">✅</span>
                    <span className="font-medium">Linked List</span>
                  </div>
                  <span className="text-sm text-green-700">
                    {completionStatus.counts.linkedList} sessions completed
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">✅</span>
                    <span className="font-medium">Stack</span>
                  </div>
                  <span className="text-sm text-green-700">
                    {completionStatus.counts.stack} sessions completed
                  </span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-gray-600 mb-6">
                  Click below to analyze your comprehensive performance across all topics.
                </p>
                <button
                  onClick={handleGenerate}
                  className="px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-lg shadow-lg hover:shadow-xl transition-shadow"
                >
                  Generate SWOT Analysis
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Generating State */}
        {pageState === 'generating' && completionStatus && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Generating Your SWOT Analysis...
              </h1>

              <div className="flex items-center justify-center mb-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
              </div>

              <div className="max-w-md mx-auto">
                <p className="text-gray-600 mb-6">Analyzing your performance across:</p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-center text-green-700">
                    <span className="mr-2">✅</span>
                    <span>Array ({completionStatus.counts.array} sessions)</span>
                  </div>
                  <div className="flex items-center justify-center text-green-700">
                    <span className="mr-2">✅</span>
                    <span>Linked List ({completionStatus.counts.linkedList} sessions)</span>
                  </div>
                  <div className="flex items-center justify-center text-green-700">
                    <span className="mr-2">✅</span>
                    <span>Stack ({completionStatus.counts.stack} sessions)</span>
                  </div>
                </div>

                <p className="text-sm text-gray-500">This will take 5-10 seconds...</p>
              </div>
            </div>
          </div>
        )}

        {/* Generated State */}
        {pageState === 'generated' && swotData && (
          <div id="swot-container" className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center">
                <div className="text-5xl mb-3">🎯</div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Your Comprehensive SWOT Analysis
                </h1>
                <p className="text-gray-600 swot-meta">
                  Last generated: <span className="font-medium">{getTimeAgo(swotData.generated_at)}</span>
                </p>
                <p className="text-sm text-gray-500 swot-meta">
                  Based on {swotData.total_sessions_analyzed} total sessions
                </p>
                <p className="text-xs text-gray-400 mt-2 swot-meta">
                  ✨ Powered by Google Gemini AI
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4 mt-6 swot-actions no-print">
                <button
                  onClick={handleRegenerateClick}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  Regenerate SWOT
                </button>
                <button
                  onClick={handlePrint}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Print / Save as PDF
                </button>
              </div>
            </div>

            {/* 2x2 SWOT Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 swot-grid">
              {/* Strengths */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-green-500 swot-card swot-quadrant swot-strengths">
                <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center">
                  <span className="text-2xl mr-2">💪</span>
                  STRENGTHS
                </h3>
                <ul className="space-y-2.5">
                  {parseBullets(swotData.swot_strengths).map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-green-500 mt-1 flex-shrink-0">•</span>
                      <span className="leading-relaxed">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-yellow-500 swot-card swot-quadrant swot-weaknesses">
                <h3 className="text-xl font-bold text-yellow-700 mb-4 flex items-center">
                  <span className="text-2xl mr-2">⚠️</span>
                  WEAKNESSES
                </h3>
                <ul className="space-y-2.5">
                  {parseBullets(swotData.swot_weaknesses).map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-yellow-500 mt-1 flex-shrink-0">•</span>
                      <span className="leading-relaxed">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Opportunities */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-blue-500 swot-card swot-quadrant swot-opportunities">
                <h3 className="text-xl font-bold text-blue-700 mb-4 flex items-center">
                  <span className="text-2xl mr-2">🎯</span>
                  OPPORTUNITIES
                </h3>
                <ul className="space-y-2.5">
                  {parseBullets(swotData.swot_opportunities).map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-blue-500 mt-1 flex-shrink-0">•</span>
                      <span className="leading-relaxed">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Threats */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-red-500 swot-card swot-quadrant swot-threats">
                <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center">
                  <span className="text-2xl mr-2">🚨</span>
                  THREATS
                </h3>
                <ul className="space-y-2.5">
                  {parseBullets(swotData.swot_threats).map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-red-500 mt-1 flex-shrink-0">•</span>
                      <span className="leading-relaxed">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Radar Chart */}
            <div className="bg-white rounded-lg shadow-lg p-8 radar-chart-container">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                📊 Performance Comparison Across Topics
              </h2>
              <p className="text-sm text-gray-600 mb-6 text-center">
                6 NASA-TLX Dimensions (Scale: 0-20)
              </p>

              <RadarChartComponent radarData={swotData.radar_data} />

              {/* Radar Chart Explanation - only show if exists */}
              {swotData.radar_explanation && (
                <div className="mt-6 mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                    <span className="mr-2">📖</span>
                    Understanding This Chart
                  </h3>
                  <ul className="space-y-1.5">
                    {parseBullets(swotData.radar_explanation).map((bullet, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                        <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-purple-600">Array</div>
                  <div className="text-gray-600">Avg Score: {swotData.avg_score_array ?? 'N/A'}/10</div>
                  <div className="text-gray-600">Avg Cognitive Load: {swotData.radar_data.array.cognitiveLoad}/20</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-pink-600">Linked List</div>
                  <div className="text-gray-600">Avg Score: {swotData.avg_score_linked_list ?? 'N/A'}/10</div>
                  <div className="text-gray-600">Avg Cognitive Load: {swotData.radar_data.linkedList.cognitiveLoad}/20</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600">Stack</div>
                  <div className="text-gray-600">Avg Score: {swotData.avg_score_stack ?? 'N/A'}/10</div>
                  <div className="text-gray-600">Avg Cognitive Load: {swotData.radar_data.stack.cognitiveLoad}/20</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Regenerate Confirmation Dialog */}
        {showRegenerateDialog && swotData && completionStatus && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                ⚠️ Regenerate SWOT Analysis?
              </h3>
              <p className="text-gray-600 mb-4">
                This will update your analysis based on all current session data.
              </p>

              <div className="mb-4 p-4 bg-blue-50 rounded-lg text-sm">
                <p className="mb-1">
                  • Current: <span className="font-medium">{swotData.total_sessions_analyzed}</span> sessions analyzed
                </p>
                <p>
                  • Updated: <span className="font-medium">
                    {completionStatus.counts.array + completionStatus.counts.linkedList + completionStatus.counts.stack}
                  </span> sessions will be analyzed
                </p>
              </div>

              <p className="text-sm text-gray-500 mb-6">
                This cannot be undone. Your previous analysis will be replaced.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRegenerateDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRegenerate}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Radar Chart Component
function RadarChartComponent({ radarData }: { radarData: SwotAnalysis['radar_data'] }) {
  // State to track which topics are visible
  const [visibleTopics, setVisibleTopics] = useState({
    array: true,
    linkedList: true,
    stack: true
  })

  // Toggle topic visibility
  const toggleTopic = (topic: 'array' | 'linkedList' | 'stack') => {
    setVisibleTopics(prev => ({
      ...prev,
      [topic]: !prev[topic]
    }))
  }

  // Transform data from DB format to Recharts format
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
              ? 'bg-purple-50 border-2 border-purple-500'
              : 'bg-gray-100 border-2 border-gray-300 opacity-50'
          }`}
        >
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }}></div>
          <span className={`font-medium ${visibleTopics.array ? 'text-purple-700' : 'text-gray-500'}`}>
            Array
          </span>
        </button>

        <button
          onClick={() => toggleTopic('linkedList')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            visibleTopics.linkedList
              ? 'bg-pink-50 border-2 border-pink-500'
              : 'bg-gray-100 border-2 border-gray-300 opacity-50'
          }`}
        >
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ec4899' }}></div>
          <span className={`font-medium ${visibleTopics.linkedList ? 'text-pink-700' : 'text-gray-500'}`}>
            Linked List
          </span>
        </button>

        <button
          onClick={() => toggleTopic('stack')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            visibleTopics.stack
              ? 'bg-green-50 border-2 border-green-500'
              : 'bg-gray-100 border-2 border-gray-300 opacity-50'
          }`}
        >
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
          <span className={`font-medium ${visibleTopics.stack ? 'text-green-700' : 'text-gray-500'}`}>
            Stack
          </span>
        </button>
      </div>
    </>
  )
}
