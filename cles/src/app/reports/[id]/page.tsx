"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSessions, formatDate, calculateSessionDuration } from "@/lib/storage";

function generateTimelineSentences(report: any): string[] {
  const sentences: string[] = [];
  
  // Session start
  const startTime = new Date(report.startedAt).toLocaleTimeString();
  sentences.push(`User started session at ${startTime}.`);
  
  // Use both session data and event data for comprehensive analysis
  const questionStats = Array.from({ length: 5 }, (_, index) => ({
    hintsOpened: report.hintsUsed?.[index] || 0,
    extraTimeRequests: report.extraTimeUsed?.[index] ? 1 : 0,
    timeWarnings: 0,
    wasSkipped: false
  }));
  
  // Analyze events for additional insights
  report.events.forEach((event: any) => {
    if (event.type === 'ten_second_warning' && event.questionIndex !== undefined) {
      if (event.questionIndex >= 0 && event.questionIndex < 5) {
        questionStats[event.questionIndex].timeWarnings++;
      }
    }
    if (event.type === 'choose_skip' && event.questionIndex !== undefined) {
      if (event.questionIndex >= 0 && event.questionIndex < 5) {
        questionStats[event.questionIndex].wasSkipped = true;
      }
    }
  });
  
  // Fallback: detect skipped questions based on question data
  report.questions.slice(0, 5).forEach((question: any, index: number) => {
    // If question was not answered correctly and has very low time spent, it might be skipped
    if (!question.correct && question.timeSpent < 5) {
      questionStats[index].wasSkipped = true;
    }
  });
  
  // Per question analysis
  report.questions.slice(0, 5).forEach((question: any, index: number) => {
    const questionNum = index + 1;
    const stats = questionStats[index];
    
    // Determine cognitive load level
    let loadLevel = "low";
    if (question.load > 0.6) loadLevel = "high";
    else if (question.load > 0.4) loadLevel = "medium";
    
    // Build sentence
    let sentence = `In Q${questionNum}, the user`;
    
    // Show hints opened (even if question was skipped)
    if (stats.hintsOpened > 0) {
      sentence += ` opened ${stats.hintsOpened} hint${stats.hintsOpened !== 1 ? 's' : ''}`;
    }
    
    // Show extra time requests (even if question was skipped)
    if (stats.extraTimeRequests > 0) {
      if (stats.hintsOpened > 0) {
        sentence += `, requested extra time ${stats.extraTimeRequests} time${stats.extraTimeRequests !== 1 ? 's' : ''}`;
      } else {
        sentence += ` requested extra time ${stats.extraTimeRequests} time${stats.extraTimeRequests !== 1 ? 's' : ''}`;
      }
    }
    
    // Show time warnings (even if question was skipped)
    if (stats.timeWarnings > 0) {
      if (stats.hintsOpened > 0 || stats.extraTimeRequests > 0) {
        sentence += `, had ${stats.timeWarnings} time warning${stats.timeWarnings !== 1 ? 's' : ''}`;
      } else {
        sentence += ` had ${stats.timeWarnings} time warning${stats.timeWarnings !== 1 ? 's' : ''}`;
      }
    }
    
    // Show skip status
    if (stats.wasSkipped) {
      if (stats.hintsOpened > 0 || stats.extraTimeRequests > 0 || stats.timeWarnings > 0) {
        sentence += `, and skipped the question`;
      } else {
        sentence += ` skipped the question`;
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sessions = getSessions();
    const session = sessions.find(s => s.id === reportId);
    
    if (session) {
      setReport({
        id: session.id,
        date: formatDate(session.startedAt),
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        subtopic: getSubtopicName(session.subtopicId),
        mode: session.mode,
        score: session.score,
        totalTime: calculateSessionDuration(session.startedAt, session.endedAt),
        avgLoad: session.avgLoad,
        questions: session.questions,
        events: session.events,
        hintsUsed: session.hintsUsed || [],
        extraTimeUsed: session.extraTimeUsed || [],
      });
    }
  }, [reportId]);

  function getSubtopicName(subtopicId: string): string {
    const subtopics: Record<string, string> = {
      'array': 'Array',
      'linked-list': 'Linked List',
      'stack': 'Stack',
      'queue': 'Queue',
      'tree': 'Tree',
      'sorting': 'Sorting',
    };
    return subtopics[subtopicId] || 'Unknown';
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Report not found</h1>
        <a href="/home" className="mt-4 text-sm underline underline-offset-4">Back to Home</a>
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
            {report.questions.slice(0, 5).map((q: any, index: number) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full rounded-t-xl transition-all duration-300 ${
                    q.load > 0.6 ? 'bg-gradient-to-t from-red-500 to-red-400' : 
                    q.load > 0.4 ? 'bg-gradient-to-t from-yellow-500 to-yellow-400' : 
                    'bg-gradient-to-t from-green-500 to-green-400'
                  }`}
                  style={{ height: `${q.load * 200}px` }}
                />
                <div className="text-xs mt-3 text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">Q{index + 1}</div>
                  <div className="text-gray-600 dark:text-gray-400">{Math.round(q.load * 100)}%</div>
                </div>
              </div>
            ))}
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
            {report.questions.slice(0, 5).map((q: any, index: number) => (
              <div key={index} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div className="w-12 text-sm font-semibold text-gray-900 dark:text-white">Q{index + 1}</div>
                <div className="flex-1 flex gap-1 h-8 rounded-lg overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-400"
                    style={{ width: `${q.intrinsic * 100}%` }}
                    title={`Intrinsic: ${Math.round(q.intrinsic * 100)}%`}
                  />
                  <div
                    className="bg-gradient-to-r from-red-500 to-red-400"
                    style={{ width: `${q.extraneous * 100}%` }}
                    title={`Extraneous: ${Math.round(q.extraneous * 100)}%`}
                  />
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-400"
                    style={{ width: `${q.germane * 100}%` }}
                    title={`Germane: ${Math.round(q.germane * 100)}%`}
                  />
                </div>
                <div className="text-lg w-16 text-right">
                  {q.correct ? "✓" : "✗"}
                </div>
              </div>
            ))}
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
          <a href="/home" className="px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 font-medium">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}

