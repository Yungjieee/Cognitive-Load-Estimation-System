"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DatabaseClient } from "@/lib/database";

const SUBTOPICS = {
  array: { name: "Array", description: "Indexing, traversal, and operations" },
  linked_list: { name: "Linked List", description: "Singly/Doubly lists and operations" },
  stack: { name: "Stack", description: "LIFO operations and use-cases" },
  queue: { name: "Queue", description: "FIFO, circular, priority" },
  tree: { name: "Tree", description: "Traversal, BST, basic properties" },
  sorting: { name: "Sorting", description: "Common sorting algorithms" },
};

// Subtopic freeze configuration
const ENABLED_SUBTOPICS = ["array", "linked_list", "stack"];
const LOCKED_SUBTOPICS = ["queue", "tree", "sorting"];

function isSubtopicEnabled(subtopicId: string): boolean {
  return ENABLED_SUBTOPICS.includes(subtopicId);
}

function isSubtopicLocked(subtopicId: string): boolean {
  return LOCKED_SUBTOPICS.includes(subtopicId);
}

export default function SubtopicDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const subtopicId = params.id as string;
  const subtopic = SUBTOPICS[subtopicId as keyof typeof SUBTOPICS];

  const [user, setUser] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [mode, setMode] = useState<'support' | 'no_support'>('support');

  useEffect(() => {
    setIsClient(true);
    
    // Load user data from Supabase Auth and database
    const loadUser = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        
        if (currentUser) {
          // Load user profile and settings from database
          const { data: userProfile } = await supabase
            .from('users')
            .select('profile_completed, settings_mode')
            .eq('id', currentUser.id)
            .single();
            
          if (userProfile) {
            setProfileCompleted(userProfile.profile_completed || false);
            setMode(userProfile.settings_mode || 'support');
          }
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    
    loadUser();
    
    // Redirect locked subtopics to home with toast
    if (isSubtopicLocked(subtopicId)) {
      router.push('/home');
      // Note: In a real app, you'd show a toast notification here
      return;
    }
  }, [subtopicId, router]);

  function handleStartPreparation() {
    if (!profileCompleted) {
      // Show blocking modal behavior
      const confirmed = confirm("Please complete your profile before starting. Would you like to go to your profile now?");
      if (confirmed) {
        router.push(`/profile?return=/subtopics/${subtopicId}`);
      }
      return;
    }
    router.push(`/calibration?subtopic=${subtopicId}`);
  }

  if (!subtopic) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="text-center mb-8 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 dark:text-red-400 text-2xl">❌</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Subtopic Not Found</h1>
            <p className="text-gray-600 dark:text-gray-300">The requested subtopic could not be found.</p>
          </div>
          <div className="text-center">
            <a href="/home" className="px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 font-medium">
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state to prevent hydration mismatch
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-4 mb-6">
            <a href="/home" className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 font-medium">
              ← Back to Home
            </a>
          </div>
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">📚</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{subtopic.name}</h1>
            <p className="text-gray-600 dark:text-gray-300">{subtopic.description}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-sm">📋</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Session Details</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Questions:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">5</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Estimated time:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">8–10 minutes</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mode:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{mode === "support" ? "Support" : "No-Support"}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-sm">🎯</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">What to Expect</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Complete a brief calibration to set baselines</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 dark:text-blue-400 text-xs">📊</span>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Work through 5 questions with real-time monitoring</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-purple-600 dark:text-purple-400 text-xs">📈</span>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Get detailed insights and a downloadable report</span>
              </div>
              {mode === "support" && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-amber-600 dark:text-amber-400 text-xs">💡</span>
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Access hints, examples, and encouragement</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-sm">🚀</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ready to Start?</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              {profileCompleted 
                ? "Your profile is complete and you're ready to begin your learning session."
                : "Complete your profile first to get personalized recommendations and start your session."
              }
            </p>
            <button
              onClick={handleStartPreparation}
              className={`w-full rounded-xl px-6 py-3 font-semibold text-lg transition-all duration-300 ${
                profileCompleted 
                  ? "btn-primary text-white shadow-lg hover:shadow-xl" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              }`}
              disabled={!profileCompleted}
              title={!profileCompleted ? "Complete your profile first" : "Start your learning session"}
            >
              {profileCompleted ? "Start Preparation" : "Complete Profile First"}
            </button>
            {!profileCompleted && (
              <p className="mt-4 text-center text-sm text-amber-700 dark:text-amber-300">
                Complete your profile to enable the "Start Preparation" button.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

