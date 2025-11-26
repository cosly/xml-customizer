# XML Customizer

Een Cloudflare-gebaseerde applicatie voor het beheren van Kyero-formatted XML feeds met per-klant property selecties.

## Features

- **Feed Management**: Import en beheer externe Kyero/Tesoro XML feeds
- **Klant Management**: Maak klanten aan met unieke hash IDs
- **Property Selectie**: Selecteer per klant welke properties zichtbaar zijn
- **Unieke Endpoints**: Elke klant krijgt een unieke, moeilijk te raden URL
- **Multi-layer Caching**: Edge Cache → KV → D1/R2 voor optimale performance

## Tech Stack

- **Backend**: Cloudflare Workers + Hono (TypeScript)
- **Frontend**: SvelteKit + Cloudflare Pages
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (XML bestanden)
- **Cache**: Cloudflare KV

## Project Structuur

```
xml-customizer/
├── apps/
│   ├── api/          # Hono API Worker
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── middleware/
│   │   └── migrations/
│   └── web/          # SvelteKit Frontend
│       └── src/
│           ├── lib/
│           └── routes/
└── packages/
    └── shared/       # Gedeelde TypeScript types
```

## Installatie

### Vereisten

- Node.js 18+
- npm
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account

### 1. Clone en installeer dependencies

```bash
git clone <repo-url>
cd xml-customizer
npm install
```

### 2. Cloudflare Resources Aanmaken

Login bij Wrangler:
```bash
wrangler login
```

Maak D1 database aan:
```bash
cd apps/api
wrangler d1 create xml-customizer-db
```

Kopieer de database ID uit de output en update `apps/api/wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "xml-customizer-db"
database_id = "YOUR_ACTUAL_DATABASE_ID"
```

Maak R2 bucket aan:
```bash
wrangler r2 bucket create xml-customizer-feeds
```

Maak KV namespace aan:
```bash
wrangler kv:namespace create KV
```

Kopieer de namespace ID en update `apps/api/wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "KV"
id = "YOUR_ACTUAL_KV_NAMESPACE_ID"
```

### 3. Database Migraties

```bash
cd apps/api
wrangler d1 execute xml-customizer-db --file=./migrations/0001_initial.sql
```

### 4. Environment Variables

Maak `.env` aan in `apps/web/`:
```bash
cp apps/web/.env.example apps/web/.env
```

Update de waardes voor je omgeving.

## Development

### API Worker (backend)

```bash
npm run dev:api
```

De API draait op `http://localhost:8787`

### Web Frontend

```bash
npm run dev:web
```

De frontend draait op `http://localhost:5173`

### Beide tegelijk

```bash
npm run dev
```

## Deployment

### API Worker Deployen

Update productie variabelen in `apps/api/wrangler.toml`:
```toml
[env.production]
vars = {
  CORS_ORIGIN = "https://your-frontend.pages.dev",
  ADMIN_API_KEY = "generate-a-secure-key-here"
}
```

Deploy:
```bash
cd apps/api
wrangler deploy --env production
```

### Frontend Deployen

Update `apps/web/.env` met productie API URL:
```
VITE_API_URL=https://xml-customizer-api.your-account.workers.dev
VITE_API_KEY=your-production-api-key
```

Build en deploy:
```bash
cd apps/web
npm run deploy
```

Of via Cloudflare Pages dashboard:
1. Connect je GitHub repository
2. Build command: `npm run build`
3. Build output directory: `.svelte-kit/cloudflare`
4. Root directory: `apps/web`

## API Endpoints

### Admin Endpoints (vereisen X-API-Key header)

| Methode | Endpoint | Beschrijving |
|---------|----------|--------------|
| GET | `/api/customers` | Lijst alle klanten |
| GET | `/api/customers/:id` | Haal klant op met selecties |
| POST | `/api/customers` | Maak nieuwe klant |
| PUT | `/api/customers/:id` | Update klant |
| DELETE | `/api/customers/:id` | Verwijder klant |
| PUT | `/api/customers/:id/selections` | Update property selecties |
| GET | `/api/feeds` | Lijst alle feeds |
| GET | `/api/feeds/:id` | Haal feed details op |
| POST | `/api/feeds` | Voeg nieuwe feed toe |
| PUT | `/api/feeds/:id` | Update feed |
| DELETE | `/api/feeds/:id` | Verwijder feed |
| POST | `/api/feeds/:id/refresh` | Herlaad feed van bron |
| GET | `/api/feeds/:id/properties` | Haal properties uit feed |
| POST | `/api/feeds/:id/purge-cache` | Wis feed cache |

### Public Endpoint (geen authenticatie)

| Methode | Endpoint | Beschrijving |
|---------|----------|--------------|
| GET | `/feed/:hashId` | Haal gefilterde XML feed voor klant |
| GET | `/feed/:hashId?feed=:feedId` | Specifieke feed voor klant |

## Caching Strategie

De applicatie gebruikt een 3-laags caching strategie:

1. **Edge Cache** (CF-Cache-Control): 5 minuten voor publieke feeds
2. **KV Cache**: 10 minuten voor vaak opgevraagde data
3. **R2 Storage**: Permanente opslag van bron XML

Cache invalidatie gebeurt automatisch bij:
- Property selectie wijzigingen
- Feed refresh
- Handmatige cache purge

## Security

- Admin endpoints zijn beveiligd met API key authenticatie
- Klant feed URLs gebruiken cryptografisch willekeurige hash IDs
- CORS is geconfigureerd voor specifieke origins
- Input validatie op alle endpoints

## License

MIT
