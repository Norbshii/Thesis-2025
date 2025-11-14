import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api, { authAPI } from '../services/api';
import LoadingScreen from './LoadingScreen';
import echo from '../services/echo';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './AdminDashboard.css';

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'buildings' | 'stats'
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [stats, setStats] = useState({});
  
  // Modal states
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateBuildingModal, setShowCreateBuildingModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingBuilding, setEditingBuilding] = useState(null);
  
  // Toast states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  
  // Form hooks
  const { register: registerUser, handleSubmit: handleSubmitUser, formState: { errors: userErrors }, reset: resetUserForm, watch: watchUser } = useForm();
  const { register: registerBuilding, handleSubmit: handleSubmitBuilding, formState: { errors: buildingErrors }, reset: resetBuildingForm } = useForm();
  
  const selectedRole = watchUser('role');

  useEffect(() => {
    fetchInitialData();
    
    // 🔥 WEBSOCKET LISTENERS - REAL-TIME UPDATES!
    
    // Listen for student list updates
    const studentChannel = echo.channel('students')
      .listen('.student.updated', (event) => {
        console.log('📚 Students updated via WebSocket (Admin):', event);
        // Refresh users to get updated list
        fetchUsers();
        showToastMessage('Student list updated', 'info');
      });
    
    // Listen for building updates
    const buildingChannel = echo.channel('buildings')
      .listen('.building.updated', (event) => {
        console.log('🏢 Buildings updated via WebSocket (Admin):', event);
        setBuildings(event.buildings);
        showToastMessage('Building list updated', 'info');
      });
    
    return () => {
      // Disconnect WebSocket channels
      echo.leave('students');
      echo.leave('buildings');
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchUsers(),
        fetchBuildings(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      showToastMessage('Error loading dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      if (response.data.success) {
        setTeachers(response.data.teachers || []);
        setStudents(response.data.students || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  };

  const fetchBuildings = async () => {
    try {
      const response = await api.get('/admin/buildings');
      if (response.data.success) {
        setBuildings(response.data.buildings || []);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
      throw error;
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      if (response.data.success) {
        setStats(response.data.stats || {});
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  };

  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // User Management Functions
  const onSubmitUser = async (data) => {
    try {
      if (editingUser) {
        // Update user
        const response = await api.put(`/admin/users/${editingUser.type}/${editingUser.id}`, data);
        if (response.data.success) {
          showToastMessage('User updated successfully!');
          await fetchUsers();
          setShowCreateUserModal(false);
          setEditingUser(null);
          resetUserForm();
        }
      } else {
        // Create user
        const response = await api.post('/admin/users', data);
        if (response.data.success) {
          showToastMessage(`${data.role.charAt(0).toUpperCase() + data.role.slice(1)} created successfully!`);
          await fetchUsers();
          await fetchStats();
          setShowCreateUserModal(false);
          resetUserForm();
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error saving user';
      showToastMessage(errorMsg, 'error');
    }
  };

  const handleDeleteUser = async (type, id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const response = await api.delete(`/admin/users/${type}/${id}`);
      if (response.data.success) {
        showToastMessage('User deleted successfully!');
        await fetchUsers();
        await fetchStats();
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error deleting user';
      showToastMessage(errorMsg, 'error');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    resetUserForm({
      email: user.email,
      name: user.name,
      username: user.username,
      role: user.role,
      course: user.course
    });
    setShowCreateUserModal(true);
  };

  // Building Management Functions
  const onSubmitBuilding = async (data) => {
    try {
      if (editingBuilding) {
        // Update building
        const response = await api.put(`/admin/buildings/${editingBuilding.id}`, data);
        if (response.data.success) {
          showToastMessage('Building updated successfully!');
          await fetchBuildings();
          setShowCreateBuildingModal(false);
          setEditingBuilding(null);
          resetBuildingForm();
        }
      } else {
        // Create building
        const response = await api.post('/admin/buildings', data);
        if (response.data.success) {
          showToastMessage('Building created successfully!');
          await fetchBuildings();
          await fetchStats();
          setShowCreateBuildingModal(false);
          resetBuildingForm();
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error saving building';
      showToastMessage(errorMsg, 'error');
    }
  };

  const handleDeleteBuilding = async (id) => {
    if (!window.confirm('Are you sure you want to delete this building?')) return;
    
    try {
      const response = await api.delete(`/admin/buildings/${id}`);
      if (response.data.success) {
        showToastMessage('Building deleted successfully!');
        await fetchBuildings();
        await fetchStats();
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error deleting building';
      showToastMessage(errorMsg, 'error');
    }
  };

  const handleEditBuilding = (building) => {
    setEditingBuilding(building);
    resetBuildingForm({
      name: building.name,
      latitude: building.latitude,
      longitude: building.longitude,
      description: building.description,
      address: building.address,
      is_active: building.is_active
    });
    setShowCreateBuildingModal(true);
  };

  const handleToggleBuildingActive = async (id) => {
    try {
      const response = await api.patch(`/admin/buildings/${id}/toggle-active`);
      if (response.data.success) {
        showToastMessage('Building status updated!');
        await fetchBuildings();
      }
    } catch (error) {
      showToastMessage('Error updating building status', 'error');
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    window.location.href = '/login';
  };

  if (loading) {
    return <LoadingScreen message="Loading Admin Dashboard..." />;
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-content">
          <div className="admin-logo">
            <h1>📍 PinPoint Admin</h1>
          </div>
          <div className="admin-user-info">
            <span className="admin-user-name">{authAPI.getStoredUser()?.name || authAPI.getStoredUser()?.email}</span>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Statistics
        </button>
        <button 
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button 
          className={`admin-tab ${activeTab === 'buildings' ? 'active' : ''}`}
          onClick={() => setActiveTab('buildings')}
        >
          🏢 Buildings
        </button>
      </div>

      {/* Main Content */}
      <div className="admin-content">
        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="stats-container">
            <h2>System Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👨‍🏫</div>
                <div className="stat-info">
                  <div className="stat-value">{stats.teachers || 0}</div>
                  <div className="stat-label">Teachers</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👨‍💼</div>
                <div className="stat-info">
                  <div className="stat-value">{stats.admins || 0}</div>
                  <div className="stat-label">Admins</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👨‍🎓</div>
                <div className="stat-info">
                  <div className="stat-value">{stats.students || 0}</div>
                  <div className="stat-label">Students</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📚</div>
                <div className="stat-info">
                  <div className="stat-value">{stats.classes || 0}</div>
                  <div className="stat-label">Classes</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🏢</div>
                <div className="stat-info">
                  <div className="stat-value">{stats.buildings || 0}</div>
                  <div className="stat-label">Buildings</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="users-container">
            <div className="section-header">
              <h2>User Management</h2>
              <button 
                className="btn-primary"
                onClick={() => {
                  setEditingUser(null);
                  resetUserForm();
                  setShowCreateUserModal(true);
                }}
              >
                ➕ Create User
              </button>
            </div>

            {/* Teachers Table */}
            <div className="table-section">
              <h3>Teachers & Admins</h3>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.length === 0 ? (
                      <tr><td colSpan="6" className="no-data">No teachers found</td></tr>
                    ) : (
                      teachers.map(teacher => (
                        <tr key={teacher.id}>
                          <td>{teacher.name}</td>
                          <td>{teacher.email}</td>
                          <td>{teacher.username || '-'}</td>
                          <td>
                            <span className={`role-badge ${teacher.role}`}>
                              {teacher.role === 'admin' ? '👑' : '👨‍🏫'} {teacher.role.toUpperCase()}
                            </span>
                          </td>
                          <td>{new Date(teacher.created_at).toLocaleDateString()}</td>
                          <td className="actions">
                            <button 
                              className="btn-edit"
                              onClick={() => handleEditUser(teacher)}
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              className="btn-delete"
                              onClick={() => handleDeleteUser('teacher', teacher.id)}
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Students Table */}
            <div className="table-section">
              <h3>Students</h3>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Username</th>
                      <th>Course</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 ? (
                      <tr><td colSpan="6" className="no-data">No students found</td></tr>
                    ) : (
                      students.map(student => (
                        <tr key={student.id}>
                          <td>{student.name}</td>
                          <td>{student.email}</td>
                          <td>{student.username || '-'}</td>
                          <td>{student.course || '-'}</td>
                          <td>{new Date(student.created_at).toLocaleDateString()}</td>
                          <td className="actions">
                            <button 
                              className="btn-edit"
                              onClick={() => handleEditUser(student)}
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              className="btn-delete"
                              onClick={() => handleDeleteUser('student', student.id)}
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Buildings Tab */}
        {activeTab === 'buildings' && (
          <div className="buildings-container">
            <div className="section-header">
              <h2>Building Management</h2>
              <button 
                className="btn-primary"
                onClick={() => {
                  setEditingBuilding(null);
                  resetBuildingForm();
                  setShowCreateBuildingModal(true);
                }}
              >
                ➕ Add Building
              </button>
            </div>

            <div className="buildings-grid">
              {buildings.length === 0 ? (
                <div className="no-data">No buildings found. Add one to get started!</div>
              ) : (
                buildings.map(building => (
                  <div key={building.id} className="building-card">
                    <div className="building-header">
                      <h3>{building.name}</h3>
                      <span className={`status-badge ${building.is_active ? 'active' : 'inactive'}`}>
                        {building.is_active ? '✅ Active' : '❌ Inactive'}
                      </span>
                    </div>
                    <div className="building-details">
                      <p><strong>📍 Coordinates:</strong></p>
                      <p className="coordinates">
                        Lat: {building.latitude}, Lng: {building.longitude}
                      </p>
                      {building.address && (
                        <p><strong>📫 Address:</strong> {building.address}</p>
                      )}
                      {building.description && (
                        <p><strong>📝 Description:</strong> {building.description}</p>
                      )}
                    </div>
                    
                    {/* Mini Map */}
                    <div className="building-map">
                      <MapContainer
                        center={[parseFloat(building.latitude), parseFloat(building.longitude)]}
                        zoom={17}
                        style={{ height: '150px', width: '100%' }}
                        dragging={false}
                        scrollWheelZoom={false}
                        doubleClickZoom={false}
                        zoomControl={false}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />
                        <Marker position={[parseFloat(building.latitude), parseFloat(building.longitude)]}>
                          <Popup>{building.name}</Popup>
                        </Marker>
                        <Circle
                          center={[parseFloat(building.latitude), parseFloat(building.longitude)]}
                          radius={100}
                          pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
                        />
                      </MapContainer>
                    </div>

                    <div className="building-actions">
                      <button 
                        className="btn-edit"
                        onClick={() => handleEditBuilding(building)}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        className="btn-toggle"
                        onClick={() => handleToggleBuildingActive(building.id)}
                      >
                        {building.is_active ? '⏸️ Deactivate' : '▶️ Activate'}
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => handleDeleteBuilding(building.id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit User Modal */}
      {showCreateUserModal && (
        <div className="modal-overlay" onClick={() => {
          setShowCreateUserModal(false);
          setEditingUser(null);
          resetUserForm();
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Edit User' : 'Create New User'}</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowCreateUserModal(false);
                  setEditingUser(null);
                  resetUserForm();
                }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmitUser(onSubmitUser)} className="form-container">
              <div className="form-group">
                <label>Email *</label>
                <input 
                  type="email"
                  {...registerUser('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className={userErrors.email ? 'error' : ''}
                  disabled={editingUser !== null}
                />
                {userErrors.email && <span className="error-message">{userErrors.email.message}</span>}
              </div>

              {!editingUser && (
                <div className="form-group">
                  <label>Password *</label>
                  <input 
                    type="password"
                    {...registerUser('password', { 
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters'
                      }
                    })}
                    className={userErrors.password ? 'error' : ''}
                  />
                  {userErrors.password && <span className="error-message">{userErrors.password.message}</span>}
                </div>
              )}

              <div className="form-group">
                <label>Role *</label>
                <select 
                  {...registerUser('role', { required: 'Role is required' })}
                  className={userErrors.role ? 'error' : ''}
                  disabled={editingUser !== null}
                >
                  <option value="">Select Role</option>
                  <option value="admin">Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
                {userErrors.role && <span className="error-message">{userErrors.role.message}</span>}
              </div>

              <div className="form-group">
                <label>Name</label>
                <input 
                  type="text"
                  {...registerUser('name')}
                  placeholder="Full name"
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input 
                  type="text"
                  {...registerUser('username')}
                  placeholder="Optional username"
                />
              </div>

              {selectedRole === 'student' && (
                <div className="form-group">
                  <label>Course</label>
                  <input 
                    type="text"
                    {...registerUser('course')}
                    placeholder="e.g., BSCS 3A"
                  />
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowCreateUserModal(false);
                    setEditingUser(null);
                    resetUserForm();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Building Modal */}
      {showCreateBuildingModal && (
        <div className="modal-overlay" onClick={() => {
          setShowCreateBuildingModal(false);
          setEditingBuilding(null);
          resetBuildingForm();
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingBuilding ? 'Edit Building' : 'Add New Building'}</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowCreateBuildingModal(false);
                  setEditingBuilding(null);
                  resetBuildingForm();
                }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmitBuilding(onSubmitBuilding)} className="form-container">
              <div className="form-group">
                <label>Building Name *</label>
                <input 
                  type="text"
                  {...registerBuilding('name', { required: 'Building name is required' })}
                  className={buildingErrors.name ? 'error' : ''}
                  placeholder="e.g., Science Building"
                />
                {buildingErrors.name && <span className="error-message">{buildingErrors.name.message}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Latitude *</label>
                  <input 
                    type="number"
                    step="0.00000001"
                    {...registerBuilding('latitude', { 
                      required: 'Latitude is required',
                      min: { value: -90, message: 'Latitude must be between -90 and 90' },
                      max: { value: 90, message: 'Latitude must be between -90 and 90' }
                    })}
                    className={buildingErrors.latitude ? 'error' : ''}
                    placeholder="e.g., 8.98765432"
                  />
                  {buildingErrors.latitude && <span className="error-message">{buildingErrors.latitude.message}</span>}
                </div>

                <div className="form-group">
                  <label>Longitude *</label>
                  <input 
                    type="number"
                    step="0.00000001"
                    {...registerBuilding('longitude', { 
                      required: 'Longitude is required',
                      min: { value: -180, message: 'Longitude must be between -180 and 180' },
                      max: { value: 180, message: 'Longitude must be between -180 and 180' }
                    })}
                    className={buildingErrors.longitude ? 'error' : ''}
                    placeholder="e.g., 125.12345678"
                  />
                  {buildingErrors.longitude && <span className="error-message">{buildingErrors.longitude.message}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>Address</label>
                <input 
                  type="text"
                  {...registerBuilding('address')}
                  placeholder="Street address (optional)"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea 
                  {...registerBuilding('description')}
                  rows="3"
                  placeholder="Building description (optional)"
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input 
                    type="checkbox"
                    {...registerBuilding('is_active')}
                    defaultChecked={true}
                  />
                  <span>Active</span>
                </label>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowCreateBuildingModal(false);
                    setEditingBuilding(null);
                    resetBuildingForm();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingBuilding ? 'Update Building' : 'Add Building'}
                </button>
              </div>
            </form>
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

export default AdminDashboard;
