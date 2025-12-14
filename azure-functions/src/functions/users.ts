import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { query, queryOne, update, insert, remove } from '../lib/database';
import { requireAdmin, User, hashPassword } from '../lib/auth';

/**
 * GET /api/users - Alle Benutzer (nur Admin)
 */
async function getUsers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    const users = await query<User>(
      'SELECT id, email, name, role, team_ids, created_at, last_login FROM users ORDER BY created_at DESC'
    );

    return {
      jsonBody: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        teamIds: u.team_ids || [],
        createdAt: new Date(u.created_at).getTime(),
        lastLogin: u.last_login ? new Date(u.last_login).getTime() : undefined,
      })),
    };
  } catch (error: any) {
    context.error('GetUsers error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Abrufen der Benutzer' } };
  }
}

/**
 * PUT /api/users/:id/role - Benutzerrolle ändern (nur Admin)
 */
async function updateUserRole(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    const id = request.params.id;
    const body = await request.json() as { role: string };

    if (!['ADMIN', 'TRAINER', 'ZUSCHAUER'].includes(body.role)) {
      return { status: 400, jsonBody: { error: 'Ungültige Rolle' } };
    }

    const user = await update<User>('users', id, { role: body.role });

    if (!user) {
      return { status: 404, jsonBody: { error: 'Benutzer nicht gefunden' } };
    }

    return {
      jsonBody: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamIds: user.team_ids || [],
      },
    };
  } catch (error: any) {
    context.error('UpdateUserRole error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Aktualisieren der Rolle' } };
  }
}

/**
 * PUT /api/users/:id/teams - Teams zuweisen (nur Admin)
 */
async function updateUserTeams(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    const id = request.params.id;
    const body = await request.json() as { teamIds: string[] };

    if (!Array.isArray(body.teamIds)) {
      return { status: 400, jsonBody: { error: 'teamIds muss ein Array sein' } };
    }

    // Format as PostgreSQL array
    const teamIdsArray = `{${body.teamIds.join(',')}}`;

    const user = await update<User>('users', id, { team_ids: teamIdsArray });

    if (!user) {
      return { status: 404, jsonBody: { error: 'Benutzer nicht gefunden' } };
    }

    return {
      jsonBody: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamIds: user.team_ids || [],
      },
    };
  } catch (error: any) {
    context.error('UpdateUserTeams error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Aktualisieren der Teams' } };
  }
}

/**
 * POST /api/users - Benutzer erstellen (nur Admin)
 */
async function createUser(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    const body = await request.json() as { email: string; name: string; password: string; role?: string };
    const { email, name, password, role } = body;

    if (!email || !name || !password) {
      return { status: 400, jsonBody: { error: 'Email, Name und Passwort erforderlich' } };
    }

    // Check if email already exists
    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing) {
      return { status: 409, jsonBody: { error: 'Email bereits registriert' } };
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userRole = role && ['ADMIN', 'TRAINER', 'ZUSCHAUER'].includes(role) ? role : 'ZUSCHAUER';
    const user = await insert<User>('users', {
      email: email.toLowerCase(),
      password_hash: passwordHash,
      name,
      role: userRole,
      team_ids: '{}',
    });

    if (!user) {
      return { status: 500, jsonBody: { error: 'Benutzer konnte nicht erstellt werden' } };
    }

    context.log('User created by admin:', { userId: user.id, email: user.email });

    return {
      status: 201,
      jsonBody: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamIds: user.team_ids || [],
        createdAt: new Date(user.created_at).getTime(),
      },
    };
  } catch (error: any) {
    context.error('CreateUser error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Erstellen des Benutzers' } };
  }
}

/**
 * DELETE /api/users/:id - Benutzer löschen (nur Admin)
 */
async function deleteUser(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    const id = request.params.id;

    // Prevent deleting yourself
    if (String(auth.user.id) === String(id)) {
      return { status: 400, jsonBody: { error: 'Du kannst dich nicht selbst löschen' } };
    }

    // Check if user exists
    const user = await queryOne<User>('SELECT * FROM users WHERE id = $1', [id]);
    if (!user) {
      return { status: 404, jsonBody: { error: 'Benutzer nicht gefunden' } };
    }

    // Delete user
    await remove('users', id);

    context.log('User deleted by admin:', { userId: id, email: user.email });

    return { status: 204 };
  } catch (error: any) {
    context.error('DeleteUser error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Löschen des Benutzers' } };
  }
}

// Register functions
app.http('getUsers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users',
  handler: getUsers,
});

app.http('createUser', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'users',
  handler: createUser,
});

app.http('deleteUser', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'users/{id}',
  handler: deleteUser,
});

app.http('updateUserRole', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'users/{id}/role',
  handler: updateUserRole,
});

app.http('updateUserTeams', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'users/{id}/teams',
  handler: updateUserTeams,
});

