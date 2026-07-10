export function Loader({ label = 'Loading...', size = 'default' }) {
  return (
    <div className={`loader loader--${size}`} role="status" aria-live="polite">
      <span className="loader__spinner" aria-hidden="true" />
      <span className="loader__label">{label}</span>
    </div>
  )
}
