import React, { useState, useEffect } from 'react';
import { db } from '@pulse/core-logic';
import { Info, RefreshCw, UserPlus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

const SAMPLE_WORKSPACE_ID = '550e8400-e29b-41d4-a716-446655440000';

export const LoginDebug: React.FC = () => {
  const [dbInfo, setDbInfo] = useState<{
    totalCashiers: number;
    activeCashiers: number;
    cashiers: Array<{ username: string; role: string; is_active: boolean; pin: string }>;
    dbName: string;
    dbVersion: number;
  } | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadDbInfo();
  }, []);

  const loadDbInfo = async () => {
    try {
      await db.open();
      const allCashiers = await db.cashiers.toArray();
      const activeCashiers = allCashiers.filter(c => c.is_active && !c._deleted);
      
      setDbInfo({
        totalCashiers: allCashiers.length,
        activeCashiers: activeCashiers.length,
        cashiers: allCashiers.map(c => ({
          username: c.username,
          role: c.role,
          is_active: c.is_active,
          pin: c.pin_code,
        })),
        dbName: db.name,
        dbVersion: db.verno,
      });
    } catch (error) {
      console.error('Failed to load DB info:', error);
      toast.error('Failed to load database info');
    }
  };

  const createDefaultAdmin = async () => {
    setIsCreating(true);
    try {
      const existingAdmin = await db.cashiers.where('username').equals('admin').first();
      
      if (existingAdmin) {
        toast.error('Admin user already exists');
        return;
      }

      await db.cashiers.add({
        id: uuidv4(),
        workspace_id: SAMPLE_WORKSPACE_ID,
        username: 'admin',
        pin_code: '1234',
        full_name: 'Administrator',
        is_active: true,
        role: 'admin',
        created_at: new Date().toISOString(),
        _synced: false,
        _dirty: true,
      });

      toast.success('Admin user created! Username: admin, PIN: 1234');
      await loadDbInfo();
    } catch (error) {
      console.error('Failed to create admin:', error);
      toast.error('Failed to create admin user');
    } finally {
      setIsCreating(false);
    }
  };

  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className="fixed bottom-4 right-4 p-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-colors z-50"
        title="Show debug info"
      >
        <Info className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800/95 text-white p-4 rounded-lg shadow-2xl max-w-md z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Info className="w-4 h-4" />
          Debug Info
        </h3>
        <div className="flex gap-2">
          <button
            onClick={loadDbInfo}
            className="text-gray-400 hover:text-white"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDebug(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>

      {dbInfo ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-300">Database:</span>
            <span className="font-mono">{dbInfo.dbName} v{dbInfo.dbVersion}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Total Cashiers:</span>
            <span className="font-mono">{dbInfo.totalCashiers}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Active Cashiers:</span>
            <span className="font-mono">{dbInfo.activeCashiers}</span>
          </div>
          
          {dbInfo.cashiers.length > 0 ? (
            <div className="mt-3 pt-3 border-t border-gray-600">
              <div className="text-xs text-gray-400 mb-2">Cashiers:</div>
              {dbInfo.cashiers.map((c, i) => (
                <div key={i} className="flex gap-2 text-xs mb-1">
                  <span className={c.is_active ? 'text-green-400' : 'text-red-400'}>●</span>
                  <span className="font-mono">{c.username}</span>
                  <span className="text-gray-400">({c.role})</span>
                  <span className="text-gray-500 ml-auto">PIN: {c.pin}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 pt-3 border-t border-gray-600">
              <div className="text-xs text-yellow-400 mb-2">⚠️ No cashiers in database!</div>
              <button
                onClick={createDefaultAdmin}
                disabled={isCreating}
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs rounded flex items-center justify-center gap-2 transition-colors"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3 h-3" />
                    Create Admin User
                  </>
                )}
              </button>
            </div>
          )}
          
          <div className="mt-3 pt-3 border-t border-gray-600 text-xs text-gray-400">
            Default login: <span className="font-mono text-white">admin / 1234</span>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-400">Loading...</div>
      )}
    </div>
  );
};
