import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { query, queryOne, insert, update, remove } from '../lib/database';
import { requireTrainer, requireAuth } from '../lib/auth';

interface Team {
  id: string;
  name: string;
  jahrgang?: string;
  trainer?: string;
  trikot_farbe?: string;
  logo_url?: string;
  formation?: any;
  created_at: string;
}

/**
 * GET /api/teams - Alle Teams
 */
async function getTeams(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const teams = await query<Team>('SELECT * FROM teams ORDER BY created_at DESC');
    
    return {
      jsonBody: teams.map(t => ({
        id: t.id,
        name: t.name,
        jahrgang: t.jahrgang,
        trainer: t.trainer,
        trikotFarbe: t.trikot_farbe,
        logoUrl: t.logo_url,
        formation: t.formation,
        createdAt: new Date(t.created_at).getTime(),
      })),
    };
  } catch (error: any) {
    context.error('GetTeams error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Abrufen der Teams' } };
  }
}

/**
 * GET /api/teams/:id - Einzelnes Team
 */
async function getTeam(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    const team = await queryOne<Team>('SELECT * FROM teams WHERE id = $1', [id]);
    
    if (!team) {
      return { status: 404, jsonBody: { error: 'Team nicht gefunden' } };
    }

    return {
      jsonBody: {
        id: team.id,
        name: team.name,
        jahrgang: team.jahrgang,
        trainer: team.trainer,
        trikotFarbe: team.trikot_farbe,
        logoUrl: team.logo_url,
        formation: team.formation,
        createdAt: new Date(team.created_at).getTime(),
      },
    };
  } catch (error: any) {
    context.error('GetTeam error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Abrufen des Teams' } };
  }
}

/**
 * POST /api/teams - Team erstellen
 */
async function createTeam(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireTrainer(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    const body = await request.json() as any;
    const { name, jahrgang, trainer, trikotFarbe, logoUrl, formation } = body;

    if (!name) {
      return { status: 400, jsonBody: { error: 'Name erforderlich' } };
    }

    const team = await insert<Team>('teams', {
      name,
      jahrgang,
      trainer,
      trikot_farbe: trikotFarbe,
      logo_url: logoUrl,
      formation: formation ? JSON.stringify(formation) : null,
    });

    return {
      status: 201,
      jsonBody: {
        id: team.id,
        name: team.name,
        jahrgang: team.jahrgang,
        trainer: team.trainer,
        trikotFarbe: team.trikot_farbe,
        logoUrl: team.logo_url,
        formation: team.formation,
        createdAt: new Date(team.created_at).getTime(),
      },
    };
  } catch (error: any) {
    context.error('CreateTeam error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Erstellen des Teams' } };
  }
}

/**
 * PUT /api/teams/:id - Team aktualisieren
 */
async function updateTeam(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireTrainer(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    const id = request.params.id;
    const body = await request.json() as any;
    
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.jahrgang !== undefined) updates.jahrgang = body.jahrgang;
    if (body.trainer !== undefined) updates.trainer = body.trainer;
    if (body.trikotFarbe !== undefined) updates.trikot_farbe = body.trikotFarbe;
    if (body.logoUrl !== undefined) updates.logo_url = body.logoUrl;
    if (body.formation !== undefined) updates.formation = JSON.stringify(body.formation);

    const team = await update<Team>('teams', id, updates);
    
    if (!team) {
      return { status: 404, jsonBody: { error: 'Team nicht gefunden' } };
    }

    return {
      jsonBody: {
        id: team.id,
        name: team.name,
        jahrgang: team.jahrgang,
        trainer: team.trainer,
        trikotFarbe: team.trikot_farbe,
        logoUrl: team.logo_url,
        formation: team.formation,
        createdAt: new Date(team.created_at).getTime(),
      },
    };
  } catch (error: any) {
    context.error('UpdateTeam error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Aktualisieren des Teams' } };
  }
}

/**
 * DELETE /api/teams/:id - Team löschen
 */
async function deleteTeam(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireTrainer(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    const id = request.params.id;
    await remove('teams', id);

    return { status: 204 };
  } catch (error: any) {
    context.error('DeleteTeam error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Löschen des Teams' } };
  }
}

// Register functions
app.http('getTeams', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'teams',
  handler: getTeams,
});

app.http('getTeam', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'teams/{id}',
  handler: getTeam,
});

app.http('createTeam', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'teams',
  handler: createTeam,
});

app.http('updateTeam', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'teams/{id}',
  handler: updateTeam,
});

app.http('deleteTeam', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'teams/{id}',
  handler: deleteTeam,
});

