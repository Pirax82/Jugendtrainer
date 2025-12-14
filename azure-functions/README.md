# Jugendtrainer API - Azure Functions

REST API Backend für die Jugendtrainer App, gehostet auf Azure Functions.

## API Endpoints

### Authentifizierung
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/api/auth/signup` | Registrierung |
| POST | `/api/auth/signin` | Anmeldung |
| GET | `/api/auth/me` | Aktueller User |

### Teams
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/teams` | Alle Teams |
| GET | `/api/teams/:id` | Team Details |
| POST | `/api/teams` | Team erstellen |
| PUT | `/api/teams/:id` | Team aktualisieren |
| DELETE | `/api/teams/:id` | Team löschen |

### Spieler
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/players?team_id=` | Alle Spieler |
| POST | `/api/players` | Spieler erstellen |
| PUT | `/api/players/:id` | Spieler aktualisieren |
| DELETE | `/api/players/:id` | Spieler löschen |

### Turniere
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/tournaments` | Alle Turniere |
| GET | `/api/tournaments/:id` | Turnier Details |
| POST | `/api/tournaments` | Turnier erstellen |
| PUT | `/api/tournaments/:id` | Turnier aktualisieren |
| DELETE | `/api/tournaments/:id` | Turnier löschen |

### Spiele
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/matches?tournament_id=` | Alle Spiele |
| GET | `/api/matches/:id` | Spiel Details |
| POST | `/api/matches` | Spiel erstellen |
| PUT | `/api/matches/:id` | Spiel aktualisieren |
| DELETE | `/api/matches/:id` | Spiel löschen |
| GET | `/api/matches/:id/events` | Events eines Spiels |
| POST | `/api/matches/:id/events` | Event hinzufügen |
| DELETE | `/api/matches/:id/events/:eventId` | Event löschen |

### Benutzer (nur Admin)
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/users` | Alle Benutzer |
| PUT | `/api/users/:id/role` | Rolle ändern |
| PUT | `/api/users/:id/teams` | Teams zuweisen |

### Berichte
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/api/reports/generate` | KI-Bericht generieren |

## Lokale Entwicklung

```bash
# Dependencies installieren
npm install

# Azure Functions Core Tools installieren
npm install -g azure-functions-core-tools@4

# Lokal starten
npm start
```

Die API läuft dann unter `http://localhost:7071/api/`

## Deployment zu Azure

### 1. Azure Resources erstellen

```bash
# Azure CLI Login
az login

# Resource Group erstellen
az group create --name jugendtrainer-rg --location westeurope

# Function App erstellen
az functionapp create \
  --resource-group jugendtrainer-rg \
  --consumption-plan-location westeurope \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --name jugendtrainer-api \
  --storage-account jugendtrainerstorage
```

### 2. Umgebungsvariablen konfigurieren

```bash
az functionapp config appsettings set \
  --name jugendtrainer-api \
  --resource-group jugendtrainer-rg \
  --settings \
    PG_HOST=tknpostgre.postgres.database.azure.com \
    PG_DATABASE=TVS \
    PG_USER=tknapp_db \
    PG_PASSWORD=*** \
    PG_PORT=5432 \
    PG_SSL=true \
    JWT_SECRET=your-secret-key \
    OPENAI_API_KEY=your-openai-key
```

### 3. Deployen

```bash
# Build
npm run build

# Deploy
func azure functionapp publish jugendtrainer-api
```

## Architektur

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│   App       │────▶│  Azure Functions │────▶│ Azure PostgreSQL  │
│  (Expo)     │     │     (Node.js)    │     │   (Database)      │
└─────────────┘     └──────────────────┘     └───────────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │   OpenAI     │
                    │   (Reports)  │
                    └──────────────┘
```

## Authentifizierung

- JWT-basierte Authentifizierung
- Token wird bei `/api/auth/signin` zurückgegeben
- Token im `Authorization: Bearer <token>` Header senden
- Rollen: ADMIN > TRAINER > ZUSCHAUER

## Umgebungsvariablen

| Variable | Beschreibung |
|----------|--------------|
| `PG_HOST` | PostgreSQL Host |
| `PG_DATABASE` | Datenbankname |
| `PG_USER` | Datenbankbenutzer |
| `PG_PASSWORD` | Datenbankpasswort |
| `PG_PORT` | Port (default: 5432) |
| `PG_SSL` | SSL aktivieren (true/false) |
| `JWT_SECRET` | Secret für JWT-Signierung |
| `OPENAI_API_KEY` | OpenAI API Key für Berichte |

