import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { useTasks } from '../hooks/useTasks'

export function DashboardLayout() {
  const [filter, setFilter] = useState({ mode: 'assigned-to-me', person: null })
  const tasksState = useTasks(filter)

  return (
    <>
      <Header />
      <main className="app-main">
        <Outlet context={{ ...tasksState, filter, setFilter }} />
      </main>
    </>
  )
}
