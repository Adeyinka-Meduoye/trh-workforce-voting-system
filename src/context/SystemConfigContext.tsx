import React, { createContext, useContext, useState, useEffect } from 'react';
import { SystemConfig } from '../types';
import { getSystemConfig, updateSystemConfig, DEFAULT_SYSTEM_CONFIG } from '../services/db';
import { useAuth } from './AuthContext';

interface SystemConfigContextType {
  config: SystemConfig;
  loading: boolean;
  refreshConfig: () => Promise<void>;
  saveConfig: (newConfig: Partial<SystemConfig>) => Promise<void>;
  updateConfig: (newConfig: Partial<SystemConfig>) => Promise<void>;
}

const SystemConfigContext = createContext<SystemConfigContextType | undefined>(undefined);

export const SystemConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_SYSTEM_CONFIG);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useAuth();

  const load = async () => {
    try {
      const cfg = await getSystemConfig();
      setConfig(cfg);
    } catch (e) {
      console.error('Failed to load system config:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveConfig = async (newConfig: Partial<SystemConfig>) => {
    try {
      const updated = await updateSystemConfig(newConfig, {
        id: userProfile?.uid || 'admin',
        name: userProfile?.displayName || 'Admin',
        email: userProfile?.email
      });
      setConfig(updated);
    } catch (e) {
      console.error('Error saving system config:', e);
      throw e;
    }
  };

  return (
    <SystemConfigContext.Provider
      value={{
        config,
        loading,
        refreshConfig: load,
        saveConfig,
        updateConfig: saveConfig
      }}
    >
      {children}
    </SystemConfigContext.Provider>
  );
};

export const useSystemConfig = () => {
  const context = useContext(SystemConfigContext);
  if (!context) {
    throw new Error('useSystemConfig must be used within SystemConfigProvider');
  }
  return context;
};
