import { toast } from 'sonner';

interface NotificationOptions {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  category?: 'lowStock' | 'highValueSale' | 'failedSync' | 'general';
}

export const sendNotification = (options: NotificationOptions) => {
  const { title, message, type, category = 'general' } = options;

  // Check settings
  let shouldNotifyDesktop = true;
  let soundEnabled = true;

  try {
    const settingsStr = localStorage.getItem('pulse-settings');
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      const notifSettings = settings.notifications || {};
      
      soundEnabled = notifSettings.soundEnabled ?? true;

      // Check category specific settings
      if (category === 'lowStock' && !notifSettings.lowStock) shouldNotifyDesktop = false;
      if (category === 'highValueSale' && !notifSettings.highValueSale) shouldNotifyDesktop = false;
      if (category === 'failedSync' && !notifSettings.failedSync) shouldNotifyDesktop = false;
    }
  } catch (e) {
    console.error('Error reading settings:', e);
  }

  // 1. In-App Toast
  switch (type) {
    case 'success':
      toast.success(title, { description: message });
      break;
    case 'error':
      toast.error(title, { description: message });
      break;
    case 'warning':
      toast.warning(title, { description: message });
      break;
    case 'info':
      toast.info(title, { description: message });
      break;
  }

  // 2. Sound (Mock)
  if (soundEnabled && (type === 'error' || type === 'warning')) {
    // playSound(); // TODO: Implement sound
  }

  // 3. Desktop Notification
  if (shouldNotifyDesktop && window.electronAPI?.showNotification) {
    window.electronAPI.showNotification({ title, body: message });
  }
};
