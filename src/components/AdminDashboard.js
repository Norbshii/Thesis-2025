import React, { useState, useEffect } from 'react';
import api, { authAPI } from '../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [professor, setProfessor] = useState({
    name: '',
    department: '',
    email: '',
    profilePicture: null
  });

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Modal states
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showClassDetailsModal, setShowClassDetailsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showManageStudentsModal, setShowManageStudentsModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  
  // Toast states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Form states
  const [newClass, setNewClass] = useState({
    code: '',
    name: '',
    date: '',
    startTime: '',
    endTime: '',
    maxStudents: 30,
    lateThreshold: 15, // minutes
    isManualControl: false
  });

  const [enrolledStudents, setEnrolledStudents] = useState([]);
  
  // Manage Students Modal states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  
  // Loading states
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [isAddingStudents, setIsAddingStudents] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const loadData = async () => {
      try {
        const currentUser = authAPI.getStoredUser();
        
        // Load teacher profile from Airtable
        if (currentUser?.email) {
          try {
            const prof = await api.get('/student/profile', { params: { email: currentUser.email } });
            const p = prof?.data?.profile || {};
            const emailDerived = String(currentUser.email).split('@')[0].replace(/\./g, ' ').trim();
            setProfessor({
              name: p.name || currentUser?.name || emailDerived || 'Teacher',
              department: p.department || 'Computer Science',
              email: p.email || currentUser.email || '',
              profilePicture: null
            });
          } catch (e) {
            // Fallback if profile not found
            const emailDerived = String(currentUser.email).split('@')[0].replace(/\./g, ' ').trim();
            setProfessor({
              name: currentUser?.name || emailDerived || 'Teacher',
              department: 'Computer Science',
              email: currentUser.email || '',
              profilePicture: null
            });
          }
        }
        
        // Load classes from Airtable (filtered by teacher email)
        try {
          const classesResponse = await api.get('/classes', {
            params: { teacherEmail: currentUser?.email }
          });
          const loadedClasses = classesResponse.data.classes || [];
          
          // Filter out empty classes (rows with no code or name)
          const validClasses = loadedClasses.filter(cls => cls.code && cls.name);
          
          // Classes already have enrolledStudents from Airtable
          const classesWithAttendance = validClasses.map(cls => ({
            ...cls,
            enrolledStudents: cls.enrolledStudents || [],
            attendance: []
          }));
          
          setClasses(classesWithAttendance);
        } catch (error) {
          console.error('Error loading classes:', error);
          showToastMessage('Failed to load classes', 'error');
        }

        // Load students from Airtable Students table
        try {
          const studentsResponse = await api.get('/students');
          const loadedStudents = studentsResponse.data.students || [];
          setStudents(loadedStudents);
        } catch (error) {
          console.error('Error loading students:', error);
          showToastMessage('Failed to load students', 'error');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
    return () => clearInterval(timer);
  }, []);

  const showToastMessage = (message, type) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const handleAddClass = async () => {
    if (!newClass.code || !newClass.name || !newClass.startTime || !newClass.endTime) {
      showToastMessage('Please fill in all required fields', 'error');
      return;
    }

    setIsCreatingClass(true);
    try {
      const currentUser = authAPI.getStoredUser();
      // Always use today's date
      const today = new Date().toISOString().split('T')[0];
      const payload = {
        code: newClass.code,
        name: newClass.name,
        date: today,
        startTime: newClass.startTime,
        endTime: newClass.endTime,
        maxStudents: parseInt(newClass.maxStudents, 10) || 30,
        lateThreshold: parseInt(newClass.lateThreshold, 10) || 15,
        isManualControl: newClass.isManualControl,
        teacherEmail: currentUser?.email
      };
      console.log('Creating class with payload:', payload);
      const response = await api.post('/classes', payload);

      const newClassData = {
        ...response.data.class,
        enrolledStudents: [],
        attendance: []
      };

      setClasses([...classes, newClassData]);
      // Get today's date for the next class
      const nextClassDate = new Date().toISOString().split('T')[0];
      setNewClass({
        code: '',
        name: '',
        date: nextClassDate,
        startTime: '',
        endTime: '',
        maxStudents: 30,
        lateThreshold: 15,
        isManualControl: false
      });
      setShowAddClassModal(false);
      showToastMessage('Class added successfully', 'success');
    } catch (error) {
      console.error('Error adding class:', error);
      const errorMsg = error.response?.data?.message || 'Failed to add class';
      showToastMessage(errorMsg, 'error');
    } finally {
      setIsCreatingClass(false);
    }
  };

  const handleToggleClassStatus = async (classId) => {
    const classItem = classes.find(c => c.id === classId);
    const isCurrentlyOpen = classItem.isOpen;

    if (!isCurrentlyOpen) {
      // Opening class - get teacher's location
      if (!navigator.geolocation) {
        showToastMessage('Geolocation is not supported by your browser. Please use a modern browser like Chrome, Firefox, or Safari.', 'error');
        return;
      }

      // Show loading message
      showToastMessage('Requesting your location... Please allow location access when prompted.', 'info');

      try {
        console.log('Requesting geolocation...');
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              console.log('Location obtained:', pos.coords);
              resolve(pos);
            },
            (err) => {
              console.error('Geolocation error:', err);
              reject(err);
            },
            {
              enableHighAccuracy: true,
              timeout: 15000, // Increased timeout to 15 seconds
              maximumAge: 0
            }
          );
        });

        const { latitude, longitude, accuracy } = position.coords;
        console.log(`Location: ${latitude}, ${longitude}, Accuracy: ${accuracy}m`);

        // Call API to open class with geolocation
        const response = await api.post('/classes/open', {
          classId: classId,
          latitude: latitude,
          longitude: longitude
        });

        setClasses(classes.map(c => 
          c.id === classId ? { ...c, isOpen: true } : c
        ));

        // Check if geofencing is active
        if (response.data.geofence_active === false) {
          showToastMessage(`${response.data.message}\n\n${response.data.warning}`, 'info');
        } else {
          showToastMessage(`Class opened successfully! Geofence set (50m radius, accuracy: ${Math.round(accuracy)}m)`, 'success');
        }
      } catch (error) {
        console.error('Geolocation error:', error);
        if (error.code) {
          // Geolocation error
          const errorMessages = {
            1: 'Location permission denied. Please click "Allow" when your browser asks for location access. You may need to check your browser settings.',
            2: 'Location unavailable. Please ensure location services are enabled on your device and try again.',
            3: 'Location request timed out. This may happen if GPS signal is weak. Try moving closer to a window or outside, then try again.'
          };
          showToastMessage(errorMessages[error.code] || 'Failed to get location. Please try again.', 'error');
        } else if (error.response) {
          showToastMessage(error.response?.data?.message || 'Failed to open class. Please try again.', 'error');
        } else {
          showToastMessage('Failed to open class. Please check your internet connection and try again.', 'error');
        }
      }
    } else {
      // Closing class
      try {
        await api.post('/classes/close', {
          classId: classId
        });

        setClasses(classes.map(c => 
          c.id === classId ? { ...c, isOpen: false } : c
        ));
        showToastMessage('Class closed successfully', 'success');
      } catch (error) {
        console.error('Error closing class:', error);
        showToastMessage('Failed to close class. Please try again.', 'error');
      }
    }
  };

  const handleExtendClass = async (classId) => {
    const classItem = classes.find(c => c.id === classId);
    
    // Show options for extending
    const options = [
      { label: '15 minutes', value: 15 },
      { label: '30 minutes', value: 30 },
      { label: '1 hour', value: 60 },
      { label: '2 hours', value: 120 }
    ];
    
    const choice = prompt(
      `Extend "${classItem.name}" by how many minutes?\n\n` +
      `Current end time: ${classItem.endTime}\n\n` +
      `Enter minutes (5-180) or choose:\n` +
      options.map(o => `- ${o.value} (${o.label})`).join('\n')
    );
    
    if (!choice) return; // User cancelled
    
    const minutes = parseInt(choice);
    if (isNaN(minutes) || minutes < 5 || minutes > 180) {
      showToastMessage('Please enter a valid number between 5 and 180 minutes', 'error');
      return;
    }
    
    try {
      const response = await api.post('/classes/extend', {
        classId: classId,
        additionalMinutes: minutes
      });
      
      if (response.data.success) {
        // Update local state
        setClasses(classes.map(c => 
          c.id === classId ? { 
            ...c, 
            endTime: response.data.newEndTime,
            isOpen: true 
          } : c
        ));
        
        showToastMessage(
          `Class extended by ${minutes} minutes! New end time: ${response.data.newEndTime}`,
          'success'
        );
      }
    } catch (error) {
      console.error('Error extending class:', error);
      showToastMessage(
        error.response?.data?.message || 'Failed to extend class. Please try again.',
        'error'
      );
    }
  };

  const handleViewClassDetails = async (classItem) => {
    setSelectedClass(classItem);
    setShowClassDetailsModal(true);
    // Fetch attendance for today by default
    await fetchAttendance(classItem.id, selectedDate);
  };

  const fetchAttendance = async (classId, date) => {
    setLoadingAttendance(true);
    try {
      const response = await api.get(`/classes/${classId}/attendance`, {
        params: { date }
      });
      
      if (response.data.success) {
        setAttendanceRecords(response.data.attendance || []);
      } else {
        setAttendanceRecords([]);
        showToastMessage('Failed to load attendance records', 'error');
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAttendanceRecords([]);
      showToastMessage('Error loading attendance', 'error');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleDateChange = async (newDate) => {
    setSelectedDate(newDate);
    if (selectedClass) {
      await fetchAttendance(selectedClass.id, newDate);
    }
  };

  const handleAddStudentsToClass = (classId) => {
    const classItem = classes.find(c => c.id === classId);
    setSelectedClass(classItem);
    
    // Filter out students who are already enrolled in this class (by student ID)
    const enrolledStudentIds = classItem.enrolledStudents || [];
    const availableStudentsList = students.filter(student => 
      !enrolledStudentIds.includes(student.id)
    );
    
    setAvailableStudents(availableStudentsList);
    setSelectedStudents([]);
    setSearchTerm('');
    setShowManageStudentsModal(true);
  };

  const handleSearchStudents = (searchTerm) => {
    setSearchTerm(searchTerm);
  };

  const handleStudentSelection = (studentId, isSelected) => {
    if (isSelected) {
      setSelectedStudents([...selectedStudents, studentId]);
    } else {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    }
  };

  const handleAddSelectedStudents = async () => {
    if (selectedStudents.length === 0) {
      showToastMessage('Please select at least one student', 'error');
      return;
    }

    setIsAddingStudents(true);
    try {
      // Send student IDs to backend to save in Airtable
      const response = await api.post('/classes/add-students', {
        classId: selectedClass.id,
        studentIds: selectedStudents
      });

      // Get the student names for display
      const selectedStudentNames = students
        .filter(student => selectedStudents.includes(student.id))
        .map(student => student.name);

      // Update local state with enrolled students
      const updatedClasses = classes.map(classItem => 
        classItem.id === selectedClass.id 
          ? { 
              ...classItem, 
              enrolledStudents: response.data.enrolledStudents || [...(classItem.enrolledStudents || []), ...selectedStudents],
              attendance: [
                ...(classItem.attendance || []),
                ...selectedStudentNames.map(name => ({
                  name,
                  signedIn: false,
                  time: null,
                  isLate: false
                }))
              ]
            }
          : classItem
      );

      setClasses(updatedClasses);
      setShowManageStudentsModal(false);
      setSelectedStudents([]);
      setSearchTerm('');
      showToastMessage(`${selectedStudentNames.length} student(s) added successfully`, 'success');
    } catch (error) {
      console.error('Error adding students:', error);
      showToastMessage('Failed to add students. Please try again.', 'error');
    } finally {
      setIsAddingStudents(false);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    try {
      // Get student name for display
      const student = students.find(s => s.id === studentId);
      const studentName = student ? student.name : 'Student';

      // Send request to backend to remove student from Airtable
      await api.post('/classes/remove-student', {
        classId: selectedClass.id,
        studentId: studentId
      });

      // Update local state
      const updatedClasses = classes.map(classItem => 
        classItem.id === selectedClass.id 
          ? { 
              ...classItem, 
              enrolledStudents: (classItem.enrolledStudents || []).filter(id => id !== studentId),
              attendance: (classItem.attendance || []).filter(att => att.name !== studentName)
            }
          : classItem
      );

      setClasses(updatedClasses);
      
      // Update selectedClass if the modal is still open
      if (selectedClass && selectedClass.id === selectedClass.id) {
        setSelectedClass({
          ...selectedClass,
          enrolledStudents: (selectedClass.enrolledStudents || []).filter(id => id !== studentId)
        });
      }
      
      showToastMessage(`${studentName} removed from class`, 'success');
    } catch (error) {
      console.error('Error removing student:', error);
      showToastMessage('Failed to remove student. Please try again.', 'error');
    }
  };

  const getFilteredStudents = () => {
    if (!searchTerm) return availableStudents;
    
    return availableStudents.filter(student => 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.course.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Helper function to get student details from ID
  const getStudentById = (studentId) => {
    return students.find(s => s.id === studentId);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isLate = (signInTime, startTime, lateThreshold) => {
    if (!signInTime) return false;
    
    const start = new Date(`2000-01-01 ${startTime}`);
    const signIn = new Date(`2000-01-01 ${signInTime}`);
    const threshold = new Date(start.getTime() + (lateThreshold * 60000));
    
    return signIn > threshold;
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="profile-container">
        {/* Dashboard Title - Separate Container */}
        <div className="dashboard-title-container">
          <h1 className="dashboard-title-text">Admin Dashboard</h1>
        </div>

        {/* Profile Header - Mobile Style for All Screens */}
        <div className="profile-header">
          <div className="profile-picture">
            <div className="avatar">
              {professor.name.split(' ').map(n => n[0]).join('')}
            </div>
          </div>
          <div className="profile-info">
            {/* Professor Name - Separate Container */}
            <div className="professor-name-container">
              <h2>{professor.name}</h2>
            </div>
            
            <p><strong>Department:</strong> {professor.department}</p>
            <p><strong>Email:</strong> {professor.email}</p>
            <div className="current-time">
              Current Time: {formatTime(currentTime)}
            </div>
            
            {/* Action Buttons - Above Separator */}
            <div className="action-buttons-section">
              <button 
                className="add-class-btn" 
                onClick={() => setShowAddClassModal(true)}
              >
                Add New Class
              </button>
              <button 
                className="settings-btn" 
                onClick={() => setShowSettingsModal(true)}
              >
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Separator Line */}
        <div className="separator-line"></div>


        {/* Classes Section */}
        <div className="classes-section">
          <h2 className="classes-title">My Classes</h2>
          <div className="classes-list">
            {classes.length > 0 ? (
              classes.map((classItem) => (
                <div key={classItem.id} className="class-card">
                  <div className="class-header">
                    <div className="class-info">
                      <h3 className="class-code">{classItem.code}</h3>
                      <h4 className="class-name">{classItem.name}</h4>
                      <p className="class-schedule">
                        📅 {formatDate(new Date().toISOString().split('T')[0])} | 🕒 {classItem.startTime || 'N/A'} - {classItem.endTime || 'N/A'}
                      </p>
                      <p className="class-stats">
                        👥 {classItem.enrolledStudents?.length || 0}/{classItem.maxStudents || 0} students
                      </p>
                    </div>
                    <div className="class-status">
                      <span className={`status-badge ${classItem.isOpen ? 'open' : 'closed'}`}>
                        {classItem.isOpen ? 'Open' : 'Closed'}
                      </span>
                      <span className={`control-badge ${classItem.isManualControl ? 'manual' : 'auto'}`}>
                        {classItem.isManualControl ? 'Manual Control' : 'Time-based'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="class-actions">
                    <button 
                      className={`toggle-btn ${classItem.isOpen ? 'close' : 'open'}`}
                      onClick={() => handleToggleClassStatus(classItem.id)}
                    >
                      {classItem.isOpen ? 'Close Class' : 'Open Class'}
                    </button>
                    {classItem.isOpen && (
                      <button 
                        className="extend-btn"
                        onClick={() => handleExtendClass(classItem.id)}
                        style={{
                          backgroundColor: '#ff9800',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        ⏱️ Extend Time
                      </button>
                    )}
                    <button 
                      className="details-btn"
                      onClick={() => handleViewClassDetails(classItem)}
                    >
                      View Details
                    </button>
                    <button 
                      className="students-btn"
                      onClick={() => handleAddStudentsToClass(classItem.id)}
                    >
                      Manage Students
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-classes">
                <p>No classes created yet. Click "Add New Class" to get started.</p>
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
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '160px',
              height: '48px',
              transition: 'all 0.3s ease'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Add Class Modal */}
      {showAddClassModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add New Class</h3>
              <button className="close-btn" onClick={() => setShowAddClassModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Class Code:</label>
                  <input
                    type="text"
                    value={newClass.code}
                    onChange={(e) => setNewClass({...newClass, code: e.target.value})}
                    placeholder="e.g., CC 201"
                  />
                </div>
                <div className="form-group">
                  <label>Class Name:</label>
                  <input
                    type="text"
                    value={newClass.name}
                    onChange={(e) => setNewClass({...newClass, name: e.target.value})}
                    placeholder="e.g., Introduction to Computing"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Max Students:</label>
                  <input
                    type="number"
                    value={newClass.maxStudents}
                    onChange={(e) => setNewClass({...newClass, maxStudents: parseInt(e.target.value)})}
                    min="1"
                    max="100"
                  />
                </div>
                <div className="form-group">
                  <label>Late Threshold (minutes):</label>
                  <input
                    type="number"
                    value={newClass.lateThreshold}
                    onChange={(e) => setNewClass({...newClass, lateThreshold: parseInt(e.target.value)})}
                    min="0"
                    max="60"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time:</label>
                  <input
                    type="time"
                    value={newClass.startTime}
                    onChange={(e) => setNewClass({...newClass, startTime: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>End Time:</label>
                  <input
                    type="time"
                    value={newClass.endTime}
                    onChange={(e) => setNewClass({...newClass, endTime: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={newClass.isManualControl}
                      onChange={(e) => setNewClass({...newClass, isManualControl: e.target.checked})}
                    />
                    Manual Control (Override time-based sign-in)
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setShowAddClassModal(false)}
                disabled={isCreatingClass}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleAddClass}
                disabled={isCreatingClass}
              >
                {isCreatingClass ? (
                  <>
                    <span className="spinner"></span>
                    Creating...
                  </>
                ) : (
                  'Add Class'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Class Details Modal */}
      {showClassDetailsModal && selectedClass && (
        <div className="modal-overlay">
          <div className="modal large-modal">
            <div className="modal-header">
              <h3>{selectedClass.code} - {selectedClass.name}</h3>
              <button className="close-btn" onClick={() => setShowClassDetailsModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="class-details-info">
                <div className="detail-section">
                  <h4>Class Information</h4>
                  <p><strong>Date:</strong> {formatDate(selectedClass.date)}</p>
                  <p><strong>Time:</strong> {selectedClass.startTime} - {selectedClass.endTime}</p>
                  <p><strong>Late Threshold:</strong> {selectedClass.lateThreshold} minutes</p>
                  <p><strong>Control Type:</strong> {selectedClass.isManualControl ? 'Manual' : 'Time-based'}</p>
                </div>

                <div className="detail-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4>Attendance Records</h4>
                    <div className="date-picker-container">
                      <label style={{ marginRight: '10px', fontSize: '14px' }}>Select Date:</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #ddd',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>

                  {loadingAttendance ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                      Loading attendance records...
                    </div>
                  ) : attendanceRecords.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '20px', 
                      color: '#999',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px'
                    }}>
                      <p style={{ margin: 0 }}>📋 No attendance records for this date</p>
                      <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>Students will appear here after they sign in</p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ 
                        color: '#666', 
                        fontSize: '14px', 
                        marginBottom: '10px',
                        fontWeight: '500'
                      }}>
                        {attendanceRecords.length} student{attendanceRecords.length !== 1 ? 's' : ''} signed in on {formatDate(selectedDate)}
                      </p>
                      <div className="attendance-list">
                        {attendanceRecords.map((record, index) => (
                          <div key={record.id || index} className={`attendance-item ${record.isLate ? 'late' : ''}`}>
                            <div className="student-info">
                              <span className="student-name">{record.studentName}</span>
                              <span className={record.isLate ? 'late-status' : 'on-time-status'}>
                                {record.isLate ? 'Late' : 'On Time'}
                              </span>
                            </div>
                            <div className="sign-in-info">
                              <span className="sign-in-time">
                                {record.signInTime}
                              </span>
                              <span className="distance-info">
                                {record.distance}m
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowClassDetailsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Settings</h3>
              <button className="close-btn" onClick={() => setShowSettingsModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Default Late Threshold (minutes):</label>
                <input type="number" defaultValue="15" min="1" max="60" />
              </div>
              <div className="form-group">
                <label>
                  <input type="checkbox" defaultChecked />
                  Auto-close classes after end time
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input type="checkbox" defaultChecked />
                  Send notifications for late students
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowSettingsModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={() => setShowSettingsModal(false)}>
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Students Modal */}
      {showManageStudentsModal && selectedClass && (
        <div className="modal-overlay">
          <div className="modal large-modal">
            <div className="modal-header">
              <h3>Manage Students - {selectedClass.code}</h3>
              <button className="close-btn" onClick={() => setShowManageStudentsModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              {/* Current Enrolled Students */}
              <div className="detail-section">
                <h4>Current Enrolled Students ({selectedClass.enrolledStudents?.length || 0})</h4>
                <div className="enrolled-students-list">
                  {(selectedClass.enrolledStudents || []).length > 0 ? (
                    (selectedClass.enrolledStudents || []).map((studentId, index) => {
                      const student = getStudentById(studentId);
                      return student ? (
                        <div key={studentId || index} className="enrolled-student-item">
                          <div className="student-info">
                            <span className="student-name">{student.name}</span>
                            <span className="student-email">{student.email}</span>
                            <span className="student-status">Enrolled</span>
                          </div>
                          <button 
                            className="remove-student-btn"
                            onClick={() => handleRemoveStudent(studentId)}
                          >
                            ❌ Remove
                          </button>
                        </div>
                      ) : null;
                    })
                  ) : (
                    <p className="no-students">No students enrolled yet.</p>
                  )}
                </div>
              </div>

              {/* Add New Students */}
              <div className="detail-section">
                <h4>Add New Students</h4>
                
                {/* Search Bar */}
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Search by name, email, or course..."
                    value={searchTerm}
                    onChange={(e) => handleSearchStudents(e.target.value)}
                    className="search-input"
                  />
                  <span className="search-icon">🔍</span>
                </div>

                {/* Available Students List */}
                <div className="available-students-list">
                  {getFilteredStudents().length > 0 ? (
                    getFilteredStudents().map((student) => (
                      <div key={student.id} className="available-student-item">
                        <div className="student-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={(e) => handleStudentSelection(student.id, e.target.checked)}
                          />
                        </div>
                        <div className="student-details">
                          <div className="student-name">{student.name}</div>
                          <div className="student-email">{student.email}</div>
                          <div className="student-course">{student.course}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-students">
                      {searchTerm ? 'No students found matching your search.' : 'No available students to add.'}
                    </div>
                  )}
                </div>

                {/* Selected Students Summary */}
                {selectedStudents.length > 0 && (
                  <div className="selected-summary">
                    <strong>{selectedStudents.length} student(s) selected</strong>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setShowManageStudentsModal(false)}
                disabled={isAddingStudents}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleAddSelectedStudents}
                disabled={selectedStudents.length === 0 || isAddingStudents}
              >
                {isAddingStudents ? (
                  <>
                    <span className="spinner"></span>
                    Adding Students...
                  </>
                ) : (
                  `Add Selected Students (${selectedStudents.length})`
                )}
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
              {toastType === 'success' ? '✅' : toastType === 'error' ? '❌' : 'ℹ️'}
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

export default AdminDashboard;
