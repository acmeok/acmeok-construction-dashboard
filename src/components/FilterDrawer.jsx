import { useState, useEffect } from 'react'

const EMPTY = { status: [], overdue: false, assignedBy: [], assignedTo: [] }

const STATUS_OPTIONS = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

function FilterCheckboxGroup({ title, options, selected, onToggle }) {
  return (
    <div className="fd__group">
      {title && <p className="fd__group-title">{title}</p>}
      {options.map(({ value, label }) => (
        <label key={value} className="fd__checkbox">
          <input
            type="checkbox"
            checked={selected.includes(value)}
            onChange={() => onToggle(value)}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  )
}

/* ── Desktop right panel (always visible, filters apply immediately) ── */
export function SecondaryFilterPanel({ filters, onChange, roster, filterMode }) {
  const isAssignedByMe = filterMode === 'assigned-by-me'

  function toggleArr(key, value) {
    onChange((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }))
  }

  const rosterOptions = roster.map((p) => ({ value: p.email.toLowerCase(), label: p.name }))
  const hasActive =
    filters.status.length > 0 ||
    filters.overdue ||
    filters.assignedBy.length > 0 ||
    filters.assignedTo.length > 0

  return (
    <div className="fd fd--panel">
      <p className="fd__heading">Filters</p>

      <FilterCheckboxGroup
        title="Status"
        options={STATUS_OPTIONS}
        selected={filters.status}
        onToggle={(v) => toggleArr('status', v)}
      />

      <div className="fd__group">
        <p className="fd__group-title">Deadline</p>
        <label className="fd__checkbox">
          <input
            type="checkbox"
            checked={filters.overdue}
            onChange={() => onChange((p) => ({ ...p, overdue: !p.overdue }))}
          />
          <span>Overdue only</span>
        </label>
      </div>

      {isAssignedByMe ? (
        <FilterCheckboxGroup
          title="Assigned To"
          options={rosterOptions}
          selected={filters.assignedTo}
          onToggle={(v) => toggleArr('assignedTo', v)}
        />
      ) : (
        <FilterCheckboxGroup
          title="Assigned By"
          options={rosterOptions}
          selected={filters.assignedBy}
          onToggle={(v) => toggleArr('assignedBy', v)}
        />
      )}

      {hasActive && (
        <button type="button" className="fd__clear" onClick={() => onChange(EMPTY)}>
          Clear all
        </button>
      )}
    </div>
  )
}

/* ── Mobile drawer (slides in, apply-on-confirm) ── */
export function FilterDrawer({ isOpen, onClose, appliedFilters, onApply, roster, filterMode }) {
  const isAssignedByMe = filterMode === 'assigned-by-me'
  const [local, setLocal] = useState(appliedFilters)

  useEffect(() => {
    if (isOpen) setLocal(appliedFilters)
  }, [isOpen, appliedFilters])

  function toggleArr(key, value) {
    setLocal((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }))
  }

  function handleApply() {
    onApply(local)
    onClose()
  }

  const rosterOptions = roster.map((p) => ({ value: p.email.toLowerCase(), label: p.name }))

  return (
    <>
      <div
        className={`fd-overlay${isOpen ? ' fd-overlay--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div className={`fd fd--drawer${isOpen ? ' fd--drawer-open' : ''}`} aria-modal="true">
        <div className="fd__drawer-header">
          <span className="fd__heading">Filters</span>
          <button type="button" className="fd__close" onClick={onClose} aria-label="Close filters">
            ✕
          </button>
        </div>

        <div className="fd__drawer-body">
          <FilterCheckboxGroup
            title="Status"
            options={STATUS_OPTIONS}
            selected={local.status}
            onToggle={(v) => toggleArr('status', v)}
          />

          <div className="fd__group">
            <p className="fd__group-title">Deadline</p>
            <label className="fd__checkbox">
              <input
                type="checkbox"
                checked={local.overdue}
                onChange={() => setLocal((p) => ({ ...p, overdue: !p.overdue }))}
              />
              <span>Overdue only</span>
            </label>
          </div>

          {isAssignedByMe ? (
            <FilterCheckboxGroup
              title="Assigned To"
              options={rosterOptions}
              selected={local.assignedTo}
              onToggle={(v) => toggleArr('assignedTo', v)}
            />
          ) : (
            <FilterCheckboxGroup
              title="Assigned By"
              options={rosterOptions}
              selected={local.assignedBy}
              onToggle={(v) => toggleArr('assignedBy', v)}
            />
          )}
        </div>

        <div className="fd__drawer-footer">
          <button type="button" className="fd__clear" onClick={() => setLocal(EMPTY)}>
            Clear all
          </button>
          <button type="button" className="fd__apply" onClick={handleApply}>
            Apply Filters
          </button>
        </div>
      </div>
    </>
  )
}

export { EMPTY as EMPTY_FILTERS }
