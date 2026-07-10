import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const ALLOWED_EMAIL_DOMAIN = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)

export const googleProvider = new GoogleAuthProvider()
// Narrows the account picker to Workspace accounts on this domain. This is only
// a hint to Google's sign-in UI - the real enforcement happens after sign-in by
// checking the user's verified email suffix (see auth/AuthContext.jsx).
googleProvider.setCustomParameters({ hd: ALLOWED_EMAIL_DOMAIN })
