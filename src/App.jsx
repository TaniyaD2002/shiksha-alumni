import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/authContext'
import Header from './components/Header'
import Footer from './components/Footer'
import Login from './pages/Login'
import Directory from './pages/Directory'
import Profile from './pages/Profile'
import './App.css'

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

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/alumni" element={<Directory />} />
        <Route path="/alumni/:id" element={<Profile />} />
        <Route path="*" element={<Navigate to="/alumni" replace />} />
      </Route>
    </Routes>
  )
}

export default App
