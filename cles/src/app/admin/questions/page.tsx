'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Question, Subtopic } from '@/lib/database'

interface QuestionWithSubtopic extends Question {
  subtopics?: {
    name: string
    key: string
  }
}

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<QuestionWithSubtopic[]>([])
  const [subtopics, setSubtopics] = useState<Subtopic[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionWithSubtopic | null>(null)

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (selectedQuestion) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [selectedQuestion])

  // Filters
  const [subtopicFilter, setSubtopicFilter] = useState<string>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [enabledFilter, setEnabledFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch subtopics
      const { data: subtopicsData } = await supabase
        .from('subtopics')
        .select('*')
        .order('name')

      setSubtopics(subtopicsData || [])

      // Fetch questions with subtopic info
      const { data: questionsData, error } = await supabase
        .from('questions')
        .select(`
          *,
          subtopics:subtopic_id (
            name,
            key
          )
        `)
        .order('id', { ascending: false })

      if (error) throw error
      setQuestions(questionsData || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredQuestions = questions.filter(q => {
    const matchesSubtopic = subtopicFilter === 'all' || q.subtopics?.key === subtopicFilter
    const matchesDifficulty = difficultyFilter === 'all' || q.difficulty === difficultyFilter
    const matchesType = typeFilter === 'all' || q.qtype === typeFilter
    const matchesEnabled = enabledFilter === 'all' ||
      (enabledFilter === 'enabled' ? q.enabled : !q.enabled)
    const matchesSearch = searchQuery.trim() === '' ||
      q.prompt.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSubtopic && matchesDifficulty && matchesType && matchesEnabled && matchesSearch
  })

  const stats = {
    total: questions.length,
    enabled: questions.filter(q => q.enabled).length,
    disabled: questions.filter(q => !q.enabled).length,
    easy: questions.filter(q => q.difficulty === 'E').length,
    medium: questions.filter(q => q.difficulty === 'M').length,
    hard: questions.filter(q => q.difficulty === 'H').length
  }

  const getDifficultyLabel = (diff: string) => {
    if (diff === 'E') return 'Easy'
    if (diff === 'M') return 'Medium'
    if (diff === 'H') return 'Hard'
    return diff
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      mcq: 'Multiple Choice',
      short: 'Short Answer',
      code: 'Code',
      image_mcq: 'Image MCQ',
      image_short: 'Image Short'
    }
    return labels[type] || type
  }

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-purple-600 dark:text-purple-400 font-medium">Loading questions...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Questions Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View and manage all quiz questions across all subtopics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total</p>
          <p className="text-2xl font-bold gradient-text">{stats.total}</p>
        </div>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Enabled</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.enabled}</p>
        </div>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Disabled</p>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.disabled}</p>
        </div>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Easy</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.easy}</p>
        </div>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Medium</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.medium}</p>
        </div>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Hard</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.hard}</p>
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
            placeholder="Search by question prompt..."
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

      {/* Filter Tabs */}
      <div className="mb-6 space-y-4">
        {/* Subtopic Filter */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setSubtopicFilter('all')}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              subtopicFilter === 'all'
                ? 'gradient-bg text-white shadow-lg'
                : 'bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-purple-200/30 dark:border-purple-800/30 hover:border-purple-400'
            }`}
          >
            All Subtopics
          </button>
          {subtopics.map(subtopic => (
            <button
              key={subtopic.key}
              onClick={() => setSubtopicFilter(subtopic.key)}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                subtopicFilter === subtopic.key
                  ? 'gradient-bg text-white shadow-lg'
                  : 'bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-purple-200/30 dark:border-purple-800/30 hover:border-purple-400'
              }`}
            >
              {subtopic.name}
            </button>
          ))}
        </div>

        {/* Other Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-purple-200/30 dark:border-purple-800/30 text-gray-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Difficulties</option>
            <option value="E">Easy</option>
            <option value="M">Medium</option>
            <option value="H">Hard</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-purple-200/30 dark:border-purple-800/30 text-gray-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Types</option>
            <option value="mcq">Multiple Choice</option>
            <option value="short">Short Answer</option>
            <option value="code">Code</option>
            <option value="image_mcq">Image MCQ</option>
            <option value="image_short">Image Short</option>
          </select>

          <select
            value={enabledFilter}
            onChange={(e) => setEnabledFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-purple-200/30 dark:border-purple-800/30 text-gray-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Status</option>
            <option value="enabled">Enabled Only</option>
            <option value="disabled">Disabled Only</option>
          </select>
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-200/30 dark:border-purple-800/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-700 border-b border-purple-200/30 dark:border-purple-800/30">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Subtopic
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Difficulty
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Prompt
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-100 dark:divide-gray-700">
              {filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No questions found matching your filters
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((question) => (
                  <tr
                    key={question.id}
                    className="hover:bg-purple-50/50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                        #{question.id}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {question.subtopics?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          question.difficulty === 'E'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                            : question.difficulty === 'M'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}
                      >
                        {getDifficultyLabel(question.difficulty)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {getTypeLabel(question.qtype)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {truncateText(question.prompt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          question.enabled
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {question.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* View button - icon only */}
                      <button
                        onClick={() => setSelectedQuestion(question)}
                        className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                        title="View question details"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Question Detail Modal */}
      {selectedQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Question #{selectedQuestion.id}
                </h3>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                    {selectedQuestion.subtopics?.name}
                  </span>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedQuestion.difficulty === 'E'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                        : selectedQuestion.difficulty === 'M'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    }`}
                  >
                    {getDifficultyLabel(selectedQuestion.difficulty)}
                  </span>
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {getTypeLabel(selectedQuestion.qtype)}
                  </span>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedQuestion.enabled
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {selectedQuestion.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedQuestion(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl flex-shrink-0 ml-4"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-6 space-y-4 flex-1">
              {/* Prompt */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Prompt
                </label>
                <textarea
                  readOnly
                  value={selectedQuestion.prompt}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white resize-none focus:outline-none"
                />
              </div>

              {/* Options (for MCQ) */}
              {selectedQuestion.options && selectedQuestion.options.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Options ({selectedQuestion.options.length})
                  </label>
                  <div className="space-y-2">
                    {selectedQuestion.options.map((option: any, idx: number) => (
                      <input
                        key={idx}
                        readOnly
                        value={`${idx + 1}. ${option}`}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Answer Key */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Answer Key
                </label>
                <input
                  readOnly
                  value={JSON.stringify(selectedQuestion.answer_key)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Hints */}
              {selectedQuestion.hints && selectedQuestion.hints.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Hints ({selectedQuestion.hints.length})
                  </label>
                  <div className="space-y-2">
                    {selectedQuestion.hints.map((hint: string, idx: number) => (
                      <input
                        key={idx}
                        readOnly
                        value={`${idx + 1}. ${hint}`}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Explanation */}
              {selectedQuestion.explanation && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Explanation
                  </label>
                  <textarea
                    readOnly
                    value={selectedQuestion.explanation}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white resize-none focus:outline-none"
                  />
                </div>
              )}

              {/* Example */}
              {selectedQuestion.example && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Example
                  </label>
                  <textarea
                    readOnly
                    value={selectedQuestion.example}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white resize-none focus:outline-none"
                  />
                </div>
              )}

              {/* Question Image */}
              {selectedQuestion.image_url && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Question Image
                  </label>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 p-2">
                    <img
                      src={selectedQuestion.image_url}
                      alt="Question"
                      className="rounded max-w-full h-auto"
                    />
                  </div>
                </div>
              )}

              {/* Example Image */}
              {selectedQuestion.example_image_url && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Example Image
                  </label>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 p-2">
                    <img
                      src={selectedQuestion.example_image_url}
                      alt="Example"
                      className="rounded max-w-full h-auto"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
