import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireTrainer } from '../lib/auth';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * POST /api/reports/generate - KI-Spielbericht generieren
 */
async function generateReport(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireTrainer(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    if (!OPENAI_API_KEY) {
      return { status: 500, jsonBody: { error: 'OpenAI API Key nicht konfiguriert' } };
    }

    const body = await request.json() as any;
    const { tournamentData } = body;

    if (!tournamentData) {
      return { status: 400, jsonBody: { error: 'tournamentData erforderlich' } };
    }

    const { tournament, matches, topScorers, stats, allParticipants, specialNotes } = tournamentData;

    // Build prompt
    const prompt = buildPrompt(tournament, matches, topScorers, stats, allParticipants, specialNotes);

    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Du bist ein professioneller Sportjournalist, der Spielberichte für Jugendfußball (G-/F-Jugend) schreibt. Dein Ton ist neutral-positiv, vereinsnah und familienfreundlich. Du verwendest keine Nachnamen der Gegner und konzentrierst dich auf die Leistung des eigenen Teams.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      context.error('OpenAI error:', error);
      return { status: 500, jsonBody: { error: 'Fehler bei der Berichterstellung' } };
    }

    const data = await response.json() as any;
    const report = data.choices[0].message.content;

    return {
      jsonBody: { report },
    };
  } catch (error: any) {
    context.error('GenerateReport error:', error);
    return { status: 500, jsonBody: { error: 'Fehler bei der Berichterstellung' } };
  }
}

function buildPrompt(tournament: any, matches: any[], topScorers: any[], stats: any, allParticipants?: any[], specialNotes?: string): string {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  let prompt = `Schreibe einen Turnierbericht für das folgende Jugendfußball-Turnier:\n\n`;

  // Tournament info
  prompt += `**Turnier:** ${tournament.name}\n`;
  prompt += `**Ort:** ${tournament.ort}\n`;
  prompt += `**Datum:** ${formatDate(tournament.datum)}\n`;
  if (tournament.wetter) {
    prompt += `**Wetter:** ${tournament.wetter}\n`;
  }
  prompt += `\n`;

  // Teams info
  const teamsInTournament = new Map<string, { trainer?: string }>();
  matches.forEach((match: any) => {
    if (match.teamName && !teamsInTournament.has(match.teamName)) {
      teamsInTournament.set(match.teamName, { trainer: match.teamTrainer });
    }
  });

  if (teamsInTournament.size > 0) {
    prompt += `**Teilnehmende Teams:**\n`;
    teamsInTournament.forEach((info, teamName) => {
      prompt += `- ${teamName}`;
      if (info.trainer) prompt += ` (Trainer: ${info.trainer})`;
      prompt += `\n`;
    });
    prompt += `\n`;
  }

  // Participants
  if (allParticipants && allParticipants.length > 0) {
    prompt += `**Alle Teilnehmer am Turnier:**\n`;
    allParticipants.forEach((p: any) => {
      prompt += `- ${p.name}`;
      if (p.goals > 0) prompt += ` (${p.goals} Tore)`;
      prompt += `\n`;
    });
    prompt += `\n`;
  }

  // Stats
  prompt += `**Gesamtbilanz:**\n`;
  prompt += `- ${stats.completedMatches} Spiele absolviert\n`;
  prompt += `- ${stats.wins} Siege, ${stats.draws} Unentschieden, ${stats.losses} Niederlagen\n`;
  prompt += `- ${stats.totalGoalsScored} Tore erzielt, ${stats.totalGoalsConceded} Gegentore\n\n`;

  // Match results
  prompt += `**Spielergebnisse:**\n`;
  matches.forEach((match: any, i: number) => {
    prompt += `${i + 1}. ${match.teamName} vs ${match.gegnerName}: ${match.score.heim}:${match.score.gegner}`;
    if (match.scorers?.length > 0) {
      const scorerNames = match.scorers.map((s: any) => `${s.name} (${s.minute}')`).join(', ');
      prompt += ` | Tore: ${scorerNames}`;
    }
    prompt += `\n`;
  });
  prompt += `\n`;

  // Top scorers
  if (topScorers.length > 0) {
    prompt += `**Torschützenliste:**\n`;
    topScorers.slice(0, 5).forEach((s: any, i: number) => {
      prompt += `${i + 1}. ${s.name}: ${s.goals} Tor${s.goals !== 1 ? 'e' : ''}\n`;
    });
    prompt += `\n`;
  }

  prompt += `Erstelle einen kurzen Turnierbericht (300-400 Wörter) mit:\n`;
  prompt += `1. Kreative Überschrift\n`;
  prompt += `2. Kurzes Intro\n`;
  prompt += `3. Erwähnung aller Spieler\n`;
  prompt += `4. Spielergebnisse\n`;
  prompt += `5. Torschützenliste\n`;
  prompt += `6. Positives Fazit\n\n`;

  // Special notes from trainer - placed at the end with HIGH PRIORITY
  if (specialNotes && specialNotes.trim()) {
    prompt += `⚠️ WICHTIG - BESONDERE ANMERKUNGEN VOM TRAINER (MÜSSEN VOLLSTÄNDIG IM BERICHT ERWÄHNT WERDEN):\n`;
    prompt += `"${specialNotes.trim()}"\n\n`;
    prompt += `Diese Anmerkungen des Trainers sind sehr wichtig und MÜSSEN prominent und vollständig im Bericht berücksichtigt werden. Baue alle genannten Punkte in den Fließtext ein.\n`;
  }

  return prompt;
}

/**
 * POST /api/reports/season - KI-Saisonbericht generieren
 */
async function generateSeasonReport(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireTrainer(request);
    if ('error' in auth) {
      return { status: auth.status, jsonBody: { error: auth.error } };
    }

    if (!OPENAI_API_KEY) {
      return { status: 500, jsonBody: { error: 'OpenAI API Key nicht konfiguriert' } };
    }

    const body = await request.json() as any;
    const { team, period, tournaments, stats, topScorers, specialNotes } = body;

    if (!team || !stats) {
      return { status: 400, jsonBody: { error: 'Team und Stats erforderlich' } };
    }

    // Build season report prompt
    const prompt = buildSeasonPrompt(team, period, tournaments, stats, topScorers, specialNotes);

    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Du bist ein professioneller Sportjournalist, der Saisonberichte für Jugendfußball (G-/F-Jugend) schreibt. Dein Ton ist neutral-positiv, vereinsnah und familienfreundlich. Du fasst die Entwicklung der Mannschaft über den Zeitraum zusammen und hebst positive Aspekte hervor.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      context.error('OpenAI error:', error);
      return { status: 500, jsonBody: { error: 'Fehler bei der Berichterstellung' } };
    }

    const data = await response.json() as any;
    const report = data.choices[0].message.content;

    return {
      jsonBody: { report },
    };
  } catch (error: any) {
    context.error('GenerateSeasonReport error:', error);
    return { status: 500, jsonBody: { error: 'Fehler bei der Berichterstellung' } };
  }
}

function buildSeasonPrompt(team: any, period: string, tournaments: any[], stats: any, topScorers: any[], specialNotes?: string): string {
  let prompt = `Schreibe einen Saisonbericht für die folgende Jugendfußball-Mannschaft:\n\n`;

  // Team info
  prompt += `**Mannschaft:** ${team.name}\n`;
  if (team.jahrgang) {
    prompt += `**Jahrgang:** ${team.jahrgang}\n`;
  }
  prompt += `**Berichtszeitraum:** ${period}\n\n`;

  // Overall stats
  prompt += `**Gesamtbilanz:**\n`;
  prompt += `- ${stats.totalMatches} Spiele absolviert (${stats.completedMatches} beendet)\n`;
  prompt += `- ${stats.wins} Siege, ${stats.draws} Unentschieden, ${stats.losses} Niederlagen\n`;
  prompt += `- Siegquote: ${stats.winRate}%\n`;
  prompt += `- ${stats.goalsScored} Tore erzielt, ${stats.goalsConceded} Gegentore\n`;
  prompt += `- Torverhältnis: ${stats.goalsScored > stats.goalsConceded ? '+' : ''}${stats.goalsScored - stats.goalsConceded}\n\n`;

  // Tournaments
  if (tournaments && tournaments.length > 0) {
    prompt += `**Teilgenommene Turniere (${tournaments.length}):**\n`;
    tournaments.forEach((t: any) => {
      prompt += `- ${t.name} am ${t.date} (${t.matchCount} Spiele)\n`;
    });
    prompt += `\n`;
  }

  // Top scorers
  if (topScorers && topScorers.length > 0) {
    prompt += `**Top-Torschützen der Saison:**\n`;
    topScorers.slice(0, 5).forEach((s: any, i: number) => {
      prompt += `${i + 1}. ${s.name}: ${s.goals} Tor${s.goals !== 1 ? 'e' : ''} in ${s.matches} Spielen\n`;
    });
    prompt += `\n`;
  }

  prompt += `Erstelle einen Saisonbericht (400-500 Wörter) mit:\n`;
  prompt += `1. Kreative Überschrift die den Zeitraum widerspiegelt\n`;
  prompt += `2. Einleitung mit Überblick über den Berichtszeitraum\n`;
  prompt += `3. Zusammenfassung der Turnierteilnahmen\n`;
  prompt += `4. Analyse der Spielbilanz und Entwicklung\n`;
  prompt += `5. Würdigung der Top-Torschützen\n`;
  prompt += `6. Positiver Ausblick und Fazit\n`;
  prompt += `\nDer Bericht soll motivierend und würdigend sein, geeignet für Eltern und Vereinszeitung.\n\n`;

  // Special notes from trainer - placed at the end with HIGH PRIORITY
  if (specialNotes && specialNotes.trim()) {
    prompt += `⚠️ WICHTIG - BESONDERE ANMERKUNGEN VOM TRAINER (MÜSSEN VOLLSTÄNDIG IM BERICHT ERWÄHNT WERDEN):\n`;
    prompt += `"${specialNotes.trim()}"\n\n`;
    prompt += `Diese Anmerkungen des Trainers sind sehr wichtig und MÜSSEN prominent und vollständig im Bericht berücksichtigt werden. Baue alle genannten Punkte in den Fließtext ein.\n`;
  }

  return prompt;
}

// Register functions
app.http('generateReport', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'reports/generate',
  handler: generateReport,
});

app.http('generateSeasonReport', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'reports/season',
  handler: generateSeasonReport,
});

