import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth, userInitials, displayName } from '../lib/authContext'
import Logo from './Logo'

const PUBLIC_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'About Us', to: '/about' },
  { label: 'Programme', to: '/programme' },
  { label: 'FAQs', to: '/faqs' },
]

const MEMBER_LINKS = [
  { label: 'Alumni', to: '/alumni' },
  { label: 'Your Sessions', to: '/sessions' },
]

export default function Header() {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const links = user ? [...PUBLIC_LINKS, ...MEMBER_LINKS] : PUBLIC_LINKS
  const photo = user?.user_metadata?.avatar_url

  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo to={user ? '/alumni' : '/'} />

        <nav className="nav" aria-label="Main">
          {links.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `nav-link${isActive ? ' is-active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {user ? (
          <div className="account">
            <button
              type="button"
              className="account-trigger"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              title={displayName(user)}
            >
              {photo ? (
                <img className="account-avatar" src={photo} alt="" />
              ) : (
                <span className="account-avatar">{userInitials(user)}</span>
              )}
            </button>

            {menuOpen && (
              <>
                <div
                  className="menu-scrim"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="account-menu" role="menu">
                  <p className="account-menu-name">{displayName(user)}</p>
                  <Link
                    to="/me"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/sessions"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    Your Sessions
                  </Link>
                  <button type="button" role="menuitem" onClick={signOut}>
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link className="btn btn-primary btn-small" to="/login">
            Sign in
          </Link>
        )}
      </div>
    </header>
  )
}
