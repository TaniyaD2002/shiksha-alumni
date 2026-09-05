import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/authContext'
import Header from './components/Header'
import Footer from './components/Footer'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Directory from './pages/Directory'
import Profile from './pages/Profile'
import MyProfile from './pages/MyProfile'
import Sessions from './pages/Sessions'
import Home from './pages/Home'
import About from './pages/About'
import Programme from './pages/Programme'
import Faqs from './pages/Faqs'
import './App.css'

function Shell() {
  return (
    <div className="page">
      <Header />
      <main className="main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

/** The marketing pages are readable without an account. */
function PublicLayout() {
  return <Shell />
}

/** Everything inside this layout requires a session. */
function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="page">
        <p className="state">Loading…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return <Shell />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/programme" element={<Programme />} />
        <Route path="/faqs" element={<Faqs />} />
      </Route>

      <Route element={<ProtectedLayout />}>
        <Route path="/alumni" element={<Directory />} />
        <Route path="/alumni/:id" element={<Profile />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/me" element={<MyProfile />} />
        <Route path="*" element={<Navigate to="/alumni" replace />} />
      </Route>
    </Routes>
  )
}

export default App
