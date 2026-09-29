import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'

type ApplicationStatus = 'Applied' | 'Interviewing' | 'Offer' | 'Rejected'

type JobApplication = {
  id: string
  company: string
  role: string
  status: ApplicationStatus
  appliedDate?: string
  notes?: string
  jobUrl?: string
}

function isValidJobUrl(value: string): boolean {
  if (!value) return true

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function parseApplications(data: unknown): JobApplication[] {
  if (!Array.isArray(data)) {
    throw new Error('Expected an array of applications')
  }

  const statuses = ['Applied', 'Interviewing', 'Offer', 'Rejected']
  const seenIds = new Set<string>()

  return data.map((item: unknown) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error('Invalid application')
    }

    const entry = item as Record<string, unknown>

    if (
      typeof entry.id !== 'string' ||
      !entry.id.trim() ||
      typeof entry.company !== 'string' ||
      !entry.company.trim() ||
      typeof entry.role !== 'string' ||
      !entry.role.trim() ||
      (entry.status !== undefined &&
        (typeof entry.status !== 'string' ||
          !statuses.includes(entry.status))) ||
      (entry.appliedDate !== undefined &&
        typeof entry.appliedDate !== 'string') ||
      (entry.notes !== undefined && typeof entry.notes !== 'string') ||
      (entry.jobUrl !== undefined &&
        (typeof entry.jobUrl !== 'string' ||
          !isValidJobUrl(entry.jobUrl.trim())))
    ) {
      throw new Error('Invalid application fields')
    }

    if (seenIds.has(entry.id)) {
      throw new Error('Duplicate application ID')
    }

    seenIds.add(entry.id)

    return {
      id: entry.id,
      company: entry.company.trim(),
      role: entry.role.trim(),
      status: (entry.status ?? 'Applied') as ApplicationStatus,
      appliedDate: entry.appliedDate as string | undefined,
      notes: entry.notes as string | undefined,
      jobUrl:
        typeof entry.jobUrl === 'string' ? entry.jobUrl.trim() : undefined,
    }
  })
}

function loadApplications(): {
  applications: JobApplication[]
  error: string
} {
  try {
    const saved = localStorage.getItem('job-applications')

    return {
      applications: saved ? parseApplications(JSON.parse(saved)) : [],
      error: '',
    }
  } catch {
    return {
      applications: [],
      error:
        'Saved applications could not be loaded. Automatic saving is paused to protect the stored data.',
    }
  }
}

function App() {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [appliedDate, setAppliedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<ApplicationStatus | 'All'>('All')

  const [initialData] = useState(loadApplications)
  const [applications, setApplications] =
    useState<JobApplication[]>(initialData.applications)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (initialData.error) return
  
    try {
      localStorage.setItem('job-applications', JSON.stringify(applications))
    } catch {
      window.alert(
        'Changes could not be saved in this browser. Export a backup before closing the page.'
      )
    }
  }, [applications, initialData.error])

  function resetForm() {
    setEditingId(null)
    setCompany('')
    setRole('')
    setAppliedDate('')
    setNotes('')
    setJobUrl('')
  }

  function addApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedCompany = company.trim()
    const trimmedRole = role.trim()
    const trimmedUrl = jobUrl.trim()

    if (!trimmedCompany || !trimmedRole || !appliedDate) {
      setMessage('Enter a company, job title, and application date.')
      return
    }

    if (!isValidJobUrl(trimmedUrl)) {
      setMessage('Enter a valid job link beginning with https:// or http://.')
      return
    }

    if (editingId) {
      setApplications((previous) =>
        previous.map((application) =>
          application.id === editingId
            ? {
                ...application,
                company: trimmedCompany,
                role: trimmedRole,
                appliedDate,
                notes: notes.trim(),
                jobUrl: trimmedUrl,
              }
            : application
        )
      )

      setMessage('Application updated.')
    } else {
      const newApplication: JobApplication = {
        id: crypto.randomUUID(),
        company: trimmedCompany,
        role: trimmedRole,
        status: 'Applied',
        appliedDate,
        notes: notes.trim(),
        jobUrl: trimmedUrl,
      }

      setApplications((previous) => [newApplication, ...previous])
      setMessage('Application added.')
    }

    resetForm()
  }

  function editApplication(application: JobApplication) {
    setEditingId(application.id)
    setCompany(application.company)
    setRole(application.role)
    setAppliedDate(application.appliedDate ?? '')
    setNotes(application.notes ?? '')
    setJobUrl(application.jobUrl ?? '')
    setMessage('')
    document.getElementById('company')?.focus()
  }

  function deleteApplication(id: string) {
    setApplications((previous) =>
      previous.filter((application) => application.id !== id)
    )

    if (editingId === id) resetForm()

    setMessage('Application deleted.')
  }

  function updateStatus(id: string, status: ApplicationStatus) {
    setApplications((previous) =>
      previous.map((application) =>
        application.id === id
          ? { ...application, status }
          : application
      )
    )
  }

  function exportApplications() {
    const backup = JSON.stringify(applications, null, 2)
    const blob = new Blob([backup], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = 'job-applications-backup.json'
    document.body.appendChild(link)
    link.click()
    link.remove()

    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function importApplications(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]

    if (!file) return

    try {
      const data: unknown = JSON.parse(await file.text())
      const imported = parseApplications(data)

      setApplications((previous) => {
        const seenIds = new Set(
          previous.map((application) => application.id)
        )

        const additions = imported.filter(
          (application) => !seenIds.has(application.id)
        )

        return [...additions, ...previous]
      })

      setMessage(
        'Backup processed. Missing applications were added; existing IDs were kept unchanged.'
      )
    } catch {
      setMessage(
        'Could not import this file. Choose a valid tracker JSON backup.'
      )
    } finally {
      input.value = ''
    }
  }

  const filteredApplications = applications.filter((application) => {
    const query = search.trim().toLowerCase()

    const matchesSearch =
      application.company.toLowerCase().includes(query) ||
      application.role.toLowerCase().includes(query)

    const matchesStatus =
      statusFilter === 'All' || application.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <main>
      <h1>Job Application Tracker</h1>
      <p>Keep track of your applications and their progress.</p>

      {initialData.error && <p role="alert">{initialData.error}</p>}
      <p role="status">{message}</p>

      <form onSubmit={addApplication}>
        <h2>{editingId ? 'Edit application' : 'Add application'}</h2>

        <div>
          <label htmlFor="company">Company</label>
          <input
            id="company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            placeholder="Company name"
            required
          />
        </div>

        <div>
          <label htmlFor="role">Job title</label>
          <input
            id="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            placeholder="Software Engineer I"
            required
          />
        </div>

        <div>
          <label htmlFor="applied-date">Date applied</label>
          <input
            id="applied-date"
            type="date"
            value={appliedDate}
            onChange={(event) => setAppliedDate(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="job-url">Job posting link (optional)</label>
          <input
            id="job-url"
            type="url"
            value={jobUrl}
            onChange={(event) => setJobUrl(event.target.value)}
            placeholder="https://..."
          />
        </div>

        <div>
          <label htmlFor="notes">Notes (optional)</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Referral, interview details, or follow-up plans"
            rows={3}
          />
        </div>

        <button type="submit">
          {editingId ? 'Save Changes' : 'Add Application'}
        </button>

        {editingId && (
          <button type="button" onClick={resetForm}>
            Cancel Edit
          </button>
        )}
      </form>

      <h2>Applications ({applications.length})</h2>

      <button
        type="button"
        onClick={exportApplications}
        disabled={applications.length === 0}
      >
        Export Backup
      </button>

      <div>
        <label htmlFor="import-backup">Import Backup</label>
        <input
          id="import-backup"
          type="file"
          accept=".json,application/json"
          onChange={importApplications}
        />
      </div>

      <label htmlFor="search">Search applications</label>
      <input
        id="search"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search company or job title"
      />

      <label htmlFor="status-filter">Filter by status</label>
      <select
        id="status-filter"
        value={statusFilter}
        onChange={(event) =>
          setStatusFilter(
            event.target.value as ApplicationStatus | 'All'
          )
        }
      >
        <option value="All">All statuses</option>
        <option value="Applied">Applied</option>
        <option value="Interviewing">Interviewing</option>
        <option value="Offer">Offer</option>
        <option value="Rejected">Rejected</option>
      </select>

      {applications.length === 0 ? (
        <p>No applications yet. Add your first one above.</p>
      ) : filteredApplications.length === 0 ? (
        <p>No applications match your search or status filter.</p>
      ) : (
        <ul>
          {filteredApplications.map((application) => (
            <li key={application.id}>
              <strong>{application.company}</strong> — {application.role}

              <span>
                Applied: {application.appliedDate || 'Date not recorded'}
              </span>

              {application.notes && (
                <p className="application-notes">{application.notes}</p>
              )}

              <select
                aria-label={`Status for ${application.company} ${application.role}`}
                value={application.status}
                onChange={(event) =>
                  updateStatus(
                    application.id,
                    event.target.value as ApplicationStatus
                  )
                }
              >
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offer">Offer</option>
                <option value="Rejected">Rejected</option>
              </select>

              {application.jobUrl && (
                <a
                  href={application.jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View job posting
                </a>
              )}

              <button
                type="button"
                onClick={() => editApplication(application)}
                aria-label={`Edit ${application.company} ${application.role}`}
              >
                Edit
              </button>

              <button
                type="button"
                className="delete-button"
                onClick={() => deleteApplication(application.id)}
                aria-label={`Delete ${application.company} ${application.role}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default App