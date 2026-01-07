import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { syncService } from '@pulse/core-logic';
import { cn } from '../../utils/cn';

export const ConnectionStatus: React.FC = () => {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    const handleSyncStart = () => {
      setIsSyncing(true);
      setError(false);
    };
    
    const handleSyncEnd = () => {
      setIsSyncing(false);
      // Refresh status to get last sync time
      syncService.getSyncStatus().then(status => {
        if (status.lastSync) {
            setLastSyncTime(new Date(status.lastSync));
        }
      });
    };
    
    const handleSyncError = () => {
      setError(true);
      setIsSyncing(false);
    };

    const handleSyncSuccess = () => {
        setError(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-start', handleSyncStart);
    window.addEventListener('sync-end', handleSyncEnd);
    window.addEventListener('sync-error', handleSyncError);
    window.addEventListener('sync-success', handleSyncSuccess);

    // Initial check
    syncService.getSyncStatus().then(status => {
      setIsOnline(status.isOnline);
      setIsSyncing(status.isSyncing);
      if (status.lastSync) {
        setLastSyncTime(new Date(status.lastSync));
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-start', handleSyncStart);
      window.removeEventListener('sync-end', handleSyncEnd);
      window.removeEventListener('sync-error', handleSyncError);
      window.removeEventListener('sync-success', handleSyncSuccess);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
        <WifiOff size={14} />
        <span className="text-xs font-medium">{t('status.offline', 'Offline')}</span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
        <RefreshCw size={14} className="animate-spin" />
        <span className="text-xs font-medium">{t('status.syncing', 'Syncing...')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800" title={t('status.syncError', 'Sync Failed')}>
        <AlertCircle size={14} />
        <span className="text-xs font-medium">{t('status.error', 'Sync Warning')}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800" title={lastSyncTime ? t('status.lastSync', 'Last synced: {{time}}', { time: lastSyncTime.toLocaleTimeString() }) : ''}>
      <CheckCircle size={14} />
      <span className="text-xs font-medium">{t('status.online', 'Online')}</span>
    </div>
  );
};
