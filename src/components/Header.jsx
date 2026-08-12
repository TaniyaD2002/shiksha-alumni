import { NavLink } from 'react-router-dom'
import { useAuth, userInitials, displayName } from '../lib/authContext'

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'About Us', to: '/about' },
  { label: 'Programme', to: '/programme' },
  { label: 'FAQs', to: '/faqs' },
  { label: 'Alumni', to: '/alumni' },
]

function Logo() {
  return (
    <NavLink className="logo" to="/alumni">
      <svg
        className="logo-mark"
        viewBox="0 0 32 32"
        role="presentation"
        aria-hidden="true"
      >
        <path
          d="M16 3 3 9.5 16 16l13-6.5L16 3Z"
          fill="currentColor"
          opacity="0.9"
        />
        <path
          d="M8 13.2v6.6c0 .8.4 1.5 1.1 1.9 4.3 2.5 9.5 2.5 13.8 0 .7-.4 1.1-1.1 1.1-1.9v-6.6L16 18 8 13.2Z"
          fill="currentColor"
          opacity="0.55"
        />
        <path
          d="M27 11v7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      <span className="logo-word">Shiksha</span>
    </NavLink>
  )
}

export default function Header() {
  const { user, signOut } = useAuth()

  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo />

        <nav className="nav" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              className={({ isActive }) =>
                `nav-link${isActive ? ' is-active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="account">
            <span className="account-avatar" title={displayName(user)}>
              {userInitials(user)}
            </span>
            <button type="button" className="logout" onClick={signOut}>
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
