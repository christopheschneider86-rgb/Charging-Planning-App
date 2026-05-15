import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Zap, MapPin, Maximize, Minimize } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

const MapCenter = ({ center }) => {
  const map = useMap();
  React.useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

const TILE_LAYERS = {
  standard: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri'
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'
  }
};

const createCustomIcon = (isFavorite, available) => {
  const color = isFavorite ? '#ef4444' : (available ? '#00d2ff' : '#6b7280');
  const iconMarkup = renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill={color} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3" fill="white"></circle>
    </svg>
  );
  return L.divIcon({ html: iconMarkup, className: 'custom-leaflet-icon', iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36] });
};

const createUserIcon = () => {
  const iconMarkup = renderToStaticMarkup(
    <div style={{ position: 'relative', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: '#3b82f6', borderRadius: '50%', opacity: 0.4, animation: 'pulse 2s infinite' }}></div>
      <div style={{ width: 12, height: 12, backgroundColor: '#2563eb', border: '2px solid white', borderRadius: '50%', zIndex: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}></div>
    </div>
  );
  return L.divIcon({ html: iconMarkup, className: 'custom-user-icon', iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12] });
};

const MapView = ({ stations, favorites, onStationSelect, center, userLocation, routeLine, mapStyle = 'standard' }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const defaultCenter = [51.1657, 10.4515];
  const mapCenter = center || (stations.length > 0 ? [stations[0].lat, stations[0].lng] : defaultCenter);
  const layer = TILE_LAYERS[mapStyle] || TILE_LAYERS.standard;

  const containerStyle = isFullscreen
    ? { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, backgroundColor: 'var(--bg-primary)' }
    : { height: '420px', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', zIndex: 0, position: 'relative' };

  return (
    <div style={containerStyle}>
      <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer key={mapStyle} attribution={layer.attribution} url={layer.url} />
        <MapCenter center={mapCenter} />

        {routeLine && routeLine.length > 1 && (
          <Polyline positions={routeLine} pathOptions={{ color: '#00d2ff', weight: 5, opacity: 0.85 }} />
        )}

        {userLocation && (
          <Marker position={userLocation} icon={createUserIcon()}>
            <Popup>Dein Standort</Popup>
          </Marker>
        )}

        {stations.map(station => {
          const isFav = favorites.stations.some(f => (typeof f === 'string' ? f === station.id : f.id === station.id)) || favorites.providers.includes(station.provider);
          return (
            <Marker
              key={station.id}
              position={[station.lat, station.lng]}
              icon={createCustomIcon(isFav, station.availableSpots > 0)}
              eventHandlers={{ click: () => onStationSelect(station) }}
            >
              <Popup>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{station.name}</div>
                <div style={{ display: 'flex', gap: 8, color: '#666', fontSize: 12 }}>
                  <span><Zap size={10} style={{ display: 'inline' }} /> {station.power}</span>
                  <span><MapPin size={10} style={{ display: 'inline' }} /> {station.distance}km</span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <button onClick={() => setIsFullscreen(!isFullscreen)} className="btn-icon" style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 1000, backgroundColor: 'var(--bg-secondary)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', color: 'var(--text-primary)' }}>
        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
      </button>

      <style>{`
        .leaflet-container { font-family: var(--font-main); }
        .custom-leaflet-icon, .custom-user-icon { background: transparent; border: none; }
        .leaflet-popup-content-wrapper { border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          70% { transform: scale(2.5); opacity: 0; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default MapView;
