import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/workout', label: 'Workout' },
  { to: '/measurements', label: 'Measure' },
  { to: '/history', label: 'History' },
  { to: '/discover', label: 'Discover' },
  { to: '/settings', label: 'Settings' },
];

export function Layout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden />
          <div>
            <p className="brand__name">SoftShape</p>
            <p className="brand__tag">Trans-affirming feminizing training · MTF HRT</p>
          </div>
        </div>
        <nav className="nav" aria-label="Main">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? 'nav__link is-active' : 'nav__link')}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer muted">
        Fitness support companion — not medical or HRT dosing advice. Data stays on this device.
      </footer>
    </div>
  );
}
