// Build a deep link for the user's preferred navigation app.
export const NAV_APPS = [
  { id: 'google', label: 'Google Maps' },
  { id: 'apple', label: 'Apple Maps' },
  { id: 'waze', label: 'Waze' }
];

export const buildNavUrl = (app, lat, lng) => {
  if (lat == null || lng == null) return null;
  switch (app) {
    case 'apple':
      return `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
    case 'waze':
      return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    case 'google':
    default:
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
};

export const navAppLabel = (app) => (NAV_APPS.find(a => a.id === app)?.label) || 'Google Maps';
