'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { DatabaseClient } from '@/lib/database'
import { calculateUserCognitiveLoad, calculateSystemCognitiveLoadSummary } from '@/lib/nasaTlx'

export default function SurveyPage() {
  const params = useParams()
  const router = useRouter()

  const [ratings, setRatings] = useState({
    mental_demand: 0,
    physical_demand: 0,
    temporal_demand: 0,
    performance: 0,
    effort: 0,
    frustration: 0
  })

  const [touched, setTouched] = useState({
    mental_demand: false,
    physical_demand: false,
    temporal_demand: false,
    performance: false,
    effort: false,
    frustration: false
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allTouched = Object.values(touched).every(t => t === true)

  async function handleSubmit() {
    if (!allTouched) return

    setIsSubmitting(true)
    setError(null)

    try {
      const sessionId = Number(params.id)

      // 1. Calculate user cognitive load
      const userCognitiveLoad = calculateUserCognitiveLoad(ratings)

      // 2. Save user survey ratings
      await DatabaseClient.createNasaTlxUser({
        session_id: sessionId,
        mental_demand: ratings.mental_demand,
        physical_demand: ratings.physical_demand,
        temporal_demand: ratings.temporal_demand,
        performance: ratings.performance,
        effort: ratings.effort,
        frustration: ratings.frustration,
        cognitive_load: userCognitiveLoad
      })

      // 3. Fetch system records with questions
      const systemRecords = await DatabaseClient.getSessionNasaTlxSystemWithQuestions(sessionId.toString())

      // 4. Calculate system summary
      const summary = calculateSystemCognitiveLoadSummary(systemRecords)

      // 5. Save system summary
      await DatabaseClient.createCognitiveLoadSummary({
        session_id: sessionId,
        sys_mental_demand: summary.sys_mental_demand,
        sys_physical_demand: summary.sys_physical_demand,
        sys_temporal_demand: summary.sys_temporal_demand,
        sys_performance: summary.sys_performance,
        sys_effort: summary.sys_effort,
        sys_frustration: summary.sys_frustration,
        sys_cognitive_load: summary.sys_cognitive_load
      })

      // 6. Redirect to report
      router.push(`/reports/${sessionId}`)
    } catch (err) {
      console.error('Error submitting survey:', err)
      setError('Failed to submit survey. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
      <div className="container max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Session Complete
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Please rate the following aspects of the task you just completed.
            Move each slider from 0 to reflect your experience.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Progress: {Object.values(touched).filter(t => t).length} / 6 dimensions rated
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round((Object.values(touched).filter(t => t).length / 6) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(Object.values(touched).filter(t => t).length / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* 6 Sliders */}
        <div className="space-y-6">
        {/* 1. Mental Demand */}
        <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border-2 transition-all duration-300 ${
          touched.mental_demand ? 'border-purple-500' : 'border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Mental Demand</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                How mentally demanding was the task? How much thinking was required? 
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-600">
                {ratings.mental_demand}
              </div>
              <div className="text-xs text-gray-500">/ 21</div>
            </div>
          </div>
          <div className="relative">
            <input
              type="range"
              min="0"
              max="21"
              step="1"
              value={ratings.mental_demand}
              onChange={(e) => {
                setRatings({ ...ratings, mental_demand: Number(e.target.value) })
                setTouched({ ...touched, mental_demand: true })
              }}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-purple-600"
            />
            {/* Scale markers */}
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">
              <span>0</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>21</span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>Very Low</span>
            <span>Very High</span>
          </div>
        </div>

        {/* 2. Physical Demand */}
        <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border-2 transition-all duration-300 ${
          touched.physical_demand ? 'border-purple-500' : 'border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Physical Demand</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                How distracting was your environment? Was it noisy, uncomfortable, or did people interrupt you?
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-600">
                {ratings.physical_demand}
              </div>
              <div className="text-xs text-gray-500">/ 21</div>
            </div>
          </div>
          <div className="relative">
            <input
              type="range"
              min="0"
              max="21"
              step="1"
              value={ratings.physical_demand}
              onChange={(e) => {
                setRatings({ ...ratings, physical_demand: Number(e.target.value) })
                setTouched({ ...touched, physical_demand: true })
              }}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-purple-600"
            />
            {/* Scale markers */}
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">
              <span>0</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>21</span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>Very Low</span>
            <span>Very High</span>
          </div>
        </div>

        {/* 3. Temporal Demand */}
        <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border-2 transition-all duration-300 ${
          touched.temporal_demand ? 'border-purple-500' : 'border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Temporal Demand</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                How hurried or rushed was the pace of the task? Did you feel rushed? 
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-600">
                {ratings.temporal_demand}
              </div>
              <div className="text-xs text-gray-500">/ 21</div>
            </div>
          </div>
          <div className="relative">
            <input
              type="range"
              min="0"
              max="21"
              step="1"
              value={ratings.temporal_demand}
              onChange={(e) => {
                setRatings({ ...ratings, temporal_demand: Number(e.target.value) })
                setTouched({ ...touched, temporal_demand: true })
              }}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-purple-600"
            />
            {/* Scale markers */}
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">
              <span>0</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>21</span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>Very Low</span>
            <span>Very High</span>
          </div>
        </div>

        {/* 4. Performance */}
        <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border-2 transition-all duration-300 ${
          touched.performance ? 'border-purple-500' : 'border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Performance</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                How well did you do? Did you complete the task successfully or struggle with it?
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                (0 = perfect, 21 = failure)
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-600">
                {ratings.performance}
              </div>
              <div className="text-xs text-gray-500">/ 21</div>
            </div>
          </div>
          <div className="relative">
            <input
              type="range"
              min="0"
              max="21"
              step="1"
              value={ratings.performance}
              onChange={(e) => {
                setRatings({ ...ratings, performance: Number(e.target.value) })
                setTouched({ ...touched, performance: true })
              }}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-purple-600"
            />
            {/* Scale markers */}
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">
              <span>0</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>21</span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>Perfect</span>
            <span>Failure</span>
          </div>
        </div>

        {/* 5. Effort */}
        <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border-2 transition-all duration-300 ${
          touched.effort ? 'border-purple-500' : 'border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Effort</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                How hard did you try? Did you need to put in a lot of effort to complete the task?
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-600">
                {ratings.effort}
              </div>
              <div className="text-xs text-gray-500">/ 21</div>
            </div>
          </div>
          <div className="relative">
            <input
              type="range"
              min="0"
              max="21"
              step="1"
              value={ratings.effort}
              onChange={(e) => {
                setRatings({ ...ratings, effort: Number(e.target.value) })
                setTouched({ ...touched, effort: true })
              }}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-purple-600"
            />
            {/* Scale markers */}
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">
              <span>0</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>21</span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>Very Low</span>
            <span>Very High</span>
          </div>
        </div>

        {/* 6. Frustration */}
        <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border-2 transition-all duration-300 ${
          touched.frustration ? 'border-purple-500' : 'border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Frustration</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                How frustrated did you feel? Were you stressed, annoyed, or discouraged during the task?
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-600">
                {ratings.frustration}
              </div>
              <div className="text-xs text-gray-500">/ 21</div>
            </div>
          </div>
          <div className="relative">
            <input
              type="range"
              min="0"
              max="21"
              step="1"
              value={ratings.frustration}
              onChange={(e) => {
                setRatings({ ...ratings, frustration: Number(e.target.value) })
                setTouched({ ...touched, frustration: true })
              }}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-purple-600"
            />
            {/* Scale markers */}
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">
              <span>0</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>21</span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>Very Low</span>
            <span>Very High</span>
          </div>
        </div>
      </div>

      {/* Submit Section */}
      <div className="mt-8 space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {!allTouched && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                Please adjust all ratings before submitting
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!allTouched || isSubmitting}
          className="w-full rounded-2xl px-8 py-5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Submitting Survey...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>Submit Survey</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          )}
        </button>
      </div>
      </div>
    </div>
  )
}
