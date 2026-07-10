import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { FilterBar } from '../components/FilterBar'
import { TaskTable } from '../components/TaskTable'
import { AssignTaskForm } from '../components/AssignTaskForm'
import { Loader } from '../components/Loader'
import { EMPTY_FILTERS } from '../components/FilterDrawer'
import { getTaskStatus, isOverdue } from '../taskStatus'
import { useAuth } from '../auth/AuthContext'
import { isAdmin } from '../admins'

const VOICE_APP_URL = 'https://david-voice-messaging-app.vercel.app/'

const STATUS_OPTIONS = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

function FilterStrip({ filters, onChange, roster, filterMode }) {
  const isAssignedByMe = filterMode === 'assigned-by-me'
  const rosterKey = isAssignedByMe ? 'assignedTo' : 'assignedBy'
  const rosterLabel = isAssignedByMe ? 'To' : 'By'

  function toggleStatus(value) {
    onChange((prev) => ({
      ...prev,
      status: prev.status.includes(value)
        ? prev.status.filter((v) => v !== value)
        : [...prev.status, value],
    }))
  }

  function togglePerson(value) {
    onChange((prev) => ({
      ...prev,
      [rosterKey]: prev[rosterKey].includes(value)
        ? prev[rosterKey].filter((v) => v !== value)
        : [...prev[rosterKey], value],
    }))
  }

  const hasActive =
    filters.status.length > 0 ||
    filters.overdue ||
    filters.assignedBy.length > 0 ||
    filters.assignedTo.length > 0

  return (
    <div className="task-filter-strip">
      <div className="filter-strip__group">
        <span className="filter-strip__label">Status</span>
        {STATUS_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`filter-pill${filters.status.includes(value) ? ' filter-pill--active' : ''}`}
            onClick={() => toggleStatus(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="filter-strip__group">
        <button
          type="button"
          className={`filter-pill${filters.overdue ? ' filter-pill--active' : ''}`}
          onClick={() => onChange((p) => ({ ...p, overdue: !p.overdue }))}
        >
          Overdue
        </button>
      </div>

      {roster.length > 0 && (
        <div className="filter-strip__group">
          <span className="filter-strip__label">{rosterLabel}</span>
          {roster.map((p) => (
            <button
              key={p.email}
              type="button"
              className={`filter-pill${
                filters[rosterKey].includes(p.email.toLowerCase()) ? ' filter-pill--active' : ''
              }`}
              onClick={() => togglePerson(p.email.toLowerCase())}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {hasActive && (
        <button
          type="button"
          className="filter-strip__clear"
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          Clear all
        </button>
      )}
    </div>
  )
}

export function TaskListPage() {
  const { data, loading, error, filter, setFilter, refetch } = useOutletContext()
  const { profile } = useAuth()
  const userIsAdmin = isAdmin(profile?.email)
  const [secondaryFilters, setSecondaryFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const roster = data?.roster ?? []

  useEffect(() => {
    if (!userIsAdmin && (filter.mode === 'all' || filter.mode === 'assigned-to-person')) {
      setFilter({ mode: 'assigned-to-me', person: null })
    }
  }, [userIsAdmin, filter.mode, setFilter])

  useEffect(() => {
    setSecondaryFilters(EMPTY_FILTERS)
  }, [filter.mode])

  const needsPersonChoice = filter.mode === 'assigned-to-person' && !filter.person

  const hasActiveFilters =
    secondaryFilters.status.length > 0 ||
    secondaryFilters.overdue ||
    secondaryFilters.assignedBy.length > 0 ||
    secondaryFilters.assignedTo.length > 0

  function applySecondary(tasks) {
    return tasks.filter((task) => {
      if (secondaryFilters.status.length > 0) {
        if (!secondaryFilters.status.includes(getTaskStatus(task))) return false
      }
      if (secondaryFilters.overdue && !isOverdue(task)) return false
      if (secondaryFilters.assignedBy.length > 0) {
        if (!secondaryFilters.assignedBy.includes((task.assignedByEmail || '').toLowerCase()))
          return false
      }
      if (secondaryFilters.assignedTo.length > 0) {
        const match = task.assignees.some((a) =>
          secondaryFilters.assignedTo.includes(a.email.toLowerCase())
        )
        if (!match) return false
      }
      return true
    })
  }

  const visibleTasks = data?.tasks ? applySecondary(data.tasks) : []

  return (
    <div className="task-list-page">
      {/* Top control bar */}
      <div className="task-controls">
        <FilterBar
          filter={filter}
          onFilterChange={setFilter}
          roster={roster}
          isAdmin={userIsAdmin}
        />
        <div className="task-controls__right">
          <AssignTaskForm onSuccess={refetch} />
          <a
            href={VOICE_APP_URL}
            target="_blank"
            rel="noreferrer"
            className="voice-app-link"
          >
            🎙 Assign by Voice
          </a>
          <button
            type="button"
            className={`filters-toggle${hasActiveFilters || filtersOpen ? ' filters-toggle--active' : ''}`}
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <line x1="1" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="1" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="1" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="5" cy="4" r="1.8" fill="var(--color-bg)" stroke="currentColor" strokeWidth="1.4"/>
              <circle cx="10" cy="8" r="1.8" fill="var(--color-bg)" stroke="currentColor" strokeWidth="1.4"/>
              <circle cx="6" cy="12" r="1.8" fill="var(--color-bg)" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
            Filters
            {hasActiveFilters && <span className="filters-toggle__dot" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Collapsible filter strip */}
      {filtersOpen && (
        <FilterStrip
          filters={secondaryFilters}
          onChange={setSecondaryFilters}
          roster={roster}
          filterMode={filter.mode}
        />
      )}

      {/* Table content */}
      {loading ? (
        <Loader label="Loading tasks…" />
      ) : error ? (
        <p className="state-message state-message--error">{error}</p>
      ) : needsPersonChoice ? (
        <p className="state-message">Choose a person to see their tasks.</p>
      ) : visibleTasks.length === 0 ? (
        <p className="state-message">
          {hasActiveFilters ? 'No tasks match the current filters.' : 'No tasks found.'}
        </p>
      ) : (
        <TaskTable tasks={visibleTasks} roster={roster} onRefetch={refetch} />
      )}
    </div>
  )
}
