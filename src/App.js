import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import StudentProfile from './components/StudentProfile';
import AdminDashboard from './components/AdminDashboard';
import { authAPI } from './services/api';
import './App.css';

// Guards
const RequireAuth = ({ children }) => {
  if (!authAPI.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const RequireRole = ({ role, children }) => {
  if (!authAPI.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  const user = authAPI.getStoredUser();
  const userRole = (user?.role || '').toLowerCase();
  const roles = Array.isArray(role) ? role.map(r => r.toLowerCase()) : [role.toLowerCase()];
  if (role && !roles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  const isAuthed = authAPI.isAuthenticated();
  const user = isAuthed ? authAPI.getStoredUser() : null;

  // Debug: Log auth state
  console.log('App render:', { isAuthed, user });

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Navigate
                to={
                  isAuthed
                    ? ((user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'teacher')
                      ? '/admin'
                      : '/dashboard'
                    : '/login'
                }
                replace
              />
            }
          />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/dashboard"
            element={
              <RequireRole role="student">
                <StudentProfile />
              </RequireRole>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireRole role={["admin", "teacher"]}>
                <AdminDashboard />
              </RequireRole>
            }
          />

          <Route
            path="/profile"
            element={
              <RequireRole role="student">
                <StudentProfile />
              </RequireRole>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
