import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getTasks } from '../api/dashboardApi'

export function useTasks(filter) {
  const { getToken } = useAuth()
  const [data, setData] = useState(null) // { viewer, roster, tasks }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const result = await getTasks(token, filter)
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [getToken, filter])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
