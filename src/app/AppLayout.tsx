import { NavLink, Outlet } from 'react-router-dom'
import { ReminderBanner } from '../features/reminders/ReminderBanner'

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/goals', label: 'Goals', end: false },
  { to: '/habits', label: 'Habits', end: false },
  { to: '/settings', label: 'Settings', end: false },
]

export function AppLayout() {
  return (
    <div className="shell">
      <aside className="nav">
        <div className="brand">
          <div className="brand-mark">G</div>
          <div>
            <strong>Goal Tracker</strong>
            <span>Local, just for you</span>
          </div>
        </div>
        <nav className="nav-links" aria-label="Primary">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="stage">
        <ReminderBanner />
        <Outlet />
      </main>
    </div>
  )
}
