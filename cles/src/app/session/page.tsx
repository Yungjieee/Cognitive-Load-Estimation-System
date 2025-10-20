"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sessionEngine, SessionState } from "@/lib/sessionEngine";
import { DatabaseClient } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import { liveStreamsManager } from "@/lib/liveStreams";
import { Answer } from "@/lib/questionTypes";
import { SCHEDULE } from "@/lib/config";
import QuestionRenderer from "@/components/QuestionRenderer";
import SessionRightPanel from "@/components/SessionRightPanel";
import HintPanel from "@/components/HintPanel";
import TimeUpModal from "@/components/TimeUpModal";
import ConfirmModal from "@/components/ConfirmModal";
import RevealCard from "@/components/RevealCard";
import StressorBanner from "@/components/StressorBanner";

export default function SessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subtopicKey = searchParams.get("subtopic");

  const [userId, setUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<'support' | 'no_support'>('support');
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<Answer | null>(null);
  const [showTenSecondWarning, setShowTenSecondWarning] = useState(false);

  // Load current user and settings from Supabase
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;
      setUserId(user?.id ?? null);
      
      if (user) {
        // Load user settings from database
        try {
          const { data: userProfile } = await supabase
            .from('users')
            .select('settings_mode')
            .eq('id', user.id)
            .single();
            
          if (userProfile && userProfile.settings_mode) {
            setMode(userProfile.settings_mode);
          }
        } catch (error) {
          console.error('Failed to load user settings:', error);
          // Fallback to 'support' mode
          setMode('support');
        }
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Handle timer updates
  useEffect(() => {
    if (!sessionState) return;

    const interval = setInterval(() => {
      setSessionState(sessionEngine.getState());
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionState]);

  // Handle 10-second warning
  useEffect(() => {
    if (sessionState && sessionState.timeRemaining <= 10 && sessionState.timeRemaining > 0) {
      setShowTenSecondWarning(true);
    } else {
      setShowTenSecondWarning(false);
    }
  }, [sessionState?.timeRemaining]);

  // Handle session completion
  useEffect(() => {
    if (sessionState?.isCompleted) {
      (async () => {
        const result = await sessionEngine.endSession();
        
        // Stop all streams
        liveStreamsManager.cleanup();
        
        router.push(`/reports/${sessionState.sessionId}`);
      })();
    }
  }, [sessionState?.isCompleted, router]);

  function mapDifficulty(letter: 'E' | 'M' | 'H'): number {
    switch (letter) {
      case 'E': return 1;
      case 'M': return 3;
      case 'H': return 5;
      default: return 3;
    }
  }

  function transformDbQuestions(rows: any[]): any[] {
    const LETTERS = ['A','B','C','D','E','F'];
    return rows.map((q) => {
      const hintsArray: string[] = Array.isArray(q.hints)
        ? q.hints
        : (q.hints ? JSON.parse(q.hints) : []);
      const hintText = hintsArray[0] || null;
      // Prefer explicit DB 'example' column; fallback to legacy 'explanation' or second hint
      const exampleText = q.example || q.explanation || hintsArray[1] || null;
      if (q.qtype === 'mcq') {
        const optionsArray: string[] = Array.isArray(q.options) ? q.options : (q.options ? JSON.parse(q.options) : []);
        const answerArray: string[] = Array.isArray(q.answer_key) ? q.answer_key : (q.answer_key ? JSON.parse(q.answer_key) : []);
        const options = optionsArray.map((text, idx) => ({ key: LETTERS[idx] || String(idx+1), text }));
        const correctText = answerArray[0];
        const correctIndex = optionsArray.findIndex(t => t === correctText);
        const correctKey = correctIndex >= 0 ? (LETTERS[correctIndex] || String(correctIndex+1)) : (LETTERS[0] || 'A');
        return {
          id: Number(q.id),
          subtopic_id: Number(q.subtopic_id),
          difficulty: mapDifficulty(q.difficulty as 'E'|'M'|'H'),
          qtype: 'mcq',
          prompt: q.prompt,
          options,
          answer_key: { correct: correctKey },
          hint: hintText,
          example: exampleText,
          explanation: q.explanation || null,
          hints: hintsArray,
          enabled: q.enabled,
        };
      }
      // Treat unknown types (e.g., 'code', 'short') as short-answer
      return {
        id: Number(q.id),
        subtopic_id: Number(q.subtopic_id),
        difficulty: mapDifficulty(q.difficulty as 'E'|'M'|'H'),
        qtype: 'short',
        prompt: q.prompt,
        answer_key: { regex: '.*' },
        hint: hintText,
        example: exampleText,
        explanation: q.explanation || null,
        hints: hintsArray,
        enabled: q.enabled,
      };
    });
  }

  async function startSession() {
    try {
      if (!subtopicKey) {
        alert('No subtopic selected. Please start from a subtopic details page.');
        return;
      }
      if (!userId) {
        alert('You are not signed in. Please sign in again.');
        return;
      }

      // Resolve subtopic ID by key
      const subtopic = await DatabaseClient.getSubtopic(subtopicKey);
      if (!subtopic) {
        console.error('Invalid subtopic');
        return;
      }

      // Ensure user profile row exists for FK (sessions.user_id -> users.id)
      const { data: authData } = await supabase.auth.getUser();
      const authEmail = authData.user?.email || '';
      await DatabaseClient.ensureUserRecord(userId, authEmail);

      // Create DB session
      const dbSession = await DatabaseClient.createSession({
        user_id: userId,
        subtopic_id: subtopic.id,
        mode,
      });

      // Fetch questions from DB: 1E/2M/2H (random within pools)
      let questionsOverride: any[] | undefined = undefined;
      try {
        const dbQuestions = await DatabaseClient.getQuestionsForSession(String(subtopic.id));
        if (dbQuestions && dbQuestions.length > 0) {
          questionsOverride = transformDbQuestions(dbQuestions) as any[];
        }
      } catch (qErr) {
        console.error('Question fetch failed; falling back to mock:', qErr);
      }

      // Initialize session engine
      const initialState = sessionEngine.initialize(
        Number(dbSession.id),
        userId,
        Number(subtopic.id),
        mode,
        (state) => setSessionState(state),
        questionsOverride
      );

      setSessionState(initialState);
    } catch (err: any) {
      console.error('Failed to start session:', err);
      const msg = err?.message || JSON.stringify(err);
      alert(`Failed to start session: ${msg}`);
    }
  }

  function handleAnswerChange(answer: Answer) {
    setCurrentAnswer(answer);
  }

  async function handleSubmit() {
    if (!currentAnswer || !sessionState) return;
    
    await sessionEngine.submitAnswer(currentAnswer);
    setCurrentAnswer(null);
  }

  function handleSkip() {
    if (!sessionState) return;
    sessionEngine.requestSkipConfirmation();
  }

  function handleRequestExtraTime() {
    sessionEngine.requestExtraTime();
  }

  function handleSkipQuestion() {
    sessionEngine.requestSkipConfirmation();
  }

  async function handleConfirmSkip() {
    await sessionEngine.skipQuestion();
  }

  function handleCancelSkip() {
    sessionEngine.cancelSkipConfirmation();
  }

  function handleDismissStressor() {
    sessionEngine.dismissStressor();
  }

  function handleUseHint(type: 'hint' | 'example') {
    sessionEngine.useHint(type);
  }

  function handleNextQuestion() {
    sessionEngine.nextQuestion();
    setCurrentAnswer(null);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionEngine.cleanup();
      liveStreamsManager.cleanup();
    };
  }, []);

  if (!sessionState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="text-center mb-8 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">🚀</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Ready to Start?</h1>
            <p className="text-gray-600 dark:text-gray-300">
              You'll work through 10 questions with real-time monitoring and adaptive support.
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">🎯</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Mode: {mode === "support" ? "Support" : "No-Support"}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {mode === "support" 
                      ? "Hints and examples available. Encouragement and rest suggestions will appear."
                      : "Work independently. Only technical alerts will be shown."
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {mode === "support" ? (
                  <>
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full font-medium">Hints Available</span>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">Encouragement</span>
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full font-medium">Rest Suggestions</span>
                  </>
                ) : (
                  <>
                    <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full font-medium">Independent</span>
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full font-medium">Technical Alerts Only</span>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full font-medium">Challenge Mode</span>
                  </>
                )}
              </div>
            </div>
            
            <button
              onClick={startSession}
              className="w-full rounded-xl px-6 py-4 btn-primary text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Start Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = sessionState.questions[sessionState.currentQuestionIndex];
  const progress = ((sessionState.currentQuestionIndex + 1) / sessionState.questions.length) * 100;
  const isLastQuestion = sessionState.currentQuestionIndex === sessionState.questions.length - 1;
  const currentConfig = SCHEDULE[sessionState.currentQuestionIndex];
  
  // Calculate progress based on extended time limit
  const timeProgress = sessionState.extendedTimeLimit > 0 
    ? ((sessionState.extendedTimeLimit - sessionState.timeRemaining) / sessionState.extendedTimeLimit) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border shadow-lg mb-6 transition-all duration-300 ${
          showTenSecondWarning 
            ? 'border-red-300 dark:border-red-700 ring-2 ring-red-200 dark:ring-red-800' 
            : 'border-purple-200/30 dark:border-purple-800/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-sm">📚</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Data Structures Practice</h1>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Question {sessionState.currentQuestionIndex + 1} of 5 • {currentConfig?.level || 'Loading'} • {currentConfig?.points ? Number(currentConfig.points.toFixed(1)) : '0'} pts
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <div className={`text-2xl font-bold transition-colors ${
                  showTenSecondWarning ? 'text-red-600 dark:text-red-400' : 'gradient-text'
                }`}>
                  {Math.floor(sessionState.timeRemaining / 60)}:{(sessionState.timeRemaining % 60).toString().padStart(2, '0')}
                </div>
                {sessionState.showExtraTimeFeedback && (
                  <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full text-sm font-medium animate-pulse">
                    +{sessionState.extraTimeAdded}s
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Time remaining</div>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Score: {Number(sessionState.totalScore.toFixed(1))}
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className="gradient-bg h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Ten Second Warning */}
        {showTenSecondWarning && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="text-red-600 dark:text-red-400 text-lg">⚠️</span>
              <span className="text-red-800 dark:text-red-200 font-semibold">
                Time running out! {sessionState.timeRemaining} seconds remaining.
              </span>
            </div>
          </div>
        )}

        {/* Extra Time Feedback */}
        {sessionState.showExtraTimeFeedback && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400 text-lg">⏰</span>
              <span className="text-green-800 dark:text-green-200 font-semibold">
                Extra time granted: +{sessionState.extraTimeAdded}s (-2 points)
              </span>
            </div>
          </div>
        )}

        {/* Stressor Banner */}
        {sessionState.showStressor && (
          <StressorBanner
            isVisible={sessionState.showStressor}
            onDismiss={handleDismissStressor}
            timeLimit={currentConfig?.limit || 0}
            timeElapsed={(currentConfig?.limit || 0) - sessionState.timeRemaining}
          />
        )}

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Question */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
              {sessionState.showReveal ? (
                <RevealCard
                  question={currentQuestion}
                  isCorrect={sessionState.scores[sessionState.currentQuestionIndex] > 0}
                  pointsAwarded={sessionState.scores[sessionState.currentQuestionIndex]}
                  onNext={handleNextQuestion}
                  isLastQuestion={isLastQuestion}
                />
              ) : (
                <div className="space-y-6">
                  <QuestionRenderer
                    question={currentQuestion}
                    answer={currentAnswer}
                    onAnswerChange={handleAnswerChange}
                    disabled={sessionState.isPaused}
                  />

                  <div className="flex gap-4">
                    <button
                      onClick={handleSubmit}
                      disabled={!currentAnswer || sessionState.isPaused}
                      className="flex-1 rounded-xl px-6 py-3 btn-primary text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      Submit Answer
                    </button>
                    <button
                      onClick={handleSkip}
                      disabled={sessionState.isPaused}
                      className="px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Support Panel */}
          <div className="min-h-[400px]">
            {mode === "support" && !sessionState.showReveal ? (
              <HintPanel
                question={currentQuestion}
                hintsUsed={sessionState.hintsUsed[sessionState.currentQuestionIndex]}
                onUseHint={handleUseHint}
                disabled={sessionState.isPaused}
              />
            ) : (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-4 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg gradient-bg flex items-center justify-center">
                    <span className="text-white text-xs">💡</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Support</h3>
                </div>
                <div className="text-center py-8">
                  <div className="text-gray-400 dark:text-gray-500 text-sm">
                    {mode === "support" ? "Answer submitted" : "Support not available"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live Monitoring */}
          <div className="sticky top-6">
            <SessionRightPanel
              difficulty={currentConfig?.level === 'easy' ? 1 : currentConfig?.level === 'medium' ? 2 : 3}
              hintsUsed={sessionState.hintsUsed[sessionState.currentQuestionIndex]}
              timeWarning={showTenSecondWarning}
            />
          </div>
        </div>
      </div>

      {/* Time Up Modal */}
      {sessionState.showTimeUpModal && (
        <TimeUpModal
          isOpen={sessionState.showTimeUpModal}
          onClose={() => {}}
          onRequestExtraTime={handleRequestExtraTime}
          onSkipQuestion={handleSkipQuestion}
          extraTimeUsed={sessionState.extraTimeUsed[sessionState.currentQuestionIndex]}
          originalTimeLimit={currentConfig?.limit || 0}
        />
      )}

      {/* Skip Confirmation Modal */}
      {sessionState.showSkipConfirmation && (
        <ConfirmModal
          isOpen={sessionState.showSkipConfirmation}
          title="Confirm Skip"
          message="You cannot return to this question once skipped. Are you sure?"
          confirmText="Yes, Skip Question"
          cancelText="Cancel"
          onConfirm={handleConfirmSkip}
          onCancel={handleCancelSkip}
          variant="warning"
        />
      )}
    </div>
  );
}