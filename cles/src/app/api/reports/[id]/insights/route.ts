import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DatabaseClient } from '@/lib/database';

// Helper function to calculate session duration
function calculateSessionDuration(startedAt: string, endedAt: string): string {
  const diffMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffSecs = Math.floor((diffMs % 60000) / 1000);
  return `${diffMins}m ${diffSecs}s`;
}

// Build comprehensive prompt for Gemini
function buildGeminiPrompt(
  report: any,
  cognitiveLoadSummary: any,
  nasaTlxSystem: any[],
  nasaTlxUser: any
): string {
  // Calculate behavioral statistics
  const totalHints = report.responses.reduce((sum: number, r: any) =>
    sum + (r.hints_used || 0), 0);
  const examplesOpened = report.responses.filter((r: any) =>
    (r.metrics?.examplePenalty || 0) > 0).length;
  const extraTimeRequests = report.responses.filter((r: any) =>
    r.extra_time_used).length;
  const questionsSkipped = report.responses.filter((r: any) =>
    r.metrics?.skipped === true).length;
  const correctAnswers = report.responses.filter((r: any) =>
    r.correct === true).length;
  const incorrectAnswers = report.responses.filter((r: any) =>
    r.correct === false && r.metrics?.skipped !== true).length;
  const lowAttentionCount = report.responses.filter((r: any) =>
    (r.attention_rate || 0) < 50).length;
  const highStressCount = report.responses.filter((r: any) =>
    r.metrics?.hrv === 'low').length;

  return `You are an educational psychology expert analyzing a student's cognitive load during a learning session on ${report.subtopic}.

## Session Overview
- Subject: ${report.subtopic}
- Mode: ${report.mode === 'support' ? 'With Learning Support' : 'No Support Mode'}
- Total Questions: 5
- Final Score: ${report.score}/10.0
- Session Duration: ${report.totalTime}

## Cognitive Load Analysis

### Overall Cognitive Load (0-20 scale)
- System Measured: ${(cognitiveLoadSummary?.sys_cognitive_load || 0).toFixed(1)}/20 (${Math.round(((cognitiveLoadSummary?.sys_cognitive_load || 0) / 20) * 100)}%)
- User Self-Reported: ${nasaTlxUser?.cognitive_load ? nasaTlxUser.cognitive_load.toFixed(1) + '/20 (' + Math.round((nasaTlxUser.cognitive_load / 20) * 100) + '%)' : 'Not completed'}

### NASA-TLX Dimensions Breakdown (System vs User)
1. Mental Demand: ${(cognitiveLoadSummary?.sys_mental_demand || 0).toFixed(1)} vs ${nasaTlxUser?.mental_demand?.toFixed(1) || 'N/A'}
2. Physical Demand: ${(cognitiveLoadSummary?.sys_physical_demand || 0).toFixed(1)} vs ${nasaTlxUser?.physical_demand?.toFixed(1) || 'N/A'}
3. Temporal Demand: ${(cognitiveLoadSummary?.sys_temporal_demand || 0).toFixed(1)} vs ${nasaTlxUser?.temporal_demand?.toFixed(1) || 'N/A'}
4. Performance: ${(cognitiveLoadSummary?.sys_performance || 0).toFixed(1)} vs ${nasaTlxUser?.performance?.toFixed(1) || 'N/A'}
5. Effort: ${(cognitiveLoadSummary?.sys_effort || 0).toFixed(1)} vs ${nasaTlxUser?.effort?.toFixed(1) || 'N/A'}
6. Frustration: ${(cognitiveLoadSummary?.sys_frustration || 0).toFixed(1)} vs ${nasaTlxUser?.frustration?.toFixed(1) || 'N/A'}

## Performance Summary
- ✓ Correct Answers: ${correctAnswers}/5
- ✗ Incorrect Answers: ${incorrectAnswers}/5
- ⊘ Questions Skipped: ${questionsSkipped}/5

## Learning Behaviors
- Total Hints Used: ${totalHints}
- Examples Opened: ${examplesOpened} questions
- Extra Time Requested: ${extraTimeRequests} questions
- Low Attention (<50%): ${lowAttentionCount} questions
- High Stress (Low HRV): ${highStressCount} questions

## Per-Question Details
${nasaTlxSystem.map((q: any) => {
  const response = report.responses.find((r: any) => r.q_index === q.q_index);
  return `
Question ${q.q_index}:
- Cognitive Load: ${q.cognitive_load.toFixed(1)}/20 (${Math.round((q.cognitive_load / 20) * 100)}%)
- Result: ${response?.metrics?.skipped ? 'Skipped' : response?.correct ? 'Correct ✓' : 'Incorrect ✗'}
- Support Used: ${response?.hints_used || 0} hints, ${(response?.metrics?.examplePenalty || 0) > 0 ? 'Example shown' : 'No example'}, ${response?.extra_time_used ? 'Extra time' : 'Normal time'}
- Attention Rate: ${response?.attention_rate ? Math.round(response.attention_rate) + '%' : 'N/A'}
- Stress Level: ${response?.metrics?.hrv ? (response.metrics.hrv === 'high' ? 'Low stress (High HRV)' : 'High stress (Low HRV)') : 'N/A'}
`;
}).join('')}

## Your Task
Provide concise, actionable insights in the following format. Be brief and specific.

### Performance Summary
- 2 bullet points max: Key performance takeaway and cognitive load observation

### Key Patterns
- 2 bullet points max: Most notable patterns in behavior, attention, or stress

### What Worked Well
- 2 bullet points max: Strengths demonstrated

### What to Improve
- 2 bullet points max: Specific areas needing attention

### Action Items
- 3 bullet points max: Concrete, actionable study tips

## Critical Guidelines:
- MAXIMUM 300 words total
- Each bullet point: 1 sentence only
- No explanatory paragraphs
- Use simple, direct language
- Reference specific question numbers when relevant
- Focus on actionable insights only
- CRITICAL: For Performance dimension, LOWER values mean BETTER performance, HIGHER values mean worse performance
- For other dimensions (Mental, Physical, Temporal, Effort, Frustration), higher values mean more difficulty/workload
`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = id;

  try {
    // Step 1: Check for cached insights
    const cachedInsights = await DatabaseClient.getReportInsights(sessionId);

    if (cachedInsights) {
      // Return cached insights immediately
      return Response.json({
        insights: cachedInsights.insights_text,
        cached: true,
        generatedAt: cachedInsights.created_at
      });
    }

    // Step 2: Cache miss - fetch all report data
    const sessionData = await DatabaseClient.getSessionWithDetails(sessionId);

    if (!sessionData) {
      return Response.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const { session, responses, subtopic } = sessionData;

    // Fetch cognitive load data
    const cognitiveLoadSummary = await DatabaseClient.getSessionCognitiveLoadSummary(sessionId);
    const nasaTlxSystem = await DatabaseClient.getSessionNasaTlxSystem(sessionId);
    const nasaTlxUser = await DatabaseClient.getSessionNasaTlxUser(sessionId);

    // Build report object (same structure as in page.tsx)
    const report = {
      id: String(session.id),
      subtopic: subtopic?.name || 'Unknown',
      mode: session.mode,
      score: session.score_total || 0,
      totalTime: calculateSessionDuration(session.started_at, session.ended_at || session.started_at),
      responses: responses
    };

    // // Step 3: Build prompt for Gemini
    // // Debug: Log the data being sent to Gemini
    // console.log('=== Data being sent to Gemini ===');
    // console.log('cognitiveLoadSummary:', cognitiveLoadSummary);
    // console.log('nasaTlxSystem:', nasaTlxSystem);
    // console.log('nasaTlxUser:', nasaTlxUser);
    // console.log('report.responses:', report.responses);
    // console.log('================================');

    const prompt = buildGeminiPrompt(report, cognitiveLoadSummary, nasaTlxSystem, nasaTlxUser);

    // // Debug: Log the actual prompt being sent
    // console.log('=== Prompt being sent to Gemini ===');
    // console.log(prompt);
    // console.log('===================================');

    // Step 4: Call Gemini API
    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(prompt);
    const insightsText = result.response.text();

    // Step 5: Save to database for future requests
    await DatabaseClient.saveReportInsights(sessionId, insightsText);

    // Step 6: Return fresh insights
    return Response.json({
      insights: insightsText,
      cached: false,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    return Response.json(
      {
        error: 'Failed to generate insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
