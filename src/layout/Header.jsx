import { useAuth } from '../auth/AuthContext'

const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1K5vPsgboF1l46LODYDJeU5m66PRyntoaNx0_2Q_EL_Q/edit'

export function Header() {
  const { profile, signOutUser } = useAuth()

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <img src="/logo.png" alt="Acme Construction" className="app-header__logo" />
        Acme Construction
      </div>
      <div className="app-header__right">
        <span className="app-header__viewer">
          Viewing as: <strong>{profile.name}</strong>
        </span>
        {profile.role === 'admin' && (
          <a className="app-header__sheet-link" href={SHEET_URL} target="_blank" rel="noreferrer">
            Open Google Sheet
          </a>
        )}
        <button type="button" className="app-header__signout" onClick={signOutUser}>
          Sign out
        </button>
      </div>
    </header>
  )
}
