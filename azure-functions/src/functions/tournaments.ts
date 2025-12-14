import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { query, queryOne, insert, update, remove } from '../lib/database';
import { requireTrainer } from '../lib/auth';

interface Tournament {
  id: string;
  name: string;
  ort: string;
  datum: number;
  wetter?: string;
  import_quelle?: string;
  raw_import?: any;
  created_at: string;
}

/**
 * GET /api/tournaments - Alle Turniere
 */
async function getTournaments(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const tournaments = await query<Tournament>('SELECT * FROM tournaments ORDER BY created_at DESC');

    return {
      jsonBody: tournaments.map(t => ({
        id: t.id,
        name: t.name,
        ort: t.ort,
        datum: t.datum,
        wetter: t.wetter,
        importQuelle: t.import_quelle,
        rawImport: t.raw_import,
        createdAt: new Date(t.created_at).getTime(),
      })),
    };
  } catch (error: any) {
    context.error('GetTournaments error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Abrufen der Turniere' } };
  }
}

/**
 * GET /api/tournaments/:id - Einzelnes Turnier
 */
async function getTournament(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    const tournament = await queryOne<Tournament>('SELECT * FROM tournaments WHERE id = $1', [id]);

    if (!tournament) {
      return { status: 404, jsonBody: { error: 'Turnier nicht gefunden' } };
    }

    return {
      jsonBody: {
        id: tournament.id,
        name: tournament.name,
        ort: tournament.ort,
        datum: tournament.datum,
        wetter: tournament.wetter,
        importQuelle: tournament.import_quelle,
        rawImport: tournament.raw_import,
        createdAt: new Date(tournament.created_at).getTime(),
      },
    };
  } catch (error: any) {
    context.error('GetTournament error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Abrufen des Turniers' } };
  }
}

/**
 * POST /api/tournaments - Turnier erstellen
 */
async function createTournament(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireTrainer(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    const body = await request.json() as any;
    const { name, ort, datum, wetter, importQuelle, rawImport } = body;

    if (!name || !ort || !datum) {
      return { status: 400, jsonBody: { error: 'Name, Ort und Datum erforderlich' } };
    }

    const tournament = await insert<Tournament>('tournaments', {
      name,
      ort,
      datum,
      wetter,
      import_quelle: importQuelle || 'MANUAL',
      raw_import: rawImport ? JSON.stringify(rawImport) : null,
    });

    return {
      status: 201,
      jsonBody: {
        id: tournament.id,
        name: tournament.name,
        ort: tournament.ort,
        datum: tournament.datum,
        wetter: tournament.wetter,
        importQuelle: tournament.import_quelle,
        createdAt: new Date(tournament.created_at).getTime(),
      },
    };
  } catch (error: any) {
    context.error('CreateTournament error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Erstellen des Turniers' } };
  }
}

/**
 * PUT /api/tournaments/:id - Turnier aktualisieren
 */
async function updateTournament(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireTrainer(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    const id = request.params.id;
    const body = await request.json() as any;

    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.ort !== undefined) updates.ort = body.ort;
    if (body.datum !== undefined) updates.datum = body.datum;
    if (body.wetter !== undefined) updates.wetter = body.wetter;

    const tournament = await update<Tournament>('tournaments', id, updates);

    if (!tournament) {
      return { status: 404, jsonBody: { error: 'Turnier nicht gefunden' } };
    }

    return {
      jsonBody: {
        id: tournament.id,
        name: tournament.name,
        ort: tournament.ort,
        datum: tournament.datum,
        wetter: tournament.wetter,
        importQuelle: tournament.import_quelle,
        createdAt: new Date(tournament.created_at).getTime(),
      },
    };
  } catch (error: any) {
    context.error('UpdateTournament error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Aktualisieren des Turniers' } };
  }
}

/**
 * DELETE /api/tournaments/:id - Turnier löschen
 */
async function deleteTournament(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireTrainer(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    const id = request.params.id;

    // Lösche zuerst alle Events der Matches
    const matches = await query<{ id: string }>('SELECT id FROM matches WHERE tournament_id = $1', [id]);
    for (const match of matches) {
      await remove('match_events', match.id);
    }

    // Lösche Matches
    await query('DELETE FROM matches WHERE tournament_id = $1', [id]);

    // Lösche Turnier
    await remove('tournaments', id);

    return { status: 204 };
  } catch (error: any) {
    context.error('DeleteTournament error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Löschen des Turniers' } };
  }
}

// Register functions
app.http('getTournaments', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tournaments',
  handler: getTournaments,
});

app.http('getTournament', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tournaments/{id}',
  handler: getTournament,
});

app.http('createTournament', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'tournaments',
  handler: createTournament,
});

app.http('updateTournament', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'tournaments/{id}',
  handler: updateTournament,
});

app.http('deleteTournament', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'tournaments/{id}',
  handler: deleteTournament,
});

