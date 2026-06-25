import React from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { Home, ScanLine, BarChart2, BookOpen, Settings } from 'lucide-react';
import Dashboard from './pages/Dashboard.jsx';
import Scan from './pages/Scan.jsx';
import History from './pages/History.jsx';
import FoodLibrary from './pages/FoodLibrary.jsx';
import SettingsPage from './pages/Settings.jsx';
import Login from './pages/Login.jsx';

const navItems = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/scan', icon: ScanLine, label: 'Scan' },
  { to: '/history', icon: BarChart2, label: 'History' },
  { to: '/library', icon: BookOpen, label: 'Library' },
  { to: '/settings', icon: Settings, label: 'Settings' }
];

function RequireAuth({ children }) {
  const token = localStorage.getItem('glucotrack_token');
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={
        <RequireAuth>
          <div className="max-w-md mx-auto min-h-screen relative bg-gray-50">
            <main className="pb-20">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/scan" element={<Scan />} />
                <Route path="/history" element={<History />} />
                <Route path="/library" element={<FoodLibrary />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </main>
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 max-w-md mx-auto">
              <div className="flex">
                {navItems.map(({ to, icon: Icon, label, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                        isActive ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'
                      }`
                    }
                  >
                    <Icon size={22} />
                    <span className="mt-0.5">{label}</span>
                  </NavLink>
                ))}
              </div>
            </nav>
          </div>
        </RequireAuth>
      } />
    </Routes>
  );
}
