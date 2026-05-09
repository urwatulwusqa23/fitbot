# FitBot (FYP Health Assistant)

FitBot is a full-stack health and fitness assistant. It combines a **React** web app with an **ASP.NET Core 8** API, **SQL Server** for persistence, and optional **Python** microservices for **image-based BMI estimation** and **server-side pose / motion analysis** (MediaPipe, ONNX on the .NET side where used).

## Features

- **Authentication** — Email/username and password (BCrypt), JWT sessions, optional **Google** sign-in (`@react-oauth/google`; requires `REACT_APP_GOOGLE_CLIENT_ID` in the frontend).
- **User profile & onboarding** — Health-related profile data and BMI log history.
- **AI chat** — Backend routes requests through **Google Gemini**, **Groq**, or **OpenAI** in that order (first available key wins). Replies are tailored using the user’s profile when logged in. Chat is persisted per session; users can save **diet** and **exercise** plans and use **deep memory** key–value store for long-term context.
- **YouTube video catalog** — CRUD in the app; a **background job** (`VideoDiscoveryJob`) periodically discovers new fitness videos by topic; the **YouTube Data API** is used when `ApiKeys:YouTube` is set.
- **Exercise analyzer** — Pick a reference exercise video, then the app uses **TensorFlow.js MoveNet** in the browser and compares motion to a reference, with optional backend **motion** processing (Python **FastAPI** + MediaPipe) for YouTube-based reference analysis.
- **BMI** — Manual calculator in the UI; **optional** full-body image analysis via a **Flask** app (`BMI_Server`) with DenseNet (if `best_bmi_model.pt` is present) or MediaPipe fallback.
- **Admin dashboard** — UI at `/admin` with API stats (admin role hardening in code is a TODO: see `AdminController` comments).

## Repository layout

```
FYP-Health-Assistant/
├── backend#/FitBot.Api/     # ASP.NET Core Web API (C#) — project folder is literally named "backend#"
├── frontend/                 # Create React App (JavaScript/JSX)
├── BMI_Server/              # Flask API for /predict-bmi (port 5050 in BMICalculator)
└── fitbot-pose-service/     # FastAPI + MediaPipe pose pipeline (default http://localhost:8000)
```

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) (LTS recommended) and npm
- [SQL Server LocalDB](https://learn.microsoft.com/sql/database-engine/configure-sql/sql-express-localdb) or another SQL Server instance the connection string can target
- **Python 3.10+** (for optional BMI and pose services) with `pip`

## Configuration

### Database

Default connection in `backend#/FitBot.Api/appsettings.json` uses **LocalDB**:

`Server=(localdb)\MSSQLLocalDB;Database=FitBot;Trusted_Connection=True;...`

After editing the connection string, apply the schema (from `backend#/FitBot.Api`):

#For nuget Package Manager
```bash
Add-Migration MigrationName
Update-Database

OR
dotnet ef database update
```

*(Requires the EF Core tools: `dotnet tool install --global dotnet-ef` if you do not have them.)*

### API secrets (backend)

Add **user secrets** (recommended) or extend `appsettings.Development.json` (do not commit real keys):

| Key | Purpose |
|-----|--------|
| `Jwt:Key` | Long random string for signing JWTs (default in repo is for development only) |
| `ApiKeys:Gemini` | Google Generative Language API (Gemini) |
| `ApiKeys:Groq` | Groq OpenAI-compatible API |
| `ApiKeys:OpenAI` | OpenAI API |
| `ApiKeys:YouTube` | YouTube Data API v3 (video search / discovery) |

At least one AI key should be set for the chat to work. Without a YouTube key, discovery and external search that depend on it are limited or skipped.

**Python pose service URL** — `PoseService` reads `PythonService:BaseUrl` (defaults to `http://localhost:8000`). Add to configuration if the service runs elsewhere.

**Visual BMI (optional alternate)** — `VisualBmi:BaseUrl` exists in `appsettings.json`; the current React `BMICalculator` uses `http://localhost:5050` for the Flask `BMI_Server` by default. Align these if you change ports.

### Frontend

- `frontend/.env.development` can set `REACT_APP_API_URL` (e.g. `https://localhost:7176/api`). The bundled `api.js` also uses a fixed base `http://localhost:5076/api` — use one consistent approach and matching **CORS** in the API.
- CORS in `Program.cs` allows `http://localhost:3000` for the dev server. If you use a different origin or only HTTPS, update the policy.
- `REACT_APP_GOOGLE_CLIENT_ID` — set to enable Google login buttons.

### Google OAuth (backend)

Google ID token validation uses `Google.Apis.Auth` in the user service. Ensure the OAuth client in Google Cloud matches your app’s origins and the backend is reachable from the browser (HTTPS often required in production).

## Run locally

### 1. API (`FitBot.Api`)

From `backend#/FitBot.Api`:

```bash
dotnet run
```

- **HTTP:** `http://localhost:5076` (see `Properties/launchSettings.json`)
- **HTTPS:** `https://localhost:7176`
- **Swagger** (Development): `/swagger`

HTTPS redirect is **disabled** in `Program.cs` to avoid local shutdown issues; adjust for production.

### 2. React app

From `frontend`:

```bash
npm install
npm start
```

App runs at `http://localhost:3000`. The `package.json` `proxy` is set to `https://localhost:7176/` for CRA proxying; ensure the API port/profile matches how you run the API.

### 3. Optional: Flask BMI server

From `BMI_Server` (see `bmi_api.py` header for dependencies — e.g. `flask`, `flask_cors`, `torch`/`opencv` as needed):

```bash
python bmi_api.py
```

Serves `POST /predict-bmi` on the port used in the React component (default **5050**). Place `best_bmi_model.pt` and MediaPipe task files as described in that script for full functionality.

### 4. Optional: FastAPI pose service

From `fitbot-pose-service` (use `requirements.txt`):

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Main API areas

| Area | Base route (examples) |
|------|------------------------|
| Auth | `POST /api/auth/login`, `register`, `google`, `forgot-password` |
| Profile | `GET/POST /api/profile/...` (Bearer token) |
| Chat | `POST /api/chat/message`, history, save plans, memory, liked videos |
| Video | `GET/POST /api/video`, `seed` |
| Motion / pose | `POST /api/motion/analyze`, `GET /api/motion/pattern/{id}` |
| Tags (synonyms / stop words) | `/api/tags/...` |
| Admin | `GET /api/admin/stats` (harden for production) |

## Tech stack (summary)

| Layer | Technology |
|-------|------------|
| Web UI | React 18, React Router, Redux Toolkit, Bootstrap, TensorFlow.js + pose-detection (MoveNet) |
| API | ASP.NET Core 8, Entity Framework Core, JWT, Swagger, ImageSharp, ONNX Runtime |
| Data | SQL Server (EF Core migrations in `Migrations/`) |
| AI chat | HTTP clients to Gemini / Groq / OpenAI from `ChatService` |
| Media | YouTube search, background discovery, `yt_dlp` in Python service |

## Security notes

- Replace the default `Jwt:Key` and use strong secrets in production.
- Do not commit API keys; use [User Secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets) or environment variables.
- Tighten CORS, enable HTTPS, and protect admin routes before any public deployment.

## License

No license file is included in this repository. Add a `LICENSE` file and project terms as appropriate for your final-year project or organization.
