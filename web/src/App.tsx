import { useEffect, useState } from 'react'
import { fetch_users } from './api/api'

interface User {
  name: string
  enr_no?: string
  enrollment_number?: string
  track?: string
  total_contests?: number
  leetcode_contests?: number
  codeforces_contests?: number
  rating_increment?: number
}

const App = () => {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    const load_students = async () => {
      try {
        const res = await fetch_users()
        const rawUsers: User[] = res.data?.users || []
        // Sort: total_contests desc, tie-break: rating_increment desc
        rawUsers.sort((a, b) => {
          const diffContests = (b.total_contests || 0) - (a.total_contests || 0)
          if (diffContests !== 0) return diffContests
          return (b.rating_increment || 0) - (a.rating_increment || 0)
        })
        setUsers(rawUsers)
      } catch (err) {
        console.error('Failed to fetch users:', err)
      }
    }
    load_students()
  }, [])

  return (
    <div style={{ maxWidth: '850px', margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <h1>CP Challenge 2026 Leaderboard</h1>
      <p>Total participants: {users.length}</p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '8px' }}>Rank</th>
            <th style={{ padding: '8px' }}>Name</th>
            <th style={{ padding: '8px' }}>Enrollment</th>
            <th style={{ padding: '8px' }}>Track</th>
            <th style={{ padding: '8px' }}>Contests</th>
            <th style={{ padding: '8px' }}>Rating +/-</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, idx) => (
            <tr key={u.enr_no || u.enrollment_number || idx} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px' }}>#{idx + 1}</td>
              <td style={{ padding: '8px' }}>{u.name}</td>
              <td style={{ padding: '8px' }}>{u.enr_no || u.enrollment_number || '-'}</td>
              <td style={{ padding: '8px' }}>{u.track || '-'}</td>
              <td style={{ padding: '8px', fontWeight: 'bold' }}>{u.total_contests || 0}</td>
              <td style={{ padding: '8px', color: (u.rating_increment || 0) >= 0 ? 'green' : 'red' }}>
                {(u.rating_increment || 0) > 0 ? `+${u.rating_increment}` : u.rating_increment || 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default App

