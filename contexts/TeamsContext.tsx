import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Team, Player, Formation } from '../types';
import { playersApi, teamsApi } from '../services/api';

// Small helpers to tolerate different API shapes (snake_case vs camelCase)
const toTeam = (t: any): Team => ({
  id: String(t.id),
  name: String(t.name ?? ''),
  jahrgang: t.jahrgang ?? t.jahrgang,
  trainer: t.trainer ?? t.trainer,
  trikotFarbe: t.trikotFarbe ?? t.trikot_farbe,
  logoUrl: t.logoUrl ?? t.logo_url,
  formation: t.formation ?? undefined,
  createdAt: t.createdAt ? Number(t.createdAt) : t.created_at ? new Date(t.created_at).getTime() : Date.now(),
});

const toPlayer = (p: any): Player => ({
  id: String(p.id),
  teamId: String(p.teamId ?? p.team_id),
  name: String(p.name ?? ''),
  nummer: p.nummer ?? undefined,
  fotoUrl: p.fotoUrl ?? p.foto_url,
  aktiv: p.aktiv ?? true,
  createdAt: p.createdAt ? Number(p.createdAt) : p.created_at ? new Date(p.created_at).getTime() : Date.now(),
});

interface TeamsContextType {
  teams: Team[];
  players: Player[];
  loading: boolean;
  addTeam: (team: Omit<Team, 'id' | 'createdAt'>) => Promise<string>;
  updateTeam: (id: string, updates: Partial<Team>) => Promise<void>;
  updateTeamFormation: (id: string, formation: Formation) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  addPlayer: (player: Omit<Player, 'id' | 'createdAt'>) => Promise<void>;
  updatePlayer: (id: string, updates: Partial<Player>) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  getTeamPlayers: (teamId: string) => Player[];
  getTeamById: (id: string) => Team | undefined;
  getPlayerById: (id: string) => Player | undefined;
}

export const TeamsContext = createContext<TeamsContextType | undefined>(undefined);

export function TeamsProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [teamsData, playersData] = await Promise.all([
        teamsApi.getAll(),
        playersApi.getAll(),
      ]);

      setTeams(teamsData.map(toTeam));
      setPlayers(playersData.map(toPlayer));
      setInitialized(true);
    } catch (error: any) {
      console.error('Error loading data:', error);
      setInitialized(true);
    } finally {
      setLoading(false);
    }
  };

  const addTeam = async (team: Omit<Team, 'id' | 'createdAt'>) => {
    const created = await teamsApi.create(team);
    const newTeam = toTeam(created);
    setTeams(prev => [newTeam, ...prev]);
    return newTeam.id;
  };

  const updateTeam = async (id: string, updates: Partial<Team>) => {
    await teamsApi.update(id, updates);
    setTeams(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const updateTeamFormation = async (id: string, formation: Formation) => {
    await updateTeam(id, { formation });
  };

  const deleteTeam = async (id: string) => {
    // Backend should handle cascade; we also update local state
    await teamsApi.delete(id);
    setTeams(prev => prev.filter(t => t.id !== id));
    setPlayers(prev => prev.filter(p => p.teamId !== id));
  };

  const addPlayer = async (player: Omit<Player, 'id' | 'createdAt'>) => {
    const created = await playersApi.create(player);
    const newPlayer = toPlayer(created);
    setPlayers(prev => [newPlayer, ...prev]);
  };

  const updatePlayer = async (id: string, updates: Partial<Player>) => {
    await playersApi.update(id, updates);
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePlayer = async (id: string) => {
    await playersApi.delete(id);
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const getTeamPlayers = (teamId: string) => {
    // Use loose comparison to handle string/number mismatch
    return players.filter(p => String(p.teamId) === String(teamId) && p.aktiv);
  };

  const getTeamById = (id: string) => {
    // Use loose comparison to handle string/number mismatch
    return teams.find(t => String(t.id) === String(id));
  };

  const getPlayerById = (id: string) => {
    // Use loose comparison to handle string/number mismatch
    return players.find(p => String(p.id) === String(id));
  };

  return (
    <TeamsContext.Provider
      value={{
        teams,
        players,
        loading,
        addTeam,
        updateTeam,
        updateTeamFormation,
        deleteTeam,
        addPlayer,
        updatePlayer,
        deletePlayer,
        getTeamPlayers,
        getTeamById,
        getPlayerById,
      }}
    >
      {children}
    </TeamsContext.Provider>
  );
}
