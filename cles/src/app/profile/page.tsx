"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DatabaseClient } from "@/lib/database";

const SUBTOPICS = ["array", "linked_list", "stack", "queue", "tree", "sorting"];

// Subtopic freeze configuration
const ENABLED_SUBTOPICS = ["array", "linked_list", "stack"];
const LOCKED_SUBTOPICS = ["queue", "tree", "sorting"];

function isSubtopicEnabled(subtopicId: string): boolean {
  return ENABLED_SUBTOPICS.includes(subtopicId);
}

function isSubtopicLocked(subtopicId: string): boolean {
  return LOCKED_SUBTOPICS.includes(subtopicId);
}
const PRIOR_KNOWLEDGE_LEVELS = [
  { value: "none", label: "None" },
  { value: "basic", label: "Basic" },
  { value: "familiar", label: "Familiar" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" }
];

const COURSE_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_sure", label: "Not Sure" }
];

const HANDS_ON_OPTIONS = [
  { value: "none", label: "None" },
  { value: "some_exercises", label: "Some Exercises" },
  { value: "small_project", label: "Small Project" },
  { value: "large_project", label: "Large Project" }
];

const GRADE_OPTIONS = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
  { value: "F", label: "F" },
  { value: "not_taken", label: "I didn't take this course" }
];

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return");

  const [user, setUser] = useState<any>(null);
  const [priorKnowledge, setPriorKnowledge] = useState<Record<string, string>>({});
  const [takenCourse, setTakenCourse] = useState("");
  const [handsOn, setHandsOn] = useState("");
  const [mathGrade, setMathGrade] = useState("");
  const [programmingGrade, setProgrammingGrade] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Load user data from database
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setUser(currentUser);
          
          // Load user profile from database
          const { data: userProfile } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single();
            
          if (userProfile) {
            setPriorKnowledge(userProfile.profile_prior_knowledge || {});
            setTakenCourse(userProfile.profile_experience_taken_course || "");
            setHandsOn(userProfile.profile_experience_hands_on || "");
            setMathGrade(userProfile.profile_math_grade || "");
            setProgrammingGrade(userProfile.profile_programming_grade || "");
            setInterests(userProfile.profile_interest_subtopics || []);
          }
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    }
    
    loadUser();
  }, []);

  function handleInterestToggle(subtopic: string) {
    setInterests((prev) =>
      prev.includes(subtopic) ? prev.filter((i) => i !== subtopic) : [...prev, subtopic]
    );
  }

  function isFormValid(): boolean {
    // Check all 6 subtopics have prior knowledge selected
    const allSubtopicsHaveKnowledge = SUBTOPICS.every(subtopic =>
      priorKnowledge[subtopic] && priorKnowledge[subtopic] !== ""
    );

    // Check experience fields are selected
    const experienceComplete = takenCourse !== "" && handsOn !== "";

    // Check grades are selected
    const gradesComplete = mathGrade !== "" && programmingGrade !== "";

    // Check at least one interest is selected
    const interestsComplete = interests.length >= 1;

    return allSubtopicsHaveKnowledge && experienceComplete && gradesComplete && interestsComplete;
  }

  async function handleSave() {
    if (!user || !isFormValid()) return;
    
    setLoading(true);
    
    try {
      // Save to database
      await DatabaseClient.updateUserProfile(user.id, {
        profile_prior_knowledge: priorKnowledge,
        profile_experience_taken_course: takenCourse as 'yes' | 'no' | 'not_sure',
        profile_experience_hands_on: handsOn as 'none' | 'some_exercises' | 'small_project' | 'large_project',
        profile_math_grade: mathGrade as 'A' | 'B' | 'C' | 'D' | 'F' | 'not_taken',
        profile_programming_grade: programmingGrade as 'A' | 'B' | 'C' | 'D' | 'F' | 'not_taken',
        profile_interest_subtopics: interests,
      });
      
      setTimeout(() => {
        setLoading(false);
        if (returnTo) {
          router.push(returnTo);
        } else {
          router.push("/home");
        }
      }, 800);
    } catch (error) {
      console.error('Failed to save profile:', error);
      setLoading(false);
      alert('Failed to save profile. Please try again.');
    }
  }

  const completedSections = [
    SUBTOPICS.every(subtopic => priorKnowledge[subtopic] && priorKnowledge[subtopic] !== ""),
    takenCourse !== "" && handsOn !== "",
    mathGrade !== "" && programmingGrade !== "",
    interests.length >= 1,
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
              <span className="text-sm font-bold gradient-text">Profile {completedSections}/4 → 4/4 complete</span>
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
          {/* Prior Knowledge Section */}
          <section className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-sm">📚</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Prior Knowledge</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">Rate your familiarity with each subtopic</p>
              </div>
            </div>
            <div className="space-y-6">
              {SUBTOPICS.map((subtopic) => (
                <div key={subtopic} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                  <label className="text-base font-semibold text-gray-900 dark:text-white capitalize mb-3 block">
                    {subtopic.replace('_', ' ')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRIOR_KNOWLEDGE_LEVELS.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setPriorKnowledge(prev => ({ ...prev, [subtopic]: level.value }))}
                        className={`rounded-lg px-4 py-2.5 text-sm font-medium border-2 transition-all duration-200 ${
                          priorKnowledge[subtopic] === level.value
                            ? "border-purple-500 bg-purple-500 text-white shadow-md"
                            : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Experience Section */}
          <section className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-sm">💼</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Experience</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">Tell us about your background</p>
              </div>
            </div>
            <div className="space-y-8">
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-5">
                <label className="text-base font-semibold text-gray-900 dark:text-white mb-4 block">
                  Have you taken a Data Structures course before?
                </label>
                <div className="flex flex-wrap gap-3">
                  {COURSE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTakenCourse(option.value)}
                      className={`rounded-lg px-5 py-3 text-sm font-medium border-2 transition-all duration-200 ${
                        takenCourse === option.value
                          ? "border-purple-500 bg-purple-500 text-white shadow-md"
                          : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-5">
                <label className="text-base font-semibold text-gray-900 dark:text-white mb-4 block">
                  What&apos;s your hands-on practice level?
                </label>
                <div className="flex flex-wrap gap-3">
                  {HANDS_ON_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setHandsOn(option.value)}
                      className={`rounded-lg px-5 py-3 text-sm font-medium border-2 transition-all duration-200 ${
                        handsOn === option.value
                          ? "border-purple-500 bg-purple-500 text-white shadow-md"
                          : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Grades Section */}
          <section className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-sm">🎓</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Academic Grades</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">What grades did you receive?</p>
              </div>
            </div>
            <div className="space-y-6">
              {/* Math Grade */}
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-5">
                <label className="text-base font-semibold text-gray-900 dark:text-white mb-4 block">
                  Math Course Grade
                </label>
                <div className="flex flex-wrap gap-2">
                  {GRADE_OPTIONS.map((grade) => (
                    <button
                      key={grade.value}
                      type="button"
                      onClick={() => setMathGrade(grade.value)}
                      className={`rounded-lg px-4 py-2.5 text-sm font-medium border-2 transition-all duration-200 ${
                        mathGrade === grade.value
                          ? "border-purple-500 bg-purple-500 text-white shadow-md"
                          : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                      }`}
                    >
                      {grade.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Programming Grade */}
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-5">
                <label className="text-base font-semibold text-gray-900 dark:text-white mb-4 block">
                  Programming Course Grade
                </label>
                <div className="flex flex-wrap gap-2">
                  {GRADE_OPTIONS.map((grade) => (
                    <button
                      key={grade.value}
                      type="button"
                      onClick={() => setProgrammingGrade(grade.value)}
                      className={`rounded-lg px-4 py-2.5 text-sm font-medium border-2 transition-all duration-200 ${
                        programmingGrade === grade.value
                          ? "border-purple-500 bg-purple-500 text-white shadow-md"
                          : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                      }`}
                    >
                      {grade.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Interests Section */}
          <section className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-sm">⭐</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Interests</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">Select subtopics you want to practice (choose at least 1)</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-5">
              <div className="flex flex-wrap gap-2">
                {SUBTOPICS.map((subtopic) => {
                  const isLocked = isSubtopicLocked(subtopic);
                  return (
                    <button
                      key={subtopic}
                      type="button"
                      onClick={() => !isLocked && handleInterestToggle(subtopic)}
                      disabled={isLocked}
                      className={`rounded-lg px-3 py-2.5 text-sm font-medium border-2 transition-all duration-200 flex-shrink-0 ${
                        isLocked
                          ? "border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
                          : interests.includes(subtopic)
                            ? "border-purple-500 bg-purple-500 text-white shadow-md"
                            : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                      }`}
                      title={isLocked ? "This topic is locked for now" : ""}
                    >
                      {subtopic.replace('_', ' ')}
                      {isLocked && " 🔒"}
                    </button>
                  );
                })}
              </div>
            </div>
            {interests.length === 0 && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">Please select at least one subtopic</p>
              </div>
            )}
          </section>

          <div className="flex items-center gap-4 pt-6">
            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className="flex-1 rounded-xl px-6 py-3 btn-primary text-white font-semibold text-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving Profile...
                </div>
              ) : (
                "Save & Continue"
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