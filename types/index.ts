export interface PlayerPosition {
  playerId: string;
  x: number; // 0-100 percentage from left
  y: number; // 0-100 percentage from top
}

export interface Formation {
  starters: PlayerPosition[];
  substitutes: string[]; // player IDs
}

export interface Team {
  id: string;
  name: string;
  jahrgang?: string;
  trainer?: string;
  trikotFarbe?: string;
  logoUrl?: string;
  formation?: Formation; // Default formation for the team
  createdAt: number;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  nummer?: number;
  fotoUrl?: string;
  aktiv: boolean;
  createdAt: number;
}

export enum ImportSource {
  MANUAL = 'MANUAL',
  MEIN_TURNIERPLAN = 'MEIN_TURNIERPLAN',
  CSV = 'CSV',
}

export enum Wetter {
  SONNIG = 'Sonnig',
  BEWOELKT = 'Bewölkt',
  REGEN = 'Regen',
  SCHNEE = 'Schnee',
  WIND = 'Windig',
}

export interface Tournament {
  id: string;
  name: string;
  ort: string;
  datum: number; // timestamp
  wetter?: Wetter;
  importQuelle: ImportSource;
  rawImport?: any;
  createdAt: number;
}

export enum MatchStatus {
  GEPLANT = 'GEPLANT',
  LAUFEND = 'LAUFEND',
  ABGESCHLOSSEN = 'ABGESCHLOSSEN',
}

export interface Match {
  id: string;
  tournamentId: string;
  teamId: string;
  gegnerName: string;
  startZeit?: number;
  dauerMin: number;
  feld?: string;
  status: MatchStatus;
  endZeit?: number;
  formation?: Formation; // Match-specific formation (overrides team default)
  createdAt: number;
}

export enum EventType {
  ANPFIFF = 'ANPFIFF',
  TOR_HEIM = 'TOR_HEIM',
  TOR_GEGNER = 'TOR_GEGNER',
  PAUSE = 'PAUSE',
  FORTSETZUNG = 'FORTSETZUNG',
  SCHLUSS = 'SCHLUSS',
  MANUELLE_KORREKTUR = 'MANUELLE_KORREKTUR',
}

export interface MatchEvent {
  id: string;
  matchId: string;
  typ: EventType;
  playerId?: string;
  spielminute: number;
  timestamp: number;
  meta?: any;
}

export enum TimerStatus {
  READY = 'READY',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  ENDED = 'ENDED',
}

// User Role Hierarchy: Admin > Trainer > Zuschauer
export enum UserRole {
  ADMIN = 'ADMIN',
  TRAINER = 'TRAINER',
  ZUSCHAUER = 'ZUSCHAUER',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teamIds?: string[]; // Teams the trainer is assigned to
  createdAt: number;
  lastLogin?: number;
}
