import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import StudentProfile from './StudentProfile';
import AdminDashboard from './AdminDashboard';
import './Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = authAPI.getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        } else {
          // Try to get current user from API
          const currentUser = await authAPI.getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Redirect to login if not authenticated
        window.location.href = '/';
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if API call fails
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // If user is a student, show the StudentProfile component
  if (user?.role === 'student') {
    return <StudentProfile />;
  }

  // If user is an admin, show the AdminDashboard component
  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  // For other roles, show the original dashboard
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Student Portal Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {user?.first_name} {user?.last_name}</span>
            <span className="user-role">({user?.role})</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="welcome-card">
            <h2>Welcome to your Student Portal!</h2>
            <p>You have successfully logged in as a {user?.role}.</p>
            
            <div className="user-details">
              <h3>Account Information</h3>
              <div className="detail-row">
                <span className="label">Username:</span>
                <span className="value">{user?.username}</span>
              </div>
              <div className="detail-row">
                <span className="label">Email:</span>
                <span className="value">{user?.email}</span>
              </div>
              <div className="detail-row">
                <span className="label">Full Name:</span>
                <span className="value">{user?.first_name} {user?.last_name}</span>
              </div>
              <div className="detail-row">
                <span className="label">Role:</span>
                <span className="value role-badge">{user?.role}</span>
              </div>
            </div>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <h3>📚 Courses</h3>
              <p>View and manage your courses</p>
            </div>
            <div className="feature-card">
              <h3>📊 Grades</h3>
              <p>Check your academic progress</p>
            </div>
            <div className="feature-card">
              <h3>📅 Schedule</h3>
              <p>View your class schedule</p>
            </div>
            <div className="feature-card">
              <h3>💬 Messages</h3>
              <p>Communicate with teachers</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
