'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Subtopic } from '@/lib/database'

export default function AdminSubtopicsPage() {
  const [subtopics, setSubtopics] = useState<Subtopic[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSubtopic, setEditingSubtopic] = useState<Subtopic | null>(null)
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    enabled: true
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSubtopics()
  }, [])

  const fetchSubtopics = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('subtopics')
        .select('*')
        .order('name')

      if (error) throw error
      setSubtopics(data || [])
    } catch (err) {
      console.error('Error fetching subtopics:', err)
      setError('Failed to load subtopics')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setFormData({
      key: '',
      name: '',
      description: '',
      enabled: true
    })
    setEditingSubtopic(null)
    setShowAddModal(true)
  }

  const handleEdit = (subtopic: Subtopic) => {
    setFormData({
      key: subtopic.key,
      name: subtopic.name,
      description: subtopic.description || '',
      enabled: subtopic.enabled
    })
    setEditingSubtopic(subtopic)
    setShowAddModal(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')

      // Validate
      if (!formData.key.trim() || !formData.name.trim()) {
        setError('Key and Name are required')
        return
      }

      if (editingSubtopic) {
        // Update
        const res = await fetch('/api/admin/subtopics', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingSubtopic.id,
            ...formData
          })
        })

        const data = await res.json()
        if (data.error) throw new Error(data.error)
      } else {
        // Create
        const res = await fetch('/api/admin/subtopics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })

        const data = await res.json()
        if (data.error) throw new Error(data.error)
      }

      // Refresh list
      await fetchSubtopics()
      setShowAddModal(false)
    } catch (err: any) {
      console.error('Error saving subtopic:', err)
      setError(err.message || 'Failed to save subtopic')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleEnabled = async (subtopic: Subtopic) => {
    try {
      const res = await fetch('/api/admin/subtopics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: subtopic.id,
          key: subtopic.key,
          name: subtopic.name,
          description: subtopic.description,
          enabled: !subtopic.enabled
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      await fetchSubtopics()
    } catch (err: any) {
      console.error('Error toggling subtopic:', err)
      setError(err.message || 'Failed to update subtopic')
    }
  }

  const handleDelete = async (subtopic: Subtopic) => {
    if (!confirm(`Are you sure you want to delete "${subtopic.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch('/api/admin/subtopics', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: subtopic.id })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      await fetchSubtopics()
    } catch (err: any) {
      console.error('Error deleting subtopic:', err)
      setError(err.message || 'Failed to delete subtopic')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-purple-600 dark:text-purple-400 font-medium">Loading subtopics...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subtopics Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage data structure topics and their settings
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="px-6 py-3 gradient-bg text-white rounded-2xl hover:opacity-90 font-medium shadow-lg"
        >
          + Add Subtopic
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
          <p className="text-red-800 dark:text-red-300 font-medium">Error:</p>
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Subtopics</p>
              <p className="text-3xl font-bold gradient-text">{subtopics.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
              <span className="text-white text-2xl">📚</span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Enabled</p>
              <p className="text-3xl font-bold gradient-text">
                {subtopics.filter(s => s.enabled).length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
              <span className="text-white text-2xl">✓</span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Disabled</p>
              <p className="text-3xl font-bold gradient-text">
                {subtopics.filter(s => !s.enabled).length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
              <span className="text-white text-2xl">⏸</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subtopics Table */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-200/30 dark:border-purple-800/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-700 border-b border-purple-200/30 dark:border-purple-800/30">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Key
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Description
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
              {subtopics.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No subtopics found. Click "Add Subtopic" to create one.
                  </td>
                </tr>
              ) : (
                subtopics.map((subtopic) => (
                  <tr
                    key={subtopic.id}
                    className="hover:bg-purple-50/50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                        {subtopic.key}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {subtopic.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {subtopic.description || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleEnabled(subtopic)}
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition-colors ${
                          subtopic.enabled
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {subtopic.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {/* Edit button - icon only */}
                        <button
                          onClick={() => handleEdit(subtopic)}
                          className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          title="Edit subtopic"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        {/* Delete button - icon only */}
                        <button
                          onClick={() => handleDelete(subtopic)}
                          className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          title="Delete subtopic"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {editingSubtopic ? 'Edit Subtopic' : 'Add New Subtopic'}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Key (unique identifier) *
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="e.g., array, linked_list"
                  disabled={!!editingSubtopic}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {editingSubtopic && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Key cannot be changed after creation
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name (display name) *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Array, Linked List"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this subtopic"
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="enabled" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Enabled (visible to users)
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setError('')
                }}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 gradient-bg text-white rounded-lg hover:opacity-90 font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingSubtopic ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
