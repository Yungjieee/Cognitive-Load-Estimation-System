import { NextRequest } from 'next/server'
import { DatabaseClient } from '@/lib/database'

/**
 * GET /api/swot-analysis?userId=xxx
 *
 * Returns one of three states:
 * 1. 'generated' - SWOT exists, return it
 * 2. 'locked' - Not all topics completed, show missing topics
 * 3. 'ready_to_generate' - All topics completed, ready to generate
 */
export async function GET(request: NextRequest) {
  try {
    // Get userId from query parameter
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return Response.json({ error: 'User ID required' }, { status: 400 })
    }

    // Check if SWOT exists
    const existingSwot = await DatabaseClient.getSWOTAnalysis(userId)

    if (existingSwot) {
      // Fetch current session counts for regenerate dialog
      const { counts } = await DatabaseClient.hasCompletedAllSubtopics(userId)
      return Response.json({
        status: 'generated',
        swot: existingSwot,
        counts
      })
    }

    // Check if all topics completed
    const { completed, missing, counts } = await DatabaseClient.hasCompletedAllSubtopics(userId)

    if (!completed) {
      return Response.json({
        status: 'locked',
        missing,
        counts
      })
    }

    // All topics completed but SWOT not generated yet
    return Response.json({
      status: 'ready_to_generate',
      counts
    })

  } catch (error) {
    console.error('SWOT fetch error:', error)
    return Response.json({ error: 'Failed to fetch SWOT status' }, { status: 500 })
  }
}
