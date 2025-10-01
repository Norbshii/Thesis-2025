import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import './StudentProfile.css';

const StudentProfile = () => {
  const [student, setStudent] = useState({
    name: 'Dave Lima',
    age: 22,
    course: 'BSCS 4B',
    address: '123 Main Street, City, Province',
    guardianName: 'Maria Lima',
    relationship: 'Mother',
    guardianPhone: '+63 912 345 6789',
    profilePicture: null
  });
  
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showTimeRestrictionModal, setShowTimeRestrictionModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [selectedClass, setSelectedClass] = useState(null);
  const [restrictedClassInfo, setRestrictedClassInfo] = useState(null);
  const [editForm, setEditForm] = useState({
    name: student.name,
    age: student.age,
    course: student.course,
    address: student.address,
    guardianName: student.guardianName,
    relationship: student.relationship,
    guardianPhone: student.guardianPhone
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Simulate loading and fetch data
    const loadData = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock classes data
        const mockClasses = [
          {
            id: 1,
            code: 'CC 201',
            name: 'Introduction to Computing 2',
            timeSlot: '8:00 AM - 10:00 AM',
            instructor: 'Prof. Smith',
            isSignedIn: false
          },
          {
            id: 2,
            code: 'CS 301',
            name: 'Data Structures',
            timeSlot: '10:00 AM - 12:00 PM',
            instructor: 'Prof. Johnson',
            isSignedIn: false
          },
          {
            id: 3,
            code: 'CS 401',
            name: 'Algorithm Analysis',
            timeSlot: '1:00 PM - 3:00 PM',
            instructor: 'Prof. Williams',
            isSignedIn: false
          },
          {
            id: 4,
            code: 'CS 501',
            name: 'Software Engineering',
            timeSlot: '3:00 PM - 5:00 PM',
            instructor: 'Prof. Brown',
            isSignedIn: false
          },
          {
            id: 5,
            code: 'TEST 101',
            name: 'Testing Class (Always Open)',
            timeSlot: 'Always Available',
            instructor: 'Prof. Test',
            isSignedIn: false,
            alwaysAvailable: true
          }
        ];
        
        setClasses(mockClasses);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();

    return () => clearInterval(timer);
  }, []);

  // Check if class sign-in is available based on current time
  const isClassAvailable = (classItem) => {
    // If class is marked as always available, it's always open
    if (classItem.alwaysAvailable) {
      return true;
    }

    // Get timeSlot with fallback
    const timeSlot = classItem.timeSlot || classItem.time_slot || 'Always Available';
    
    // If timeSlot is "Always Available", it's always open
    if (timeSlot === 'Always Available') {
      return true;
    }

    const now = currentTime;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    try {
      // Parse time slot (e.g., "8:00 AM - 10:00 AM")
      const [startTime, endTime] = timeSlot.split(' - ');
      
      if (!startTime || !endTime) {
        return false;
      }
      
      const parseTime = (timeStr) => {
        const [time, period] = timeStr.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        let totalMinutes = hours * 60 + minutes;
        
        if (period === 'PM' && hours !== 12) {
          totalMinutes += 12 * 60;
        } else if (period === 'AM' && hours === 12) {
          totalMinutes -= 12 * 60;
        }
        
        return totalMinutes;
      };

      const startMinutes = parseTime(startTime);
      const endMinutes = parseTime(endTime);

      return currentTimeInMinutes >= startMinutes && currentTimeInMinutes <= endMinutes;
    } catch (error) {
      console.error('Error parsing time slot:', error, 'timeSlot:', timeSlot);
      return false;
    }
  };

  const handleClassClick = (classId) => {
    const classItem = classes.find(c => c.id === classId);
    
    if (!isClassAvailable(classItem)) {
      setRestrictedClassInfo(classItem);
      setShowTimeRestrictionModal(true);
      return;
    }
    
    setSelectedClass(classItem);
    setShowSignInModal(true);
  };

  const handleSignInOut = async (action) => {
    if (!selectedClass) return;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      setClasses(classes.map(c => 
        c.id === selectedClass.id 
          ? { ...c, isSignedIn: action === 'sign_in' }
          : c
      ));

      const actionText = action === 'sign_in' ? 'signed in to' : 'signed out of';
      showToastMessage(`Successfully ${actionText} ${selectedClass.code} - ${selectedClass.name}`, 'success');
      
      setShowSignInModal(false);
      setSelectedClass(null);
    } catch (error) {
      console.error('Error updating class status:', error);
      showToastMessage('Failed to update class status', 'error');
    }
  };

  const showToastMessage = (message, type) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleSaveProfile = () => {
    setStudent({
      ...student,
      name: editForm.name,
      age: editForm.age,
      course: editForm.course,
      address: editForm.address,
      guardianName: editForm.guardianName,
      relationship: editForm.relationship,
      guardianPhone: editForm.guardianPhone
    });
    setShowEditModal(false);
    showToastMessage('Profile updated successfully', 'success');
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all stored authentication data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('rememberMe');
      // Redirect to login page
      window.location.href = '/';
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (loading) {
    return (
      <div className="student-profile">
        <div className="profile-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-profile">
      <div className="profile-container">
        {/* Dashboard Title - Separate Container */}
        <div className="dashboard-title-container">
          <h1 className="dashboard-title-text">Student Dashboard</h1>
        </div>

        {/* Profile Header - Mobile Style for All Screens */}
        <div className="profile-header">
          <div className="profile-picture">
            <div className="avatar">
              {student.name.split(' ').map(n => n[0]).join('')}
            </div>
          </div>
          <div className="profile-info">
            {/* Student Name - Separate Container */}
            <div className="student-name-container">
              <h2>{student.name}</h2>
            </div>
            
            <p><strong>Course & Section:</strong> {student.course}</p>
            <p><strong>Age:</strong> {student.age} years old</p>
            <p><strong>Address:</strong> {student.address}</p>
            <p><strong>Guardian:</strong> {student.guardianName}</p>
            <p><strong>Relationship:</strong> {student.relationship}</p>
            <p><strong>Guardian Phone:</strong> {student.guardianPhone}</p>
            <div className="current-time">
              Current Time: {formatTime(currentTime)}
            </div>
            
            {/* Edit Profile Button - Above Separator */}
            <div className="edit-profile-section">
              <button className="edit-profile-btn" onClick={handleEditProfile}>
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* List of Classes */}
        <div className="classes-section">
          <h2 className="classes-title">List of Classes</h2>
          <div className="classes-list">
            {classes && classes.length > 0 ? (
              classes.map((classItem) => (
              <div 
                key={classItem.id}
                className={`class-item ${!isClassAvailable(classItem) ? 'unavailable' : ''} ${classItem.isSignedIn ? 'signed-in' : ''}`}
                onClick={() => handleClassClick(classItem.id)}
              >
                <div className="class-info">
                  <span className="class-code">{classItem.code || 'N/A'}</span>
                  <span className="class-name">{classItem.name || 'N/A'}</span>
                  <span className="class-time">{classItem.timeSlot || classItem.time_slot || 'Always Available'}</span>
                  <span className="class-instructor">Instructor: {classItem.instructor || 'N/A'}</span>
                </div>
                <div className="class-status">
                  {!isClassAvailable(classItem) ? (
                    <span className="status unavailable">Not Available</span>
                  ) : classItem.alwaysAvailable ? (
                    classItem.isSignedIn ? (
                      <span className="status signed-in">Signed In</span>
                    ) : (
                      <span className="status always-available">Always Open</span>
                    )
                  ) : classItem.isSignedIn ? (
                    <span className="status signed-in">Signed In</span>
                  ) : (
                    <span className="status available">Click to Sign In</span>
                  )}
                </div>
              </div>
              ))
            ) : (
              <div className="no-classes">
                <p>No classes available at the moment.</p>
              </div>
            )}
          </div>
        </div>

        {/* Logout Button - Bottom Section */}
        <div 
          className="logout-section"
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '2px solid #e9ecef'
          }}
        >
          <button 
            className="logout-btn" 
            onClick={handleLogout}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.3s ease'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>EDIT Student's Profile</h3>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Age:</label>
                <input
                  type="number"
                  value={editForm.age}
                  onChange={(e) => setEditForm({...editForm, age: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Course Yr & Section:</label>
                <input
                  type="text"
                  value={editForm.course}
                  onChange={(e) => setEditForm({...editForm, course: e.target.value})}
                  placeholder="e.g., BSCS 4B"
                />
              </div>
              <div className="form-group">
                <label>Address:</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                  placeholder="Enter your complete address"
                />
              </div>
              <div className="form-group">
                <label>Guardian's Name:</label>
                <input
                  type="text"
                  value={editForm.guardianName}
                  onChange={(e) => setEditForm({...editForm, guardianName: e.target.value})}
                  placeholder="Enter guardian's full name"
                />
              </div>
              <div className="form-group">
                <label>Relationship:</label>
                <select
                  value={editForm.relationship}
                  onChange={(e) => setEditForm({...editForm, relationship: e.target.value})}
                  className="form-select"
                >
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Grandmother">Grandmother</option>
                  <option value="Grandfather">Grandfather</option>
                  <option value="Uncle">Uncle</option>
                  <option value="Aunt">Aunt</option>
                  <option value="Sister">Sister</option>
                  <option value="Brother">Brother</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Guardian's Phone Number:</label>
                <input
                  type="tel"
                  value={editForm.guardianPhone}
                  onChange={(e) => setEditForm({...editForm, guardianPhone: e.target.value})}
                  placeholder="+63 912 345 6789"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveProfile}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign In/Out Modal */}
      {showSignInModal && selectedClass && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Class Sign In/Out</h3>
              <button className="close-btn" onClick={() => {
                setShowSignInModal(false);
                setSelectedClass(null);
              }}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="class-info-modal">
                <h4>{selectedClass.code} - {selectedClass.name}</h4>
                <p><strong>Instructor:</strong> {selectedClass.instructor}</p>
                <p><strong>Time:</strong> {selectedClass.timeSlot}</p>
                <p><strong>Current Status:</strong> {selectedClass.isSignedIn ? 'Signed In' : 'Not Signed In'}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => {
                setShowSignInModal(false);
                setSelectedClass(null);
              }}>
                Cancel
              </button>
              <button 
                className={`btn-primary ${selectedClass.isSignedIn ? 'sign-out-btn' : 'sign-in-btn'}`}
                onClick={() => handleSignInOut(selectedClass.isSignedIn ? 'sign_out' : 'sign_in')}
              >
                {selectedClass.isSignedIn ? 'Sign Out' : 'Sign In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Restriction Modal */}
      {showTimeRestrictionModal && restrictedClassInfo && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Class Not Available</h3>
              <button className="close-btn" onClick={() => {
                setShowTimeRestrictionModal(false);
                setRestrictedClassInfo(null);
              }}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="time-restriction-info">
                <div className="restriction-icon">⏰</div>
                <div className="restriction-message">
                  <h4>{restrictedClassInfo.code} - {restrictedClassInfo.name}</h4>
                  <p>This class is not available at the current time.</p>
                  <div className="time-info">
                    <p><strong>Available Time:</strong> {restrictedClassInfo.timeSlot}</p>
                    <p><strong>Current Time:</strong> {formatTime(currentTime)}</p>
                  </div>
                  <div className="help-text">
                    Please check back during the scheduled class time.
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => {
                setShowTimeRestrictionModal(false);
                setRestrictedClassInfo(null);
              }}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className={`toast ${toastType}`}>
          <div className="toast-content">
            <div className="toast-icon">
              {toastType === 'success' ? '✅' : '❌'}
            </div>
            <div className="toast-message">{toastMessage}</div>
            <button className="toast-close" onClick={() => setShowToast(false)}>
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;