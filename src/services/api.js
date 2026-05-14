// Geocoding using free OpenStreetMap Nominatim API
export const geocodeAddress = async (address) => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'de-DE,de;q=0.9',
        // Nominatim requires a User-Agent
        'User-Agent': 'LadestationenPWA/1.0 (evplanner@example.com)'
      }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        name: data[0].display_name
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding Error:", error);
    return null;
  }
};

// Fetch from OpenChargeMap
export const fetchStations = async (lat, lng, apiKey, distanceKm = 10) => {
  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  try {
    const url = `https://api.openchargemap.io/v3/poi/?output=json&latitude=${lat}&longitude=${lng}&distance=${distanceKm}&maxresults=50`;
    const response = await fetch(url, {
      headers: {
        'x-api-key': apiKey
      }
    });
    
    if (response.status === 403 || response.status === 401) {
      throw new Error('INVALID_API_KEY');
    }
    
    if (!response.ok) {
      throw new Error('API_ERROR');
    }

    const data = await response.json();
    
    // Map OCM data to our internal Station model
    return data.map(item => {
      // Determine max power
      let maxPower = 0;
      if (item.Connections && item.Connections.length > 0) {
        maxPower = Math.max(...item.Connections.map(c => c.PowerKW || 0));
      }

      // Format provider name
      let provider = 'Unbekannt';
      if (item.OperatorInfo && item.OperatorInfo.Title) {
        provider = item.OperatorInfo.Title;
      }

      // Address
      const addrInfo = item.AddressInfo || {};
      const address = `${addrInfo.AddressLine1 || ''}, ${addrInfo.Postcode || ''} ${addrInfo.Town || ''}`.trim().replace(/^,|,$/g, '');

      // Fake availability for now as OCM live status is spotty without deep integration
      const isAvailable = item.StatusType ? item.StatusType.IsOperational : true;
      const totalSpots = item.NumberOfPoints || 2;
      const availableSpots = isAvailable ? Math.floor(Math.random() * totalSpots) + 1 : 0;

      return {
        id: item.ID.toString(),
        name: addrInfo.Title || 'Ladestation',
        provider: provider,
        power: maxPower > 0 ? `${maxPower}kW` : 'k.A.',
        price: item.UsageCost ? item.UsageCost : 'k.A.',
        distance: item.AddressInfo && item.AddressInfo.Distance ? item.AddressInfo.Distance.toFixed(1) : 0,
        distanceUnit: 'km',
        address: address,
        available: isAvailable,
        totalSpots: totalSpots,
        availableSpots: availableSpots,
        conditions: item.GeneralComments || item.UsageCost || 'Keine spezifischen Bedingungen angegeben.',
        imageUrl: 'https://images.unsplash.com/photo-1593941707882-a5bba14938cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        lat: addrInfo.Latitude,
        lng: addrInfo.Longitude
      };
    });
  } catch (error) {
    console.error("OpenChargeMap Error:", error);
    throw error;
  }
};
