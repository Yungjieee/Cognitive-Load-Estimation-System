// Local storage utilities for CLES demo

export interface User {
  id: string;
  email: string;
  profile_completed: boolean;
  profile_prior_knowledge: Record<string, string>; // subtopic_key: level_enum
  profile_experience_taken_course: string; // 'yes' | 'no' | 'not_sure'
  profile_experience_hands_on: string; // 'none' | 'some_exercises' | 'small_project' | 'large_project'
  profile_interest_subtopics: string[]; // array of subtopic keys
  settings: {
    mode: 'support' | 'no_support';
  };
}

export interface Session {
  id: string;
  userId: string;
  subtopicId: string;
  mode: 'support' | 'no_support';
  startedAt: string;
  endedAt?: string;
  score: number;
  avgLoad: number;
  questions: Array<{
    id: number;
    load: number;
    intrinsic: number;
    extraneous: number;
    germane: number;
    correct: boolean;
    timeSpent: number;
  }>;
  hintsUsed: number[];
  extraTimeUsed: boolean[];
  events: Array<{
    time: string;
    type: string;
    description: string;
  }>;
}

// Storage keys
const STORAGE_KEYS = {
  CURRENT_USER: 'cles-current-user',
  USER_DATA: 'cles-user-data',
  SESSIONS: 'cles-sessions',
  REPORTS: 'cles-reports',
} as const;

// User management
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const userData = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return userData ? JSON.parse(userData) : null;
}

export function setCurrentUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
}

export function createUser(email: string): User {
  const user: User = {
    id: `user_${Date.now()}`,
    email,
    profile_completed: false,
    profile_prior_knowledge: {},
    profile_experience_taken_course: '',
    profile_experience_hands_on: '',
    profile_interest_subtopics: [],
    settings: {
      mode: 'support',
    },
  };
  
  setCurrentUser(user);
  return user;
}

export function updateUserProfile(userId: string, profileData: {
  profile_prior_knowledge?: Record<string, string>;
  profile_experience_taken_course?: string;
  profile_experience_hands_on?: string;
  profile_interest_subtopics?: string[];
}): void {
  if (typeof window === 'undefined') return;
  const user = getCurrentUser();
  if (user && user.id === userId) {
    if (profileData.profile_prior_knowledge) {
      user.profile_prior_knowledge = profileData.profile_prior_knowledge;
    }
    if (profileData.profile_experience_taken_course) {
      user.profile_experience_taken_course = profileData.profile_experience_taken_course;
    }
    if (profileData.profile_experience_hands_on) {
      user.profile_experience_hands_on = profileData.profile_experience_hands_on;
    }
    if (profileData.profile_interest_subtopics) {
      user.profile_interest_subtopics = profileData.profile_interest_subtopics;
    }
    user.profile_completed = true;
    setCurrentUser(user);
  }
}

export function updateUserSettings(userId: string, settings: Partial<User['settings']>): void {
  if (typeof window === 'undefined') return;
  const user = getCurrentUser();
  if (user && user.id === userId) {
    user.settings = { ...user.settings, ...settings };
    setCurrentUser(user);
  }
}

// Session management
export function createSession(userId: string, subtopicId: string, mode: 'support' | 'no_support'): Session {
  if (typeof window === 'undefined') {
    return {
      id: `session_${Date.now()}`,
      userId,
      subtopicId,
      mode,
      startedAt: new Date().toISOString(),
      score: 0,
      avgLoad: 0,
      questions: [],
      events: [],
      hintsUsed: [],
      extraTimeUsed: [],
    };
  }
  
  const session: Session = {
    id: `session_${Date.now()}`,
    userId,
    subtopicId,
    mode,
    startedAt: new Date().toISOString(),
    score: 0,
    avgLoad: 0,
    questions: [],
    events: [],
    hintsUsed: [],
    extraTimeUsed: [],
  };
  
  const sessions = getSessions();
  sessions.push(session);
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  
  return session;
}

export function getSessions(): Session[] {
  if (typeof window === 'undefined') return [];
  const sessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
  return sessions ? JSON.parse(sessions) : [];
}

export function getSessionsByUser(userId: string): Session[] {
  return getSessions().filter(session => session.userId === userId);
}

export function updateSession(sessionId: string, updates: Partial<Session>): void {
  if (typeof window === 'undefined') return;
  const sessions = getSessions();
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    sessions[index] = { ...sessions[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }
}


// Mock data generation
export function generateMockSessionData(subtopicId: string): { questions: Session['questions'], events: Session['events'] } {
  const questions = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    load: Math.random() * 0.6 + 0.2, // 0.2 to 0.8
    intrinsic: Math.random() * 0.4 + 0.1,
    extraneous: Math.random() * 0.3 + 0.1,
    germane: Math.random() * 0.4 + 0.1,
    correct: Math.random() > 0.3, // 70% success rate
    timeSpent: Math.random() * 120 + 30, // 30-150 seconds
  }));

  const events = [
    { time: '00:30', type: 'session_start', description: 'Session started' },
    { time: '02:15', type: 'hint_open', description: 'Opened hint for question 3' },
    { time: '05:20', type: 'rest_suggest', description: 'Suggested 30s break' },
    { time: '08:45', type: 'hint_open', description: 'Opened hint for question 6' },
    { time: '10:30', type: 'encouragement', description: 'Great focus message shown' },
    { time: '12:00', type: 'session_end', description: 'Session completed' },
  ];

  return { questions, events };
}

// Utility functions
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function calculateSessionDuration(startedAt: string, endedAt?: string): string {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function completeSession(
  sessionId: string,
  totalScore: number,
  percentage: number,
  questionData: Array<{
    id: number;
    load: number;
    intrinsic: number;
    extraneous: number;
    germane: number;
    correct: boolean;
    timeSpent: number;
  }>,
  events: Array<{
    time: string;
    type: string;
    description: string;
  }>,
  hintsUsed: number[],
  extraTimeUsed: boolean[]
): void {
  const sessions = getSessions();
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  
  if (sessionIndex !== -1) {
    sessions[sessionIndex] = {
      ...sessions[sessionIndex],
      endedAt: new Date().toISOString(),
      score: totalScore,
      avgLoad: questionData.reduce((sum, q) => sum + q.load, 0) / questionData.length,
      questions: questionData,
      events,
      hintsUsed,
      extraTimeUsed
    };
    
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }
}