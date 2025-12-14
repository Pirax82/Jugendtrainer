import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { query, queryOne, insert, update } from '../lib/database';
import { hashPassword, verifyPassword, generateToken, User } from '../lib/auth';

/**
 * POST /api/auth/bootstrap - Erstes Admin-Konto anlegen (einmalig, token-protected)
 *
 * Sicherheit:
 * - Nur möglich wenn noch KEIN Admin existiert
 * - Erfordert BOOTSTRAP_TOKEN (Function App Setting) und bootstrapToken im Body
 */
async function bootstrapAdmin(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const bootstrapSecret = process.env.BOOTSTRAP_TOKEN;
    const body = await request.json() as { email?: string; password?: string; name?: string; bootstrapToken?: string };
    const email = (body.email || '').trim();
    const password = (body.password || '').trim();
    const name = (body.name || '').trim();
    const bootstrapToken = (body.bootstrapToken || '').trim();

    if (!bootstrapSecret) {
      return { status: 501, jsonBody: { error: 'BOOTSTRAP_TOKEN ist nicht konfiguriert' } };
    }

    if (!bootstrapToken || bootstrapToken !== bootstrapSecret) {
      return { status: 403, jsonBody: { error: 'Ungültiges Bootstrap-Token' } };
    }

    if (!email) {
      return { status: 400, jsonBody: { error: 'Email erforderlich' } };
    }

    // Only allow if no ADMIN exists yet
    const existingAdmin = await queryOne('SELECT id FROM users WHERE role = $1 LIMIT 1', ['ADMIN']);
    if (existingAdmin) {
      return { status: 409, jsonBody: { error: 'Bootstrap nicht möglich (Admin existiert bereits)' } };
    }

    const emailLower = email.toLowerCase();
    const existing = await queryOne<User & { password_hash?: string }>('SELECT * FROM users WHERE email = $1', [emailLower]);

    // If the user already exists (e.g. you registered in the app), promote that account to ADMIN.
    // This is still safe because:
    // - it only runs when NO ADMIN exists
    // - it still requires BOOTSTRAP_TOKEN
    //
    // Security/usability:
    // - For existing users we do NOT require password/name (avoids leaking credentials via curl).
    // - For creating the very first ADMIN user from scratch, password + name are required.
    let user: User | null = null;
    if (existing) {
      user = await update<User>('users', existing.id, {
        email: emailLower,
        ...(name ? { name } : {}),
        role: 'ADMIN',
      });
    } else {
      if (!password || !name) {
        return { status: 400, jsonBody: { error: 'Passwort und Name erforderlich, um den ersten Admin anzulegen' } };
      }
      const passwordHash = await hashPassword(password);
      user = await insert<User>('users', {
        email: emailLower,
        password_hash: passwordHash,
        name,
        role: 'ADMIN',
        team_ids: '{}',
      });
    }

    if (!user) {
      if (existing) {
        return { status: 500, jsonBody: { error: 'Bootstrap fehlgeschlagen (Update returned null)' } };
      }
      return { status: 500, jsonBody: { error: 'Bootstrap fehlgeschlagen' } };
    }

    const token = generateToken(user);

    context.log('Bootstrap admin ensured:', { userId: user.id, existingUser: !!existing });

    return {
      status: 201,
      jsonBody: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          teamIds: user.team_ids || [],
        },
        token,
      },
    };
  } catch (error: any) {
    context.error('BootstrapAdmin error:', error);
    return { status: 500, jsonBody: { error: 'Bootstrap fehlgeschlagen' } };
  }
}

/**
 * POST /api/auth/signup - Registrierung
 */
async function signUp(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = await request.json() as { email: string; password: string; name: string };
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return { status: 400, jsonBody: { error: 'Email, Passwort und Name erforderlich' } };
    }

    // Prüfe ob Email bereits existiert
    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing) {
      return { status: 409, jsonBody: { error: 'Email bereits registriert' } };
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Erstelle User (startet als ZUSCHAUER)
    const user = await insert<User>('users', {
      email: email.toLowerCase(),
      password_hash: passwordHash,
      name,
      role: 'ZUSCHAUER',
      team_ids: '{}',
    });

    // Generate token
    const token = generateToken(user);

    return {
      status: 201,
      jsonBody: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          teamIds: user.team_ids || [],
        },
        token,
      },
    };
  } catch (error: any) {
    context.error('SignUp error:', error);
    return { status: 500, jsonBody: { error: 'Registrierung fehlgeschlagen' } };
  }
}

/**
 * POST /api/auth/signin - Anmeldung
 */
async function signIn(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = await request.json() as { email: string; password: string };
    const { email, password } = body;

    if (!email || !password) {
      return { status: 400, jsonBody: { error: 'Email und Passwort erforderlich' } };
    }

    // Finde User
    const user = await queryOne<User & { password_hash: string }>(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (!user || !user.password_hash) {
      return { status: 401, jsonBody: { error: 'Ungültige Anmeldedaten' } };
    }

    // Verifiziere Passwort
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return { status: 401, jsonBody: { error: 'Ungültige Anmeldedaten' } };
    }

    // Update last_login
    await update('users', user.id, { last_login: new Date().toISOString() });

    // Generate token
    const token = generateToken(user);

    return {
      jsonBody: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          teamIds: user.team_ids || [],
        },
        token,
      },
    };
  } catch (error: any) {
    context.error('SignIn error:', error);
    return { status: 500, jsonBody: { error: 'Anmeldung fehlgeschlagen' } };
  }
}

/**
 * GET /api/auth/me - Aktueller User
 */
async function getMe(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const { getAuthUser } = await import('../lib/auth');
    const user = await getAuthUser(request);

    if (!user) {
      return { status: 401, jsonBody: { error: 'Nicht authentifiziert' } };
    }

    return {
      jsonBody: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          teamIds: user.team_ids || [],
          createdAt: user.created_at ? new Date(user.created_at).getTime() : Date.now(),
          lastLogin: user.last_login ? new Date(user.last_login).getTime() : undefined,
        },
      },
    };
  } catch (error: any) {
    context.error('GetMe error:', error);
    return { status: 500, jsonBody: { error: 'Fehler beim Abrufen des Benutzers' } };
  }
}

// Register functions
app.http('authSignUp', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/signup',
  handler: signUp,
});

app.http('authSignIn', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/signin',
  handler: signIn,
});

app.http('authMe', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'auth/me',
  handler: getMe,
});

app.http('authBootstrap', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/bootstrap',
  handler: bootstrapAdmin,
});

