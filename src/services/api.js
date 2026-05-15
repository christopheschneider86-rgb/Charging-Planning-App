// Geocoding using free OpenStreetMap Nominatim API
const NOMINATIM_HEADERS = {
  'Accept-Language': 'de-DE,de;q=0.9'
};

export const geocodeAddress = async (address) => {
  if (!address || !address.trim()) return null;
  try {
    const results = await geocodeSuggestions(address, 1);
    if (results.length > 0) {
      const r = results[0];
      return { lat: r.lat, lng: r.lng, name: r.label };
    }
    return null;
  } catch (error) {
    console.error("Geocoding Error:", error);
    return null;
  }
};

// Returns up to 3 suggestion candidates for the autocomplete dropdown
const mapNominatim = (item) => {
  const addr = item.address || {};
  const street = [addr.road, addr.house_number].filter(Boolean).join(' ');
  const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
  const country = addr.country || '';
  // Prefer a friendly POI name if it exists (e.g. shopping center, attraction)
  const poi = item.namedetails?.name || addr.attraction || addr.shop || addr.building || addr.tourism || addr.amenity;
  const subtitle = [street, [addr.postcode, city].filter(Boolean).join(' '), country].filter(Boolean).join(', ');
  const label = poi ? `${poi}${subtitle ? ' — ' + subtitle : ''}` : (subtitle || item.display_name);
  return {
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    name: item.display_name,
    label,
    title: poi || street || city || item.display_name,
    subtitle: poi ? subtitle : (street ? [addr.postcode, city].filter(Boolean).join(' ') : country),
    type: item.type,
    category: item.class
  };
};

const nominatimQuery = async (query, limit, withCountryBias) => {
  const params = new URLSearchParams({
    format: 'json',
    q: query,
    limit: String(limit),
    addressdetails: '1',
    namedetails: '1'
  });
  if (withCountryBias) params.set('countrycodes', 'de,at,ch,fr,nl,be,lu,dk,pl,cz');
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const response = await fetch(url, { headers: NOMINATIM_HEADERS });
  const data = await response.json();
  return Array.isArray(data) ? data.map(mapNominatim) : [];
};

export const geocodeSuggestions = async (query, limit = 5) => {
  if (!query || query.trim().length < 2) return [];
  try {
    // First: country-biased — addresses and local POIs
    let results = await nominatimQuery(query, limit, true);
    // Fallback: if we got nothing, retry without country bias (helps for unique POI names like "Fashion Place")
    if (results.length === 0) {
      results = await nominatimQuery(query, limit, false);
    }
    // Dedupe by lat/lng
    const seen = new Set();
    return results.filter(r => {
      const key = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch (error) {
    console.error("Suggest Error:", error);
    return [];
  }
};

// Driving route via public OSRM demo server. Returns array of [lat,lng] points and meta info.
export const fetchRoute = async (startCoords, destCoords) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startCoords.lng},${startCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('ROUTE_FAILED');
    const data = await response.json();
    if (!data.routes || data.routes.length === 0) throw new Error('ROUTE_FAILED');
    const route = data.routes[0];
    const coords = route.geometry.coordinates.map(c => [c[1], c[0]]); // [lat,lng]
    return {
      coords,
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60
    };
  } catch (error) {
    console.error("Route Error:", error);
    return null;
  }
};

// Pick evenly spaced points along a polyline for station sampling
const samplePointsAlongRoute = (coords, sampleCount = 5) => {
  if (!coords || coords.length === 0) return [];
  if (coords.length <= sampleCount) return coords;
  const points = [];
  const step = (coords.length - 1) / (sampleCount - 1);
  for (let i = 0; i < sampleCount; i++) {
    points.push(coords[Math.round(i * step)]);
  }
  return points;
};

// Fetch stations along a route by sampling multiple points and merging unique results.
export const fetchStationsAlongRoute = async (routeCoords, apiKey, corridorKm = 5) => {
  if (!apiKey) throw new Error('NO_API_KEY');
  const samples = samplePointsAlongRoute(routeCoords, 5);
  const all = [];
  const seen = new Set();
  for (const [lat, lng] of samples) {
    try {
      const stations = await fetchStations(lat, lng, apiKey, corridorKm);
      for (const s of stations) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          all.push(s);
        }
      }
    } catch (e) {
      if (e.message === 'INVALID_API_KEY' || e.message === 'NO_API_KEY') throw e;
    }
  }
  return all;
};

const mapOcmItem = (item) => {
  let maxPower = 0;
  const connectorTypes = new Set();
  const connectors = [];
  if (item.Connections && item.Connections.length > 0) {
    for (const c of item.Connections) {
      if (c.PowerKW && c.PowerKW > maxPower) maxPower = c.PowerKW;
      if (c.ConnectionType && c.ConnectionType.Title) connectorTypes.add(c.ConnectionType.Title);
      connectors.push({
        type: c.ConnectionType ? c.ConnectionType.Title : 'k.A.',
        powerKW: c.PowerKW || 0,
        current: c.CurrentType ? c.CurrentType.Title : null,
        amps: c.Amps || null,
        voltage: c.Voltage || null,
        quantity: c.Quantity || 1,
        status: c.StatusType ? c.StatusType.Title : null
      });
    }
  }

  let provider = 'Unbekannt';
  let providerUrl = null;
  if (item.OperatorInfo) {
    if (item.OperatorInfo.Title) provider = item.OperatorInfo.Title;
    if (item.OperatorInfo.WebsiteURL) providerUrl = item.OperatorInfo.WebsiteURL;
  }

  const addrInfo = item.AddressInfo || {};
  const address = `${addrInfo.AddressLine1 || ''}, ${addrInfo.Postcode || ''} ${addrInfo.Town || ''}`
    .trim()
    .replace(/^,|,$/g, '');

  const isOperational = item.StatusType ? item.StatusType.IsOperational : true;
  const totalSpots = item.NumberOfPoints || (connectors.reduce((s, c) => s + (c.quantity || 1), 0) || 2);
  // Real-time availability is not reliable in OCM; show operational only.
  const availableSpots = isOperational ? totalSpots : 0;

  return {
    id: item.ID.toString(),
    name: addrInfo.Title || 'Ladestation',
    provider,
    providerUrl,
    power: maxPower > 0 ? `${maxPower}kW` : 'k.A.',
    powerKW: maxPower,
    price: item.UsageCost ? item.UsageCost : 'k.A.',
    distance: addrInfo.Distance ? addrInfo.Distance.toFixed(1) : 0,
    distanceUnit: 'km',
    address,
    available: isOperational,
    totalSpots,
    availableSpots,
    conditions: item.GeneralComments || item.UsageCost || 'Keine spezifischen Bedingungen angegeben.',
    accessComments: item.AddressInfo ? item.AddressInfo.AccessComments : null,
    usageType: item.UsageType ? item.UsageType.Title : null,
    statusTitle: item.StatusType ? item.StatusType.Title : null,
    isOperational,
    connectors,
    connectorTypes: Array.from(connectorTypes),
    numberOfPoints: item.NumberOfPoints || null,
    dataProvider: item.DataProvider ? item.DataProvider.Title : null,
    dateLastVerified: item.DateLastVerified || null,
    dateLastStatusUpdate: item.DateLastStatusUpdate || null,
    ocmUrl: `https://openchargemap.org/site/poi/details/${item.ID}`,
    imageUrl: 'https://images.unsplash.com/photo-1593941707882-a5bba14938cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    lat: addrInfo.Latitude,
    lng: addrInfo.Longitude
  };
};

// Fetch from OpenChargeMap
export const fetchStations = async (lat, lng, apiKey, distanceKm = 10) => {
  if (!apiKey) throw new Error('NO_API_KEY');

  try {
    const url = `https://api.openchargemap.io/v3/poi/?output=json&latitude=${lat}&longitude=${lng}&distance=${distanceKm}&distanceunit=KM&maxresults=80&compact=false&verbose=false&includecomments=false`;
    const response = await fetch(url, {
      headers: { 'x-api-key': apiKey }
    });

    if (response.status === 403 || response.status === 401) throw new Error('INVALID_API_KEY');
    if (!response.ok) throw new Error('API_ERROR');

    const data = await response.json();
    return data.map(mapOcmItem);
  } catch (error) {
    console.error("OpenChargeMap Error:", error);
    throw error;
  }
};

// Refresh a single station by ID against OCM (used in favorites for "sync")
export const fetchStationById = async (id, apiKey) => {
  if (!apiKey) throw new Error('NO_API_KEY');
  try {
    const url = `https://api.openchargemap.io/v3/poi/?output=json&chargepointid=${encodeURIComponent(id)}&maxresults=1&compact=false&verbose=false`;
    const response = await fetch(url, { headers: { 'x-api-key': apiKey } });
    if (response.status === 403 || response.status === 401) throw new Error('INVALID_API_KEY');
    if (!response.ok) throw new Error('API_ERROR');
    const data = await response.json();
    if (!data || data.length === 0) return null;
    return mapOcmItem(data[0]);
  } catch (error) {
    console.error("OCM single fetch error:", error);
    throw error;
  }
};
