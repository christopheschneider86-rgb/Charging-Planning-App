import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Zap, MapPin, Maximize, Minimize, Info, Navigation as NavIcon, ExternalLink, Crosshair, RefreshCw, Scaling } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildNavUrl, navAppLabel } from '../services/nav';

// Bridge component: exposes the map instance up via a ref-callback so the
// outer toolbar can call setView / getCenter / getBounds.
const MapHandle = ({ onReady }) => {
  const map = useMap();
  React.useEffect(() => {
    if (onReady) onReady(map);
  }, [map, onReady]);
  return null;
};

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

const MapView = ({ stations, favorites, onStationSelect, center, userLocation, routeLine, mapStyle = 'standard', navApp = 'google', onSearchArea, onLocate, isLoading }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef(null);
  const defaultCenter = [51.1657, 10.4515];
  const mapCenter = center || (stations.length > 0 ? [stations[0].lat, stations[0].lng] : defaultCenter);
  const layer = TILE_LAYERS[mapStyle] || TILE_LAYERS.standard;

  // When fullscreen toggles, the map's container resized → tell leaflet about it.
  // Also lock body scroll while fullscreen is on so the page behind doesn't move.
  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    // Invalidate on the next frame so the new size has been laid out
    const t = setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 100);
    return () => {
      document.body.classList.remove('modal-open');
      clearTimeout(t);
    };
  }, [isFullscreen]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (mapRef.current) mapRef.current.setView([lat, lng], 14);
        if (onLocate) onLocate(lat, lng);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleFitToRoute = () => {
    if (!mapRef.current) return;
    if (routeLine && routeLine.length > 1) {
      const bounds = L.latLngBounds(routeLine);
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    } else if (stations.length > 0) {
      const bounds = L.latLngBounds(stations.map(s => [s.lat, s.lng]));
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  const handleReload = () => {
    if (!mapRef.current) return;
    // Always redraw the map / refresh tiles
    mapRef.current.invalidateSize();
    const c = mapRef.current.getCenter();
    const z = mapRef.current.getZoom();
    mapRef.current.setView(c, z, { animate: false });
    mapRef.current.eachLayer(layer => {
      if (layer.redraw) layer.redraw();
    });
    if (onSearchArea) {
      const b = mapRef.current.getBounds();
      const ne = b.getNorthEast();
      const sw = b.getSouthWest();
      const diagonalKm = ne.distanceTo(sw) / 1000;
      const radiusKm = Math.max(3, Math.min(50, diagonalKm / 2));
      onSearchArea(c.lat, c.lng, radiusKm);
    }
  };

  const handleOpenDetails = (station) => {
    // Close fullscreen first so the bottom-sheet is not covered.
    if (isFullscreen) setIsFullscreen(false);
    onStationSelect(station);
  };

  // ---- Shared map content (rendered in both inline & fullscreen containers) ----
  const mapContent = (
    <>
      <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
        <MapHandle onReady={(m) => { mapRef.current = m; }} />
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
          const navUrl = buildNavUrl(navApp, station.lat, station.lng);
          return (
            <Marker
              key={station.id}
              position={[station.lat, station.lng]}
              icon={createCustomIcon(isFav, station.availableSpots > 0)}
            >
              <Popup minWidth={220}>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{station.name}</div>
                <div style={{ display: 'flex', gap: 8, color: '#666', fontSize: 12, marginBottom: 6 }}>
                  <span><Zap size={10} style={{ display: 'inline' }} /> {station.power}</span>
                  <span><MapPin size={10} style={{ display: 'inline' }} /> {station.distance} km</span>
                </div>
                {station.provider && station.provider !== 'Unbekannt' && (
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>{station.provider}</div>
                )}
                {station.address && (
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>{station.address}</div>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleOpenDetails(station)}
                    style={{ background: '#00d2ff', color: 'white', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Info size={10} /> Details
                  </button>
                  <a
                    href={navUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ background: '#3a7bd5', color: 'white', textDecoration: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                    title={`Mit ${navAppLabel(navApp)} navigieren`}
                  >
                    <NavIcon size={10} /> {navAppLabel(navApp).split(' ')[0]}
                  </a>
                  {station.providerUrl && (
                    <a
                      href={station.providerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ background: '#f1f5f9', color: '#333', textDecoration: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <ExternalLink size={10} /> Anbieter
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map toolbar */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="btn-icon"
          title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
          style={{ backgroundColor: 'var(--bg-secondary)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', color: 'var(--text-primary)' }}
        >
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
        {(routeLine && routeLine.length > 1) || stations.length > 1 ? (
          <button
            onClick={handleFitToRoute}
            className="btn-icon"
            title={routeLine ? 'Gesamte Route zeigen' : 'Alle Stationen zeigen'}
            style={{ backgroundColor: 'var(--bg-secondary)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', color: 'var(--text-primary)' }}
          >
            <Scaling size={20} />
          </button>
        ) : null}
        <button
          onClick={handleLocateMe}
          className="btn-icon"
          title="Mein Standort"
          disabled={locating}
          style={{ backgroundColor: 'var(--bg-secondary)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', color: locating ? 'var(--text-muted)' : 'var(--text-primary)' }}
        >
          <Crosshair size={20} />
        </button>
        <button
          onClick={handleReload}
          className="btn-icon"
          title={onSearchArea ? 'Diesen Ausschnitt neu laden' : 'Karte neu laden'}
          disabled={isLoading}
          style={{ backgroundColor: 'var(--bg-secondary)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', color: isLoading ? 'var(--text-muted)' : 'var(--text-primary)' }}
        >
          <RefreshCw size={20} className={isLoading ? 'spin' : ''} />
        </button>
      </div>
    </>
  );

  const inlineStyle = {
    height: 'min(65vh, 600px)', minHeight: '320px', width: '100%',
    borderRadius: '16px', overflow: 'hidden',
    border: '1px solid var(--border-color)',
    zIndex: 0, position: 'relative'
  };

  const fullscreenStyle = {
    position: 'fixed', top: 0, left: 0,
    width: '100vw', height: '100dvh',
    zIndex: 9999, backgroundColor: 'var(--bg-primary)'
  };

  // Inline placeholder when fullscreen is active — keeps the surrounding layout stable.
  if (isFullscreen) {
    return (
      <>
        <div style={{ ...inlineStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Karte ist im Vollbild …
        </div>
        {createPortal(
          <div style={fullscreenStyle}>{mapContent}</div>,
          document.body
        )}
        <style>{`
          .leaflet-container { font-family: var(--font-main); }
          .custom-leaflet-icon, .custom-user-icon { background: transparent; border: none; }
          .leaflet-popup-content-wrapper { border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
          .leaflet-popup-content { margin: 10px 12px; min-width: 200px; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .spin { animation: spin 1s linear infinite; }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.8; }
            70% { transform: scale(2.5); opacity: 0; }
            100% { transform: scale(2.5); opacity: 0; }
          }
        `}</style>
      </>
    );
  }

  return (
    <div style={inlineStyle}>
      {mapContent}
      <style>{`
        .leaflet-container { font-family: var(--font-main); }
        .custom-leaflet-icon, .custom-user-icon { background: transparent; border: none; }
        .leaflet-popup-content-wrapper { border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .leaflet-popup-content { margin: 10px 12px; min-width: 200px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
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
