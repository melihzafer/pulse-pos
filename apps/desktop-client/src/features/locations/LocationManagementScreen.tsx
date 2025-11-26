import React, { useEffect, useState } from 'react';
import { Plus, Edit2, MapPin, Phone, Mail, User, X, Save } from 'lucide-react';
import { LocationService } from '@pulse/core-logic';
import type { Location } from '@pulse/core-logic';
import { toast } from 'sonner';

export const LocationManagementScreen: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const workspaceId = 'default-workspace'; // TODO: Get from auth/settings
      const locs = await LocationService.getAllLocations(workspaceId);
      setLocations(locs);
    } catch (error) {
      console.error('Failed to load locations:', error);
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = () => {
    setEditingLocation(null);
    setShowModal(true);
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLocation(null);
  };

  const handleSaveLocation = async (locationData: Partial<Location>) => {
    try {
      const workspaceId = 'default-workspace'; // TODO: Get from auth/settings

      if (editingLocation) {
        await LocationService.updateLocation(editingLocation.id, locationData);
        toast.success('Location updated successfully');
      } else {
        await LocationService.createLocation({
          workspace_id: workspaceId,
          name: locationData.name!,
          address: locationData.address,
          phone: locationData.phone,
          email: locationData.email,
          timezone: locationData.timezone || 'Europe/Sofia',
          currency: locationData.currency || 'BGN',
          is_active: true,
        });
        toast.success('Location created successfully');
      }

      await loadLocations();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save location:', error);
      toast.error('Failed to save location');
    }
  };

  const handleDeactivateLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to deactivate this location?')) return;

    try {
      await LocationService.deactivateLocation(locationId);
      toast.success('Location deactivated');
      await loadLocations();
    } catch (error) {
      console.error('Failed to deactivate location:', error);
      toast.error('Failed to deactivate location');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white/60">Loading locations...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Location Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your store locations and branches</p>
        </div>
        <button
          onClick={handleAddLocation}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg
                     hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-5 h-5" />
          Add Location
        </button>
      </div>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((location) => (
          <LocationCard
            key={location.id}
            location={location}
            onEdit={handleEditLocation}
            onDeactivate={handleDeactivateLocation}
          />
        ))}
        
        {/* Add New Card Placeholder */}
        <button
          onClick={handleAddLocation}
          className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800/50 transition-all min-h-[200px] group"
        >
          <div className="p-4 bg-gray-100 dark:bg-slate-800 rounded-full mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
            <Plus className="w-8 h-8" />
          </div>
          <span className="font-medium">Add New Location</span>
        </button>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <LocationModal
          location={editingLocation}
          onSave={handleSaveLocation}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

interface LocationCardProps {
  location: Location;
  onEdit: (location: Location) => void;
  onDeactivate: (locationId: string) => void;
}

const LocationCard: React.FC<LocationCardProps> = ({ location, onEdit, onDeactivate }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
      
      <div className="flex justify-between items-start mb-6 relative">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{location.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{location.timezone}</p>
          </div>
        </div>
        <button
          onClick={() => onEdit(location)}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 mb-6 relative">
        {location.address && (
          <div className="flex items-start gap-3 text-sm">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
            <span className="text-gray-600 dark:text-gray-300">{location.address}</span>
          </div>
        )}
        {location.phone && (
          <div className="flex items-center gap-3 text-sm">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-300">{location.phone}</span>
          </div>
        )}
        {location.email && (
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-300">{location.email}</span>
          </div>
        )}
        {location.manager_user_id && (
          <div className="flex items-center gap-3 text-sm">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-300">Manager assigned</span>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center relative">
        <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded">
          {location.currency}
        </span>
        <button
          onClick={() => onDeactivate(location.id)}
          className="text-xs font-medium text-red-500 hover:text-red-600 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
        >
          Deactivate
        </button>
      </div>
    </div>
  );
};

interface LocationModalProps {
  location: Location | null;
  onSave: (data: Partial<Location>) => void;
  onClose: () => void;
}

const LocationModal: React.FC<LocationModalProps> = ({ location, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: location?.name || '',
    address: location?.address || '',
    phone: location?.phone || '',
    email: location?.email || '',
    timezone: location?.timezone || 'Europe/Sofia',
    currency: location?.currency || 'BGN',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-slate-700">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {location ? 'Edit Location' : 'Add New Location'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="e.g., Downtown Store"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="123 Main St, Sofia"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="+359 888 123 456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="store@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
              <input
                type="text"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Europe/Sofia"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="BGN"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg
                         hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
            >
              <Save className="w-4 h-4" />
              Save Location
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
