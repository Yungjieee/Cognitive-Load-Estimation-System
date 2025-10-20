"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { DatabaseClient } from "@/lib/database";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function calculateSessionDuration(startedAt: string, endedAt: string): string {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffSecs = Math.floor((diffMs % 60000) / 1000);
  return `${diffMins}m ${diffSecs}s`;
}

function generateTimelineSentences(report: any): string[] {
  const sentences: string[] = [];
  
  // Session start
  const startTime = new Date(report.startedAt).toLocaleTimeString();
  sentences.push(`User started session at ${startTime}.`);
  
  // Use both session data and event data for comprehensive analysis
  // Ensure we have stats for all 5 questions, even if some were skipped
  const questionStats = Array.from({ length: 5 }, (_, index) => {
    const response = report.responses.find((r: any) => r.q_index === index + 1);
    return {
      hintsOpened: response?.hints_used || 0,
      extraTimeRequests: response?.extra_time_used ? 1 : 0,
      timeWarnings: 0,
      wasSkipped: response?.metrics?.skipped || false,
      wasCorrect: response?.correct || false,
      timeSpent: response?.time_ms || 0,
      exampleUsed: response?.metrics?.examplePenalty > 0 || false
    };
  });
  
  // Analyze events for additional insights
  report.events.forEach((event: any) => {
    if (event.etype === 'ten_second_warning' && event.payload?.questionIndex !== undefined) {
      const questionIndex = event.payload.questionIndex;
      if (questionIndex >= 0 && questionIndex < report.responses.length) {
        questionStats[questionIndex].timeWarnings++;
      }
    }
    if (event.etype === 'choose_skip' && event.payload?.questionIndex !== undefined) {
      const questionIndex = event.payload.questionIndex;
      if (questionIndex >= 0 && questionIndex < report.responses.length) {
        questionStats[questionIndex].wasSkipped = true;
      }
    }
  });
  
  // Per question analysis - iterate over all 5 questions
  questionStats.forEach((stats: any, index: number) => {
    const questionNum = index + 1;
    const response = report.responses.find((r: any) => r.q_index === questionNum);
    
    // Determine cognitive load level (simplified for now)
    let loadLevel = "low";
    if (response?.time_ms && response.time_ms > 120000) loadLevel = "high"; // > 2 minutes
    else if (response?.time_ms && response.time_ms > 60000) loadLevel = "medium"; // > 1 minute
    
    // Build enhanced sentence based on user actions
    let sentence = `In Q${questionNum}, the user`;
    
    // Handle skipped questions first
    if (stats.wasSkipped) {
      const actions = [];
      if (stats.hintsOpened > 0) {
        actions.push(`opened ${stats.hintsOpened} hint${stats.hintsOpened !== 1 ? 's' : ''}`);
      }
      if (stats.exampleUsed) {
        actions.push('used the example');
      }
      if (stats.extraTimeRequests > 0) {
        actions.push(`requested extra time ${stats.extraTimeRequests} time${stats.extraTimeRequests !== 1 ? 's' : ''}`);
      }
      
      if (actions.length > 0) {
        sentence += ` ${actions.join(', ')}, and then skipped the question`;
      } else {
        sentence += ` skipped the question`;
      }
    } else {
      // Handle answered questions
      const actions = [];
      
      // Describe the answer behavior
      if (stats.timeSpent < 30000) { // Less than 30 seconds
        if (stats.wasCorrect) {
          actions.push('quickly selected the correct answer');
        } else {
          actions.push('quickly submitted an answer');
        }
      } else if (stats.wasCorrect) {
        actions.push('answered correctly');
      } else {
        actions.push('submitted an answer');
      }
      
      // Add support actions
      if (stats.hintsOpened > 0) {
        actions.push(`opened ${stats.hintsOpened} hint${stats.hintsOpened !== 1 ? 's' : ''}`);
      }
      if (stats.exampleUsed) {
        actions.push('used the example');
      }
      if (stats.extraTimeRequests > 0) {
        actions.push(`requested extra time ${stats.extraTimeRequests} time${stats.extraTimeRequests !== 1 ? 's' : ''}`);
      }
      
      if (actions.length > 1) {
        sentence += ` ${actions.join(', ')}`;
      } else {
        sentence += ` ${actions[0]}`;
      }
    }
    
    sentence += `, and the cognitive load was ${loadLevel}.`;
    
    sentences.push(sentence);
  });
  
  // Session end
  const endTime = new Date(report.endedAt).toLocaleTimeString();
  sentences.push(`User finished session at ${endTime}.`);
  
  return sentences;
}

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      try {
        const sessionData = await DatabaseClient.getSessionWithDetails(reportId);
        
        if (sessionData) {
          const { session, responses, events, subtopic } = sessionData;
          
          setReport({
            id: String(session.id),
            date: formatDate(session.started_at),
            startedAt: session.started_at,
            endedAt: session.ended_at || session.started_at,
            subtopic: subtopic?.name || 'Unknown',
            mode: session.mode,
            score: session.score_total || 0,
            totalTime: calculateSessionDuration(session.started_at, session.ended_at || session.started_at),
            avgLoad: 0.5, // TODO: Calculate from responses
            responses: responses,
            events: events,
          });
        } else {
          // No session data found
        }
      } catch (error) {
        console.error('Failed to load report:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadReport();
  }, [reportId]);


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
            <h1 className="text-2xl font-semibold mb-4">Loading Report...</h1>
            <p className="text-gray-600 dark:text-gray-300">Please wait while we fetch your session data.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📊</span>
            </div>
            <h1 className="text-2xl font-semibold mb-4">Report not found</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              The requested session report could not be found.
            </p>
            <a href="/home" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-primary text-white font-semibold hover:shadow-lg transition-all duration-300">
              <span>🏠</span>
              Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  function handleDownloadPDF() {
    setLoading(true);
    // Placeholder: simulate PDF generation
    setTimeout(() => {
      setLoading(false);
      alert("PDF download started (placeholder)");
    }, 1000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-4 mb-6">
            <a href="/home" className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 font-medium">
              ← Back to Home
            </a>
            <a href="/reports" className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 font-medium">
              📊 All Reports
            </a>
          </div>
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">📊</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Session Report</h1>
            <p className="text-gray-600 dark:text-gray-300">
              {report.date} • {report.subtopic} • {report.mode === "support" ? "Support" : "No-Support"} Mode
            </p>
          </div>
        </div>

        {/* Overview Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <span className="text-white font-bold text-sm">📈</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Overview</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <div className="text-3xl font-bold gradient-text">Score {report.score}/10</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Score</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              <div className="text-3xl font-bold gradient-text">{report.totalTime}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Time</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-50 to-purple-50 dark:from-green-900/20 dark:to-purple-900/20">
              <div className="text-3xl font-bold gradient-text">{Math.round(report.avgLoad * 100)}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Avg Load</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-50 to-purple-50 dark:from-orange-900/20 dark:to-purple-900/20">
              <div className="text-3xl font-bold gradient-text">{report.mode === "support" ? "Support" : "No-Support"}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Mode</div>
            </div>
          </div>
        </div>

        {/* Chart 1: Overall Load per Question */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <span className="text-white font-bold text-sm">📊</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Overall Load per Question</h2>
          </div>
          <div className="h-64 flex items-end gap-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl">
            {Array.from({ length: 5 }, (_, index) => {
              const response = report.responses.find((r: any) => r.q_index === index + 1);
              // Calculate load based on time and correctness
              const timeLoad = response?.time_ms ? Math.min(response.time_ms / 120000, 1) : 0.5; // Normalize to 2 minutes
              const correctnessLoad = response?.correct ? 0.3 : 0.8;
              const totalLoad = (timeLoad + correctnessLoad) / 2;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-full rounded-t-xl transition-all duration-300 ${
                      totalLoad > 0.6 ? 'bg-gradient-to-t from-red-500 to-red-400' : 
                      totalLoad > 0.4 ? 'bg-gradient-to-t from-yellow-500 to-yellow-400' : 
                      'bg-gradient-to-t from-green-500 to-green-400'
                    }`}
                    style={{ height: `${totalLoad * 200}px` }}
                  />
                  <div className="text-xs mt-3 text-center">
                    <div className="font-semibold text-gray-900 dark:text-white">Q{index + 1}</div>
                    <div className="text-gray-600 dark:text-gray-400">{Math.round(totalLoad * 100)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Three-Load Breakdown */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <span className="text-white font-bold text-sm">📋</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Load Breakdown per Question</h2>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }, (_, index) => {
              const response = report.responses.find((r: any) => r.q_index === index + 1);
              // Simplified load breakdown based on response data
              const intrinsic = response?.correct ? 0.4 : 0.2; // Base difficulty
              const extraneous = (response?.hints_used || 0) * 0.15 + (response?.extra_time_used ? 0.2 : 0); // Penalties
              const germane = response?.correct ? 0.4 : 0.1; // Learning
              
              return (
                <div key={index} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                  <div className="w-12 text-sm font-semibold text-gray-900 dark:text-white">Q{index + 1}</div>
                  <div className="flex-1 flex gap-1 h-8 rounded-lg overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-400"
                      style={{ width: `${intrinsic * 100}%` }}
                      title={`Intrinsic: ${Math.round(intrinsic * 100)}%`}
                    />
                    <div
                      className="bg-gradient-to-r from-red-500 to-red-400"
                      style={{ width: `${extraneous * 100}%` }}
                      title={`Extraneous: ${Math.round(extraneous * 100)}%`}
                    />
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-400"
                      style={{ width: `${germane * 100}%` }}
                      title={`Germane: ${Math.round(germane * 100)}%`}
                    />
                  </div>
                  <div className="text-lg w-16 text-right">
                    {response?.correct ? "✓" : "✗"}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-blue-400 rounded"></div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Intrinsic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-red-400 rounded"></div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Extraneous</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-green-400 rounded"></div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Germane</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <span className="text-white font-bold text-sm">⏰</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Session Timeline</h2>
          </div>
          <div className="space-y-4">
            {generateTimelineSentences(report).map((sentence: string, index: number) => (
              <div key={index} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div className="text-sm text-gray-900 dark:text-white leading-relaxed">{sentence}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Narrative Insights */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <span className="text-white font-bold text-sm">💡</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Insights</h2>
          </div>
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
            <p className="leading-relaxed">
              Your cognitive load was moderate overall (42%). Questions 3 and 5 showed higher load levels,
              suggesting these topics may need more practice.
            </p>
            <p className="leading-relaxed">
              {report.mode === "support" && "You used hints effectively, which helped maintain engagement without over-reliance."}
              {report.mode === "no_support" && "Working independently showed good self-regulation skills."}
            </p>
            <p className="leading-relaxed">
              Consider revisiting array traversal concepts and time complexity analysis to strengthen your foundation.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleDownloadPDF}
            disabled={loading}
            className="flex-1 rounded-xl px-6 py-3 btn-primary text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Generating...
              </div>
            ) : (
              "Download PDF"
            )}
          </button>
          <a href="/reports" className="px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 font-medium">
            📊 All Reports
          </a>
          <a href="/home" className="px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 font-medium">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}


