import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { User, UserRole } from '../types';
import { apiLogin } from '../services/api';
import { useRealtime } from './RealtimeContext';

const AUTH_STORAGE_KEY = 'a-baba-user';

interface AuthContextType {
  user: User | null;
  login: (role: UserRole, username: string, pin: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
        const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
        return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const { subscribe, unsubscribe } = useRealtime();

  useEffect(() => {
    if (!user) {
      return;
    }

    const handleUserUpdate = (updatedUser: User) => {
      if (user && updatedUser.id === user.id) {
        // Also update localStorage when user data is refreshed
        setUser(updatedUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      }
    };

    subscribe('user-update', handleUserUpdate);

    return () => {
      unsubscribe('user-update', handleUserUpdate);
    };
  }, [user, subscribe, unsubscribe]);

  const login = useCallback(async (role: UserRole, username: string, pin: string) => {
    setIsLoading(true);
    try {
      const loggedInUser = await apiLogin(role, username, pin);
      setUser(loggedInUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedInUser));
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};