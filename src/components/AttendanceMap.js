import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icon for teacher location
const teacherIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#dc3545" stroke="white" stroke-width="2"/>
      <text x="12" y="17" font-size="14" font-weight="bold" text-anchor="middle" fill="white">T</text>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Custom icon for student location
const studentIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
      <circle cx="12" cy="12" r="10" fill="#28a745" stroke="white" stroke-width="2"/>
      <text x="12" y="17" font-size="14" font-weight="bold" text-anchor="middle" fill="white">S</text>
    </svg>
  `),
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

// Component for the center map button
function CenterMapButton({ teacherLocation, onCenter }) {
  const map = useMap();

  const centerMap = () => {
    if (teacherLocation) {
      map.setView([teacherLocation.lat, teacherLocation.lng], 17, {
        animate: true,
        duration: 0.5
      });
      if (onCenter) onCenter();
    }
  };

  return (
    <div 
      onClick={centerMap}
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        background: 'white',
        border: '2px solid rgba(0,0,0,0.2)',
        borderRadius: '8px',
        padding: '10px',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f8f9fa';
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'white';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      title="Center map on teacher location"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>Center</span>
    </div>
  );
}

export default function AttendanceMap({ teacherLocation, students = [], geofenceRadius = 100 }) {
  if (!teacherLocation || !teacherLocation.lat || !teacherLocation.lng) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        background: '#f8f9fa',
        borderRadius: '12px',
        color: '#6c757d'
      }}>
        <p>📍 Map will appear when class location is set</p>
      </div>
    );
  }

  const center = [teacherLocation.lat, teacherLocation.lng];

  return (
    <div style={{ 
      position: 'relative',
      borderRadius: '12px', 
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      border: '2px solid #e9ecef'
    }}>
      <MapContainer 
        center={center} 
        zoom={17} 
        style={{ height: '450px', width: '100%' }}
        scrollWheelZoom={true}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Geofence Circle */}
        <Circle 
          center={center} 
          radius={geofenceRadius}
          pathOptions={{
            color: '#007bff',
            fillColor: '#007bff',
            fillOpacity: 0.1,
            weight: 2
          }}
        />

        {/* Teacher Location Marker */}
        <Marker position={center} icon={teacherIcon}>
          <Popup>
            <div style={{ textAlign: 'center' }}>
              <strong>📍 Class Location (Teacher)</strong>
              <br />
              <small>Geofence: {geofenceRadius}m radius</small>
            </div>
          </Popup>
        </Marker>

        {/* Student Markers */}
        {students && students.map((student, index) => {
          if (!student.latitude || !student.longitude) return null;
          
          const studentPos = [student.latitude, student.longitude];
          const distance = getDistanceFromLatLonInMeters(
            teacherLocation.lat, 
            teacherLocation.lng,
            student.latitude,
            student.longitude
          );

          const timeInside = student.timeInsideGeofence || 0;
          const timeOutside = student.timeOutsideGeofence || 0;

          return (
            <Marker 
              key={index} 
              position={studentPos}
              icon={studentIcon}
            >
              <Popup>
                <div style={{ minWidth: '180px' }}>
                  <strong>👤 {student.name || student.studentName || 'Student'}</strong>
                  <br />
                  <small style={{ color: '#6c757d' }}>
                    {student.email || student.studentEmail || 'No email'}
                  </small>
                  <br />
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '6px',
                    background: distance <= geofenceRadius ? '#d4edda' : '#f8d7da',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    📏 {distance.toFixed(1)}m from class
                    <br />
                    {distance <= geofenceRadius ? '✅ Inside' : '❌ Outside'} geofence
                  </div>
                  
                  {/* Time tracking info */}
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '8px',
                    background: '#f8f9fa',
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}>
                    <div style={{ marginBottom: '4px' }}>
                      ⏱️ <strong>Time Inside:</strong> {formatDuration(timeInside)}
                    </div>
                    <div>
                      ⏰ <strong>Time Outside:</strong> {formatDuration(timeOutside)}
                    </div>
                  </div>

                  {(() => {
                    // Try timestamp first (ISO8601 format with full date+time)
                    if (student.timestamp) {
                      try {
                        const date = new Date(student.timestamp);
                        if (!isNaN(date.getTime())) {
                          return (
                            <div style={{ marginTop: '6px', fontSize: '11px', color: '#6c757d' }}>
                              🕐 Signed in: {date.toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </div>
                          );
                        }
                      } catch (e) {
                        // Fall through to next option
                      }
                    }
                    
                    // If we have date and signInTime, combine them
                    if (student.date && student.signInTime) {
                      try {
                        const dateStr = `${student.date}T${student.signInTime}`;
                        const date = new Date(dateStr);
                        if (!isNaN(date.getTime())) {
                          return (
                            <div style={{ marginTop: '6px', fontSize: '11px', color: '#6c757d' }}>
                              🕐 Signed in: {date.toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </div>
                          );
                        }
                      } catch (e) {
                        // Fall through to display raw data
                      }
                    }
                    
                    // Fallback: Just show the time if available
                    if (student.signInTime) {
                      return (
                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#6c757d' }}>
                          🕐 Signed in: {student.signInTime}
                        </div>
                      );
                    }
                    
                    return null;
                  })()}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Center Map Button */}
        <CenterMapButton teacherLocation={teacherLocation} />
      </MapContainer>

      {/* Map Legend */}
      <div style={{
        background: 'white',
        padding: '12px 16px',
        borderTop: '1px solid #e9ecef',
        display: 'flex',
        justifyContent: 'space-around',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '13px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#dc3545' }}></div>
          <span>Teacher Location</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#28a745' }}></div>
          <span>Student Present ({students.length})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#007bff', opacity: 0.3 }}></div>
          <span>{geofenceRadius}m Geofence</span>
        </div>
      </div>
    </div>
  );
}

// Haversine formula to calculate distance between two GPS coordinates
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

// Format duration from seconds to human-readable format
function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}
