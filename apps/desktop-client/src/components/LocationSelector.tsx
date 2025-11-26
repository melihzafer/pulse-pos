import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { db } from '@pulse/core-logic';
import type { Location } from '@pulse/core-logic';

interface LocationSelectorProps {
  selectedLocationId?: string;
  onLocationChange: (locationId: string) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedLocationId,
  onLocationChange,
}) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLocations = async () => {
    try {
      const workspaceId = 'default-workspace'; // TODO: Get from auth/settings
      const locs = await db.locations
        .where('workspace_id')
        .equals(workspaceId)
        .filter((loc: any) => loc.is_active === true)
        .toArray();
      
      setLocations(locs);
      
      // Auto-select first location if none selected
      if (!selectedLocationId && locs.length > 0) {
        onLocationChange(locs[0].id);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg">
        <MapPin className="w-4 h-4 text-pulse-cyan" />
        <span className="text-sm text-white/60">Loading...</span>
      </div>
    );
  }

  if (locations.length === 0) {
    return null; // Don't show selector if only one or no locations
  }

  return (
    <div className="flex items-center gap-2">
      <MapPin className="w-4 h-4 text-pulse-cyan" />
      <select
        value={selectedLocationId || ''}
        onChange={(e) => onLocationChange(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                   focus:outline-none focus:ring-2 focus:ring-pulse-cyan/50
                   hover:bg-white/10 transition-colors cursor-pointer"
      >
        {locations.map((location) => (
          <option key={location.id} value={location.id} className="bg-gray-900">
            {location.name}
          </option>
        ))}
      </select>
    </div>
  );
};
