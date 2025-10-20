"use client";

import { useState, useEffect } from "react";
import { DatabaseClient } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import type { Subtopic as DBSubtopic, Session } from "@/lib/database";
import type { User } from "@supabase/supabase-js";

// Helper function to format dates
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

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

// Helper functions for subtopic status
function isSubtopicEnabled(subtopic: DBSubtopic): boolean {
  return subtopic.enabled;
}

function isSubtopicLocked(subtopic: DBSubtopic): boolean {
  return !subtopic.enabled;
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [recentReports, setRecentReports] = useState<Session[]>([]);
  const [subtopics, setSubtopics] = useState<DBSubtopic[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileCompleted, setProfileCompleted] = useState(false);

  useEffect(() => {
    // Set client flag
    setIsClient(true);
    
    // Get current user from Supabase Auth and check profile completion
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Check profile completion from database
        try {
          const { data: userProfile } = await supabase
            .from('users')
            .select('profile_completed')
            .eq('id', user.id)
            .single();
            
          setProfileCompleted(userProfile?.profile_completed || false);
        } catch (error) {
          console.error('Failed to check profile completion:', error);
          setProfileCompleted(false);
        }
      }
      
      return user;
    };

    // Load subtopics from database
    const loadSubtopics = async () => {
      try {
        const dbSubtopics = await DatabaseClient.getSubtopics();
        setSubtopics(dbSubtopics);
      } catch (error) {
        console.error('Failed to load subtopics:', error);
        setSubtopics([]);
      }
    };

    // Load recent reports from database
    const loadRecentReports = async (userId: string) => {
      try {
        const sessions = await DatabaseClient.getSessionsByUser(userId);
        // Get the 3 most recent sessions
        const recentSessions = sessions
          .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
          .slice(0, 3);
        
        setRecentReports(recentSessions);
      } catch (error) {
        console.error('Failed to load recent reports:', error);
        setRecentReports([]);
      }
    };

    // Load user, subtopics, and recent reports
    const initializeData = async () => {
      const currentUser = await getCurrentUser();
      await loadSubtopics();
      
      if (currentUser) {
        await loadRecentReports(currentUser.id);
      }
      
      setLoading(false);
    };

    initializeData();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Profile completion is now managed by state

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
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="animate-pulse bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl mb-4"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="flex gap-3">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Enabled Subtopics Row */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Available Topics</h3>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {subtopics.filter(s => s.enabled).map((s, index) => {
                    const canStart = isClient && profileCompleted;
                    
                    return (
                      <div key={s.id} className="group card-hover bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg flex flex-col h-full">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <span className="text-white font-bold text-lg">{index + 1}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">
                              5 Questions
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 mb-4">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{s.name}</h3>
                          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{s.description || 'Practice data structure concepts'}</p>
                          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-4">
                            <span>⏱️ ~8–10 min</span>
                            <span>📊 Real-time monitoring</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-auto">
                          <a href={`/subtopics/${s.key}`} className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors">
                            View Details
                          </a>
                          <button
                            aria-disabled={!canStart}
                            className={`text-sm rounded-xl px-4 py-2 font-medium transition-all duration-300 ${
                              canStart
                                ? "btn-primary text-white shadow-lg hover:shadow-xl" 
                                : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                            }`}
                            title={
                              !isClient || !profileCompleted 
                                ? "Complete profile first" 
                                : "Start learning"
                            }
                          >
                            {!isClient || !profileCompleted 
                              ? "Complete Profile First" 
                              : "Start Learning"
                            }
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Locked Subtopics Row */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Coming Soon</h3>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {subtopics.filter(s => !s.enabled).map((s, index) => {
                    return (
                      <div key={s.id} className="group card-hover bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg opacity-75 flex flex-col h-full">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <span className="text-white font-bold text-lg">{subtopics.filter(s => s.enabled).length + index + 1}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">
                              5 Questions
                            </div>
                            <div className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium">
                              Locked
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 mb-4">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{s.name}</h3>
                          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{s.description || 'Practice data structure concepts'}</p>
                          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-4">
                            <span>⏱️ ~8–10 min</span>
                            <span>📊 Real-time monitoring</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-auto">
                          <a href={`/subtopics/${s.key}`} className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors">
                            View Details
                          </a>
                          <button
                            disabled
                            className="text-sm rounded-xl px-4 py-2 font-medium transition-all duration-300 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                            title="This topic is locked for now."
                          >
                            Locked
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
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
                      {r.subtopics?.name || 'Unknown'} Practice Session
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(r.started_at)} • {r.mode === "support" ? "Support Mode" : "No-Support Mode"}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg text-gray-900 dark:text-white">{r.score_total.toFixed(1)}/10</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Session Complete
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



