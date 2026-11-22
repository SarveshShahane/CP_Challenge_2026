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
  total_contests?: number
  leetcode_contests?: number
  codeforces_contests?: number
  rating_increment?: number
  leetcode_rating_diff?: number
  codeforces_rating_diff?: number
  streak?: number
  total_active_days?: number
  active_days?: number
  challenge_ac?: number
  baseline_ac_count?: number
  ac_count?: number
  easy_ac?: number
  medium_ac?: number
  hard_ac?: number
  updated_at?: string
  contests_updated_at?: string
}

function normalizeHandle(input?: string): string {
  if (!input) return ''
  const clean = input.trim().split('?')[0].replace(/\/+$/, '')
  const parts = clean.split('/')
  return (parts[parts.length - 1] || '').replace(/^@/, '').trim()
}

type TrackType = 'competitive' | 'beginner'
type ThemeMode = 'dark' | 'light'

const App = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme') as ThemeMode | null
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const [activeTrack, setActiveTrack] = useState<TrackType>('competitive')
  const [search, setSearch] = useState('')
  const [batchFilter, setBatchFilter] = useState('all')

  const [competitiveList, setCompetitiveList] = useState<Participant[]>([])
  const [beginnerList, setBeginnerList] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch_users()
      const data = res.data || {}

      let cp: Participant[] = []
      let bg: Participant[] = []

      const sanitize = (list: Participant[]) =>
        list.map(u => ({
          ...u,
          leetcode_id: normalizeHandle(u.leetcode_id),
          codeforces_id: normalizeHandle(u.codeforces_id),
        }))

      if (data.competitive && data.beginner) {
        cp = sanitize(data.competitive)
        bg = sanitize(data.beginner)
      } else if (Array.isArray(data.users)) {
        const sanitized = sanitize(data.users)
        const isBg = (t?: string) => {
          const s = (t || '').toLowerCase()
          return s.includes('beginner') || s.includes('both')
        }
        const isCp = (t?: string) => {
          const s = (t || '').toLowerCase()
          return s.includes('competitive') || s.includes('both') || !s.includes('beginner')
        }
        cp = sanitized.filter((u: Participant) => isCp(u.track))
        bg = sanitized.filter((u: Participant) => isBg(u.track))
      }

      setCompetitiveList(cp)
      setBeginnerList(bg)
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
        const adA = a.total_active_days ?? a.active_days ?? 0
        const adB = b.total_active_days ?? b.active_days ?? 0
        if (adB !== adA) return adB - adA
        const cacA = a.challenge_ac ?? 0
        const cacB = b.challenge_ac ?? 0
        if (cacB !== cacA) return cacB - cacA
        const acA = a.ac_count || 0
        const acB = b.ac_count || 0
        if (acB !== acA) return acB - acA
        return (b.streak || 0) - (a.streak || 0)
      }
    })
  }, [activeTrack, competitiveList, beginnerList, search, batchFilter])

  return (
    <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 font-sans selection:bg-neutral-200 dark:selection:bg-neutral-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        {/* Navigation Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black flex items-center justify-center font-mono font-bold text-sm tracking-wider">
              CP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight">Co.L.D CP Marathon 3.0</h1>
              
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-1.5 rounded-md text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 transition"
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Track Selector & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-6 pb-4">
          
          {/* Segmented Track Switcher */}
          <div className="inline-flex p-1 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-medium">
            <button
              onClick={() => setActiveTrack('competitive')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-2 ${
                activeTrack === 'competitive'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              <span>Competitive Track</span>
              <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                activeTrack === 'competitive'
                  ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
                  : 'text-neutral-400'
              }`}>
                {competitiveList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTrack('beginner')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-2 ${
                activeTrack === 'beginner'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              <span>Beginner Track</span>
              <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                activeTrack === 'beginner'
                  ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
                  : 'text-neutral-400'
              }`}>
                {beginnerList.length}
              </span>
            </button>
          </div>

          {/* Search & Batch Filters */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search participant..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={batchFilter}
              onChange={e => setBatchFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:border-neutral-400 cursor-pointer"
            >
              <option value="all">All Batches</option>
              <option value="2026">Batch 2026</option>
              <option value="2025">Batch 2025</option>
              <option value="2024">Batch 2024</option>
            </select>
          </div>
        </div>

        {/* Track Objective Meta Banner */}
        <div className="text-xs text-neutral-500 dark:text-neutral-400 pb-3 flex items-center justify-between">
          <div>
            {activeTrack === 'competitive' ? (
              <span>Ranked by <strong>Contests Attended</strong> (LeetCode + Codeforces). Tie-breaker: <strong>Net Rating Δ</strong>.</span>
            ) : (
              <span>Ranked by <strong>Active Days</strong> on LeetCode. Tie-breaker: <strong>Accepted Questions (Challenge)</strong>.</span>
            )}
          </div>
          <span className="font-mono text-[11px] text-neutral-400">
            {currentList.length} {currentList.length === 1 ? 'participant' : 'participants'}
          </span>
        </div>

        {/* Leaderboard Table Container */}
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-950">
          {loading ? (
            <div className="py-24 text-center">
              <div className="inline-block w-5 h-5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-xs text-neutral-400 font-mono">Loading participants...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center px-4">
              <p className="text-xs font-mono text-rose-500 mb-2">{error}</p>
              <button
                onClick={loadData}
                className="text-xs font-mono px-3 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
              >
                Retry
              </button>
            </div>
          ) : currentList.length === 0 ? (
            <div className="py-20 text-center text-xs text-neutral-400 font-mono">
              {search || batchFilter !== 'all' ? 'No matching participants found.' : 'No participants registered in this track.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 text-[11px] font-mono font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-4">Participant</th>
                    <th className="py-2.5 px-4">Handles</th>
                    {activeTrack === 'competitive' ? (
                      <>
                        <th className="py-2.5 px-4 text-right">Contests</th>
                        <th className="py-2.5 px-4 text-right">Net Rating Δ</th>
                        <th className="py-2.5 px-4 text-right">LC / CF</th>
                      </>
                    ) : (
                      <>
                        <th className="py-2.5 px-4 text-right">Active Days</th>
                        <th className="py-2.5 px-4 text-right">Challenge AC</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                  {currentList.map((student, idx) => {
                    const rank = idx + 1
                    const isTop1 = rank === 1
                    const isTop2 = rank === 2
                    const isTop3 = rank === 3

                    return (
                      <tr
                        key={student.enr_no || student.enrollment_number || idx}
                        className="hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors"
                      >
                        {/* Rank */}
                        <td className="py-3 px-3 text-center font-mono font-semibold text-xs">
                          {isTop1 ? (
                            <span className="text-amber-500 font-bold">01</span>
                          ) : isTop2 ? (
                            <span className="text-neutral-400 font-bold">02</span>
                          ) : isTop3 ? (
                            <span className="text-amber-700 dark:text-amber-600 font-bold">03</span>
                          ) : (
                            <span className="text-neutral-400 font-normal">
                              {rank < 10 ? `0${rank}` : rank}
                            </span>
                          )}
                        </td>

                        {/* Participant Details */}
                        <td className="py-3 px-4">
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium text-neutral-900 dark:text-neutral-100">
                              {student.name}
                            </span>
                            {student.batch_no && (
                              <span className="text-[10px] font-mono text-neutral-400">
                                &apos;{student.batch_no.toString().slice(-2)}
                              </span>
                            )}
                            
                          </div>
                          <span className="text-[11px] font-mono text-neutral-400 block mt-0.5">
                            {student.enr_no || student.enrollment_number || '—'}
                          </span>
                        </td>

                        {/* Handles */}
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            {student.leetcode_id && (
                              <a
                                href={`https://leetcode.com/${student.leetcode_id}/`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 underline decoration-neutral-300 dark:decoration-neutral-700 underline-offset-2 transition"
                              >
                                lc/{student.leetcode_id}
                              </a>
                            )}
                            {student.codeforces_id && (
                              <a
                                href={`https://codeforces.com/profile/${student.codeforces_id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 underline decoration-neutral-300 dark:decoration-neutral-700 underline-offset-2 transition"
                              >
                                cf/{student.codeforces_id}
                              </a>
                            )}
                            {!student.leetcode_id && !student.codeforces_id && (
                              <span className="text-neutral-400">—</span>
                            )}
                          </div>
                        </td>

                        {activeTrack === 'competitive' ? (
                          <>
                            {/* Total Contests */}
                            <td className="py-3 px-4 text-right font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                              {student.total_contests || 0}
                            </td>

                            {/* Net Rating Delta */}
                            <td className="py-3 px-4 text-right font-mono font-medium">
                              {(student.rating_increment || 0) > 0 ? (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  +{student.rating_increment}
                                </span>
                              ) : (student.rating_increment || 0) < 0 ? (
                                <span className="text-rose-600 dark:text-rose-400">
                                  {student.rating_increment}
                                </span>
                              ) : (
                                <span className="text-neutral-400">0</span>
                              )}
                            </td>

                            {/* Contest Breakdown */}
                            <td className="py-3 px-4 text-right font-mono text-[11px] text-neutral-500">
                              <span>{student.leetcode_contests || 0}</span>
                              <span className="text-neutral-300 dark:text-neutral-700 mx-1">/</span>
                              <span>{student.codeforces_contests || 0}</span>
                            </td>
                          </>
                        ) : (
                          <>
                            {/* Active Days */}
                            <td className="py-3 px-4 text-right font-mono font-semibold">
                              {(student.total_active_days ?? student.active_days ?? 0) > 0 ? (
                                <span className="text-orange-600 dark:text-orange-400">
                                  {student.total_active_days ?? student.active_days}d
                                </span>
                              ) : (
                                <span className="text-neutral-400">0d</span>
                              )}
                            </td>

                            {/* Challenge AC */}
                            <td className="py-3 px-4 text-right font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                              {student.challenge_ac ?? 0}
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

        {/* Minimal Footer */}
        <footer className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-900 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-neutral-400 font-mono gap-2">
          <span>Co.L.D — Code Learn Discuss</span>
        </footer>

      </div>
    </div>
  )
}

export default App
