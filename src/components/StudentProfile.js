import React, { useState, useEffect } from 'react';
import api, { authAPI } from '../services/api';
import LoadingScreen from './LoadingScreen';
import echo from '../services/echo';
import './StudentProfile.css';

const StudentProfile = () => {
  const [student, setStudent] = useState({
    name: '',
    age: '',
    course: '',
    section: '',
    address: '',
    guardianName: '',
    relationship: '',
    guardianEmail: '',
    profilePicture: null
  });
  
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showTimeRestrictionModal, setShowTimeRestrictionModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [selectedClass, setSelectedClass] = useState(null);
  const [restrictedClassInfo, setRestrictedClassInfo] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    newPassword_confirmation: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [editForm, setEditForm] = useState({
    name: '',
    age: '',
    course: '',
    section: '',
    address: '',
    guardianName: '',
    relationship: '',
    guardianEmail: ''
  });
  const [courseOptions, setCourseOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Load course options
    const loadCourseOptions = async () => {
      try {
        const response = await api.get('/student/course-options');
        setCourseOptions(response.data.courses || []);
      } catch (error) {
        console.error('Failed to load course options:', error);
        setCourseOptions([]);
      }
    };

    // Load section options
    const loadSectionOptions = async () => {
      try {
        const response = await api.get('/sections/active');
        setSectionOptions(response.data.sections || []);
      } catch (error) {
        console.error('Failed to load section options:', error);
        setSectionOptions([]);
      }
    };

    // Load classes + profile
    const loadData = async () => {
      const currentUser = authAPI.getStoredUser();
      
      // Load student profile first (independent of classes)
      if (currentUser?.email) {
        try {
          const prof = await api.get('/student/profile', { params: { email: currentUser.email } });
          const p = prof?.data?.profile || {};
          const fallbackNameFromEmail = String(currentUser.email).split('@')[0].replace(/\./g, ' ').trim();
          const merged = {
            name: p.name || currentUser?.name || fallbackNameFromEmail || '',
            age: p.age || '',
            course: p.course || '',
            section: p.section || '',
            address: p.address || '',
            guardianName: p.guardianName || '',
            relationship: p.relationship || '',
            guardianEmail: p.guardianEmail || '',
            profilePicture: null
          };
          setStudent(merged);
          setEditForm(merged);
        } catch (e) {
          console.error('Profile load error:', e);
          // Fallback to email-derived name
          const fallbackNameFromEmail = String(currentUser.email).split('@')[0].replace(/\./g, ' ').trim();
          const fallback = {
            name: currentUser?.name || fallbackNameFromEmail || '',
            age: '',
            course: '',
            section: '',
            address: '',
            guardianName: '',
            relationship: '',
            guardianEmail: '',
            profilePicture: null
          };
          setStudent(fallback);
          setEditForm(fallback);
        }
      }

      // Load classes (separate try/catch so profile still loads if classes fail)
      try {
        // NEW: Use studentEmail parameter to fetch only enrolled classes
        const response = await api.get('/classes', {
          params: { studentEmail: currentUser?.email }
        });
        const enrolledClasses = response?.data?.classes || [];
        
        const mapped = enrolledClasses.map(r => ({
          id: r.id,
          code: r.code || 'N/A',
          name: r.name || 'N/A',
          timeSlot: r.time_slot || 'Always Available',
          instructor: r.instructor || 'N/A',
          isSignedIn: !!r.is_signed_in,
          alwaysAvailable: !!r.always_available,
          isOpen: !!r.isOpen,
          startTime: r.startTime || null,
          endTime: r.endTime || null,
          building: r.building || null // Add building information
        }));
        setClasses(mapped);
      } catch (error) {
        console.error('Error loading classes:', error);
        // Keep empty classes array
      }

        setLoading(false);
    };

    loadCourseOptions();
    loadSectionOptions();
    loadData();

    // 🔥 WEBSOCKET LISTENERS - REAL-TIME CLASS UPDATES!
    
    // Listen for class updates (opened/closed)
    const classChannel = echo.channel('classes')
      .listen('.class.updated', (event) => {
        console.log('🔄 Class updated via WebSocket (Student):', event);
        const updatedClass = event.class;
        
        // Update the class in state if it's in the student's enrolled classes
        setClasses(prevClasses => {
          return prevClasses.map(c => {
            if (c.id === updatedClass.id) {
              return {
                ...c,
                isOpen: updatedClass.is_open,
                startTime: updatedClass.start_time,
                endTime: updatedClass.end_time
              };
            }
            return c;
          });
        });
        
        // Show toast notification
        if (event.action === 'opened') {
          showToastMessage(`📍 ${updatedClass.class_name} is now OPEN!`, 'success');
        } else if (event.action === 'closed') {
          showToastMessage(`🔒 ${updatedClass.class_name} is now closed`, 'info');
        }
      });

    return () => {
      clearInterval(timer);
      // Disconnect WebSocket channels
      echo.leave('classes');
    };
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

    if (action === 'sign_in') {
      // For sign-in, we need geolocation
      if (!navigator.geolocation) {
        showToastMessage('Geolocation is not supported by your browser', 'error');
        return;
      }

      setIsSigningIn(true);

      try {
        // Get student's current location
        console.log('📍 Requesting geolocation...');
        showToastMessage('📍 Getting your location... Please wait.', 'info');
        
        // Multiple attempts with different strategies
        let position;
        let attempt = 1;
        
        // Attempt 1: Use any cached location (fastest)
        try {
          console.log('📍 Attempt 1: Trying cached/network location...');
          position = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('timeout')), 5000);
            
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                clearTimeout(timeout);
                console.log('✅ Cached/Network location acquired:', pos.coords);
                resolve(pos);
              },
              (err) => {
                clearTimeout(timeout);
                reject(err);
              },
              {
                enableHighAccuracy: false,
                timeout: 4000,
                maximumAge: 60000 // Accept up to 1 minute old location
              }
            );
          });
        } catch (e1) {
          console.log('⚠️ Attempt 1 failed, trying GPS...');
          attempt = 2;
          
          // Attempt 2: GPS low accuracy
          try {
            showToastMessage('📍 Getting GPS location... Please wait.', 'info');
            position = await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('timeout')), 15000);
              
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  clearTimeout(timeout);
                  console.log('✅ GPS location acquired:', pos.coords);
                  resolve(pos);
                },
                (err) => {
                  clearTimeout(timeout);
                  reject(err);
                },
                {
                  enableHighAccuracy: false,
                  timeout: 12000,
                  maximumAge: 0
                }
              );
            });
          } catch (e2) {
            console.log('⚠️ Attempt 2 failed, trying high accuracy GPS...');
            attempt = 3;
            
            // Attempt 3: GPS high accuracy (last resort)
            showToastMessage('📍 Acquiring precise GPS... This takes longer.', 'info');
            position = await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('All location attempts failed'));
              }, 40000);
              
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  clearTimeout(timeout);
                  console.log('✅ High accuracy GPS acquired:', pos.coords);
                  resolve(pos);
                },
                (err) => {
                  clearTimeout(timeout);
                  console.error('❌ All attempts failed');
                  reject(err);
                },
                {
                  enableHighAccuracy: true,
                  timeout: 35000,
                  maximumAge: 0
                }
              );
            });
          }
        }
        
        console.log(`📍 Location acquired on attempt ${attempt}:`, {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });

        const { latitude, longitude } = position.coords;
        console.log('📍 Using coordinates:', { latitude, longitude, accuracy: position.coords.accuracy });
        
        // Validate coordinates before sending
        if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
          console.error('❌ Invalid coordinates received:', { latitude, longitude });
          showToastMessage('Invalid location detected. Please try again.', 'error');
          setIsSigningIn(false);
          return;
        }
        
        // Check if coordinates are 0,0 (invalid - in the ocean)
        if (latitude === 0 && longitude === 0) {
          console.error('❌ Coordinates are 0,0 (invalid)');
          showToastMessage('Location not available. Please refresh and allow location access.', 'error');
          setIsSigningIn(false);
          return;
        }
        
        // Check if coordinates are in valid ranges
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          console.error('❌ Coordinates out of range:', { latitude, longitude });
          showToastMessage('Invalid location coordinates. Please try again.', 'error');
          setIsSigningIn(false);
          return;
        }
        
        // Check accuracy - if accuracy is very poor (> 1000m), warn user
        if (position.coords.accuracy && position.coords.accuracy > 1000) {
          console.warn('⚠️ Low GPS accuracy:', position.coords.accuracy, 'meters');
          showToastMessage(`⚠️ Low GPS accuracy (${Math.round(position.coords.accuracy)}m). Please move to an open area.`, 'warning');
        }
        
        const currentUser = authAPI.getStoredUser();

        // Call API to sign in with geolocation validation
        const response = await api.post('/classes/student-signin', {
          classId: selectedClass.id,
          studentEmail: currentUser?.email || '',
          studentName: student.name || currentUser?.name || 'Student',
          latitude: latitude,
          longitude: longitude
        });

        if (response.data.success) {
          setClasses(classes.map(c => 
            c.id === selectedClass.id 
              ? { ...c, isSignedIn: true }
              : c
          ));

          const message = response.data.message;
          const distance = response.data.distance;
          showToastMessage(`${message} (Distance: ${distance}m from classroom)`, 'success');
          
          setShowSignInModal(false);
          setSelectedClass(null);
        } else {
          showToastMessage(response.data.message || 'Failed to sign in', 'error');
        }
      } catch (error) {
        console.error('Error signing in:', error);
        
        // If this is a geolocation error (has .code property) OR location attempt failed
        // try TEST MODE sign-in (no location required)
        const isLocationError = error.code || 
                               (error.message && error.message.toLowerCase().includes('location')) ||
                               (error.message && error.message.includes('failed')) ||
                               (error.message && error.message.includes('timeout'));
        
        if (isLocationError) {
          console.log('⚠️ Location acquisition failed. Attempting TEST MODE sign-in...');
          showToastMessage('⚠️ Cannot get location. Trying test mode sign-in...', 'info');
          
          try {
            const currentUser = authAPI.getStoredUser();
            const response = await api.post('/classes/student-signin', {
              classId: selectedClass.id,
              studentEmail: currentUser?.email || '',
              studentName: student.name || currentUser?.name || 'Student'
              // No latitude/longitude - test mode will handle this
            });
            
            if (response.data.success) {
              setClasses(classes.map(c => 
                c.id === selectedClass.id 
                  ? { ...c, isSignedIn: true }
                  : c
              ));
              
              showToastMessage('✅ Signed in successfully (Test Mode - Location check bypassed)', 'success');
              setShowSignInModal(false);
              setSelectedClass(null);
              return; // Success - exit early
            }
          } catch (testModeError) {
            console.error('❌ Test mode sign-in also failed:', testModeError);
            
            // Show test mode error if it's an API error
            if (testModeError.response?.data?.message) {
              showToastMessage(testModeError.response.data.message, 'error');
              return;
            }
            // Otherwise fall through to show original error
          }
        }
        
        // Better error messages
        if (error.response?.status === 400 && error.response?.data?.alreadySignedIn) {
          // Duplicate sign-in attempt
          const signInTime = error.response.data.signInTime || 'earlier';
          showToastMessage(
            `✅ Already signed in! You signed in to this class at ${signInTime}. Your attendance has been recorded.`,
            'info'
          );
          
          // Update UI to show as signed in
          setClasses(classes.map(c => 
            c.id === selectedClass.id 
              ? { ...c, isSignedIn: true }
              : c
          ));
          
          setShowSignInModal(false);
          setSelectedClass(null);
        } else if (error.response?.status === 400) {
          // Handle 400 errors (validation errors, invalid coordinates, etc.)
          const errorMsg = error.response?.data?.message || '';
          const errorType = error.response?.data?.error_type;
          
          console.log('400 Error:', { message: errorMsg, type: errorType, data: error.response?.data });
          
          if (errorType === 'invalid_coordinates') {
            // Show specific error message for invalid coordinates
            showToastMessage(errorMsg || 'Invalid location detected. Please refresh the page and try again.', 'error');
          } else if (errorMsg.includes('Location error detected')) {
            showToastMessage(errorMsg, 'error');
          } else if (errorMsg.includes('Invalid location')) {
            showToastMessage(errorMsg, 'error');
          } else if (errorMsg.includes('Location not available')) {
            showToastMessage(errorMsg, 'error');
          } else {
            // Generic 400 error
            showToastMessage(errorMsg || 'Invalid request. Please try again.', 'error');
          }
        } else if (error.response?.status === 403) {
          const errorMsg = error.response?.data?.message || '';
          console.log('403 Error Message:', errorMsg);
          
          if (errorMsg.includes('not open')) {
            showToastMessage('⏸️ Class is not open yet. Please wait for the teacher to open the class.', 'error');
          } else if (errorMsg.includes('not within') || errorMsg.includes('away from')) {
            showToastMessage(errorMsg || '📍 You are not in the classroom area. Please move closer to sign in.', 'error');
          } else if (errorMsg.includes('geofence not set')) {
            showToastMessage('⏸️ Class is not open yet. Teacher needs to open the class first.', 'error');
          } else if (errorMsg.includes('building assigned')) {
            showToastMessage(errorMsg, 'error');
          } else {
            showToastMessage(errorMsg || 'Cannot sign in at this time', 'error');
          }
        } else if (error.code) {
          // Geolocation error
          const errorMessages = {
            1: '🚫 Location permission denied. Please enable location access in your browser settings.',
            2: '📡 Location unavailable. Please check if GPS is enabled on your device.',
            3: '⏱️ Location request timed out. Please try again.'
          };
          const msg = errorMessages[error.code] || 'Failed to get location';
          console.error('Geolocation error details:', error);
          showToastMessage(msg, 'error');
        } else if (error.message && error.message.includes('timed out')) {
          showToastMessage('⏱️ Location request timed out. Please ensure GPS is enabled and try again.', 'error');
        } else if (error.response?.data?.message) {
          showToastMessage(error.response.data.message, 'error');
        } else {
          console.error('Unknown sign-in error:', error);
          showToastMessage('❌ Failed to sign in. Please check your location settings and try again.', 'error');
        }
      } finally {
        setIsSigningIn(false);
      }
    } else {
      // For sign-out, no geolocation needed
      try {
        await api.post('/class/toggle-signin', {
          record_id: selectedClass.id,
          action: 'sign_out'
        });

      setClasses(classes.map(c => 
        c.id === selectedClass.id 
            ? { ...c, isSignedIn: false }
          : c
      ));

        showToastMessage(`Successfully signed out of ${selectedClass.code} - ${selectedClass.name}`, 'success');
      
      setShowSignInModal(false);
      setSelectedClass(null);
    } catch (error) {
        console.error('Error signing out:', error);
        showToastMessage('Failed to sign out', 'error');
      }
    }
  };

  const showToastMessage = (message, type) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    
    // Standardize error duration to 2 seconds, success/info can be faster
    const duration = type === 'error' ? 2000 : 1500;
    
    setTimeout(() => {
      setShowToast(false);
    }, duration);
  };

  const handleEditProfile = () => {
    // Preload edit form with current student values
    setEditForm({
      name: student.name || '',
      age: student.age || '',
      course: student.course || '',
      section: student.section || '',
      address: student.address || '',
      guardianName: student.guardianName || '',
      relationship: student.relationship || '',
      guardianEmail: student.guardianEmail || ''
    });
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const currentUser = authAPI.getStoredUser();
      const response = await api.post('/student/profile', {
        email: currentUser?.email,
        name: editForm.name,
        age: editForm.age ? parseInt(editForm.age, 10) : null,
        course: editForm.course,
        section: editForm.section,
        address: editForm.address,
        guardianName: editForm.guardianName,
        relationship: editForm.relationship,
        guardianEmail: editForm.guardianEmail
      });
      console.log('Profile save response:', response.data);
    setStudent({
      ...student,
      name: editForm.name,
      age: editForm.age,
      course: editForm.course,
      section: editForm.section,
      address: editForm.address,
      guardianName: editForm.guardianName,
      relationship: editForm.relationship,
      guardianEmail: editForm.guardianEmail
    });
    setShowEditModal(false);
    showToastMessage('Profile updated successfully', 'success');
    } catch (err) {
      console.error('Profile save failed:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to update profile';
      showToastMessage(errorMsg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.newPassword_confirmation) {
      showToastMessage('Please fill in all password fields', 'error');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showToastMessage('New password must be at least 6 characters', 'error');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.newPassword_confirmation) {
      showToastMessage('New passwords do not match', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      const currentUser = authAPI.getStoredUser();
      const response = await api.post('/change-password', {
        email: currentUser?.email,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        newPassword_confirmation: passwordForm.newPassword_confirmation
      });

      if (response.data.success) {
        showToastMessage('Password changed successfully! Please use your new password next time you log in.', 'success');
        setShowChangePasswordModal(false);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          newPassword_confirmation: ''
        });
        setShowPasswords({
          current: false,
          new: false,
          confirm: false
        });
      }
    } catch (err) {
      console.error('Password change failed:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to change password';
      showToastMessage(errorMsg, 'error');
    } finally {
      setIsChangingPassword(false);
    }
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

  // Derive a display name even if Airtable field is briefly unavailable
  const storedUser = authAPI.getStoredUser();
  const emailDerived = storedUser?.email ? String(storedUser.email).split('@')[0].replace(/\./g, ' ').trim() : '';
  const displayName = (student.name && String(student.name).trim()) || storedUser?.name || emailDerived || '';

  if (loading) {
    return <LoadingScreen message="Loading your profile..." />;
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
              {displayName.split(' ').map(n => n[0]).join('')}
            </div>
          </div>
          <div className="profile-info">
            {/* Student Name - Separate Container */}
            <div className="student-name-container">
              <h2>{displayName}</h2>
            </div>
            
            <p><strong>Course & Section:</strong> {student.section || 'Not set'}</p>
            <p><strong>Age:</strong> {student.age} years old</p>
            <p><strong>Address:</strong> {student.address}</p>
            <p><strong>Guardian:</strong> {student.guardianName}</p>
            <p><strong>Relationship:</strong> {student.relationship}</p>
            <p><strong>Guardian Email:</strong> {student.guardianEmail}</p>
            <div className="current-time">
              Current Time: {formatTime(currentTime)}
            </div>
            
            {/* Edit Profile & Change Password Buttons - Above Separator */}
            <div className="edit-profile-section">
              <button className="edit-profile-btn" onClick={handleEditProfile}>
                📝 Edit Profile
              </button>
              <button 
                className="change-password-btn" 
                onClick={() => setShowChangePasswordModal(true)}
                style={{
                  marginLeft: '10px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                🔒 Change Password
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
                className={`class-item ${!classItem.isOpen ? 'unavailable' : ''} ${classItem.isSignedIn ? 'signed-in' : ''}`}
                onClick={() => handleClassClick(classItem.id)}
              >
                <div className="class-info">
                  <span className="class-code">{classItem.code || 'N/A'}</span>
                  <span className="class-name">{classItem.name || 'N/A'}</span>
                  {classItem.building && (
                    <span className="class-building" style={{
                      fontSize: '13px',
                      color: '#6c757d',
                      fontWeight: '500'
                    }}>
                      🏢 {classItem.building.name || 'Building'}
                    </span>
                  )}
                  <span className="class-time" style={{
                    color: classItem.isOpen ? '#28a745' : '#6c757d',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    {classItem.isOpen ? '🟢 OPEN' : '🔴 CLOSED'}
                  </span>
                  <span className="class-instructor">Instructor: {classItem.instructor || 'N/A'}</span>
                </div>
                <div className="class-status">
                  {!classItem.isOpen ? (
                    <span className="status unavailable">Class Closed</span>
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
                <label>Course & Section:</label>
                <select
                  value={editForm.section}
                  onChange={(e) => setEditForm({...editForm, section: e.target.value})}
                >
                  <option value="">Select Course & Section</option>
                  {sectionOptions.map((section) => (
                    <option key={section.id} value={section.name}>
                      {section.name}
                    </option>
                  ))}
                </select>
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
                <label>Guardian's Email Address:</label>
                <input
                  type="email"
                  value={editForm.guardianEmail}
                  onChange={(e) => setEditForm({...editForm, guardianEmail: e.target.value})}
                  placeholder="guardian@example.com"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowEditModal(false)} disabled={isSaving}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
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
                {selectedClass.building && (
                  <p><strong>Building:</strong> {selectedClass.building.name}</p>
                )}
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
                disabled={isSigningIn}
              >
                {isSigningIn ? (
                  <>
                    <span className="spinner"></span>
                    Signing in...
                  </>
                ) : (
                  selectedClass.isSignedIn ? 'Sign Out' : 'Sign In'
                )}
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

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>🔒 Change Password</h3>
              <button className="close-btn" onClick={() => {
                setShowChangePasswordModal(false);
                setPasswordForm({
                  currentPassword: '',
                  newPassword: '',
                  newPassword_confirmation: ''
                });
                setShowPasswords({
                  current: false,
                  new: false,
                  confirm: false
                });
              }}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '20px', color: '#666' }}>
                Enter your current password and choose a new password (minimum 6 characters).
              </p>
              <div className="form-group">
                <label>Current Password:</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    placeholder="Enter current password"
                    disabled={isChangingPassword}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '18px',
                      color: '#666'
                    }}
                    disabled={isChangingPassword}
                  >
                    {showPasswords.current ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>New Password:</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    placeholder="Enter new password (min 6 characters)"
                    disabled={isChangingPassword}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '18px',
                      color: '#666'
                    }}
                    disabled={isChangingPassword}
                  >
                    {showPasswords.new ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Confirm New Password:</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordForm.newPassword_confirmation}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword_confirmation: e.target.value})}
                    placeholder="Confirm new password"
                    disabled={isChangingPassword}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '18px',
                      color: '#666'
                    }}
                    disabled={isChangingPassword}
                  >
                    {showPasswords.confirm ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    newPassword_confirmation: ''
                  });
                  setShowPasswords({
                    current: false,
                    new: false,
                    confirm: false
                  });
                }}
                disabled={isChangingPassword}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            bottom: 'auto',
            left: window.innerWidth <= 768 ? '50%' : 'auto',
            right: window.innerWidth <= 768 ? 'auto' : '20px',
            transform: window.innerWidth <= 768 ? 'translateX(-50%)' : 'none',
            maxWidth: window.innerWidth <= 768 ? 'calc(100vw - 32px)' : '450px',
            minWidth: '280px',
            maxHeight: 'none',
            width: 'auto',
            height: 'auto',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 99999,
            overflow: 'visible',
            border: toastType === 'success' ? '2px solid #28a745' : '2px solid #dc3545',
            display: 'inline-block',
            pointerEvents: 'auto',
            margin: '0'
          }}
        >
          <div 
            style={{ 
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 16px',
              background: toastType === 'success' ? '#d4edda' : '#f8d7da'
            }}
          >
            <div style={{ fontSize: '20px', flexShrink: 0, marginTop: '2px' }}>
              {toastType === 'success' ? '✅' : toastType === 'error' ? '❌' : 'ℹ️'}
            </div>
            <div style={{ 
              flex: 1,
              fontSize: '14px',
              lineHeight: '1.5',
              color: toastType === 'success' ? '#155724' : '#721c24',
              fontWeight: '500',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'normal'
            }}>
              {toastMessage}
            </div>
            <button 
              onClick={() => setShowToast(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: toastType === 'success' ? '#155724' : '#721c24',
                padding: '0',
                lineHeight: '1',
                flexShrink: 0,
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;