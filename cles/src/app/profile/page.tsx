"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentUser, updateUserProfile } from "@/lib/storage";

const SUBTOPICS = ["Array", "Linked List", "Stack", "Queue", "Tree", "Sorting"];

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return");

  const [user, setUser] = useState(getCurrentUser());
  const [priorKnowledge, setPriorKnowledge] = useState<Record<string, number>>({});
  const [experience, setExperience] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [program, setProgram] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setPriorKnowledge(user.profile.priorKnowledge);
      setExperience(user.profile.experience);
      setInterests(user.profile.interests);
      setProgram(user.profile.program);
      setYear(user.profile.year);
    } else {
      // Initialize with defaults
      const initial: Record<string, number> = {};
      SUBTOPICS.forEach((s) => {
        initial[s] = 1;
      });
      setPriorKnowledge(initial);
    }
  }, [user]);

  function handleInterestToggle(subtopic: string) {
    setInterests((prev) =>
      prev.includes(subtopic) ? prev.filter((i) => i !== subtopic) : [...prev, subtopic]
    );
  }

  async function handleSave() {
    if (!user) return;
    
    setLoading(true);
    
    // Save to localStorage
    updateUserProfile(user.id, {
      priorKnowledge,
      experience,
      interests,
      program,
      year,
    });
    
    setTimeout(() => {
      setLoading(false);
      if (returnTo) {
        router.push(returnTo);
      } else {
        router.push("/home");
      }
    }, 800);
  }

  const completedSections = [
    Object.keys(priorKnowledge).length > 0,
    experience.trim().length > 0,
    interests.length > 0,
    program.trim().length > 0 || year.trim().length > 0,
  ].filter(Boolean).length;

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
              <span className="text-white font-bold text-xl">👤</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Complete Your Profile</h1>
            <p className="text-gray-600 dark:text-gray-300">Help us personalize your learning experience</p>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
              <span className="text-sm font-bold gradient-text">{completedSections}/4</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className="gradient-bg h-3 rounded-full transition-all duration-500"
                style={{ width: `${(completedSections / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-8">
          <section className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-sm">📚</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Prior Knowledge</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">Rate your familiarity with each subtopic (1 = beginner, 5 = expert)</p>
              </div>
            </div>
            <div className="space-y-4">
              {SUBTOPICS.map((subtopic) => (
                <div key={subtopic} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                  <label className="text-sm font-semibold text-gray-900 dark:text-white">{subtopic}</label>
                  <select
                    value={priorKnowledge[subtopic] || 1}
                    onChange={(e) => setPriorKnowledge((prev) => ({ ...prev, [subtopic]: Number(e.target.value) }))}
                    className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-600 px-3 py-2 text-sm font-medium text-gray-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 transition-all duration-200"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-sm">💼</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Experience</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">Have you completed a course or project involving Data Structures?</p>
              </div>
            </div>
            <textarea
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="Briefly describe your experience (optional)"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-600 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 transition-all duration-200 min-h-[100px] resize-y"
            />
          </section>

          <section className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-sm">⭐</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Interests</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">Select subtopics you're most interested in practicing</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {SUBTOPICS.map((subtopic) => (
                <button
                  key={subtopic}
                  type="button"
                  onClick={() => handleInterestToggle(subtopic)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium border transition-all duration-200 ${
                    interests.includes(subtopic)
                      ? "border-purple-500 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                      : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-300 dark:hover:border-purple-700"
                  }`}
                >
                  {subtopic}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-sm">🎓</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Basics (Optional)</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">Tell us about your academic background</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Program</label>
                <input
                  type="text"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  placeholder="e.g., Computer Science"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-600 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Year</label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g., 2025"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-600 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 transition-all duration-200"
                />
              </div>
            </div>
          </section>

          <div className="flex items-center gap-4 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl px-6 py-3 btn-primary text-white font-semibold text-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving Profile...
                </div>
              ) : (
                "Save Profile"
              )}
            </button>
            {returnTo && (
              <a href={returnTo} className="px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 font-medium">
                Cancel
              </a>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

