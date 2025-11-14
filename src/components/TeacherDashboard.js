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
  const [showClassDetailsModal, setShowClassDetailsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showManageStudentsModal, setShowManageStudentsModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  
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
          
          // Update live attendance map immediately
          setLiveAttendance(prev => {
            const currentAttendance = prev[event.classId] || [];
            return {
              ...prev,
              [event.classId]: [...currentAttendance, newAttendance]
            };
          });
          
          showToastMessage(`✅ ${newAttendance.student_name} signed in!`, 'success');
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
          const latitude = classItem.building.latitude;
          const longitude = classItem.building.longitude;

          console.log(`✅ Building Location: ${latitude}, ${longitude}`);

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

      // No building location - fall back to teacher's GPS (legacy behavior)
      if (!navigator.geolocation) {
        showToastMessage('Geolocation is not supported by your browser. Please use a modern browser like Chrome, Firefox, or Safari.', 'error');
        return;
      }

      // Show loading message
      showToastMessage('📍 Getting your location... This may take 20-30 seconds indoors.', 'info');

      try {
        console.log('No building assigned - requesting teacher geolocation (indoor-friendly mode)...');
        
        // Check if permission is granted first
        if (navigator.permissions) {
          try {
            const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
            console.log('Geolocation permission status:', permissionStatus.state);
            
            if (permissionStatus.state === 'denied') {
              showToastMessage('Location permission denied. Please enable location access in your browser settings and reload the page.', 'error');
              return;
            }
          } catch (permError) {
            console.warn('Could not check permission status:', permError);
          }
        }
        
        // Indoor-friendly location strategy: Watch for improvements over time
        let bestPosition = null;
        let watchId = null;
        
        const getLocationWithWatch = () => {
          return new Promise((resolve, reject) => {
            let positionCount = 0;
            const maxWaitTime = 30000; // 30 seconds total wait
            const minPositions = 3; // Collect at least 3 readings
            const startTime = Date.now();
            
            const timeoutId = setTimeout(() => {
              if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
              }
              if (bestPosition) {
                console.log(`⏱️ Timeout reached, using best position: ${bestPosition.coords.accuracy}m`);
                resolve(bestPosition);
              } else {
                reject(new Error('Location timeout - no position obtained'));
              }
            }, maxWaitTime);
            
            watchId = navigator.geolocation.watchPosition(
              (position) => {
                positionCount++;
                const accuracy = position.coords.accuracy;
                const elapsed = Date.now() - startTime;
                
                console.log(`📍 Position ${positionCount}: Accuracy ${accuracy.toFixed(1)}m (${(elapsed/1000).toFixed(1)}s elapsed)`);
                
                // Keep the best (most accurate) position
                if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
                  bestPosition = position;
                  console.log(`✨ New best accuracy: ${accuracy.toFixed(1)}m`);
                }
                
                // Success conditions:
                // 1. Very good accuracy (< 50m)
                // 2. Good accuracy (< 100m) after 15 seconds
                // 3. Acceptable accuracy (< 300m) after 20 seconds
                // 4. Any accuracy after collecting enough readings
                const goodEnough = (
                  (accuracy < 50) ||
                  (accuracy < 100 && elapsed > 15000) ||
                  (accuracy < 300 && elapsed > 20000) ||
                  (positionCount >= minPositions && elapsed > 10000)
                );
                
                if (goodEnough) {
                  clearTimeout(timeoutId);
                  navigator.geolocation.clearWatch(watchId);
                  console.log(`✅ Acceptable location found: ${accuracy.toFixed(1)}m after ${(elapsed/1000).toFixed(1)}s`);
                  resolve(bestPosition);
                }
              },
              (error) => {
                clearTimeout(timeoutId);
                if (watchId !== null) {
                  navigator.geolocation.clearWatch(watchId);
                }
                console.error('Geolocation error:', error);
                
                // If we have at least one position, use it
                if (bestPosition) {
                  console.log(`⚠️ Error occurred, but using best position: ${bestPosition.coords.accuracy}m`);
                  resolve(bestPosition);
                } else {
                  reject(error);
                }
              },
              {
                enableHighAccuracy: true,
                timeout: 10000, // Timeout for each individual reading
                maximumAge: 0
              }
            );
          });
        };
        
        const position = await getLocationWithWatch();

        const { latitude, longitude, accuracy } = position.coords;
        console.log(`✅ Final Location: ${latitude}, ${longitude}, Accuracy: ${accuracy}m`);
        
        // Show accuracy info to teacher
        let accuracyMessage = '';
        if (accuracy < 50) {
          accuracyMessage = `📍 Excellent accuracy: ${Math.round(accuracy)}m`;
        } else if (accuracy < 100) {
          accuracyMessage = `📍 Good accuracy: ${Math.round(accuracy)}m`;
        } else if (accuracy < 300) {
          accuracyMessage = `📍 Acceptable accuracy: ${Math.round(accuracy)}m (Good for indoor use)`;
        } else {
          accuracyMessage = `📍 Low accuracy: ${Math.round(accuracy)}m (Location may be approximate)`;
        }
        console.log(accuracyMessage);

        // Call API to open class with geolocation
        const response = await api.post('/classes/open', {
          classId: classId,
          latitude: latitude,
          longitude: longitude
        });

        // Update the class with GPS coordinates
        setClasses(classes.map(c => 
          c.id === classId ? { 
            ...c, 
            isOpen: true,
            currentSessionLat: latitude,
            currentSessionLon: longitude,
            currentSessionOpened: new Date().toISOString()
          } : c
        ));

        // Check if geofencing is active
        if (response.data.geofence_active === false) {
          showToastMessage(`${response.data.message} ${response.data.warning}`, 'info');
        } else {
          showToastMessage(`✅ Class opened successfully! ${accuracyMessage} • Geofence: 100m radius`, 'success');
        }
      } catch (error) {
        console.error('Geolocation error:', error);
        if (error.code) {
          // Geolocation API error codes
          const errorMessages = {
            1: '📍 Location Access Denied. Please enable location permission in your browser settings and reload the page.',
            2: '📡 Location Unavailable. Please enable Location Services in your phone settings and make sure GPS is turned on.',
            3: '⏱️ Location Timeout. GPS is taking too long. Please go outdoors or near a window and try again.'
          };
          showToastMessage(errorMessages[error.code] || 'Failed to get location. Please try again.', 'error');
        } else if (error.message && error.message.includes('timeout')) {
          showToastMessage('⏱️ Location request timed out. Please go outdoors or near a window and try again.', 'error');
        } else if (error.response) {
          showToastMessage(error.response?.data?.message || 'Failed to open class. Please try again.', 'error');
        } else {
          showToastMessage('❌ Failed to get location. Please check location services are enabled and try again.', 'error');
        }
      }
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
    <div className="admin-dashboard">
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
                style={{
                  backgroundColor: '#2196F3', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, marginLeft: '10px', marginRight: '10px'
                }}
                onClick={() => setShowChangePasswordModal(true)}
              >
                🔒 Change Password
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

                  {/* Live Attendance Map - Shows below class card */}
                  <div style={{ marginTop: '20px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px'
                    }}>
                      <h4 style={{ margin: 0, fontSize: '16px', color: '#2c3e50' }}>
                        📍 Class Location
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
                          🟢 LIVE
                        </span>
                      )}
                    </div>
                    <AttendanceMap
                      teacherLocation={
                        classItem.isOpen && classItem.currentSessionLat && classItem.currentSessionLon
                          ? {
                              lat: classItem.currentSessionLat,
                              lng: classItem.currentSessionLon
                            }
                          : null
                      }
                      students={
                        (liveAttendance[classItem.id] || [])
                          .filter(r => r.latitude && r.longitude)
                          .map(r => ({
                            name: r.studentName,
                            email: r.studentEmail || '',
                            latitude: r.latitude,
                            longitude: r.longitude,
                            signed_in_at: r.signInTime
                          }))
                      }
                      geofenceRadius={100}
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
                  {selectedClass.isOpen && selectedClass.currentSessionLat && selectedClass.currentSessionLon && (
                    <p>
                      <strong>Class Status:</strong> 
                      <span style={{ 
                        color: '#28a745', 
                        fontWeight: 'bold',
                        marginLeft: '8px'
                      }}>
                        🟢 LIVE - Geofence Active
                      </span>
                    </p>
                  )}
                </div>

                {/* Live Attendance Map - Only shown when class is open */}
                {selectedClass.isOpen && selectedClass.currentSessionLat && selectedClass.currentSessionLon && (
                  <div className="detail-section">
                    <h4>📍 Live Attendance Map</h4>
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
                        signed_in_at: r.signInTime
                      }))}
                      geofenceRadius={100}
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
                        <span className="student-status">✓ Enrolled</span>
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

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>🔒 Change Password</h3>
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
            maxWidth: window.innerWidth <= 768 ? 'calc(100vw - 32px)' : '380px',
            minWidth: '280px',
            maxHeight: '80px',
            width: 'auto',
            height: 'auto',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 99999,
            overflow: 'hidden',
            border: toastType === 'success' ? '2px solid #28a745' : '2px solid #dc3545',
            display: 'inline-block',
            pointerEvents: 'auto',
            margin: '0'
          }}
        >
          <div 
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              background: toastType === 'success' ? '#d4edda' : '#f8d7da'
            }}
          >
            <div style={{ fontSize: '20px', flexShrink: 0 }}>
              {toastType === 'success' ? '✅' : toastType === 'error' ? '❌' : 'ℹ️'}
            </div>
            <div style={{ 
              flex: 1,
              fontSize: '14px',
              lineHeight: '1.4',
              color: toastType === 'success' ? '#155724' : '#721c24',
              fontWeight: '500',
              wordBreak: 'break-word'
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

export default TeacherDashboard;
