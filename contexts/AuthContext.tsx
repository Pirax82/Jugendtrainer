import React, { createContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '../types';
import { authApi, setAuthToken, usersApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isTrainer: boolean;
  isAdmin: boolean;
  isZuschauer: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  getAllUsers: () => Promise<User[]>;
  assignTeamToTrainer: (userId: string, teamId: string) => Promise<{ success: boolean; error?: string }>;
  removeTeamFromTrainer: (userId: string, teamId: string) => Promise<{ success: boolean; error?: string }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'tvs_jugendtrainer_auth_token';

function toUser(raw: any): User {
  return {
    id: String(raw.id),
    email: String(raw.email ?? ''),
    name: String(raw.name ?? ''),
    role: (raw.role as UserRole) ?? UserRole.ZUSCHAUER,
    teamIds: raw.teamIds ?? raw.team_ids ?? [],
    createdAt: raw.createdAt ? Number(raw.createdAt) : raw.created_at ? new Date(raw.created_at).getTime() : Date.now(),
    lastLogin: raw.lastLogin ? Number(raw.lastLogin) : raw.last_login ? new Date(raw.last_login).getTime() : undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        setAuthToken(token);

        if (!token) {
          if (!cancelled) setUser(null);
          return;
        }

        const me = await authApi.me();
        if (!cancelled) setUser(toUser(me.user));
      } catch {
        // Token may be invalid; fall back to Zuschauer
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const { token, user: rawUser } = await authApi.signIn(email, password);
      setAuthToken(token);
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      setUser(toUser(rawUser));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Anmeldung fehlgeschlagen' };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const { token, user: rawUser } = await authApi.signUp(email, password, name);
      setAuthToken(token);
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      setUser(toUser(rawUser));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Registrierung fehlgeschlagen' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
    setLoading(false);
  };

  const updateUserRole = async (userId: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    // Only admins can change roles
    if (user?.role !== UserRole.ADMIN) {
      return { success: false, error: 'Keine Berechtigung' };
    }

    try {
      await usersApi.updateRole(userId, role);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Rolle konnte nicht geändert werden' };
    }
  };

  const getAllUsers = async (): Promise<User[]> => {
    // Only admins can see all users
    if (user?.role !== UserRole.ADMIN) {
      return [];
    }

    try {
      const data = await usersApi.getAll();
      return data.map(toUser);
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  };

  const assignTeamToTrainer = async (userId: string, teamId: string): Promise<{ success: boolean; error?: string }> => {
    if (user?.role !== UserRole.ADMIN) {
      return { success: false, error: 'Keine Berechtigung' };
    }

    try {
      const allUsers = await usersApi.getAll();
      const u = allUsers.find((x: any) => String(x.id) === String(userId));
      const current = (u?.teamIds ?? u?.team_ids ?? []) as string[];
      const next = current.includes(teamId) ? current : [...current, teamId];
      await usersApi.updateTeams(userId, next);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Team konnte nicht zugewiesen werden' };
    }
  };

  const removeTeamFromTrainer = async (userId: string, teamId: string): Promise<{ success: boolean; error?: string }> => {
    if (user?.role !== UserRole.ADMIN) {
      return { success: false, error: 'Keine Berechtigung' };
    }

    try {
      const allUsers = await usersApi.getAll();
      const u = allUsers.find((x: any) => String(x.id) === String(userId));
      const current = (u?.teamIds ?? u?.team_ids ?? []) as string[];
      const next = current.filter((id: string) => id !== teamId);
      await usersApi.updateTeams(userId, next);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Team konnte nicht entfernt werden' };
    }
  };

  // Role checks
  const roleFlags = useMemo(() => {
    const isAdmin = user?.role === UserRole.ADMIN;
    const isTrainer = user?.role === UserRole.TRAINER || user?.role === UserRole.ADMIN;
    const isZuschauer = !user || user.role === UserRole.ZUSCHAUER;
    return { isAdmin, isTrainer, isZuschauer };
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isTrainer: roleFlags.isTrainer,
        isAdmin: roleFlags.isAdmin,
        isZuschauer: roleFlags.isZuschauer,
        signIn,
        signUp,
        signOut,
        updateUserRole,
        getAllUsers,
        assignTeamToTrainer,
        removeTeamFromTrainer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
