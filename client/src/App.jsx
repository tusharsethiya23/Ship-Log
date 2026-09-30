// The map of the app: which page shows for which address.

import { Link, Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import { link, notice, page } from './utils/ui.js';

export default function App() {
  return (
    <>
      <nav className="border-b border-neutral-800 px-6 py-3.5">
        <Link className="font-bold text-neutral-100" to="/">
          🔥 Ship Log
        </Link>
      </nav>

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/u/:username" element={<Profile />} />
        {/* Any other address */}
        <Route
          path="*"
          element={
            <main className={page}>
              <p className={notice}>Page not found</p>
              <Link className={link} to="/">
                Back to home
              </Link>
            </main>
          }
        />
      </Routes>
    </>
  );
}