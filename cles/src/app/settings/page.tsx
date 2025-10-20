"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DatabaseClient } from "@/lib/database";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mode, setMode] = useState<"support" | "no_support">("support");
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Load user data and settings from database
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setUser(currentUser);
          
          // Load user settings from database
          const { data: userProfile } = await supabase
            .from('users')
            .select('settings_mode')
            .eq('id', currentUser.id)
            .single();
            
          if (userProfile && userProfile.settings_mode) {
            setMode(userProfile.settings_mode);
          }
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    }
    
    loadUser();
  }, []);

  async function handleSave() {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Save to database
      await DatabaseClient.updateUserSettings(user.id, { settings_mode: mode });
      
      setTimeout(() => {
        setLoading(false);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }, 300);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setLoading(false);
      alert('Failed to save settings. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">⚙️</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
            <p className="text-gray-600 dark:text-gray-300">Configure your practice mode preferences</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-sm">🎯</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Practice Mode</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">Choose how you want to practice Data Structures tasks</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-start gap-4 cursor-pointer p-4 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200">
                <input
                  type="radio"
                  name="mode"
                  value="support"
                  checked={mode === "support"}
                  onChange={(e) => setMode(e.target.value as "support")}
                  className="mt-1 w-5 h-5 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">Support Mode</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Get hints, examples, encouragement, and rest suggestions during tasks. Perfect for learning and building confidence.
                  </div>
                  <div className="mt-2 flex gap-2">
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">Hints Available</span>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">Encouragement</span>
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">Rest Suggestions</span>
                  </div>
                </div>
              </label>
              
              <label className="flex items-start gap-4 cursor-pointer p-4 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200">
                <input
                  type="radio"
                  name="mode"
                  value="no_support"
                  checked={mode === "no_support"}
                  onChange={(e) => setMode(e.target.value as "no_support")}
                  className="mt-1 w-5 h-5 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">No-Support Mode</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Work independently with only technical alerts. Challenge yourself and test your knowledge without assistance.
                  </div>
                  <div className="mt-2 flex gap-2">
                    <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full">Independent</span>
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full">Technical Alerts Only</span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full">Challenge Mode</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 rounded-xl px-6 py-3 btn-primary text-white font-semibold text-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : (
                "Save Settings"
              )}
            </button>
            <a href="/home" className="px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 font-medium">
              Back to Home
            </a>
          </div>
        </div>

        {showToast && (
          <div className="fixed bottom-6 right-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl border border-green-200 dark:border-green-800 shadow-2xl px-6 py-4 animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
              </div>
              <div>
                <div className="font-semibold text-green-800 dark:text-green-200">Settings Saved</div>
                <div className="text-sm text-green-700 dark:text-green-300">Applied to future sessions</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

