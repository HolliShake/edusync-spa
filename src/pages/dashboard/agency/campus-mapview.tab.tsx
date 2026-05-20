import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// 1. Correctly import the assets statically so your bundler (Vite/Webpack) resolves the URLs
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import type React from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

// --- TYPE-SAFE FIX FOR DEFAULT MARKER ICON ISSUE ---
// Define an interface extending Leaflet's internal prototype structure without using 'any'
interface LeafletIconDefaultPrototype {
  _getIconUrl?: unknown;
}

// Safely cast and delete the hidden internal method
delete (L.Icon.Default.prototype as LeafletIconDefaultPrototype)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
// ---------------------------------------------------

interface CampusMapViewTabProps {
  lat: number | string; // Adjusted to allow string fallbacks from your API
  lng: number | string;
}

export default function CampusMapViewTab({
  lat = 7.0712,
  lng = 125.6089,
}: CampusMapViewTabProps): React.JSX.Element {
  // 2. Safely parse coordinates to floats to prevent MapContainer from crashing if the API sends strings
  const centerLat = typeof lat === 'string' ? parseFloat(lat) : lat;
  const centerLng = typeof lng === 'string' ? parseFloat(lng) : lng;

  // Fallback if coordinates are invalid numbers
  if (isNaN(centerLat) || isNaN(centerLng)) {
    return <div className="p-4 text-red-500">Invalid coordinates provided for Campus Map.</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Campus Map View</h2>

      {/* 1. Remove the height styles from this wrapper div */}
      <div className="rounded-lg overflow-hidden border shadow">
        <MapContainer
          key={`${centerLat}-${centerLng}`}
          center={[centerLat, centerLng]}
          zoom={17}
          scrollWheelZoom={true}
          // 2. Put the explicit pixel heights directly here!
          style={{ height: '400px', minHeight: '300px', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[centerLat, centerLng]}>
            <Popup>
              Campus Location
              <br />
              Lat: {centerLat}, Lng: {centerLng}
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
