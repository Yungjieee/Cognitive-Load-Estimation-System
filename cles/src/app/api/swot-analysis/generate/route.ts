import { NextRequest } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { DatabaseClient } from '@/lib/database'

/**
 * POST /api/swot-analysis/generate
 * Body: { userId: "xxx" }
 *
 * Generates or regenerates SWOT analysis using Gemini AI
 * Upserts the result to database (INSERT if new, UPDATE if exists)
 */
export async function POST(request: NextRequest) {
  try {
    // Get userId from request body
    const body = await request.json()
    const userId = body.userId

    if (!userId) {
      return Response.json({ error: 'User ID required' }, { status: 400 })
    }

    // Verify all topics completed
    const { completed } = await DatabaseClient.hasCompletedAllSubtopics(userId)
    if (!completed) {
      return Response.json({ error: 'Not all topics completed' }, { status: 400 })
    }

    // Get aggregated data
    const radarData = await DatabaseClient.getAggregatedNasaTlxData(userId)
    const avgScoreArray = await DatabaseClient.getSubtopicAverageScore(userId, 'array')
    const avgScoreLinkedList = await DatabaseClient.getSubtopicAverageScore(userId, 'linked_list')
    const avgScoreStack = await DatabaseClient.getSubtopicAverageScore(userId, 'stack')

    // Count total sessions
    const { counts } = await DatabaseClient.hasCompletedAllSubtopics(userId)
    const totalSessions = counts.array + counts.linkedList + counts.stack

    // Build Gemini prompt
    const prompt = `You are an educational psychologist analyzing a student's comprehensive learning journey across three Data Structure topics: Arrays, Linked Lists, and Stacks.

## Student Performance Data:

### Arrays:
- Sessions completed: ${counts.array}
- Average score: ${avgScoreArray}/10
- Average Mental Demand: ${radarData.array.mental}/21
- Average Physical Demand: ${radarData.array.physical}/21
- Average Temporal Demand: ${radarData.array.temporal}/21
- Average Performance: ${radarData.array.performance}/21
- Average Effort: ${radarData.array.effort}/21
- Average Frustration: ${radarData.array.frustration}/21
- Average Overall Cognitive Load: ${radarData.array.cognitiveLoad}/21

### Linked Lists:
- Sessions completed: ${counts.linkedList}
- Average score: ${avgScoreLinkedList}/10
- Average Mental Demand: ${radarData.linkedList.mental}/21
- Average Physical Demand: ${radarData.linkedList.physical}/21
- Average Temporal Demand: ${radarData.linkedList.temporal}/21
- Average Performance: ${radarData.linkedList.performance}/21
- Average Effort: ${radarData.linkedList.effort}/21
- Average Frustration: ${radarData.linkedList.frustration}/21
- Average Overall Cognitive Load: ${radarData.linkedList.cognitiveLoad}/21

### Stacks:
- Sessions completed: ${counts.stack}
- Average score: ${avgScoreStack}/10
- Average Mental Demand: ${radarData.stack.mental}/21
- Average Physical Demand: ${radarData.stack.physical}/21
- Average Temporal Demand: ${radarData.stack.temporal}/21
- Average Performance: ${radarData.stack.performance}/21
- Average Effort: ${radarData.stack.effort}/21
- Average Frustration: ${radarData.stack.frustration}/21
- Average Overall Cognitive Load: ${radarData.stack.cognitiveLoad}/21

## Task:
Provide a comprehensive SWOT analysis in markdown format. Each section should have EXACTLY 4 SHORT, CONCISE bullet points.

### STRENGTHS
[4 bullet points with specific strengths, referencing topics and dimensions- each ONE SHORT SENTENCE only]


### WEAKNESSES
[4 bullet points with specific weaknesses, with actionable context- each ONE SHORT SENTENCE only]

### OPPORTUNITIES
[4 bullet points withopportunities for growth and learning strategies]


### THREATS
[4 bullet points with potential challenges or risks to learning success - each ONE SHORT SENTENCE only]


### RADAR CHART EXPLANATION
[Analyze the radar chart data above and provide 5-6 bullet points explaining what the student can observe:
- Compare the three colored areas (Array in purple, Linked List in pink, Stack in green)
- Point out which topic has the largest/smallest area and what that means
- Explain patterns like "Array has higher Mental Demand compared to Stack" with actual values
- CRITICAL: For Performance dimension, LOWER values mean BETTER performance (closer to center = more perfect), HIGHER values mean worse performance
- For other dimensions (Mental, Physical, Temporal, Effort, Frustration), higher values mean more difficulty/workload
- Use observations from the actual data (e.g., "Stack shows lowest Frustration at ${radarData.stack.frustration}/21")
- Keep each bullet SHORT and student-friendly 
- Help students understand what the visible patterns in THEIR chart indicate about their learning experience]


## CRITICAL FORMAT RULES:
- Each bullet point must be ONE SHORT SENTENCE 
- NO sub-bullets or nested points
- NO bold text or special formatting within bullet points
- Be direct and specific
- Reference specific topics (Arrays, Linked Lists, Stacks) in SWOT sections
- Use simple, clear, student-friendly language
- Be encourraging but honest
- Provide actionable insights
- For Performance dimension, LOWER values mean BETTER performance (closer to center = more perfect), HIGHER values mean worse performance
- For other dimensions (Mental, Physical, Temporal, Effort, Frustration), higher values mean more difficulty/workload
- Example: "High effort (19.38/21) in Arrays shows strong dedication to learning."
`;

    // Call Gemini
    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent(prompt)
    const fullText = result.response.text()

    // Parse SWOT sections (keep as markdown for client-side parsing)
    const parseSection = (sectionName: string): string => {
      const regex = new RegExp(`###\\s*${sectionName}\\s*\\n([\\s\\S]*?)(?=###|$)`, 'i')
      const match = fullText.match(regex)
      if (match) {
        return match[1].trim()
      }
      return ''
    }

    const strengths = parseSection('STRENGTHS')
    const weaknesses = parseSection('WEAKNESSES')
    const opportunities = parseSection('OPPORTUNITIES')
    const threats = parseSection('THREATS')
    const radarExplanation = parseSection('RADAR CHART EXPLANATION')

    // Validate that all sections were parsed
    if (!strengths || !weaknesses || !opportunities || !threats || !radarExplanation) {
      console.error('Failed to parse SWOT sections from Gemini response')
      return Response.json(
        { error: 'Failed to parse SWOT analysis from AI response' },
        { status: 500 }
      )
    }

    // Upsert to database
    await DatabaseClient.upsertSWOTAnalysis({
      user_id: userId,
      swot_strengths: strengths,
      swot_weaknesses: weaknesses,
      swot_opportunities: opportunities,
      swot_threats: threats,
      radar_explanation: radarExplanation,
      radar_data: radarData,
      total_sessions_analyzed: totalSessions,
      avg_score_array: avgScoreArray,
      avg_score_linked_list: avgScoreLinkedList,
      avg_score_stack: avgScoreStack
    })

    return Response.json({
      status: 'success',
      message: 'SWOT analysis generated successfully'
    })

  } catch (error) {
    console.error('SWOT generation failed:', error)
    return Response.json(
      {
        error: 'Failed to generate SWOT',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
