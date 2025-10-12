"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/storage";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const currentUser = getCurrentUser();
    setUser(currentUser);

    // Listen for storage changes to update user state
    const handleStorageChange = () => {
      const updatedUser = getCurrentUser();
      setUser(updatedUser);
    };

    // Listen for custom storage events
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events (for same-tab updates)
    window.addEventListener('userUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userUpdated', handleStorageChange);
    };
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showProfileMenu) {
        const target = event.target as Element;
        if (!target.closest('.profile-dropdown')) {
          setShowProfileMenu(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  function handleLogout() {
    localStorage.removeItem('cles-current-user');
    setUser(null);
    // Dispatch custom event to update header
    window.dispatchEvent(new CustomEvent('userUpdated'));
    router.push('/');
  }

  function handleProfileClick() {
    setShowProfileMenu(!showProfileMenu);
  }

  // Don't render anything on server-side to avoid hydration mismatch
  if (!isClient) {
    return (
      <header className="w-full border-b border-purple-200/30 dark:border-purple-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-gray-900/80 sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 font-bold text-xl">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="gradient-text">CLES</span>
          </a>
          <div className="flex items-center gap-3">
            <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="w-full border-b border-purple-200/30 dark:border-purple-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-gray-900/80 sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <a href={user ? "/home" : "/"} className="flex items-center gap-3 font-bold text-xl">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="gradient-text">CLES</span>
        </a>
        
        {user ? (
          // Authenticated user navigation
          <>
            <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
              <a 
                href="/home" 
                className={`transition-colors ${
                  pathname === '/home' 
                    ? 'text-purple-600 dark:text-purple-400 font-semibold' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                Tasks
              </a>
              <a 
                href="/reports" 
                className={`transition-colors ${
                  pathname.startsWith('/reports') 
                    ? 'text-purple-600 dark:text-purple-400 font-semibold' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                Reports
              </a>
            </nav>
            
            <div className="flex items-center gap-3">
              {/* Profile Dropdown */}
              <div className="relative profile-dropdown">
                <button
                  onClick={handleProfileClick}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user.email}
                  </span>
                  <svg 
                    className={`w-4 h-4 text-gray-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-purple-200/30 dark:border-purple-800/30 py-2 z-50 animate-slide-up">
                    <a
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <div className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center">
                        <span className="text-white font-bold text-xs">👤</span>
                      </div>
                      View Profile
                    </a>
                    <hr className="my-2 border-gray-200 dark:border-gray-700" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left"
                    >
                      <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <span className="text-red-600 dark:text-red-400 text-xs">🚪</span>
                      </div>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          // Public navigation
          <>
            <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
              <a href="/#features" className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Features</a>
              <a href="/#about" className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">About</a>
            </nav>
            <div className="flex items-center gap-3">
              <a href="/auth/sign-in" className="text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-medium">Sign In</a>
              <a href="/auth/sign-up" className="text-sm rounded-lg px-4 py-2 btn-primary text-white font-medium">Get Started</a>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
