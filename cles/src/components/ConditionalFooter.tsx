'use client'

import { usePathname } from 'next/navigation'

export default function ConditionalFooter() {
  const pathname = usePathname()

  // Don't show footer on admin routes
  if (pathname?.startsWith('/admin')) {
    return null
  }

  return (
    <footer className="w-full border-t border-purple-200/30 dark:border-purple-800/30 mt-16 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-gray-600 dark:text-gray-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded gradient-bg flex items-center justify-center">
            <span className="text-white font-bold text-xs">C</span>
          </div>
          <span>© {new Date().getFullYear()} CLES</span>
        </div>
        <a href="https://vercel.com" target="_blank" rel="noreferrer" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
          Powered by Next.js
        </a>
      </div>
    </footer>
  )
}
