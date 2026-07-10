import { Routes, Route } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { DashboardLayout } from './layout/DashboardLayout'
import { TaskListPage } from './pages/TaskListPage'
import { Loader } from './components/Loader'
import './App.css'

function App() {
  const { status, error, signIn } = useAuth()

  if (status === 'loading') {
    return <Loader label="Loading..." />
  }

  if (status !== 'signedIn') {
    return (
      <section id="login-screen">
        <div className="login-card">
          <h1>Acme Construction Dashboard</h1>
          <p>Sign in with your acmeok.com Google account.</p>
          {error && <p className="state-message state-message--error">{error}</p>}
          <button type="button" onClick={signIn}>
            Sign in with Google
          </button>
        </div>
      </section>
    )
  }

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<TaskListPage />} />
      </Route>
    </Routes>
  )
}

export default App
