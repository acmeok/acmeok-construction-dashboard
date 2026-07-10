import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext'

// Own chunk so it's cached independently of app code that changes more often.
const SiteBackgroundCanvas = lazy(() =>
  import('./components/SiteBackgroundCanvas').then((m) => ({ default: m.SiteBackgroundCanvas }))
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={null}>
      <SiteBackgroundCanvas />
    </Suspense>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
