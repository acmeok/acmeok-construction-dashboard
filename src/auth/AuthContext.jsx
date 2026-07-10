import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { verifyLogin } from '../api/dashboardApi'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null) // { email, name, role }
  const [status, setStatus] = useState('loading') // loading | signedOut | signedIn | error
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setProfile(null)
        setStatus('signedOut')
        return
      }
      try {
        const idToken = await firebaseUser.getIdToken()
        const verified = await verifyLogin(idToken)
        setProfile({ email: verified.email, name: verified.name, role: verified.role })
        setStatus('signedIn')
        setError(null)
      } catch (err) {
        setError(err.message)
        setStatus('error')
        await signOut(auth)
      }
    })
    return unsubscribe
  }, [])

  const signIn = useCallback(async () => {
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }, [])

  const signOutUser = useCallback(() => signOut(auth), [])

  const getToken = useCallback(() => {
    if (!auth.currentUser) throw new Error('Not signed in.')
    return auth.currentUser.getIdToken()
  }, [])

  return (
    <AuthContext.Provider value={{ profile, status, error, signIn, signOutUser, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
