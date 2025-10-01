import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [professor, setProfessor] = useState({
    name: 'Dr. Maria Santos',
    department: 'Computer Science',
    email: 'admin@gmail.com',
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const loadData = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock classes data
        const mockClasses = [
          {
            id: 1,
            code: 'CC 201',
            name: 'Introduction to Computing 2',
            date: '2024-01-15',
            startTime: '08:00',
            endTime: '10:00',
            maxStudents: 30,
            lateThreshold: 15,
            isManualControl: false,
            isOpen: false,
            enrolledStudents: ['Dave Lima', 'Mary Johnson', 'John Smith'],
            attendance: [
              { name: 'Dave Lima', signedIn: true, time: '08:05', isLate: false },
              { name: 'Mary Johnson', signedIn: true, time: '07:55', isLate: false },
              { name: 'John Smith', signedIn: false, time: null, isLate: false }
            ]
          },
          {
            id: 2,
            code: 'CS 301',
            name: 'Data Structures',
            date: '2024-01-15',
            startTime: '10:00',
            endTime: '12:00',
            maxStudents: 25,
            lateThreshold: 15,
            isManualControl: true,
            isOpen: true,
            enrolledStudents: ['Dave Lima', 'Mary Johnson'],
            attendance: [
              { name: 'Dave Lima', signedIn: true, time: '10:02', isLate: false },
              { name: 'Mary Johnson', signedIn: true, time: '10:18', isLate: true }
            ]
          }
        ];

        const mockStudents = [
          { id: 1, name: 'Dave Lima', email: 'dave.lima@student.edu', course: 'BSCS 4B' },
          { id: 2, name: 'Mary Johnson', email: 'mary.johnson@student.edu', course: 'BSCS 3A' },
          { id: 3, name: 'John Smith', email: 'john.smith@student.edu', course: 'BSCS 4B' },
          { id: 4, name: 'Sarah Wilson', email: 'sarah.wilson@student.edu', course: 'BSCS 3B' },
          { id: 5, name: 'Mike Brown', email: 'mike.brown@student.edu', course: 'BSCS 4A' },
          { id: 6, name: 'Emily Davis', email: 'emily.davis@student.edu', course: 'BSCS 3A' },
          { id: 7, name: 'James Wilson', email: 'james.wilson@student.edu', course: 'BSCS 4B' },
          { id: 8, name: 'Lisa Anderson', email: 'lisa.anderson@student.edu', course: 'BSCS 3C' },
          { id: 9, name: 'Robert Taylor', email: 'robert.taylor@student.edu', course: 'BSCS 4A' },
          { id: 10, name: 'Jennifer Martinez', email: 'jennifer.martinez@student.edu', course: 'BSCS 3B' },
          { id: 11, name: 'David Garcia', email: 'david.garcia@student.edu', course: 'BSCS 4C' },
          { id: 12, name: 'Amanda Lee', email: 'amanda.lee@student.edu', course: 'BSCS 3A' }
        ];
        
        setClasses(mockClasses);
        setStudents(mockStudents);
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

  const handleAddClass = () => {
    if (!newClass.code || !newClass.name || !newClass.date || !newClass.startTime || !newClass.endTime) {
      showToastMessage('Please fill in all required fields', 'error');
      return;
    }

    const classData = {
      id: classes.length + 1,
      ...newClass,
      isOpen: false,
      enrolledStudents: [],
      attendance: []
    };

    setClasses([...classes, classData]);
    setNewClass({
      code: '',
      name: '',
      date: '',
      startTime: '',
      endTime: '',
      maxStudents: 30,
      lateThreshold: 15,
      isManualControl: false
    });
    setShowAddClassModal(false);
    showToastMessage('Class added successfully', 'success');
  };

  const handleToggleClassStatus = (classId) => {
    setClasses(classes.map(c => 
      c.id === classId ? { ...c, isOpen: !c.isOpen } : c
    ));
    const classItem = classes.find(c => c.id === classId);
    showToastMessage(`Class ${classItem.isOpen ? 'closed' : 'opened'} successfully`, 'success');
  };

  const handleViewClassDetails = (classItem) => {
    setSelectedClass(classItem);
    setShowClassDetailsModal(true);
  };

  const handleAddStudentsToClass = (classId) => {
    const classItem = classes.find(c => c.id === classId);
    setSelectedClass(classItem);
    
    // Filter out students who are already enrolled in this class
    const enrolledStudentNames = classItem.enrolledStudents;
    const availableStudentsList = students.filter(student => 
      !enrolledStudentNames.includes(student.name)
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

  const handleAddSelectedStudents = () => {
    if (selectedStudents.length === 0) {
      showToastMessage('Please select at least one student', 'error');
      return;
    }

    const selectedStudentNames = students
      .filter(student => selectedStudents.includes(student.id))
      .map(student => student.name);

    // Update the class with new students
    const updatedClasses = classes.map(classItem => 
      classItem.id === selectedClass.id 
        ? { 
            ...classItem, 
            enrolledStudents: [...classItem.enrolledStudents, ...selectedStudentNames],
            attendance: [
              ...classItem.attendance,
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
  };

  const handleRemoveStudent = (studentName) => {
    const updatedClasses = classes.map(classItem => 
      classItem.id === selectedClass.id 
        ? { 
            ...classItem, 
            enrolledStudents: classItem.enrolledStudents.filter(name => name !== studentName),
            attendance: classItem.attendance.filter(att => att.name !== studentName)
          }
        : classItem
    );

    setClasses(updatedClasses);
    showToastMessage(`${studentName} removed from class`, 'success');
  };

  const getFilteredStudents = () => {
    if (!searchTerm) return availableStudents;
    
    return availableStudents.filter(student => 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.course.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
                        📅 {formatDate(classItem.date)} | 🕒 {classItem.startTime} - {classItem.endTime}
                      </p>
                      <p className="class-stats">
                        👥 {classItem.enrolledStudents.length}/{classItem.maxStudents} students
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
                  <label>Date:</label>
                  <input
                    type="date"
                    value={newClass.date}
                    onChange={(e) => setNewClass({...newClass, date: e.target.value})}
                  />
                </div>
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
                  <label>Late Threshold (minutes):</label>
                  <input
                    type="number"
                    value={newClass.lateThreshold}
                    onChange={(e) => setNewClass({...newClass, lateThreshold: parseInt(e.target.value)})}
                    min="1"
                    max="60"
                  />
                </div>
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
              <button className="btn-secondary" onClick={() => setShowAddClassModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAddClass}>
                Add Class
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
                  <h4>Attendance ({selectedClass.attendance.length} students)</h4>
                  <div className="attendance-list">
                    {selectedClass.attendance.map((student, index) => (
                      <div key={index} className={`attendance-item ${student.isLate ? 'late' : ''}`}>
                        <div className="student-info">
                          <span className="student-name">{student.name}</span>
                          <span className={`status ${student.signedIn ? 'present' : 'absent'}`}>
                            {student.signedIn ? '✅ Present' : '❌ Absent'}
                          </span>
                        </div>
                        {student.signedIn && (
                          <div className="sign-in-info">
                            <span className="sign-in-time">Signed in: {student.time}</span>
                            {student.isLate && <span className="late-badge">LATE</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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
                <h4>Current Enrolled Students ({selectedClass.enrolledStudents.length})</h4>
                <div className="enrolled-students-list">
                  {selectedClass.enrolledStudents.map((studentName, index) => (
                    <div key={index} className="enrolled-student-item">
                      <div className="student-info">
                        <span className="student-name">{studentName}</span>
                        <span className="student-status">Enrolled</span>
                      </div>
                      <button 
                        className="remove-student-btn"
                        onClick={() => handleRemoveStudent(studentName)}
                      >
                        ❌ Remove
                      </button>
                    </div>
                  ))}
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
              <button className="btn-secondary" onClick={() => setShowManageStudentsModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleAddSelectedStudents}
                disabled={selectedStudents.length === 0}
              >
                Add Selected Students ({selectedStudents.length})
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
