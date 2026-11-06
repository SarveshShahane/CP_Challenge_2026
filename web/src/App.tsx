import { useEffect, useState } from 'react'
import { fetch_users } from './api/api'

interface User {
  name: string
  enrollment_number: string
}

const App = () => {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    const load_students = async () => {
      try {
        const res = await fetch_users()
        setUsers(res.data?.users || [])
      } catch (err) {
        console.error('Failed to fetch users:', err)
      }
    }
    load_students()
  }, [])

  return (
    <div>
      <h2>Total participants: {users.length}</h2>
      {users.map((u, k) => (
        <div key={k}>
          <p>User: {u.name}</p>
        </div>
      ))}
    </div>
  )
}

export default App
