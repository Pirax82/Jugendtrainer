import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { query, queryOne, insert, update, remove } from '../lib/database';
import { requireTrainer } from '../lib/auth';

interface Match {
  id: string;
  tournament_id: string;
  team_id: string;
  gegner_name: string;
  start_zeit?: number;
  dauer_min: number;
  feld?: string;
  status: string;
  end_zeit?: number;
  formation?: any;
  created_at: string;
}

interface MatchEvent {
  id: string;
  match_id: string;
  typ: string;
  player_id?: string;
  spielminute: number;
  timestamp: number;
  meta?: any;
}

/**
 * GET /api/matches - Alle Spiele (optional nach Turnier filtern)
 */
async function getMatches(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const tournamentId = request.query.get('tournament_id');

    let matches: Match[];
    if (tournamentId) {
      matches = await query<Match>(
        'SELECT * FROM matches WHERE tournament_id = $1 ORDER BY created_at DESC',
        [tournamentId]
      );
    } else {
      matches = await query<Match>('SELECT * FROM matches ORDER BY created_at DESC');
    }

    return {
      jsonBody: matches.map(m => ({
        id: m.id,
        tournamentId: m.tournament_id,
        teamId: m.team_id,
        gegnerName: m.gegner_name,
        startZeit: m.start_zeit,
        dauerMin: m.dauer_min,
        feld: m.feld,
        status: m.status,
        endZeit: m.end_zeit,
        formation: m.formation,
        createdAt: new Date(m.created_at).getTime(),
      })),
    };
  } catch (error: any) {
    context.error('GetMatches error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Abrufen der Spiele' } };
  }
}

/**
 * GET /api/matches/:id - Einzelnes Spiel
 */
async function getMatch(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    const match = await queryOne<Match>('SELECT * FROM matches WHERE id = $1', [id]);

    if (!match) {
      return { status: 404, jsonBody: { error: 'Spiel nicht gefunden' } };
    }

    return {
      jsonBody: {
        id: match.id,
        tournamentId: match.tournament_id,
        teamId: match.team_id,
        gegnerName: match.gegner_name,
        startZeit: match.start_zeit,
        dauerMin: match.dauer_min,
        feld: match.feld,
        status: match.status,
        endZeit: match.end_zeit,
        formation: match.formation,
        createdAt: new Date(match.created_at).getTime(),
      },
    };
  } catch (error: any) {
    context.error('GetMatch error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Abrufen des Spiels' } };
  }
}

/**
 * POST /api/matches - Spiel erstellen
 */
async function createMatch(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireTrainer(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    const body = await request.json() as any;
    const { tournamentId, teamId, gegnerName, dauerMin, feld, status, formation } = body;

    if (!tournamentId || !teamId || !gegnerName) {
      return { status: 400, jsonBody: { error: 'TournamentId, TeamId und GegnerName erforderlich' } };
    }

    const match = await insert<Match>('matches', {
      tournament_id: tournamentId,
      team_id: teamId,
      gegner_name: gegnerName,
      dauer_min: dauerMin || 10,
      feld,
      status: status || 'GEPLANT',
      formation: formation ? JSON.stringify(formation) : null,
    });

    return {
      status: 201,
      jsonBody: {
        id: match.id,
        tournamentId: match.tournament_id,
        teamId: match.team_id,
        gegnerName: match.gegner_name,
        dauerMin: match.dauer_min,
        feld: match.feld,
        status: match.status,
        formation: match.formation,
        createdAt: new Date(match.created_at).getTime(),
      },
    };
  } catch (error: any) {
    context.error('CreateMatch error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Erstellen des Spiels' } };
  }
}

/**
 * PUT /api/matches/:id - Spiel aktualisieren
 */
async function updateMatch(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireTrainer(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    const id = request.params.id;
    const body = await request.json() as any;

    const updates: any = {};
    if (body.gegnerName !== undefined) updates.gegner_name = body.gegnerName;
    if (body.startZeit !== undefined) updates.start_zeit = body.startZeit;
    if (body.dauerMin !== undefined) updates.dauer_min = body.dauerMin;
    if (body.feld !== undefined) updates.feld = body.feld;
    if (body.status !== undefined) updates.status = body.status;
    if (body.endZeit !== undefined) updates.end_zeit = body.endZeit;
    if (body.formation !== undefined) updates.formation = JSON.stringify(body.formation);

    const match = await update<Match>('matches', id, updates);

    if (!match) {
      return { status: 404, jsonBody: { error: 'Spiel nicht gefunden' } };
    }

    return {
      jsonBody: {
        id: match.id,
        tournamentId: match.tournament_id,
        teamId: match.team_id,
        gegnerName: match.gegner_name,
        startZeit: match.start_zeit,
        dauerMin: match.dauer_min,
        feld: match.feld,
        status: match.status,
        endZeit: match.end_zeit,
        formation: match.formation,
        createdAt: new Date(match.created_at).getTime(),
      },
    };
  } catch (error: any) {
    context.error('UpdateMatch error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Aktualisieren des Spiels' } };
  }
}

/**
 * DELETE /api/matches/:id - Spiel löschen
 */
async function deleteMatch(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireTrainer(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    const id = request.params.id;

    // Lösche zuerst alle Events
    await query('DELETE FROM match_events WHERE match_id = $1', [id]);

    // Lösche Spiel
    await remove('matches', id);

    return { status: 204 };
  } catch (error: any) {
    context.error('DeleteMatch error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Löschen des Spiels' } };
  }
}

/**
 * GET /api/matches/:id/events - Events eines Spiels
 */
async function getMatchEvents(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const matchId = request.params.id;
    const events = await query<MatchEvent>(
      'SELECT * FROM match_events WHERE match_id = $1 ORDER BY timestamp ASC',
      [matchId]
    );

    return {
      jsonBody: events.map(e => ({
        id: e.id,
        matchId: e.match_id,
        typ: e.typ,
        playerId: e.player_id,
        spielminute: e.spielminute,
        timestamp: e.timestamp,
        meta: e.meta,
      })),
    };
  } catch (error: any) {
    context.error('GetMatchEvents error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Abrufen der Events' } };
  }
}

/**
 * POST /api/matches/:id/events - Event hinzufügen
 */
async function createMatchEvent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireTrainer(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    const matchId = request.params.id;
    const body = await request.json() as any;
    const { typ, playerId, spielminute, meta } = body;

    if (!typ || spielminute === undefined) {
      return { status: 400, jsonBody: { error: 'Typ und Spielminute erforderlich' } };
    }

    const event = await insert<MatchEvent>('match_events', {
      match_id: matchId,
      typ,
      player_id: playerId,
      spielminute,
      timestamp: Date.now(),
      meta: meta ? JSON.stringify(meta) : null,
    });

    return {
      status: 201,
      jsonBody: {
        id: event.id,
        matchId: event.match_id,
        typ: event.typ,
        playerId: event.player_id,
        spielminute: event.spielminute,
        timestamp: event.timestamp,
        meta: event.meta,
      },
    };
  } catch (error: any) {
    context.error('CreateMatchEvent error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Erstellen des Events' } };
  }
}

/**
 * DELETE /api/matches/:matchId/events/:eventId - Event löschen
 */
async function deleteMatchEvent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireTrainer(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    const eventId = request.params.eventId;
    await remove('match_events', eventId);

    return { status: 204 };
  } catch (error: any) {
    context.error('DeleteMatchEvent error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Löschen des Events' } };
  }
}

// Register functions
app.http('getMatches', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'matches',
  handler: getMatches,
});

app.http('getMatch', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'matches/{id}',
  handler: getMatch,
});

app.http('createMatch', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'matches',
  handler: createMatch,
});

app.http('updateMatch', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'matches/{id}',
  handler: updateMatch,
});

app.http('deleteMatch', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'matches/{id}',
  handler: deleteMatch,
});

app.http('getMatchEvents', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'matches/{id}/events',
  handler: getMatchEvents,
});

app.http('createMatchEvent', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'matches/{id}/events',
  handler: createMatchEvent,
});

app.http('deleteMatchEvent', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'matches/{matchId}/events/{eventId}',
  handler: deleteMatchEvent,
});

