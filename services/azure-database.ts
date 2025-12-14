/**
 * Azure PostgreSQL Database Service
 * 
 * Dieser Service verbindet die App mit Azure PostgreSQL.
 * Für React Native/Expo muss ein Backend-API verwendet werden,
 * da direkte PostgreSQL-Verbindungen aus dem Browser nicht möglich sind.
 * 
 * ARCHITEKTUR:
 * App → Azure Functions API → Azure PostgreSQL
 * 
 * Dieser Code definiert die API-Aufrufe für das Backend.
 */

// Azure-Konfiguration aus Umgebungsvariablen
const AZURE_API_URL = process.env.EXPO_PUBLIC_AZURE_API_URL || '';

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Azure Database API Client
 */
class AzureDatabaseClient {
  private apiUrl: string;
  private authToken: string | null = null;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error: error.message || 'Request failed' };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message || 'Network error' };
    }
  }

  // ============================================
  // Teams
  // ============================================
  
  async getTeams() {
    return this.request<any[]>('/api/teams');
  }

  async getTeam(id: string) {
    return this.request<any>(`/api/teams/${id}`);
  }

  async createTeam(team: any) {
    return this.request<any>('/api/teams', 'POST', team);
  }

  async updateTeam(id: string, updates: any) {
    return this.request<any>(`/api/teams/${id}`, 'PUT', updates);
  }

  async deleteTeam(id: string) {
    return this.request<void>(`/api/teams/${id}`, 'DELETE');
  }

  // ============================================
  // Players
  // ============================================
  
  async getPlayers(teamId?: string) {
    const query = teamId ? `?team_id=${teamId}` : '';
    return this.request<any[]>(`/api/players${query}`);
  }

  async createPlayer(player: any) {
    return this.request<any>('/api/players', 'POST', player);
  }

  async updatePlayer(id: string, updates: any) {
    return this.request<any>(`/api/players/${id}`, 'PUT', updates);
  }

  async deletePlayer(id: string) {
    return this.request<void>(`/api/players/${id}`, 'DELETE');
  }

  // ============================================
  // Tournaments
  // ============================================
  
  async getTournaments() {
    return this.request<any[]>('/api/tournaments');
  }

  async getTournament(id: string) {
    return this.request<any>(`/api/tournaments/${id}`);
  }

  async createTournament(tournament: any) {
    return this.request<any>('/api/tournaments', 'POST', tournament);
  }

  async updateTournament(id: string, updates: any) {
    return this.request<any>(`/api/tournaments/${id}`, 'PUT', updates);
  }

  async deleteTournament(id: string) {
    return this.request<void>(`/api/tournaments/${id}`, 'DELETE');
  }

  // ============================================
  // Matches
  // ============================================
  
  async getMatches(tournamentId?: string) {
    const query = tournamentId ? `?tournament_id=${tournamentId}` : '';
    return this.request<any[]>(`/api/matches${query}`);
  }

  async getMatch(id: string) {
    return this.request<any>(`/api/matches/${id}`);
  }

  async createMatch(match: any) {
    return this.request<any>('/api/matches', 'POST', match);
  }

  async updateMatch(id: string, updates: any) {
    return this.request<any>(`/api/matches/${id}`, 'PUT', updates);
  }

  async deleteMatch(id: string) {
    return this.request<void>(`/api/matches/${id}`, 'DELETE');
  }

  // ============================================
  // Match Events
  // ============================================
  
  async getMatchEvents(matchId: string) {
    return this.request<any[]>(`/api/matches/${matchId}/events`);
  }

  async createMatchEvent(matchId: string, event: any) {
    return this.request<any>(`/api/matches/${matchId}/events`, 'POST', event);
  }

  async deleteMatchEvent(matchId: string, eventId: string) {
    return this.request<void>(`/api/matches/${matchId}/events/${eventId}`, 'DELETE');
  }

  // ============================================
  // Users & Auth
  // ============================================
  
  async signIn(email: string, password: string) {
    return this.request<{ user: any; token: string }>('/api/auth/signin', 'POST', { email, password });
  }

  async signUp(email: string, password: string, name: string) {
    return this.request<{ user: any; token: string }>('/api/auth/signup', 'POST', { email, password, name });
  }

  async getUser(id: string) {
    return this.request<any>(`/api/users/${id}`);
  }

  async updateUserRole(id: string, role: string) {
    return this.request<any>(`/api/users/${id}/role`, 'PUT', { role });
  }

  async getAllUsers() {
    return this.request<any[]>('/api/users');
  }

  // ============================================
  // Reports
  // ============================================
  
  async generateReport(tournamentData: any) {
    return this.request<{ report: string }>('/api/reports/generate', 'POST', tournamentData);
  }
}

// Export singleton instance
export const azureDb = new AzureDatabaseClient(AZURE_API_URL);

/**
 * PostgreSQL Connection String für Backend-Services
 * 
 * Verwende diesen String in Azure Functions oder Node.js Backend:
 * 
 * const connectionString = `
 *   host=tknpostgre.postgres.database.azure.com
 *   port=5432
 *   dbname=TVS
 *   user=tknapp_db
 *   password=****
 *   sslmode=require
 * `;
 */

