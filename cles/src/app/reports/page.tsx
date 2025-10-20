"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DatabaseClient } from "@/lib/database";

type ReportItem = {
  id: string;
  date: string;
  subtopic: string;
  mode: "support" | "no_support";
  score: number;
  avgLoad: number;
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function ReportsPage() {
  const [user, setUser] = useState<any>(null);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    async function loadReports() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        
        if (currentUser) {
          const sessions = await DatabaseClient.getSessionsByUser(currentUser.id);
          const reportItems = sessions
            .filter(session => session.ended_at)
            .map(session => ({
              id: String(session.id),
              date: formatDate(session.started_at),
              subtopic: session.subtopics?.name || 'Unknown',
              mode: session.mode as "support" | "no_support",
              score: session.score_total || 0,
              avgLoad: 0.5, // TODO: Calculate from responses
            }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setReports(reportItems);
        }
      } catch (error) {
        console.error('Failed to load reports:', error);
      }
    }
    
    loadReports();
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">📊</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Your Reports</h1>
            <p className="text-gray-600 dark:text-gray-300">View detailed analytics from your practice sessions</p>
          </div>
        </div>

        <div className="space-y-6">
          {reports.length > 0 ? (
            reports.map((report, index) => (
              <div key={report.id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg hover:shadow-xl transition-all duration-300">
                <a href={`/reports/${report.id}`} className="block">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                          {report.subtopic} Practice Session
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                          <span>{report.date}</span>
                          <span>•</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            report.mode === "support" 
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                              : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                          }`}>
                            {report.mode === "support" ? "Support Mode" : "No-Support Mode"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold gradient-text mb-1">{report.score}/10</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Avg Load: {Math.round(report.avgLoad * 100)}%
                      </div>
                    </div>
                  </div>
                </a>
              </div>
            ))
          ) : (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-12 border border-purple-200/30 dark:border-purple-800/30 shadow-lg text-center">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">No Reports Yet</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Complete your first practice session to see detailed analytics here.
              </p>
              <a 
                href="/home" 
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-primary text-white font-semibold hover:shadow-lg transition-all duration-300"
              >
                <span>🚀</span>
                Start Your First Session
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
