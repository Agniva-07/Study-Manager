import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Session from './pages/Session';
import Analytics from './pages/Analytics';
import Contracts from './pages/Contracts';
import Roadmap from './pages/Roadmap';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/session" element={<Session />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/roadmap" element={<Roadmap />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Ambient background */}
      <div className="ambient-bg" />

      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <main className="md:ml-[220px] pt-14 pb-20 md:pt-0 md:pb-0 min-h-screen relative z-10">
        <AnimatedRoutes />
      </main>
    </BrowserRouter>
  );
}
