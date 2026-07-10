export function FilterBar({ filter, onFilterChange, roster, isAdmin }) {
  const isPersonMode = filter.mode === 'assigned-to-person'

  function setMode(mode) {
    onFilterChange({ mode, person: mode === 'assigned-to-person' ? '' : null })
  }

  const tabClass = (mode) =>
    `view-tab${filter.mode === mode ? ' view-tab--active' : ''}`

  return (
    <div className="view-tabs-bar">
      {isAdmin && (
        <button type="button" className={tabClass('all')} onClick={() => setMode('all')}>
          All Tasks
        </button>
      )}
      <button
        type="button"
        className={tabClass('assigned-to-me')}
        onClick={() => setMode('assigned-to-me')}
      >
        Assigned to Me
      </button>
      <button
        type="button"
        className={tabClass('assigned-by-me')}
        onClick={() => setMode('assigned-by-me')}
      >
        Assigned by Me
      </button>
      {isAdmin && (
        <button
          type="button"
          className={tabClass('assigned-to-person')}
          onClick={() => setMode('assigned-to-person')}
        >
          Assigned To…
        </button>
      )}
      {isAdmin && isPersonMode && roster.length > 0 && (
        <div className="person-tabs">
          {roster.map((p) => (
            <button
              key={p.email}
              type="button"
              className={`person-tab${filter.person === p.email ? ' person-tab--active' : ''}`}
              onClick={() => onFilterChange({ mode: 'assigned-to-person', person: p.email })}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
