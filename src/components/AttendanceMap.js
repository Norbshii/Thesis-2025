import React, { useEffect } from 'react';
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

// Component to auto-fit map bounds
function AutoBounds({ teacherLocation, students }) {
  const map = useMap();

  useEffect(() => {
    if (!teacherLocation) return;

    const bounds = L.latLngBounds([
      [teacherLocation.lat, teacherLocation.lng]
    ]);

    // Add student locations to bounds
    students.forEach(student => {
      if (student.latitude && student.longitude) {
        bounds.extend([student.latitude, student.longitude]);
      }
    });

    // Add some padding to the bounds
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [teacherLocation, students, map]);

  return null;
}

export default function AttendanceMap({ teacherLocation, students, geofenceRadius = 100 }) {
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
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Geofence Circle (100m radius) */}
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

          return (
            <Marker 
              key={index} 
              position={studentPos}
              icon={studentIcon}
            >
              <Popup>
                <div style={{ minWidth: '150px' }}>
                  <strong>👤 {student.name || 'Student'}</strong>
                  <br />
                  <small style={{ color: '#6c757d' }}>
                    {student.email || 'No email'}
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
                  {student.signed_in_at && (
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#6c757d' }}>
                      🕐 {new Date(student.signed_in_at).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Auto-fit bounds */}
        <AutoBounds teacherLocation={teacherLocation} students={students} />
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
          <span>Student Present</span>
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

