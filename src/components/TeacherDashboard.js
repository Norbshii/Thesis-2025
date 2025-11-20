import React, { useState, useEffect } from 'react';
import api, { authAPI } from '../services/api';
import AttendanceMap from './AttendanceMap';
import LoadingScreen from './LoadingScreen';
import echo from '../services/echo';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
  const [professor, setProfessor] = useState({
    name: '',
    department: '',
    email: '',
    profilePicture: null
  });

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Modal states
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [showClassDetailsModal, setShowClassDetailsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showManageStudentsModal, setShowManageStudentsModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);
  const [isDeletingClass, setIsDeletingClass] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Live attendance for all classes (for map display)
  const [liveAttendance, setLiveAttendance] = useState({});
  
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
    isManualControl: false,
    building_id: '' // Selected building
  });

  const [enrolledStudents, setEnrolledStudents] = useState([]);
  
  // Manage Students Modal states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  
  // Loading states
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [isAddingStudents, setIsAddingStudents] = useState(false);

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
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

  useEffect(() => {
    // Clock timer (keep this, it's for UI)
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const loadData = async () => {
      try {
        const currentUser = authAPI.getStoredUser();
        
        // Load teacher profile
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
            const emailDerived = String(currentUser.email).split('@')[0].replace(/\./g, ' ').trim();
            setProfessor({
              name: currentUser?.name || emailDerived || 'Teacher',
              department: 'Computer Science',
              email: currentUser.email || '',
              profilePicture: null
            });
          }
        }
        
        // Load classes ONCE (no more polling!)
        try {
          const classesResponse = await api.get('/classes', {
            params: { teacherEmail: currentUser?.email }
          });
          const loadedClasses = classesResponse.data.classes || [];
          const validClasses = loadedClasses.filter(cls => cls.code && cls.name);
          const classesWithAttendance = validClasses.map(cls => ({
            ...cls,
            enrolledStudents: cls.enrolledStudents || [],
            attendance: []
          }));
          setClasses(classesWithAttendance);
          
          // Fetch today's attendance for ALL classes (open or closed) to populate the map
          // This shows students who signed in today, even if class was closed/reopened
          const today = new Date().toISOString().split('T')[0];
          
          // Fetch attendance for all classes in parallel
          const attendancePromises = classesWithAttendance.map(async (classItem) => {
            try {
              const attendanceResponse = await api.get(`/classes/${classItem.id}/attendance`, {
                params: { date: today }
              });
              
              if (attendanceResponse.data.success && attendanceResponse.data.attendance) {
                const todayAttendance = attendanceResponse.data.attendance
                  .filter(record => record.latitude && record.longitude) // Only include records with location
                  .map(record => ({
                    studentName: record.studentName,
                    studentEmail: record.studentEmail,
                    latitude: record.latitude,
                    longitude: record.longitude,
                    signInTime: record.signInTime,
                    timeInsideGeofence: record.timeInsideGeofence || 0,
                    geofenceEntryTime: record.geofenceEntryTime || null,
                    geofenceExitTime: record.geofenceExitTime || null,
                    currentlyInside: record.currentlyInside !== undefined ? record.currentlyInside : true
                  }));
                
                return { classId: classItem.id, attendance: todayAttendance };
              }
              return { classId: classItem.id, attendance: [] };
            } catch (attendanceError) {
              console.error(`Error fetching attendance for class ${classItem.id}:`, attendanceError);
              return { classId: classItem.id, attendance: [] };
            }
          });
          
          // Wait for all attendance fetches to complete
          const attendanceResults = await Promise.all(attendancePromises);
          
          // Update liveAttendance state with all fetched records
          setLiveAttendance(prev => {
            const updated = { ...prev };
            attendanceResults.forEach(({ classId, attendance }) => {
              if (attendance.length > 0) {
                console.log(`📊 Loaded ${attendance.length} attendance records for class ${classId}:`, attendance);
              }
              updated[classId] = attendance;
            });
            console.log('🗺️ Final liveAttendance state:', updated);
            return updated;
          });
          
          // Store today's date so we can detect when it changes
          localStorage.setItem('lastAttendanceFetchDate', today);
        } catch (error) {
          console.error('Error loading classes:', error);
          showToastMessage('Failed to load classes', 'error');
        }

        // Load students ONCE
        try {
          const studentsResponse = await api.get('/students');
          setStudents(studentsResponse.data.students || []);
        } catch (error) {
          console.error('Error loading students:', error);
          showToastMessage('Failed to load students', 'error');
        }

        // Load buildings ONCE
        try {
          const buildingsResponse = await api.get('/buildings', {
            params: { active_only: true }
          });
          setBuildings(buildingsResponse.data.buildings || []);
        } catch (error) {
          console.error('Error loading buildings:', error);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
    
    // 🔥 WEBSOCKET LISTENERS - REAL-TIME UPDATES!
    
    // Listen for class updates (created/opened/closed)
    const classChannel = echo.channel('classes')
      .listen('.class.updated', (event) => {
        console.log('🔄 Class updated via WebSocket:', event);
        const updatedClass = event.class;
        const action = event.action || 'updated';
        
        // Handle deletion
        if (action === 'deleted') {
          setClasses(prevClasses => prevClasses.filter(c => c.id !== updatedClass.id));
          setLiveAttendance(prev => {
            const updated = { ...prev };
            delete updated[updatedClass.id];
            return updated;
          });
          showToastMessage(`Class "${updatedClass.class_name || updatedClass.class_code}" has been deleted`, 'info');
          return;
        }
        
        // Update the class in state
        setClasses(prevClasses => {
          const exists = prevClasses.find(c => c.id === updatedClass.id);
          if (exists) {
            // Update existing class
            return prevClasses.map(c => 
              c.id === updatedClass.id 
                ? { ...c, ...updatedClass, enrolledStudents: c.enrolledStudents }
                : c
            );
          } else {
            // Add new class
            return [...prevClasses, { ...updatedClass, enrolledStudents: [], attendance: [] }];
          }
        });
        
        // Show toast based on action
        if (event.action === 'opened') {
          showToastMessage(`📍 Class "${updatedClass.class_name}" opened!`, 'success');
        } else if (event.action === 'closed') {
          showToastMessage(`🔒 Class "${updatedClass.class_name}" closed`, 'info');
        }
      });
    
    // Listen for attendance updates (student sign-ins)
    classes.forEach(classItem => {
      echo.channel(`attendance.${classItem.id}`)
        .listen('.attendance.updated', (event) => {
          console.log('👥 Attendance updated via WebSocket:', event);
          const newAttendance = event.attendance;
          
          // Normalize WebSocket data to match API response format (camelCase)
          const normalizedAttendance = {
            studentName: newAttendance.student_name || newAttendance.studentName,
            studentEmail: newAttendance.student_email || newAttendance.studentEmail,
            latitude: newAttendance.latitude,
            longitude: newAttendance.longitude,
            signInTime: newAttendance.sign_in_time || newAttendance.signInTime,
            timeInsideGeofence: newAttendance.timeInsideGeofence || 0,
            geofenceEntryTime: newAttendance.geofence_entry_time || newAttendance.geofenceEntryTime || null,
            geofenceExitTime: newAttendance.geofence_exit_time || newAttendance.geofenceExitTime || null,
            currentlyInside: newAttendance.currently_inside !== undefined ? newAttendance.currently_inside : (newAttendance.currentlyInside !== undefined ? newAttendance.currentlyInside : true)
          };
          
          // Update live attendance map immediately
          setLiveAttendance(prev => {
            const currentAttendance = prev[event.classId] || [];
            // Check if this student already exists (avoid duplicates)
            const exists = currentAttendance.some(
              a => a.studentEmail === normalizedAttendance.studentEmail && 
                   a.signInTime === normalizedAttendance.signInTime
            );
            if (exists) {
              return prev; // Don't add duplicate
            }
            return {
              ...prev,
              [event.classId]: [...currentAttendance, normalizedAttendance]
            };
          });
          
          showToastMessage(`✅ ${normalizedAttendance.studentName} signed in!`, 'success');
        });
    });
    
    // Listen for student list updates
    const studentChannel = echo.channel('students')
      .listen('.student.updated', (event) => {
        console.log('📚 Students updated via WebSocket:', event);
        setStudents(event.students);
      });
    
    // Listen for building updates
    const buildingChannel = echo.channel('buildings')
      .listen('.building.updated', (event) => {
        console.log('🏢 Buildings updated via WebSocket:', event);
        setBuildings(event.buildings);
      });
    
    return () => {
      clearInterval(timer);
      // Disconnect WebSocket channels
      echo.leave('classes');
      classes.forEach(classItem => {
        echo.leave(`attendance.${classItem.id}`);
      });
      echo.leave('students');
      echo.leave('buildings');
    };
  }, []);

  // Auto-refresh attendance when date changes (e.g., at midnight)
  useEffect(() => {
    const checkDateChange = () => {
      const today = new Date().toISOString().split('T')[0];
      const lastFetchedDate = localStorage.getItem('lastAttendanceFetchDate');
      
      // If date changed, refresh attendance for all classes
      if (lastFetchedDate && lastFetchedDate !== today && classes.length > 0) {
        console.log('📅 Date changed! Refreshing attendance data...');
        
        const attendancePromises = classes.map(async (classItem) => {
          try {
            const attendanceResponse = await api.get(`/classes/${classItem.id}/attendance`, {
              params: { date: today }
            });
            
            if (attendanceResponse.data.success && attendanceResponse.data.attendance) {
              const todayAttendance = attendanceResponse.data.attendance
                .filter(record => record.latitude && record.longitude)
                  .map(record => ({
                    studentName: record.studentName,
                    studentEmail: record.studentEmail,
                    latitude: record.latitude,
                    longitude: record.longitude,
                    signInTime: record.signInTime,
                    timeInsideGeofence: record.timeInsideGeofence || 0,
                    geofenceEntryTime: record.geofenceEntryTime || null,
                    geofenceExitTime: record.geofenceExitTime || null,
                    currentlyInside: record.currentlyInside !== undefined ? record.currentlyInside : true
                  }));
              
              return { classId: classItem.id, attendance: todayAttendance };
            }
            return { classId: classItem.id, attendance: [] };
          } catch (attendanceError) {
            console.error(`Error refreshing attendance for class ${classItem.id}:`, attendanceError);
            return { classId: classItem.id, attendance: [] };
          }
        });
        
        Promise.all(attendancePromises).then(attendanceResults => {
          setLiveAttendance(prev => {
            const updated = { ...prev };
            attendanceResults.forEach(({ classId, attendance }) => {
              updated[classId] = attendance;
            });
            return updated;
          });
          localStorage.setItem('lastAttendanceFetchDate', today);
        });
      }
    };
    
    // Check every minute if date changed
    const dateCheckInterval = setInterval(checkDateChange, 60000);
    
    return () => clearInterval(dateCheckInterval);
  }, [classes, currentTime]);

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
        teacherEmail: currentUser?.email,
        building_id: newClass.building_id || null // Include selected building
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

  const handleEditClass = (classItem) => {
    setSelectedClass(classItem);
    setNewClass({
      code: classItem.classCode,
      name: classItem.className,
      date: classItem.days,
      startTime: classItem.startTime,
      endTime: classItem.endTime,
      maxStudents: classItem.maxStudents || 30,
      lateThreshold: classItem.lateThreshold || 15,
      isManualControl: classItem.isManualControl || false,
      building_id: classItem.building?.id || ''
    });
    setShowEditClassModal(true);
  };

  const handleUpdateClass = async () => {
    if (!newClass.code || !newClass.name || !newClass.startTime || !newClass.endTime) {
      showToastMessage('Please fill in all required fields', 'error');
        return;
      }

    setIsCreatingClass(true);
    try {
      const currentUser = authAPI.getStoredUser();
      const payload = {
        code: newClass.code,
        name: newClass.name,
        date: selectedClass.date, // Preserve original date/days
        startTime: newClass.startTime,
        endTime: newClass.endTime,
        maxStudents: parseInt(newClass.maxStudents, 10) || 30,
        lateThreshold: parseInt(newClass.lateThreshold, 10) || 15,
        isManualControl: newClass.isManualControl,
        teacherEmail: currentUser?.email,
        building_id: newClass.building_id || null
      };
      
      const response = await api.put(`/classes/${selectedClass.id}`, payload);

      // Update local state with full response data
      const updatedClass = {
        ...selectedClass,
        code: response.data.class.class_code,
        name: response.data.class.class_name,
        startTime: response.data.class.start_time,
        endTime: response.data.class.end_time,
        lateThreshold: response.data.class.late_threshold,
        isManualControl: response.data.class.is_manual_control,
        building: response.data.class.building,
        building_id: response.data.class.building_id
      };

      setClasses(classes.map(c => 
        c.id === selectedClass.id ? updatedClass : c
      ));
      
      setShowEditClassModal(false);
      showToastMessage('✅ Class updated! Time slots refreshed.', 'success');
    } catch (error) {
      console.error('Error updating class:', error);
      const errorMsg = error.response?.data?.message || 'Failed to update class';
      showToastMessage(errorMsg, 'error');
    } finally {
      setIsCreatingClass(false);
    }
  };

  const handleToggleClassStatus = async (classId) => {
    const classItem = classes.find(c => c.id === classId);
    const isCurrentlyOpen = classItem.isOpen;

    if (!isCurrentlyOpen) {
      // Opening class - check if building location is available
      if (classItem.building && classItem.building.latitude && classItem.building.longitude) {
        // Use building's location (constant coordinates)
        console.log('Using building location:', classItem.building.name);
        showToastMessage(`📍 Using ${classItem.building.name} location...`, 'info');

        try {
          const latitude = parseFloat(classItem.building.latitude);
          const longitude = parseFloat(classItem.building.longitude);

          console.log(`✅ Building Location: ${latitude}, ${longitude}`);

          // Validate coordinates
          if (isNaN(latitude) || isNaN(longitude)) {
            showToastMessage('❌ Invalid building coordinates. Please edit the building and fix the location.', 'error');
            return;
          }

          if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            showToastMessage('❌ Building coordinates are out of range. Please edit the building.', 'error');
            return;
          }

          // Call API to open class with building's geolocation
        const response = await api.post('/classes/open', {
          classId: classId,
          latitude: latitude,
          longitude: longitude
        });

          // Update the class with building coordinates
        setClasses(classes.map(c => 
          c.id === classId ? { 
            ...c, 
            isOpen: true,
            currentSessionLat: latitude,
            currentSessionLon: longitude,
            currentSessionOpened: new Date().toISOString()
          } : c
        ));

          showToastMessage(`✅ Class opened at ${classItem.building.name}! 📍 Using constant building location (100m radius)`, 'success');
      } catch (error) {
          console.error('Error opening class with building location:', error);
          showToastMessage(error.response?.data?.message || 'Failed to open class. Please try again.', 'error');
        }
        return; // Exit early - we used building location
      }

      // No building location - show warning and require building assignment
      showToastMessage('⚠️ No building assigned! Please edit this class and assign a building first.', 'error');
      console.warn('⚠️ Class has no building assigned. Please use the Edit Class function to assign a building.');
      return;
    } else {
      // Closing class
      try {
        await api.post('/classes/close', {
          classId: classId
        });

        setClasses(classes.map(c => 
          c.id === classId ? { 
            ...c, 
            isOpen: false,
            currentSessionLat: null,
            currentSessionLon: null,
            currentSessionOpened: null
          } : c
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
      `Current end time: ${formatTimeString(classItem.endTime)}\n\n` +
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
          `Class extended by ${minutes} minutes! New end time: ${formatTimeString(response.data.newEndTime)}`,
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

  const handleDeleteClassClick = (classItem) => {
    setClassToDelete(classItem);
    setShowDeleteConfirmModal(true);
  };

  const handleDeleteClass = async () => {
    if (!classToDelete) return;

    setIsDeletingClass(true);
    try {
      const response = await api.delete(`/classes/${classToDelete.id}`);
      
      if (response.data.success) {
        // Remove class from local state
        setClasses(classes.filter(c => c.id !== classToDelete.id));
        
        // Also remove from live attendance if present
        setLiveAttendance(prev => {
          const updated = { ...prev };
          delete updated[classToDelete.id];
          return updated;
        });
        
        showToastMessage(
          `✅ Class "${classToDelete.name}" deleted successfully. ${response.data.attendance_records_deleted || 0} attendance records were also deleted.`,
          'success'
        );
        
        setShowDeleteConfirmModal(false);
        setClassToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      const errorMsg = error.response?.data?.message || 'Failed to delete class. Please try again.';
      showToastMessage(errorMsg, 'error');
    } finally {
      setIsDeletingClass(false);
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

  const handleDeleteAttendance = async (attendanceId, studentName) => {
    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete the attendance record for ${studentName}? This will allow them to sign in again.`)) {
      return;
    }

    try {
      const response = await api.delete(`/classes/attendance/${attendanceId}`);
      
      if (response.data.success) {
        showToastMessage(`Attendance record for ${studentName} deleted successfully`, 'success');
        
        // Refresh attendance records
        if (selectedClass) {
          await fetchAttendance(selectedClass.id, selectedDate);
        }
        
        // Also update live attendance map if needed
        if (selectedClass && liveAttendance[selectedClass.id]) {
          setLiveAttendance(prev => {
            const updated = { ...prev };
            if (updated[selectedClass.id]) {
              updated[selectedClass.id] = updated[selectedClass.id].filter(
                record => record.id !== attendanceId
              );
            }
            return updated;
          });
        }
      } else {
        showToastMessage('Failed to delete attendance record', 'error');
      }
    } catch (error) {
      console.error('Error deleting attendance:', error);
      showToastMessage(
        error.response?.data?.message || 'Failed to delete attendance record',
        'error'
      );
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
    
    console.log('🔍 DEBUG: Opening Manage Students Modal');
    console.log('  Raw enrolledStudents:', classItem.enrolledStudents);
    console.log('  Type:', Array.isArray(classItem.enrolledStudents) ? 'Array' : typeof classItem.enrolledStudents);
    
    // Filter out students who are already enrolled in this class (by student ID)
    // enrolledStudents can be either an array of IDs or an array of objects with {id, name, email}
    const enrolledData = classItem.enrolledStudents || [];
    const enrolledStudentIds = enrolledData.map(item => {
      // If it's an object, extract the id; if it's just an ID, use it directly
      const extractedId = typeof item === 'object' && item !== null ? item.id : item;
      console.log('  Item:', item, '→ ID:', extractedId);
      return extractedId;
    });
    
    console.log('📊 Enrolled Student IDs (extracted):', enrolledStudentIds);
    console.log('📋 All Students:', students.map(s => ({ id: s.id, name: s.name })));
    
    const availableStudentsList = students.filter(student => {
      // Convert both IDs to numbers for comparison (backend might return strings)
      const studentIdNum = Number(student.id);
      const isEnrolled = enrolledStudentIds.some(enrolledId => Number(enrolledId) === studentIdNum);
      
      if (isEnrolled) {
        console.log('  ❌ Filtering out (already enrolled):', student.name, '(ID:', student.id, ')');
      } else {
        console.log('  ✅ Keeping (not enrolled):', student.name, '(ID:', student.id, ')');
      }
      return !isEnrolled;
    });
    
    console.log('✅ Available Students (after filter):', availableStudentsList.map(s => s.name));
    
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
    
    // Remove newly enrolled students from available students list
    const updatedAvailableStudents = availableStudents.filter(
      student => !selectedStudents.some(selectedId => Number(selectedId) === Number(student.id))
    );
    setAvailableStudents(updatedAvailableStudents);
    
    // Update selectedClass to reflect new enrollments
    const updatedSelectedClass = updatedClasses.find(c => c.id === selectedClass.id);
    setSelectedClass(updatedSelectedClass);
    
    setSelectedStudents([]);
    setSearchTerm('');
    
    // Keep modal open so user can see the changes
    console.log('✅ Students enrolled! Updated counts:');
    console.log('   📗 Enrolled:', updatedSelectedClass?.enrolledStudents?.length || 0);
    console.log('   📋 Available:', updatedAvailableStudents.length);
    
    showToastMessage(`${selectedStudentNames.length} student(s) added successfully! They've been removed from the available list.`, 'success');
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
              enrolledStudents: (classItem.enrolledStudents || []).filter(enrolledItem => {
                // Handle both ID-only format and object format
                const enrolledId = typeof enrolledItem === 'object' ? enrolledItem.id : enrolledItem;
                // Convert both to numbers for comparison
                return Number(enrolledId) !== Number(studentId);
              }),
              attendance: (classItem.attendance || []).filter(att => att.name !== studentName)
          }
        : classItem
    );

    setClasses(updatedClasses);
      
      // Add the removed student back to available students list
      if (student) {
        setAvailableStudents([...availableStudents, student]);
      }
      
      // Update selectedClass if the modal is still open
      const updatedSelectedClass = updatedClasses.find(c => c.id === selectedClass.id);
      if (updatedSelectedClass) {
        setSelectedClass(updatedSelectedClass);
      }
      
      console.log('✅ Student removed! They are now available again.');
      
    showToastMessage(`${studentName} removed from class and added back to available list`, 'success');
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

  // Convert 24-hour time string (e.g., "21:07:00" or "21:07") to 12-hour format (e.g., "9:07 PM")
  const formatTimeString = (timeString) => {
    if (!timeString || timeString === 'N/A') return timeString;
    
    try {
      // Handle formats like "21:07:00" or "21:07"
      const [hours, minutes] = timeString.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return timeString;
      
      const date = new Date();
      date.setHours(hours, minutes, 0);
      
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return timeString; // Return original if conversion fails
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    // Handle date strings that might be invalid (like "Mon,Wed,Fri" from days field)
    try {
      const date = new Date(dateString);
      // Check if date is valid (not 1970-01-01 which is Unix epoch)
      if (isNaN(date.getTime()) || date.getFullYear() === 1970) {
        // If invalid, return today's date
        return new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      // If parsing fails, return today's date
      return new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  // Filter attendance records based on search query
  const filteredRecords = attendanceRecords.filter(record => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.studentName?.toLowerCase().includes(query) ||
      record.studentEmail?.toLowerCase().includes(query)
    );
  });

  const isLate = (signInTime, startTime, lateThreshold) => {
    if (!signInTime) return false;
    
    const start = new Date(`2000-01-01 ${startTime}`);
    const signIn = new Date(`2000-01-01 ${signInTime}`);
    const threshold = new Date(start.getTime() + (lateThreshold * 60000));
    
    return signIn > threshold;
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

  if (loading) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  return (
    <div className="teacher-dashboard">
      <div className="profile-container">
        {/* Dashboard Title - Separate Container */}
        <div className="dashboard-title-container">
          <h1 className="dashboard-title-text">Teacher Dashboard</h1>
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
                className="change-password-btn"
                onClick={() => setShowChangePasswordModal(true)}
              >
                Change Password
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
                        Schedule: {formatDate(new Date().toISOString().split('T')[0])} | {formatTimeString(classItem.startTime) || 'N/A'} - {formatTimeString(classItem.endTime) || 'N/A'}
                      </p>
                      <p className="class-stats">
                        Students: {classItem.enrolledStudents?.length || 0}/{classItem.maxStudents || 0}
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
                        Extend Time
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
                    <button 
                      className="edit-btn"
                      onClick={() => handleEditClass(classItem)}
                      style={{
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Edit Class
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteClassClick(classItem)}
                      style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      🗑️ Delete Class
                    </button>
                  </div>

                  {/* Live Attendance Map - Shows below class card */}
                  <div style={{ marginTop: '20px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px'
                    }}>
                      <h4 style={{ margin: 0, fontSize: '16px', color: '#2c3e50' }}>
                        Class Location
                      </h4>
                      {classItem.isOpen && classItem.currentSessionLat && classItem.currentSessionLon && (
                        <span style={{
                          fontSize: '12px',
                          color: '#28a745',
                          fontWeight: 'bold',
                          padding: '4px 8px',
                          background: '#d4edda',
                          borderRadius: '12px'
                        }}>
                          Live
                        </span>
                      )}
                      {!classItem.isOpen && (
                        <span style={{
                          fontSize: '12px',
                          color: '#6c757d',
                          fontWeight: 'bold',
                          padding: '4px 8px',
                          background: '#e9ecef',
                          borderRadius: '12px'
                        }}>
                          Closed
                        </span>
                      )}
                    </div>
                    <AttendanceMap
                      teacherLocation={
                        // Always use building location (constant location for the class)
                        (classItem.building && classItem.building.latitude && classItem.building.longitude)
                          ? {
                              lat: parseFloat(classItem.building.latitude),
                              lng: parseFloat(classItem.building.longitude)
                            }
                          // Fallback: use first student's location if no building
                          : (liveAttendance[classItem.id] && liveAttendance[classItem.id].length > 0 && liveAttendance[classItem.id][0].latitude)
                          ? {
                              lat: liveAttendance[classItem.id][0].latitude,
                              lng: liveAttendance[classItem.id][0].longitude
                            }
                          : null
                      }
                      students={(() => {
                        const classAttendance = liveAttendance[classItem.id] || [];
                        const filtered = classAttendance.filter(r => r && r.latitude && r.longitude);
                        console.log(`🗺️ Map data for class ${classItem.id} (${classItem.code}):`, {
                          totalRecords: classAttendance.length,
                          withLocation: filtered.length,
                          records: filtered
                        });
                        return filtered.map(r => ({
                          name: r.studentName,
                          email: r.studentEmail || '',
                          latitude: r.latitude,
                          longitude: r.longitude,
                          signed_in_at: r.signInTime,
                          timeInsideGeofence: r.timeInsideGeofence || 0,
                          geofenceEntryTime: r.geofenceEntryTime || null,
                          geofenceExitTime: r.geofenceExitTime || null,
                          currentlyInside: r.currentlyInside !== undefined ? r.currentlyInside : true
                        }));
                      })()}
                      geofenceRadius={classItem.geofenceRadius || 100}
                      isClassOpen={classItem.isOpen}
                    />
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
        <div className="logout-section">
          <button 
            className="logout-btn" 
            onClick={handleLogout}
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
                  <label>Building Location:</label>
                  <select
                    value={newClass.building_id}
                    onChange={(e) => setNewClass({...newClass, building_id: e.target.value})}
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      fontSize: '14px',
                      width: '100%'
                    }}
                  >
                    <option value="">Select a building (optional)</option>
                    {buildings.map(building => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                    Select building to use its coordinates when opening class
                  </small>
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

      {/* Edit Class Modal */}
      {showEditClassModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Class</h3>
              <button className="close-btn" onClick={() => setShowEditClassModal(false)}>
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
                  <label>Building Location:</label>
                  <select
                    value={newClass.building_id}
                    onChange={(e) => setNewClass({...newClass, building_id: e.target.value})}
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      fontSize: '14px',
                      width: '100%'
                    }}
                  >
                    <option value="">Select a building (optional)</option>
                    {buildings.map(building => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                    Changing building will update the class location when opened
                  </small>
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
                onClick={() => setShowEditClassModal(false)}
                disabled={isCreatingClass}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleUpdateClass}
                disabled={isCreatingClass}
              >
                {isCreatingClass ? (
                  <>
                    <span className="spinner"></span>
                    Updating...
                  </>
                ) : (
                  'Update Class'
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
                  <p><strong>Date:</strong> {formatDate(selectedDate)}</p>
                  <p><strong>Time:</strong> {formatTimeString(selectedClass.startTime)} - {formatTimeString(selectedClass.endTime)}</p>
                  <p><strong>Late Threshold:</strong> {selectedClass.lateThreshold} minutes</p>
                  <p><strong>Control Type:</strong> {selectedClass.isManualControl ? 'Manual' : 'Time-based'}</p>
                  {selectedClass.isOpen && selectedClass.currentSessionLat && selectedClass.currentSessionLon && (
                    <p>
                      <strong>Class Status:</strong> 
                      <span style={{ 
                        color: '#28a745', 
                        fontWeight: 'bold',
                        marginLeft: '8px'
                      }}>
                        Live - Geofence Active
                      </span>
                    </p>
                  )}
                </div>

                {/* Live Attendance Map - Only shown when class is open */}
                {selectedClass.isOpen && selectedClass.currentSessionLat && selectedClass.currentSessionLon && (
                  <div className="detail-section">
                    <h4>Live Attendance Map</h4>
                    <AttendanceMap
                      teacherLocation={{
                        lat: selectedClass.currentSessionLat,
                        lng: selectedClass.currentSessionLon
                      }}
                      students={attendanceRecords.filter(r => r.latitude && r.longitude).map(r => ({
                        name: r.studentName,
                        email: r.studentEmail || '',
                        latitude: r.latitude,
                        longitude: r.longitude,
                        signed_in_at: r.signInTime,
                        signInTime: r.signInTime,
                        date: r.date,
                        status: r.status,
                        timeInsideGeofence: r.timeInsideGeofence || 0,
                        geofenceEntryTime: r.geofenceEntryTime || null,
                        geofenceExitTime: r.geofenceExitTime || null,
                        currentlyInside: r.currentlyInside !== undefined ? r.currentlyInside : true
                      }))}
                      geofenceRadius={selectedClass.geofenceRadius || 100}
                      isClassOpen={selectedClass.isOpen}
                    />
                  </div>
                )}

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
                      {/* Summary Stats */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '12px',
                        marginBottom: '20px'
                      }}>
                        <div style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          padding: '16px',
                          borderRadius: '12px',
                          color: 'white',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{attendanceRecords.length}</div>
                          <div style={{ fontSize: '12px', opacity: 0.9 }}>Total Present</div>
                        </div>
                        <div style={{
                          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                          padding: '16px',
                          borderRadius: '12px',
                          color: 'white',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                            {attendanceRecords.filter(r => !r.isLate).length}
                          </div>
                          <div style={{ fontSize: '12px', opacity: 0.9 }}>On Time</div>
                        </div>
                        <div style={{
                          background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                          padding: '16px',
                          borderRadius: '12px',
                          color: 'white',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                            {attendanceRecords.filter(r => r.isLate).length}
                          </div>
                          <div style={{ fontSize: '12px', opacity: 0.9 }}>Late</div>
                        </div>
                        <div style={{
                          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                          padding: '16px',
                          borderRadius: '12px',
                          color: 'white',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                            {attendanceRecords.filter(r => r.distance <= 100).length}
                          </div>
                          <div style={{ fontSize: '12px', opacity: 0.9 }}>In Geofence</div>
                        </div>
                      </div>

                      {/* Search Bar */}
                      <div style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder="Search student by name or email..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: '2px solid #e9ecef',
                        fontSize: '14px', 
                            outline: 'none',
                            transition: 'border-color 0.3s ease'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#667eea'}
                          onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                        />
                        {searchQuery && (
                          <div style={{ marginTop: '8px', fontSize: '13px', color: '#6c757d' }}>
                            Showing {filteredRecords.length} of {attendanceRecords.length} students
                          </div>
                        )}
                      </div>

                      {/* Attendance Cards - 3 Column Grid */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                        gap: '16px' 
                      }}>
                        {filteredRecords.map((record, index) => (
                          <div key={record.id || index} style={{
                            background: 'white',
                            border: `2px solid ${record.isLate ? '#ffc107' : '#28a745'}`,
                            borderRadius: '12px',
                            padding: '12px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.1)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                          >
                            {/* Header */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                        marginBottom: '10px',
                              paddingBottom: '10px',
                              borderBottom: '1px solid #f0f0f0'
                            }}>
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: `linear-gradient(135deg, ${record.isLate ? '#ffc107' : '#28a745'} 0%, ${record.isLate ? '#ff9800' : '#20c997'} 100%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                flexShrink: 0
                              }}>
                                {record.studentName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ 
                                  fontSize: '15px', 
                                  fontWeight: '600', 
                                  color: '#2c3e50',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {record.studentName}
                                </div>
                                <div style={{ 
                                  fontSize: '11px', 
                                  color: '#7f8c8d',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {record.studentEmail || 'No email'}
                                </div>
                              </div>
                              {/* Delete Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAttendance(record.id, record.studentName);
                                }}
                                style={{
                                  background: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '6px 10px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.2s ease',
                                  flexShrink: 0
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#c82333';
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#dc3545';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                                title="Delete this attendance record"
                              >
                                Delete
                              </button>
                            </div>

                            {/* Status Badge */}
                            <div style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: record.isLate ? '#fff3cd' : '#d4edda',
                              color: record.isLate ? '#856404' : '#155724',
                              fontSize: '12px',
                              fontWeight: '600',
                              textAlign: 'center',
                              marginBottom: '10px'
                            }}>
                              {record.isLate ? 'Late' : 'On Time'}
                            </div>

                            {/* Info */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#6c757d' }}>Time</span>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>
                                {formatTimeString(record.signInTime)}
                              </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#6c757d' }}>Distance</span>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>
                                  {record.distance ? `${Math.round(record.distance)}m` : 'N/A'}
                              </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#6c757d' }}>Status</span>
                                <span style={{ 
                                  fontSize: '13px', 
                                  fontWeight: '600', 
                                  color: record.distance <= 100 ? '#28a745' : '#dc3545' 
                                }}>
                                  {record.distance <= 100 ? 'Inside' : 'Outside'}
                                </span>
                              </div>
                              {record.timeInsideGeofence !== undefined && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', color: '#6c757d' }}>Duration</span>
                                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>
                                    {Math.floor(record.timeInsideGeofence / 60)}m {record.timeInsideGeofence % 60}s
                                  </span>
                                </div>
                              )}
                          </div>
                      </div>
                    ))}
                  </div>

                      {filteredRecords.length === 0 && searchQuery && (
                        <div style={{
                          textAlign: 'center',
                          padding: '40px 20px',
                          color: '#999',
                          background: '#f8f9fa',
                          borderRadius: '12px'
                        }}>
                          <div style={{ fontSize: '48px', marginBottom: '10px' }}>Search</div>
                          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '5px' }}>No results found</div>
                          <div style={{ fontSize: '14px' }}>Try searching with a different name or email</div>
                        </div>
                      )}
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
                    (selectedClass.enrolledStudents || []).map((studentData, index) => {
                      // Handle both formats: studentData can be an object {id, name, email} or just an ID
                      const studentId = typeof studentData === 'object' ? studentData.id : studentData;
                      const student = typeof studentData === 'object' && studentData.name 
                        ? studentData 
                        : getStudentById(studentId);
                      
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
                        Remove
                      </button>
                    </div>
                      ) : null;
                    })
                  ) : (
                    <p className="no-students">No students enrolled yet.</p>
                  )}
                </div>
              </div>

              {/* Divider between Enrolled and Available Students */}
              <div className="students-divider">
                <div className="divider-line"></div>
                <span className="divider-text">Available Students</span>
                <div className="divider-line"></div>
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

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="close-btn" onClick={() => {
                setShowChangePasswordModal(false);
                setPasswordForm({ currentPassword: '', newPassword: '', newPassword_confirmation: '' });
                setShowPasswords({ current: false, new: false, confirm: false });
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
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    disabled={isChangingPassword}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#666' }}
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
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    placeholder="Enter new password (min 6 characters)"
                    disabled={isChangingPassword}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#666' }}
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
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.newPassword_confirmation}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword_confirmation: e.target.value})}
                    placeholder="Confirm new password"
                    disabled={isChangingPassword}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#666' }}
                    disabled={isChangingPassword}
                  >
                    {showPasswords.confirm ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => {
                setShowChangePasswordModal(false);
                setPasswordForm({ currentPassword: '', newPassword: '', newPassword_confirmation: '' });
                setShowPasswords({ current: false, new: false, confirm: false });
              }} disabled={isChangingPassword}>Cancel</button>
              <button className="btn-primary" onClick={handleChangePassword} disabled={isChangingPassword}>
                {isChangingPassword ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Class Confirmation Modal */}
      {showDeleteConfirmModal && classToDelete && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>⚠️ Confirm Class Deletion</h3>
              <button 
                className="close-btn" 
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setClassToDelete(null);
                }}
                disabled={isDeletingClass}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div style={{ 
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ 
                  fontSize: '48px',
                  marginBottom: '20px'
                }}>
                  🗑️
                </div>
                <h4 style={{ 
                  marginBottom: '15px',
                  color: '#dc3545',
                  fontSize: '20px',
                  fontWeight: '600'
                }}>
                  Are you sure you want to delete this class?
                </h4>
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  textAlign: 'left'
                }}>
                  <p style={{ margin: '5px 0', fontWeight: '600' }}>
                    Class Code: <span style={{ color: '#6c757d' }}>{classToDelete.code}</span>
                  </p>
                  <p style={{ margin: '5px 0', fontWeight: '600' }}>
                    Class Name: <span style={{ color: '#6c757d' }}>{classToDelete.name}</span>
                  </p>
                  <p style={{ margin: '5px 0', fontWeight: '600' }}>
                    Enrolled Students: <span style={{ color: '#6c757d' }}>{classToDelete.enrolledStudents?.length || 0}</span>
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '20px'
                }}>
                  <p style={{ 
                    margin: 0,
                    color: '#856404',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    ⚠️ <strong>Warning:</strong> This action cannot be undone. Deleting this class will also permanently delete all attendance records associated with it.
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              padding: '20px'
            }}>
              <button 
                className="btn-secondary" 
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setClassToDelete(null);
                }}
                disabled={isDeletingClass}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleDeleteClass}
                disabled={isDeletingClass}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: isDeletingClass ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  opacity: isDeletingClass ? 0.6 : 1
                }}
              >
                {isDeletingClass ? 'Deleting...' : '🗑️ Yes, Delete Class'}
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
            top: '16px',
            right: '16px',
            left: window.innerWidth <= 768 ? '50%' : 'auto',
            transform: window.innerWidth <= 768 ? 'translateX(-50%)' : 'none',
            width: 'auto',
            maxWidth: '280px',
            minWidth: '200px',
            background: '#fff',
            borderRadius: '10px',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.12)',
            border: toastType === 'success' ? '1px solid #38c172' : toastType === 'info' ? '1px solid #3490dc' : '1px solid #e3342f',
            zIndex: 9999,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <div style={{ 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%',
            background: toastType === 'success' ? '#38c172' : toastType === 'info' ? '#3490dc' : '#e3342f' 
          }} />
          <div style={{ 
            flex: 1, 
            fontSize: '14px', 
            color: '#2d3748', 
            fontWeight: '500', 
            lineHeight: '1.4'
          }}>
            {toastMessage}
          </div>
          <button 
            onClick={() => setShowToast(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#a0aec0',
              fontSize: '18px',
              cursor: 'pointer',
              lineHeight: '1'
            }}
            aria-label="Close toast"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
