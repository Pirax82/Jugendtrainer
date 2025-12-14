import React, { createContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Tournament, Match, MatchEvent, MatchStatus, EventType, Formation } from '../types';
import { matchesApi, tournamentsApi } from '../services/api';

interface TopScorer {
  playerId: string;
  goals: number;
  matches: Array<{ matchId: string; goals: number }>;
}

interface TournamentStats {
  totalMatches: number;
  completedMatches: number;
  totalGoalsScored: number;
  totalGoalsConceded: number;
  wins: number;
  draws: number;
  losses: number;
}

interface TournamentsContextType {
  tournaments: Tournament[];
  matches: Match[];
  events: MatchEvent[];
  loading: boolean;
  addTournament: (tournament: Omit<Tournament, 'id' | 'createdAt'>) => Promise<string>;
  updateTournament: (id: string, updates: Partial<Tournament>) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  addMatch: (match: Omit<Match, 'id' | 'createdAt'>) => Promise<string>;
  updateMatch: (id: string, updates: Partial<Match>) => Promise<void>;
  updateMatchFormation: (id: string, formation: Formation) => Promise<void>;
  deleteMatch: (id: string) => Promise<void>;
  addEvent: (event: Omit<MatchEvent, 'id' | 'timestamp'>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getMatchEvents: (matchId: string) => MatchEvent[];
  getTournamentMatches: (tournamentId: string) => Match[];
  getMatchById: (id: string) => Match | undefined;
  getTournamentById: (id: string) => Tournament | undefined;
  getMatchScore: (matchId: string) => { heim: number; gegner: number };
  getTournamentTopScorers: (tournamentId: string) => TopScorer[];
  getTournamentStats: (tournamentId: string) => TournamentStats;
}

export const TournamentsContext = createContext<TournamentsContextType | undefined>(undefined);

const toTournament = (t: any): Tournament => ({
  id: String(t.id),
  name: String(t.name ?? ''),
  ort: String(t.ort ?? ''),
  datum: Number(t.datum ?? t.date ?? t.datum_ts ?? Date.now()),
  wetter: t.wetter ?? undefined,
  importQuelle: t.importQuelle ?? t.import_quelle,
  rawImport: t.rawImport ?? t.raw_import,
  createdAt: t.createdAt ? Number(t.createdAt) : t.created_at ? new Date(t.created_at).getTime() : Date.now(),
});

const toMatch = (m: any): Match => ({
  id: String(m.id),
  tournamentId: String(m.tournamentId ?? m.tournament_id),
  teamId: String(m.teamId ?? m.team_id),
  gegnerName: String(m.gegnerName ?? m.gegner_name ?? ''),
  startZeit: m.startZeit ?? m.start_zeit ?? undefined,
  dauerMin: Number(m.dauerMin ?? m.dauer_min ?? 0),
  feld: m.feld ?? undefined,
  status: (m.status as MatchStatus) ?? MatchStatus.GEPLANT,
  endZeit: m.endZeit ?? m.end_zeit ?? undefined,
  formation: m.formation ?? undefined,
  createdAt: m.createdAt ? Number(m.createdAt) : m.created_at ? new Date(m.created_at).getTime() : Date.now(),
});

const toEvent = (e: any): MatchEvent => ({
  id: String(e.id),
  matchId: String(e.matchId ?? e.match_id),
  typ: (e.typ as EventType) ?? e.type,
  playerId: e.playerId ?? e.player_id ?? undefined,
  spielminute: Number(e.spielminute ?? 0),
  timestamp: Number(e.timestamp ?? Date.now()),
  meta: e.meta ?? undefined,
});

export function TournamentsProvider({ children }: { children: ReactNode }) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    loadData();
    return () => {};
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tData, mData] = await Promise.all([
        tournamentsApi.getAll(),
        matchesApi.getAll(),
      ]);

      const transformedTournaments = tData.map(toTournament);
      const transformedMatches = mData.map(toMatch);

      // Load events per match (keeps API flexible; can be optimized later with a bulk endpoint)
      const matchIds = transformedMatches.map(m => m.id);
      const eventsArrays = await Promise.all(
        matchIds.map(id => matchesApi.getEvents(id).catch(() => []))
      );
      const transformedEvents = eventsArrays.flat().map(toEvent);

      setTournaments(transformedTournaments);
      setMatches(transformedMatches);
      setEvents(transformedEvents);
      setInitialized(true);
      loadedRef.current = true;
    } catch (error) {
      console.error('Error loading data:', error);
      setInitialized(true);
    } finally {
      setLoading(false);
    }
  };

  const addTournament = async (tournament: Omit<Tournament, 'id' | 'createdAt'>) => {
    const created = await tournamentsApi.create(tournament);
    const newTournament = toTournament(created);
    setTournaments(prev => [newTournament, ...prev]);
    return newTournament.id;
  };

  const updateTournament = async (id: string, updates: Partial<Tournament>) => {
    await tournamentsApi.update(id, updates);
    setTournaments(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTournament = async (id: string) => {
    try {
      // Get all matches for this tournament
      const tournamentMatches = matches.filter(m => String(m.tournamentId) === String(id));
      const matchIds = tournamentMatches.map(m => String(m.id));
      // Backend should handle cascade; local state updates remain
      await tournamentsApi.delete(id);

      setTournaments(prev => prev.filter(t => String(t.id) !== String(id)));
      setMatches(prev => prev.filter(m => String(m.tournamentId) !== String(id)));
      setEvents(prev => prev.filter(e => !matchIds.includes(String(e.matchId))));
    } catch (error) {
      console.error('Error deleting tournament:', error);
      throw error;
    }
  };

  const addMatch = async (match: Omit<Match, 'id' | 'createdAt'>) => {
    const created = await matchesApi.create(match);
    const newMatch = toMatch(created);
    setMatches(prev => [newMatch, ...prev]);
    return newMatch.id;
  };

  const updateMatch = async (id: string, updates: Partial<Match>) => {
    await matchesApi.update(id, updates);
    setMatches(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const updateMatchFormation = async (id: string, formation: Formation) => {
    await updateMatch(id, { formation });
  };

  const deleteMatch = async (id: string) => {
    await matchesApi.delete(id);
    setMatches(prev => prev.filter(m => m.id !== id));
    setEvents(prev => prev.filter(e => e.matchId !== id));
  };

  const addEvent = async (event: Omit<MatchEvent, 'id' | 'timestamp'>) => {
    const timestamp = Date.now();
    const created = await matchesApi.createEvent(event.matchId, {
      ...event,
      timestamp,
    });
    const newEvent = toEvent(created);
    setEvents(prev => [...prev, newEvent]);
  };

  const deleteEvent = async (id: string) => {
    // We only have a match-scoped delete in the API. Derive matchId from local cache.
    const matchId = events.find(e => e.id === id)?.matchId;
    if (matchId) {
      await matchesApi.deleteEvent(matchId, id);
    }
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const getMatchEvents = (matchId: string) => {
    // Use loose comparison to handle string/number mismatch
    return events.filter(e => String(e.matchId) === String(matchId)).sort((a, b) => a.timestamp - b.timestamp);
  };

  const getTournamentMatches = (tournamentId: string) => {
    // Use loose comparison to handle string/number mismatch
    return matches.filter(m => String(m.tournamentId) === String(tournamentId));
  };

  const getMatchById = (id: string) => {
    // Use loose comparison to handle string/number mismatch
    return matches.find(m => String(m.id) === String(id));
  };

  const getTournamentById = (id: string) => {
    // Use loose comparison to handle string/number mismatch
    return tournaments.find(t => String(t.id) === String(id));
  };

  const getMatchScore = (matchId: string) => {
    const matchEvents = getMatchEvents(matchId);
    const heim = matchEvents.filter(e => e.typ === EventType.TOR_HEIM).length;
    const gegner = matchEvents.filter(e => e.typ === EventType.TOR_GEGNER).length;
    return { heim, gegner };
  };

  const getTournamentTopScorers = (tournamentId: string) => {
    const tournamentMatches = getTournamentMatches(tournamentId);
    const matchIds = tournamentMatches.map(m => String(m.id));
    const tournamentEvents = events.filter(e => matchIds.includes(String(e.matchId)) && e.typ === EventType.TOR_HEIM && e.playerId);
    
    const scorersMap = new Map<string, TopScorer>();
    
    tournamentEvents.forEach(event => {
      if (!event.playerId) return;
      
      if (!scorersMap.has(event.playerId)) {
        scorersMap.set(event.playerId, {
          playerId: event.playerId,
          goals: 0,
          matches: [],
        });
      }
      
      const scorer = scorersMap.get(event.playerId)!;
      scorer.goals++;
      
      const matchEntry = scorer.matches.find(m => m.matchId === event.matchId);
      if (matchEntry) {
        matchEntry.goals++;
      } else {
        scorer.matches.push({ matchId: event.matchId, goals: 1 });
      }
    });
    
    return Array.from(scorersMap.values()).sort((a, b) => b.goals - a.goals);
  };

  const getTournamentStats = (tournamentId: string) => {
    const tournamentMatches = getTournamentMatches(tournamentId);
    const completedMatches = tournamentMatches.filter(m => m.status === MatchStatus.ABGESCHLOSSEN);
    
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let totalGoalsScored = 0;
    let totalGoalsConceded = 0;
    
    completedMatches.forEach(match => {
      const score = getMatchScore(match.id);
      totalGoalsScored += score.heim;
      totalGoalsConceded += score.gegner;
      
      if (score.heim > score.gegner) wins++;
      else if (score.heim === score.gegner) draws++;
      else losses++;
    });
    
    return {
      totalMatches: tournamentMatches.length,
      completedMatches: completedMatches.length,
      totalGoalsScored,
      totalGoalsConceded,
      wins,
      draws,
      losses,
    };
  };

  return (
    <TournamentsContext.Provider
      value={{
        tournaments,
        matches,
        events,
        loading,
        addTournament,
        updateTournament,
        deleteTournament,
        addMatch,
        updateMatch,
        updateMatchFormation,
        deleteMatch,
        addEvent,
        deleteEvent,
        getMatchEvents,
        getTournamentMatches,
        getMatchById,
        getTournamentById,
        getMatchScore,
        getTournamentTopScorers,
        getTournamentStats,
      }}
    >
      {children}
    </TournamentsContext.Provider>
  );
}
