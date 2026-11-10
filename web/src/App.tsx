import { useEffect, useState, useMemo } from 'react'
import { fetch_users } from './api/api'

interface Participant {
  name: string
  enr_no?: string
  enrollment_number?: string
  batch_no?: string
  track?: string
  email?: string
  leetcode_id?: string
  codeforces_id?: string
  // Competitive Track metrics
  total_contests?: number
  leetcode_contests?: number
  codeforces_contests?: number
  rating_increment?: number
  leetcode_rating_diff?: number
  codeforces_rating_diff?: number
  // Beginner Track metrics
  streak?: number
  total_active_days?: number
  ac_count?: number
  easy_ac?: number
  medium_ac?: number
  hard_ac?: number
  updated_at?: string
  contests_updated_at?: string
}

type TrackType = 'competitive' | 'beginner'
type ThemeMode = 'dark' | 'light'

const App = () => {
  // Theme state with local persistence
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme') as ThemeMode | null
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  // Track selection
  const [activeTrack, setActiveTrack] = useState<TrackType>('competitive')

  // Search & Batch filter
  const [search, setSearch] = useState('')
  const [batchFilter, setBatchFilter] = useState('all')

  // Data states
  const [competitiveList, setCompetitiveList] = useState<Participant[]>([])
  const [beginnerList, setBeginnerList] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // Sync theme with document class & attribute
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.setAttribute('data-theme', 'dark')
    } else {
      root.classList.remove('dark')
      root.setAttribute('data-theme', 'light')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  // Load participants from backend API
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch_users()
      const data = res.data || {}

      let cp: Participant[] = []
      let bg: Participant[] = []

      if (data.competitive && data.beginner) {
        cp = data.competitive
        bg = data.beginner
      } else if (Array.isArray(data.users)) {
        cp = data.users.filter((u: Participant) => !((u.track || '').toLowerCase().includes('beginner')))
        bg = data.users.filter((u: Participant) => (u.track || '').toLowerCase().includes('beginner'))
      }

      setCompetitiveList(cp)
      setBeginnerList(bg)
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    } catch (err: unknown) {
      console.error('Failed to load leaderboard data:', err)
      const message = err instanceof Error ? err.message : 'Failed to fetch leaderboard data'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter and sort for the active track
  const currentList = useMemo(() => {
    const base = activeTrack === 'competitive' ? competitiveList : beginnerList

    const filtered = base.filter(item => {
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.enr_no || item.enrollment_number || '').toLowerCase().includes(q) ||
        (item.leetcode_id || '').toLowerCase().includes(q) ||
        (item.codeforces_id || '').toLowerCase().includes(q)

      const matchBatch =
        batchFilter === 'all' ||
        (item.batch_no || '').toString() === batchFilter

      return matchSearch && matchBatch
    })

    return filtered.sort((a, b) => {
      if (activeTrack === 'competitive') {
        const cA = a.total_contests || 0
        const cB = b.total_contests || 0
        if (cB !== cA) return cB - cA
        return (b.rating_increment || 0) - (a.rating_increment || 0)
      } else {
        const sA = a.streak || 0
        const sB = b.streak || 0
        if (sB !== sA) return sB - sA
        const acA = a.ac_count || 0
        const acB = b.ac_count || 0
        if (acB !== acA) return acB - acA
        return (b.total_active_days || 0) - (a.total_active_days || 0)
      }
    })
  }, [activeTrack, competitiveList, beginnerList, search, batchFilter])

  const topThree = currentList.slice(0, 3)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Co.L.D CP Marathon 3.0
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Starts 15 Nov 2026
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Leaderboard Arena
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
              3-Month Consistency & Competitive Programming Marathon
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {lastUpdated && (
              <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
                Updated {lastUpdated}
              </span>
            )}
            <button
              onClick={loadData}
              title="Refresh Leaderboard"
              aria-label="Refresh Leaderboard"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              Refresh
            </button>

            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {theme === 'dark' ? (
                <>
                  <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                  </svg>
                  Light
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                  Dark
                </>
              )}
            </button>
          </div>
        </header>

        {/* Track Segmented Selector Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setActiveTrack('competitive')}
            className={`flex flex-col text-left p-5 rounded-2xl border-2 transition-all relative overflow-hidden shadow-sm ${
              activeTrack === 'competitive'
                ? 'border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-900 shadow-md ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {activeTrack === 'competitive' && (
              <span className="absolute top-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-500"></span>
            )}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🏆</span>
                <span className="font-bold text-lg">Competitive Track</span>
              </div>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                {competitiveList.length} Competitors
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Ranked by contest participation on Codeforces & LeetCode. Tie-breaker: net rating gain.
            </p>
          </button>

          <button
            onClick={() => setActiveTrack('beginner')}
            className={`flex flex-col text-left p-5 rounded-2xl border-2 transition-all relative overflow-hidden shadow-sm ${
              activeTrack === 'beginner'
                ? 'border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-900 shadow-md ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {activeTrack === 'beginner' && (
              <span className="absolute top-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-500"></span>
            )}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🔥</span>
                <span className="font-bold text-lg">Beginner&apos;s Track</span>
              </div>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                {beginnerList.length} Learners
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Daily problem-solving streak marathon on LeetCode. Tie-breaker: accepted problems count.
            </p>
          </button>
        </div>

        {/* Podium Showcase (Top 3) */}
        {!loading && topThree.length > 0 && !search && batchFilter === 'all' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {topThree.map((item, index) => {
              const rank = index + 1
              const borderColors =
                rank === 1
                  ? 'border-t-amber-400 dark:border-t-amber-400'
                  : rank === 2
                  ? 'border-t-slate-400 dark:border-t-slate-400'
                  : 'border-t-amber-600 dark:border-t-amber-600'
              const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
              const label = rank === 1 ? '1st Place' : rank === 2 ? '2nd Place' : '3rd Place'

              return (
                <div
                  key={item.enr_no || item.enrollment_number || index}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 border-t-4 ${borderColors} shadow-sm hover:shadow-md transition flex flex-col justify-between`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">{medal}</span>
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {label}
                    </span>
                  </div>
                  <div className="mb-4">
                    <h3 className="font-bold text-lg truncate text-slate-900 dark:text-slate-100">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.enr_no || item.enrollment_number || `Batch ${item.batch_no || 'N/A'}`}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-black tabular-nums">
                        {activeTrack === 'competitive'
                          ? (item.total_contests || 0)
                          : `${item.streak || 0}d`}
                      </div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {activeTrack === 'competitive' ? 'Contests Given' : 'Daily Streak'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black tabular-nums">
                        {activeTrack === 'competitive' ? (
                          <span
                            className={
                              (item.rating_increment || 0) >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {(item.rating_increment || 0) > 0 ? `+${item.rating_increment}` : item.rating_increment || 0}
                          </span>
                        ) : (
                          item.ac_count || 0
                        )}
                      </div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {activeTrack === 'competitive' ? 'Net Rating' : 'AC Solved'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Search & Batch Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search by name, enrollment, or handle..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={batchFilter}
              onChange={e => setBatchFilter(e.target.value)}
              aria-label="Filter by batch"
              className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
            >
              <option value="all">All Batches</option>
              <option value="2026">Batch 2026</option>
              <option value="2025">Batch 2025</option>
              <option value="2024">Batch 2024</option>
            </select>
          </div>
        </div>

        {/* Main Leaderboard Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin"></div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">Loading Leaderboard...</p>
              <p className="text-xs text-slate-400">Fetching live scores from DynamoDB</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-2 px-4">
              <span className="text-3xl">⚠️</span>
              <p className="font-bold text-rose-600 dark:text-rose-400">Failed to load leaderboard</p>
              <p className="text-xs text-slate-500 max-w-md">{error}</p>
              <button
                onClick={loadData}
                className="mt-3 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                Retry
              </button>
            </div>
          ) : currentList.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-2 px-4">
              <span className="text-3xl">🔍</span>
              <p className="font-bold">No participants found</p>
              <p className="text-xs text-slate-400">
                {search || batchFilter !== 'all'
                  ? 'Try broadening your search keyword or batch filter.'
                  : 'No participants registered in this track yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <th className="py-3.5 px-4 w-16">Rank</th>
                    <th className="py-3.5 px-4">Participant</th>
                    <th className="py-3.5 px-4">Profiles</th>
                    {activeTrack === 'competitive' ? (
                      <>
                        <th className="py-3.5 px-4">Contests Attended</th>
                        <th className="py-3.5 px-4">Net Rating Delta</th>
                        <th className="py-3.5 px-4">Breakdown</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3.5 px-4">Daily Streak</th>
                        <th className="py-3.5 px-4">Total Accepted</th>
                        <th className="py-3.5 px-4">Problem Difficulty</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentList.map((student, idx) => {
                    const rank = idx + 1
                    const rankBadge =
                      rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`

                    return (
                      <tr
                        key={student.enr_no || student.enrollment_number || idx}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-4 px-4 font-bold tabular-nums">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                              rank === 1
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                                : rank === 2
                                ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                                : rank === 3
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {rankBadge}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {student.name}
                              </span>
                              {student.batch_no && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {student.batch_no}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 font-mono">
                              {student.enr_no || student.enrollment_number || 'N/A'}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            {student.leetcode_id && (
                              <a
                                href={`https://leetcode.com/${student.leetcode_id}/`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 transition"
                                title="LeetCode profile"
                              >
                                <span>LC:</span> {student.leetcode_id}
                                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                  <polyline points="15 3 21 3 21 9"></polyline>
                                  <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                              </a>
                            )}
                            {student.codeforces_id && (
                              <a
                                href={`https://codeforces.com/profile/${student.codeforces_id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 transition"
                                title="Codeforces profile"
                              >
                                <span>CF:</span> {student.codeforces_id}
                                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                  <polyline points="15 3 21 3 21 9"></polyline>
                                  <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                              </a>
                            )}
                            {!student.leetcode_id && !student.codeforces_id && (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </div>
                        </td>

                        {activeTrack === 'competitive' ? (
                          <>
                            <td className="py-4 px-4 font-bold text-base tabular-nums">
                              {student.total_contests || 0}
                              <span className="text-xs font-normal text-slate-400 ml-1">contests</span>
                            </td>
                            <td className="py-4 px-4">
                              {(student.rating_increment || 0) >= 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 tabular-nums">
                                  +{student.rating_increment || 0}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 tabular-nums">
                                  {student.rating_increment || 0}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                                  LC: {student.leetcode_contests || 0}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                                  CF: {student.codeforces_contests || 0}
                                </span>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-4 px-4 font-bold text-base tabular-nums">
                              <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 font-black">
                                🔥 {student.streak || 0}
                              </span>
                              <span className="text-xs font-normal text-slate-400 ml-1">days</span>
                            </td>
                            <td className="py-4 px-4 font-bold text-base tabular-nums">
                              {student.ac_count || 0}
                              <span className="text-xs font-normal text-slate-400 ml-1">solved</span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-1.5 text-xs font-semibold">
                                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                                  E: {student.easy_ac || 0}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                                  M: {student.medium_ac || 0}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                                  H: {student.hard_ac || 0}
                                </span>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Scoring & Rules Footer */}
        <footer className="mt-8 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 shadow-sm flex items-start gap-3">
          <span className="text-lg">ℹ️</span>
          <div>
            <span className="font-bold text-slate-700 dark:text-slate-300">Marathon Scoring & Tie-Break Rules:</span>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>
                <strong>Competitive Track:</strong> Ranked by total contests attended on LeetCode & Codeforces from 15 Nov 2026 onwards. In case of a tie, the higher net rating increment wins.
              </li>
              <li>
                <strong>Beginner&apos;s Track:</strong> Ranked by longest consecutive daily LeetCode problem streak. In case of a tie, total accepted problems solved breaks the tie.
              </li>
            </ul>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App
