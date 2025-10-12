export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%238b5cf6%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div>
        <div className="relative mx-auto max-w-6xl px-4 py-20">
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
              AI-Powered Learning Analytics
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="gradient-text">Master Data Structures</span>
              <br />
              <span className="text-gray-900 dark:text-white">with Smart Monitoring</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
              Practice 10-question Data Structures tasks while our AI estimates your cognitive load using
              webcam attention tracking and heart-rate monitoring. Get personalized insights and downloadable reports.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <a href="/auth/sign-up" className="px-8 py-4 rounded-xl btn-primary text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300">
                Start Learning Free
              </a>
              <a href="#features" className="px-8 py-4 rounded-xl border-2 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 font-semibold text-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300">
                See How It Works
              </a>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-md mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold gradient-text">10</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Questions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold gradient-text">6</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Topics</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold gradient-text">∞</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Insights</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose <span className="gradient-text">CLES</span>?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Experience the future of personalized learning with AI-powered cognitive load monitoring
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group card-hover bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-8 border border-purple-200/30 dark:border-purple-800/30">
              <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Real-time Monitoring</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Get instant feedback on your cognitive load with webcam attention tracking and heart-rate monitoring. 
                Receive encouragement and rest suggestions when needed.
              </p>
            </div>
            
            <div className="group card-hover bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-8 border border-blue-200/30 dark:border-blue-800/30">
              <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Detailed Analytics</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Comprehensive reports showing intrinsic, extraneous, and germane cognitive load breakdown. 
                Track your progress with downloadable PDF reports.
              </p>
            </div>
            
            <div className="group card-hover bg-gradient-to-br from-green-50 to-purple-50 dark:from-green-900/20 dark:to-purple-900/20 rounded-2xl p-8 border border-green-200/30 dark:border-green-800/30">
              <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Adaptive Learning</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Choose between Support and No-Support modes. Get personalized recommendations based on 
                your performance and cognitive load patterns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            About <span className="gradient-text">CLES</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
            CLES focuses on Data Structures mastery with six core topics: Array, Linked List, Stack, Queue, Tree, and Sorting. 
            Each session consists of exactly 10 questions designed to challenge and improve your understanding.
          </p>
          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">🎓 For Students</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Track your learning progress, identify challenging concepts, and get personalized study recommendations.
              </p>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">👨‍🏫 For Instructors</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Monitor student engagement, understand learning patterns, and optimize your teaching approach.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
