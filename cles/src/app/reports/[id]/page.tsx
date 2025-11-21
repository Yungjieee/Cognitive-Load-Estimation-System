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

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<number[]>([]);

  useEffect(() => {
    async function loadReport() {
      try {
        const sessionData = await DatabaseClient.getSessionWithDetails(reportId);

        if (sessionData) {
          const { session, responses, subtopic } = sessionData;

          // Fetch cognitive load summary
          const cognitiveLoadSummary = await DatabaseClient.getSessionCognitiveLoadSummary(reportId);

          // Fetch NASA-TLX system data (per-question)
          const nasaTlxSystem = await DatabaseClient.getSessionNasaTlxSystem(reportId);

          // Fetch NASA-TLX user data
          const nasaTlxUser = await DatabaseClient.getSessionNasaTlxUser(reportId);

          setReport({
            id: String(session.id),
            date: formatDate(session.started_at),
            startedAt: session.started_at,
            endedAt: session.ended_at || session.started_at,
            subtopic: subtopic?.name || 'Unknown',
            mode: session.mode,
            score: session.score_total || 0,
            totalTime: calculateSessionDuration(session.started_at, session.ended_at || session.started_at),
            avgLoad: cognitiveLoadSummary?.sys_cognitive_load || 0,
            attentionRate: session.attention_rate || null,
            responses: responses,
            rmssdBaseline: session.rmssd_baseline || null,
            rmssdConfidence: session.rmssd_confidence || null,
            nasaTlxSystem: nasaTlxSystem || [],
            cognitiveLoadSummary: cognitiveLoadSummary || null,
            nasaTlxUser: nasaTlxUser || null,
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

  const toggleCard = (qIndex: number) => {
    setExpandedCards(prev =>
      prev.includes(qIndex)
        ? prev.filter(i => i !== qIndex)
        : [...prev, qIndex]
    );
  };

  const isExpanded = (qIndex: number) => expandedCards.includes(qIndex);

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
              <div className="text-3xl font-bold gradient-text">{report.score}/10</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Score</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              <div className="text-3xl font-bold gradient-text">{report.totalTime}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Time</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-50 to-purple-50 dark:from-green-900/20 dark:to-purple-900/20">
              <div className="text-3xl font-bold gradient-text">{Math.round((report.avgLoad / 21) * 100)}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Avg Cognitive Load</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-cyan-50 to-purple-50 dark:from-cyan-900/20 dark:to-purple-900/20">
              <div className="text-3xl font-bold gradient-text">
                {report.attentionRate !== null && report.attentionRate !== undefined ? `${Math.round(report.attentionRate)}%` : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Attention Rate</div>
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
          <div className="h-80 flex items-end gap-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl">
            {Array.from({ length: 5 }, (_, index) => {
              const response = report.responses.find((r: any) => r.q_index === index + 1);

              // Get cognitive load from NASA-TLX system data
              const tlxData = report.nasaTlxSystem?.find((n: any) => n.q_index === index + 1);
              const cogLoad = tlxData?.cognitive_load || 0; // 0-21 scale

              // Calculate percentage
              const loadPercentage = Math.round((cogLoad / 21) * 100);

              // Determine load level
              let loadLevel = 'N/A';
              if (cogLoad <= 7) loadLevel = 'Low';
              else if (cogLoad <= 14) loadLevel = 'Medium';
              else if (cogLoad <= 21) loadLevel = 'High';

              // Determine bar color based on load level
              const barColor = cogLoad <= 7 ? 'green' : cogLoad <= 14 ? 'yellow' : 'red';

              // Get HRV and convert to stress status
              const hrv = response?.hrv || response?.metrics?.hrv;
              let stressStatus = 'N/A';
              let stressColor = 'gray';
              if (hrv === 'high') {
                stressStatus = 'Low Stress';
                stressColor = 'green';
              } else if (hrv === 'low') {
                stressStatus = 'High Stress';
                stressColor = 'red';
              }

              // Get attention rate
              const attentionRate = response?.attention_rate;

              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-full rounded-t-xl transition-all duration-300 ${
                      barColor === 'red' ? 'bg-gradient-to-t from-red-500 to-red-400' :
                      barColor === 'yellow' ? 'bg-gradient-to-t from-yellow-500 to-yellow-400' :
                      'bg-gradient-to-t from-green-500 to-green-400'
                    }`}
                    style={{ height: `${(cogLoad / 21) * 150}px` }}
                  />
                  <div className="text-xs mt-3 text-center space-y-1">
                    {/* Question label */}
                    <div className="font-semibold text-gray-900 dark:text-white">Q{index + 1}</div>

                    {/* Percentage and Load level side by side */}
                    <div className="flex items-center justify-center gap-2">
                      <div className="text-gray-600 dark:text-gray-400">{loadPercentage}%</div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        loadLevel === 'Low' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        loadLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        loadLevel === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                      }`}>
                        {loadLevel}
                      </div>
                    </div>

                    {/* Stress status badge */}
                    <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                      stressColor === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                      stressColor === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                    }`}>
                      {stressStatus}
                    </div>

                    {/* Attention rate badge */}
                    <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                      attentionRate !== null && attentionRate !== undefined
                        ? attentionRate >= 70
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : attentionRate >= 50
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                    }`}>
                      {attentionRate !== null && attentionRate !== undefined
                        ? `ATT: ${Math.round(attentionRate)}%`
                        : 'ATT: N/A'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System vs User Comparison */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <span className="text-white font-bold text-sm">📊</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">System vs User Comparison</h2>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Chart A: Overall Cognitive Load - Horizontal Bars */}
            <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl">
              <h3 className="text-center font-semibold text-lg mb-8 text-gray-900 dark:text-white">Overall Cognitive Load</h3>

              <div className="space-y-6 max-w-4xl mx-auto">
                {/* System Row */}
                <div className="flex items-center gap-4">
                  <div className="w-20 text-sm font-semibold text-gray-700 dark:text-gray-300">System</div>
                  <div className="flex-1 relative group cursor-pointer">
                    {/* Tooltip */}
                    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-900/90 dark:bg-gray-700/90 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 shadow-lg">
                      <div className="font-semibold mb-1">System Cognitive Load</div>
                      <div>Value: {(report.cognitiveLoadSummary?.sys_cognitive_load || 0).toFixed(1)}/21</div>
                      <div>Percentage: {Math.round(((report.cognitiveLoadSummary?.sys_cognitive_load || 0) / 21) * 100)}%</div>
                      <div>Load Level: {(report.cognitiveLoadSummary?.sys_cognitive_load || 0) <= 7 ? 'Low' : (report.cognitiveLoadSummary?.sys_cognitive_load || 0) <= 14 ? 'Medium' : 'High'}</div>
                    </div>
                    {/* Horizontal bar */}
                    <div className="h-12 bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
                        style={{ width: `${((report.cognitiveLoadSummary?.sys_cognitive_load || 0) / 21) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                      {Math.round(((report.cognitiveLoadSummary?.sys_cognitive_load || 0) / 21) * 100)}%
                    </span>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      (report.cognitiveLoadSummary?.sys_cognitive_load || 0) <= 7
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : (report.cognitiveLoadSummary?.sys_cognitive_load || 0) <= 14
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {(report.cognitiveLoadSummary?.sys_cognitive_load || 0) <= 7 ? 'Low' : (report.cognitiveLoadSummary?.sys_cognitive_load || 0) <= 14 ? 'Medium' : 'High'}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {(report.cognitiveLoadSummary?.sys_cognitive_load || 0).toFixed(1)}/21
                    </span>
                  </div>
                </div>

                {/* User Row */}
                <div className="flex items-center gap-4">
                  <div className="w-20 text-sm font-semibold text-gray-700 dark:text-gray-300">User</div>
                  <div className="flex-1 relative group cursor-pointer">
                    {/* Tooltip */}
                    {report.nasaTlxUser?.cognitive_load && (
                      <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-900/90 dark:bg-gray-700/90 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 shadow-lg">
                        <div className="font-semibold mb-1">User Cognitive Load</div>
                        <div>Value: {report.nasaTlxUser.cognitive_load.toFixed(1)}/21</div>
                        <div>Percentage: {Math.round((report.nasaTlxUser.cognitive_load / 21) * 100)}%</div>
                        <div>Load Level: {report.nasaTlxUser.cognitive_load <= 7 ? 'Low' : report.nasaTlxUser.cognitive_load <= 14 ? 'Medium' : 'High'}</div>
                      </div>
                    )}
                    {/* Horizontal bar */}
                    <div className="h-12 bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden">
                      {report.nasaTlxUser?.cognitive_load ? (
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300"
                          style={{ width: `${(report.nasaTlxUser.cognitive_load / 21) * 100}%` }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                          Pending
                        </div>
                      )}
                    </div>
                  </div>
                  {report.nasaTlxUser?.cognitive_load ? (
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                        {Math.round((report.nasaTlxUser.cognitive_load / 21) * 100)}%
                      </span>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        report.nasaTlxUser.cognitive_load <= 7
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : report.nasaTlxUser.cognitive_load <= 14
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {report.nasaTlxUser.cognitive_load <= 7 ? 'Low' : report.nasaTlxUser.cognitive_load <= 14 ? 'Medium' : 'High'}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {report.nasaTlxUser.cognitive_load.toFixed(1)}/21
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <span className="text-sm text-gray-500 dark:text-gray-400">N/A</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chart B: 6 Dimensions Grouped Bar Chart */}
            <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl">
              <h3 className="text-center font-semibold text-lg mb-6 text-gray-900 dark:text-white">By Dimension</h3>

              {/* Legend */}
              <div className="flex items-center justify-center gap-8 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">System</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-orange-500 rounded"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">User</span>
                </div>
              </div>

              {/* Chart */}
              <div className="flex items-end justify-center gap-8 p-6 bg-white dark:bg-gray-800 rounded-xl" style={{ height: '350px' }}>
                {[
                  { name: 'Mental', abbr: 'MD', sys: 'sys_mental_demand', user: 'mental_demand' },
                  { name: 'Physical', abbr: 'PD', sys: 'sys_physical_demand', user: 'physical_demand' },
                  { name: 'Temporal', abbr: 'TD', sys: 'sys_temporal_demand', user: 'temporal_demand' },
                  { name: 'Performance', abbr: 'Perf', sys: 'sys_performance', user: 'performance' },
                  { name: 'Effort', abbr: 'Eff', sys: 'sys_effort', user: 'effort' },
                  { name: 'Frustration', abbr: 'Frust', sys: 'sys_frustration', user: 'frustration' }
                ].map((dim, index) => {
                  const systemValue = report.cognitiveLoadSummary?.[dim.sys] || 0;
                  const userValue = report.nasaTlxUser?.[dim.user] || 0;

                  return (
                    <div key={index} className="flex flex-col items-center">
                      {/* Bar group */}
                      <div className="flex gap-2 items-end" style={{ height: '240px' }}>
                        {/* System bar */}
                        <div className="flex flex-col justify-end items-center relative" style={{ width: '40px' }}>
                          {systemValue > 0 && (
                            <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-sm font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                              {systemValue.toFixed(1)}
                            </div>
                          )}
                          <div
                            className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all duration-300"
                            style={{ height: `${Math.max((systemValue / 21) * 240, systemValue > 0 ? 10 : 0)}px` }}
                            title={`System ${dim.name}: ${systemValue.toFixed(1)}`}
                          />
                        </div>

                        {/* User bar */}
                        <div className="flex flex-col justify-end items-center relative" style={{ width: '40px' }}>
                          {userValue > 0 ? (
                            <>
                              <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-sm font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                                {userValue.toFixed(1)}
                              </div>
                              <div
                                className="w-full bg-gradient-to-t from-orange-500 to-orange-400 rounded-t transition-all duration-300"
                                style={{ height: `${Math.max((userValue / 21) * 240, 10)}px` }}
                                title={`User ${dim.name}: ${userValue.toFixed(1)}`}
                              />
                            </>
                          ) : (
                            <div className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-t" title="User data pending"></div>
                          )}
                        </div>
                      </div>

                      {/* X-axis label */}
                      <div className="mt-3 text-sm text-center font-semibold text-gray-700 dark:text-gray-300" title={`${dim.name} Demand`}>
                        {dim.name}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Y-axis label */}
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
                Scale: 0-21
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Per-Question Detail Cards */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <span className="text-white font-bold text-sm">📝</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Per-Question Details</h2>
          </div>
          <div className="space-y-4">
            {report.responses.map((response: any) => {
              const tlxData = report.nasaTlxSystem?.find((n: any) => n.q_index === response.q_index);
              const cogLoad = tlxData?.cognitive_load || 0;
              const loadPercentage = Math.round((cogLoad / 21) * 100);
              const loadLevel = cogLoad <= 7 ? 'Low' : cogLoad <= 14 ? 'Medium' : 'High';
              const isSkipped = response.metrics?.skipped === true;
              const pointsAwarded = response.metrics?.pointsAwarded || 0;
              const exampleShown = (response.metrics?.examplePenalty || 0) > 0;

              const SCHEDULE = [
                { idx: 1, level: 'easy', limit: 30, points: 1.0 },
                { idx: 2, level: 'medium', limit: 50, points: 2.0 },
                { idx: 3, level: 'medium', limit: 50, points: 2.0 },
                { idx: 4, level: 'hard', limit: 60, points: 2.5 },
                { idx: 5, level: 'hard', limit: 60, points: 2.5 },
              ];

              const originalTimeLimit = SCHEDULE[response.q_index - 1].limit;
              const displayTime = response.extra_time_used
                ? originalTimeLimit + (response.time_ms / 1000)
                : (response.time_ms / 1000);
              const formattedTime = displayTime >= 60
                ? `${Math.floor(displayTime / 60)}m ${Math.round(displayTime % 60)}s`
                : `${Math.round(displayTime)}s`;

              const expanded = isExpanded(response.q_index);

              return (
                <div key={response.q_index} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <button
                    onClick={() => toggleCard(response.q_index)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">{expanded ? '▼' : '▶'}</span>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 dark:text-white">Question {response.q_index}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 mt-1">
                          {isSkipped ? (
                            <>
                              <span className="text-gray-500 dark:text-gray-400">⊘ Skipped</span>
                              <span>•</span>
                              <span>{pointsAwarded} points</span>
                              <span>•</span>
                              <span>{formattedTime}</span>
                            </>
                          ) : (
                            <>
                              <span className={response.correct ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                {response.correct ? '✓ Correct' : '✗ Incorrect'}
                              </span>
                              <span>•</span>
                              <span>{pointsAwarded} points</span>
                              <span>•</span>
                              <span>{formattedTime}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-700 dark:text-gray-300">{loadPercentage}%</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{cogLoad.toFixed(1)}/21</div>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        loadLevel === 'Low' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        loadLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {loadLevel} Load
                      </span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-6 space-y-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Cognitive Load Breakdown</h4>
                        <div className="space-y-3">
                          {[
                            { name: 'Mental Demand', field: 'mental_demand' },
                            { name: 'Physical Demand', field: 'physical_demand' },
                            { name: 'Temporal Demand', field: 'temporal_demand' },
                            { name: 'Performance', field: 'performance' },
                            { name: 'Effort', field: 'effort' },
                            { name: 'Frustration', field: 'frustration' }
                          ].map((dim) => {
                            const value = tlxData?.[dim.field] || 0;
                            const percentage = (value / 21) * 100;

                            const barColor = value <= 7
                              ? 'from-green-500 to-green-400'
                              : value <= 14
                              ? 'from-yellow-500 to-yellow-400'
                              : 'from-red-500 to-red-400';

                            return (
                              <div key={dim.field} className="flex items-center gap-3">
                                <div className="w-32 text-sm text-gray-700 dark:text-gray-300">{dim.name}</div>
                                <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full bg-gradient-to-r ${barColor} transition-all duration-300`}
                                    style={{ width: `${Math.max(percentage, value > 0 ? 5 : 0)}%` }}
                                  />
                                </div>
                                <div className="w-16 text-sm text-right text-gray-600 dark:text-gray-400">
                                  {value.toFixed(1)}/21
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Support Actions</h4>
                        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            <span>• Hints used:</span>
                            <span className="font-medium">{response.hints_used}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>• Example shown:</span>
                            <span className="font-medium">{exampleShown ? 'Yes' : 'No'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>• Extra time requested:</span>
                            <span className="font-medium">{response.extra_time_used ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 5: Overall Behavioral Patterns */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <span className="text-white font-bold text-sm">📊</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Overall Behavioral Patterns</h2>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {(() => {
              // Calculate statistics
              const totalHints = report.responses.reduce((sum: number, r: any) =>
                sum + (r.hints_used || 0), 0);

              const examplesOpened = report.responses.filter((r: any) =>
                (r.metrics?.examplePenalty || 0) > 0).length;

              const extraTimeRequests = report.responses.filter((r: any) =>
                r.extra_time_used === true).length;

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

              return (
                <>
                  {/* Card 1: Hints Used */}
                  <div className="bg-gradient-to-br from-purple-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-xl p-6 border border-purple-200/30 dark:border-purple-800/30 text-center">
                    <div className="text-3xl mb-3">💡</div>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                      {totalHints}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Hints Used
                    </div>
                  </div>

                  {/* Card 2: Examples Opened */}
                  <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-xl p-6 border border-blue-200/30 dark:border-blue-800/30 text-center">
                    <div className="text-3xl mb-3">📖</div>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                      {examplesOpened}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Examples Opened
                    </div>
                  </div>

                  {/* Card 3: Extra Time Requested */}
                  <div className="bg-gradient-to-br from-orange-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-xl p-6 border border-orange-200/30 dark:border-orange-800/30 text-center">
                    <div className="text-3xl mb-3">⏱️</div>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                      {extraTimeRequests}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Extra Time Requested
                    </div>
                  </div>

                  {/* Card 4: Questions Skipped */}
                  <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-xl p-6 border border-gray-200/30 dark:border-gray-800/30 text-center">
                    <div className="text-3xl mb-3">⊘</div>
                    <div className="text-4xl font-bold text-gray-600 dark:text-gray-400 mb-2">
                      {questionsSkipped}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Questions Skipped
                    </div>
                  </div>

                  {/* Card 5: Correct Answers */}
                  <div className="bg-gradient-to-br from-green-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-xl p-6 border border-green-200/30 dark:border-green-800/30 text-center">
                    <div className="text-3xl mb-3">✓</div>
                    <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
                      {correctAnswers}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Correct Answers
                    </div>
                  </div>

                  {/* Card 6: Incorrect Answers */}
                  <div className="bg-gradient-to-br from-red-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-xl p-6 border border-red-200/30 dark:border-red-800/30 text-center">
                    <div className="text-3xl mb-3">✗</div>
                    <div className="text-4xl font-bold text-red-600 dark:text-red-400 mb-2">
                      {incorrectAnswers}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Incorrect Answers
                    </div>
                  </div>

                  {/* Card 7: Low Attention Questions */}
                  <div className="bg-gradient-to-br from-yellow-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-xl p-6 border border-yellow-200/30 dark:border-yellow-800/30 text-center">
                    <div className="text-3xl mb-3">📉</div>
                    <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
                      {lowAttentionCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Low Attention Questions
                    </div>
                  </div>

                  {/* Card 8: High Stress Questions */}
                  <div className="bg-gradient-to-br from-pink-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-xl p-6 border border-pink-200/30 dark:border-pink-800/30 text-center">
                    <div className="text-3xl mb-3">💓</div>
                    <div className="text-4xl font-bold text-pink-600 dark:text-pink-400 mb-2">
                      {highStressCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      High Stress Questions
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* HRV Summary */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <span className="text-white font-bold text-sm">❤️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Heart Rate Variability Analysis</h2>
          </div>
          
          <div className="space-y-4">
            {Array.from({ length: 5 }, (_, index) => {
              const response = report.responses.find((r: any) => r.q_index === index + 1);
              const hrvData = response?.metrics;
              
              if (!hrvData?.hrv) {
                return (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                    <div className="w-12 text-sm font-semibold text-gray-900 dark:text-white">Q{index + 1}</div>
                    <div className="flex-1 text-sm text-gray-500 dark:text-gray-400">No HRV data available</div>
                  </div>
                );
              }
              
              return (
                <div key={index} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                  <div className="w-12 text-sm font-semibold text-gray-900 dark:text-white">Q{index + 1}</div>
                  <div className="flex-1 flex items-center gap-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      hrvData.hrv === 'high' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      HRV: {hrvData.hrv.toUpperCase()}
                    </div>
                    {hrvData.rmssd_q && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        RMSSD: {Math.round(hrvData.rmssd_q)}ms
                      </div>
                    )}
                    {hrvData.rmssd_base && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Baseline: {Math.round(hrvData.rmssd_base)}ms
                      </div>
                    )}
                    {hrvData.hrv_confidence && (
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        hrvData.hrv_confidence === 'ok' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {hrvData.hrv_confidence === 'ok' ? 'High Confidence' : 'Low Confidence'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <div className="font-semibold mb-2">HRV Interpretation:</div>
              <ul className="space-y-1 text-xs">
                <li>• <strong>High HRV:</strong> Indicates good autonomic nervous system balance and lower stress</li>
                <li>• <strong>Low HRV:</strong> May indicate higher stress or cognitive load</li>
                <li>• <strong>RMSSD:</strong> Root Mean Square of Successive Differences - higher values indicate better recovery</li>
              </ul>
            </div>
          </div>

          {/* Aggregate HRV Statistics */}
          {(() => {
            const questionsWithHRV = report.responses.filter((r: any) => r.metrics?.hrv);
            const highStressCount = questionsWithHRV.filter((r: any) => r.metrics.hrv === 'low').length;
            const lowStressCount = questionsWithHRV.filter((r: any) => r.metrics.hrv === 'high').length;
            const avgRMSSD = questionsWithHRV.length > 0
              ? questionsWithHRV.reduce((sum: number, r: any) => sum + (r.metrics.rmssd_q || 0), 0) / questionsWithHRV.length
              : 0;
            const baseline = report.rmssdBaseline || report.responses[0]?.metrics?.rmssd_base || 0;

            if (questionsWithHRV.length > 0) {
              return (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-center">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">{lowStressCount}</div>
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium">Low Stress Questions</div>
                  </div>
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-center">
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">{highStressCount}</div>
                    <div className="text-xs text-red-600 dark:text-red-400 font-medium">High Stress Questions</div>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-center">
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{Math.round(avgRMSSD)}<span className="text-sm">ms</span></div>
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Avg RMSSD</div>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-center">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{Math.round(baseline)}<span className="text-sm">ms</span></div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Baseline RMSSD</div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
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


