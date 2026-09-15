import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount, UserRole, Person, UserProfile } from '../types';
import { getPersonByVoterCode, verifyAdminCredentials, getUserAccountById } from '../services/db';

interface AuthContextType {
  adminUser: UserAccount | null;
  currentRole: UserRole;
  voterSession: Person | null;
  loading: boolean;
  loginAdmin: (username: string, pass: string) => Promise<{ success: boolean; user?: UserAccount; message?: string }>;
  logoutAdmin: () => void;
  updateAdminSession: (user: UserAccount) => void;
  authenticateWithVoterCode: (code: string) => Promise<{ success: boolean; person?: Person; message?: string }>;
  clearVoterSession: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  // Compatibility helpers
  userProfile: UserProfile | null;
  setSimulatedRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('trh_admin_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [voterSession, setVoterSession] = useState<Person | null>(() => {
    try {
      const saved = localStorage.getItem('church_voter_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  // 1. Refresh & verify saved sessions with DB in background
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedAdminJson = localStorage.getItem('trh_admin_user_session');
        if (savedAdminJson) {
          try {
            const parsedAdmin = JSON.parse(savedAdminJson) as UserAccount;
            if (parsedAdmin && parsedAdmin.id) {
              const liveUser = await getUserAccountById(parsedAdmin.id);
              if (liveUser) {
                if (liveUser.status === 'active') {
                  setAdminUser(liveUser);
                  localStorage.setItem('trh_admin_user_session', JSON.stringify(liveUser));
                } else {
                  // User has been disabled by admin
                  localStorage.removeItem('trh_admin_user_session');
                  setAdminUser(null);
                }
              }
            }
          } catch (e) {
            console.warn('Session parse error:', e);
          }
        }
      } catch (err) {
        console.warn('Auth init note:', err);
      }
    };

    initializeAuth();
  }, []);

  const loginAdmin = async (username: string, pass: string) => {
    setLoading(true);
    try {
      const res = await verifyAdminCredentials(username, pass);
      if (res.success && res.user) {
        setAdminUser(res.user);
        localStorage.setItem('trh_admin_user_session', JSON.stringify(res.user));
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message || 'Invalid username or password.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Login failed. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const logoutAdmin = () => {
    setAdminUser(null);
    localStorage.removeItem('trh_admin_user_session');
  };

  const updateAdminSession = (user: UserAccount) => {
    setAdminUser(user);
    localStorage.setItem('trh_admin_user_session', JSON.stringify(user));
  };

  const authenticateWithVoterCode = async (code: string) => {
    if (!code || code.trim().length === 0) {
      return { success: false, message: 'Please enter a valid voter code.' };
    }
    try {
      const person = await getPersonByVoterCode(code.trim());
      if (person) {
        setVoterSession(person);
        localStorage.setItem('church_voter_session', JSON.stringify(person));
        return { success: true, person };
      } else {
        return {
          success: false,
          message: 'Voter code not found in the verified church directory. Please contact your department admin.'
        };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Error validating code.' };
    }
  };

  const clearVoterSession = () => {
    setVoterSession(null);
    localStorage.removeItem('church_voter_session');
  };

  const setSimulatedRole = (role: UserRole) => {
    if (adminUser) {
      const updated = { ...adminUser, role };
      setAdminUser(updated);
      localStorage.setItem('trh_admin_user_session', JSON.stringify(updated));
    }
  };

  const currentRole: UserRole = adminUser ? adminUser.role : (voterSession ? 'voter' : 'voter');
  const isSuperAdmin = adminUser?.role === 'super_admin' || adminUser?.email === 'yinkopet@gmail.com';
  const isAdmin = !!adminUser && ['super_admin', 'admin', 'organisation_admin', 'department_admin'].includes(adminUser.role);

  const userProfile: UserProfile | null = adminUser
    ? {
        uid: adminUser.id,
        email: adminUser.email || `${adminUser.username}@trhworkforce.org`,
        displayName: adminUser.fullName,
        role: adminUser.role,
        organisationId: adminUser.organisationId,
        departmentId: adminUser.departmentId,
        createdAt: adminUser.createdAt,
        updatedAt: adminUser.updatedAt
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        adminUser,
        currentRole,
        voterSession,
        loading,
        loginAdmin,
        logoutAdmin,
        updateAdminSession,
        authenticateWithVoterCode,
        clearVoterSession,
        isAdmin,
        isSuperAdmin,
        userProfile,
        setSimulatedRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
