import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { query, queryOne, insert, update, remove } from '../lib/database';
import { requireTrainer } from '../lib/auth';

interface Player {
  id: string;
  team_id: string;
  name: string;
  nummer?: number;
  foto_url?: string;
  aktiv: boolean;
  created_at: string;
}

/**
 * GET /api/players - Alle Spieler (optional nach Team filtern)
 */
async function getPlayers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const teamId = request.query.get('team_id');
    
    let players: Player[];
    if (teamId) {
      players = await query<Player>(
        'SELECT * FROM players WHERE team_id = $1 ORDER BY created_at DESC',
        [teamId]
      );
    } else {
      players = await query<Player>('SELECT * FROM players ORDER BY created_at DESC');
    }

    return {
      jsonBody: players.map(p => ({
        id: p.id,
        teamId: p.team_id,
        name: p.name,
        nummer: p.nummer,
        fotoUrl: p.foto_url,
        aktiv: p.aktiv,
        createdAt: new Date(p.created_at).getTime(),
      })),
    };
  } catch (error: any) {
    context.error('GetPlayers error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Abrufen der Spieler' } };
  }
}

/**
 * POST /api/players - Spieler erstellen
 */
async function createPlayer(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireTrainer(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    const body = await request.json() as any;
    const { teamId, name, nummer, fotoUrl, aktiv } = body;

    if (!teamId || !name) {
      return { status: 400, jsonBody: { error: 'TeamId und Name erforderlich' } };
    }

    const player = await insert<Player>('players', {
      team_id: teamId,
      name,
      nummer,
      foto_url: fotoUrl,
      aktiv: aktiv ?? true,
    });

    return {
      status: 201,
      jsonBody: {
        id: player.id,
        teamId: player.team_id,
        name: player.name,
        nummer: player.nummer,
        fotoUrl: player.foto_url,
        aktiv: player.aktiv,
        createdAt: new Date(player.created_at).getTime(),
      },
    };
  } catch (error: any) {
    context.error('CreatePlayer error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Erstellen des Spielers' } };
  }
}

/**
 * PUT /api/players/:id - Spieler aktualisieren
 */
async function updatePlayer(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireTrainer(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    const id = request.params.id;
    const body = await request.json() as any;

    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.nummer !== undefined) updates.nummer = body.nummer;
    if (body.fotoUrl !== undefined) updates.foto_url = body.fotoUrl;
    if (body.aktiv !== undefined) updates.aktiv = body.aktiv;

    const player = await update<Player>('players', id, updates);

    if (!player) {
      return { status: 404, jsonBody: { error: 'Spieler nicht gefunden' } };
    }

    return {
      jsonBody: {
        id: player.id,
        teamId: player.team_id,
        name: player.name,
        nummer: player.nummer,
        fotoUrl: player.foto_url,
        aktiv: player.aktiv,
        createdAt: new Date(player.created_at).getTime(),
      },
    };
  } catch (error: any) {
    context.error('UpdatePlayer error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Aktualisieren des Spielers' } };
  }
}

/**
 * DELETE /api/players/:id - Spieler löschen
 */
async function deletePlayer(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireTrainer(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    const id = request.params.id;
    await remove('players', id);

    return { status: 204 };
  } catch (error: any) {
    context.error('DeletePlayer error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Löschen des Spielers' } };
  }
}

// Register functions
app.http('getPlayers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'players',
  handler: getPlayers,
});

app.http('createPlayer', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'players',
  handler: createPlayer,
});

app.http('updatePlayer', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'players/{id}',
  handler: updatePlayer,
});

app.http('deletePlayer', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'players/{id}',
  handler: deletePlayer,
});

