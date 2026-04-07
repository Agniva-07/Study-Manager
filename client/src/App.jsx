import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/useAuth';

import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Session from './pages/Session';
import Analytics from './pages/Analytics';
import Contracts from './pages/Contracts';
import Roadmap from './pages/Roadmap';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Signup from './pages/Signup';

export default function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <div className="ambient-bg" />

      {!user ? (
        // 🔒 NOT LOGGED IN
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* 🔥 redirect everything else */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      ) : (
        // 🔓 LOGGED IN
        <>
          <Sidebar />

          <main className="md:ml-[220px] pt-14 pb-20 min-h-screen relative z-10">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/session" element={<Session />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/profile/:id" element={<Profile />} />

              {/* 🔥 fallback */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </>
      )}
    </BrowserRouter>
  );
}