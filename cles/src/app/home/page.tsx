"use client";

import { useState, useEffect } from "react";
import { getCurrentUser, getSessionsByUser, formatDate } from "@/lib/storage";

type Subtopic = {
  id: string;
  name: string;
  description: string;
};

type ReportItem = {
  id: string;
  date: string;
  subtopic: string;
  mode: "support" | "no_support";
  score: number;
  avgLoad: number;
};

const SUBTOPICS: Subtopic[] = [
  { id: "array", name: "Array", description: "Indexing, traversal, and operations" },
  { id: "linked-list", name: "Linked List", description: "Singly/Doubly lists and operations" },
  { id: "stack", name: "Stack", description: "LIFO operations and use-cases" },
  { id: "queue", name: "Queue", description: "FIFO, circular, priority" },
  { id: "tree", name: "Tree", description: "Traversal, BST, basic properties" },
  { id: "sorting", name: "Sorting", description: "Common sorting algorithms" },
];

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set client flag and load user data
    setIsClient(true);
    const currentUser = getCurrentUser();
    setUser(currentUser);
    
    if (currentUser) {
      const sessions = getSessionsByUser(currentUser.id);
      const reports = sessions
        .filter(session => session.endedAt)
        .slice(-3)
        .map(session => ({
          id: session.id,
          date: formatDate(session.startedAt),
          subtopic: SUBTOPICS.find(s => s.id === session.subtopicId)?.name || 'Unknown',
          mode: session.mode,
          score: session.score,
          avgLoad: session.avgLoad,
        }));
      setRecentReports(reports);
    }
  }, []);

  const profileCompleted = isClient ? (user?.profileCompleted || false) : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {isClient && !profileCompleted && (
          <div className="mb-8 animate-slide-up">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-amber-600 dark:text-amber-400 text-sm">⚠️</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Complete Your Profile</h3>
                    <p className="text-amber-700 dark:text-amber-300 text-sm">Provide your prior knowledge, experience, and interests to get personalized recommendations.</p>
                  </div>
                </div>
                <a href="/profile" className="shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-colors">
                  Complete Profile
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to <span className="gradient-text">CLES</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-300">Choose a topic and start your learning journey</p>
          </div>
          <a href="/settings" className="px-4 py-2 rounded-xl border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300 font-medium">
            ⚙️ Settings
          </a>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Data Structures Topics</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SUBTOPICS.map((s, index) => (
              <div key={s.id} className="group card-hover bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white font-bold text-lg">{index + 1}</span>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">
                    10 Questions
                  </div>
                </div>
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{s.name}</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{s.description}</p>
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-4">
                    <span>⏱️ ~12–15 min</span>
                    <span>📊 Real-time monitoring</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <a href={`/subtopics/${s.id}`} className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors">
                    View Details
                  </a>
                  <button
                    aria-disabled={!isClient || !profileCompleted}
                    className={`text-sm rounded-xl px-4 py-2 font-medium transition-all duration-300 ${
                      isClient && profileCompleted 
                        ? "btn-primary text-white shadow-lg hover:shadow-xl" 
                        : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    }`}
                    title={!isClient || !profileCompleted ? "Complete profile first" : "Start learning"}
                  >
                    {isClient && profileCompleted ? "Start Learning" : "Complete Profile First"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Recent Reports</h2>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl border border-purple-200/30 dark:border-purple-800/30 shadow-lg overflow-hidden">
            {recentReports.map((r, index) => (
              <a
                key={r.id}
                href={`/reports/${r.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {r.subtopic} Practice Session
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {r.date} • {r.mode === "support" ? "Support Mode" : "No-Support Mode"}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg text-gray-900 dark:text-white">{r.score}/10</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Avg Load: {Math.round(r.avgLoad * 100)}%
                  </div>
                </div>
              </a>
            ))}
            {recentReports.length === 0 && (
              <div className="px-6 py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No Reports Yet</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Complete your first practice session to see detailed analytics here.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}



