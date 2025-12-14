// Azure Functions API Client
const API_BASE_URL = 'https://jugendtrainer-api.azurewebsites.net/api';

// Token storage
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

// Generic fetch wrapper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    let parsedError: any = null;
    let bodySnippet: string | null = null;
    try {
      if (contentType.includes('application/json')) {
        parsedError = await response.json();
      } else {
        const txt = await response.text();
        bodySnippet = txt.slice(0, 250);
      }
    } catch {
      // ignore
    }

    const msg =
      (parsedError && (parsedError.error || parsedError.message)) ||
      (bodySnippet ? `HTTP ${response.status}: ${bodySnippet}` : `HTTP ${response.status}`);
    throw new Error(msg);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return await response.json();
}

// Auth API
export const authApi = {
  signIn: (email: string, password: string) =>
    apiFetch<{ token: string; user: any }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signUp: (email: string, password: string, name: string) =>
    apiFetch<{ token: string; user: any }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  me: () => apiFetch<{ user: any }>('/auth/me'),
};

// Teams API
export const teamsApi = {
  getAll: () => apiFetch<any[]>('/teams'),
  
  getById: (id: string) => apiFetch<any>(`/teams/${id}`),
  
  create: (data: any) =>
    apiFetch<any>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiFetch<any>(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/teams/${id}`, { method: 'DELETE' }),
};

// Players API
export const playersApi = {
  getAll: () => apiFetch<any[]>('/players'),

  create: (data: any) =>
    apiFetch<any>('/players', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiFetch<any>(`/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/players/${id}`, { method: 'DELETE' }),
};

// Tournaments API
export const tournamentsApi = {
  getAll: () => apiFetch<any[]>('/tournaments'),

  getById: (id: string) => apiFetch<any>(`/tournaments/${id}`),

  create: (data: any) =>
    apiFetch<any>('/tournaments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiFetch<any>(`/tournaments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/tournaments/${id}`, { method: 'DELETE' }),
};

// Matches API
export const matchesApi = {
  getAll: () => apiFetch<any[]>('/matches'),

  getById: (id: string) => apiFetch<any>(`/matches/${id}`),

  create: (data: any) =>
    apiFetch<any>('/matches', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiFetch<any>(`/matches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/matches/${id}`, { method: 'DELETE' }),

  // Events
  getEvents: (matchId: string) => apiFetch<any[]>(`/matches/${matchId}/events`),

  createEvent: (matchId: string, data: any) =>
    apiFetch<any>(`/matches/${matchId}/events`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteEvent: (matchId: string, eventId: string) =>
    apiFetch<void>(`/matches/${matchId}/events/${eventId}`, { method: 'DELETE' }),
};

// Users API
export const usersApi = {
  getAll: () => apiFetch<any[]>('/users'),

  create: (data: { email: string; name: string; password: string; role?: string }) =>
    apiFetch<any>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/users/${id}`, { method: 'DELETE' }),

  updateRole: (id: string, role: string) =>
    apiFetch<any>(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  updateTeams: (id: string, teamIds: string[]) =>
    apiFetch<any>(`/users/${id}/teams`, {
      method: 'PUT',
      body: JSON.stringify({ teamIds }),
    }),
};

// Reports API
export const reportsApi = {
  generate: (tournamentData: any) =>
    apiFetch<{ report: string }>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ tournamentData }),
    }),

  generateSeasonReport: (data: any) =>
    apiFetch<{ report: string }>('/reports/season', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
