# MeFirst - Local Deployment Guide

This guide covers how to set up and run MeFirst locally on your machine.

## Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- **PostgreSQL** v14 or higher (running locally or via a cloud provider)
- **OpenAI API Key** (for AI wellness assistants)
- **Google OAuth Credentials** (optional, for coach calendar integration)

## 1. Clone and Install

```bash
cd me-first/src
npm install
```

## 2. Set Up Environment Variables

Create a `.env` file in the `src/` directory with the following variables:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/mefirst
SESSION_SECRET=your-random-session-secret-here
OPENAI_API_KEY=your-openai-api-key

# Optional: Google Calendar integration for coaches
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Variable Details

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret for Express session signing (any random string) |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI assistants (uses GPT-4o-mini) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID for calendar integration |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |

## 3. Set Up the Database

Push the schema to your PostgreSQL database:

```bash
npm run db:push
```

This creates all required tables: `users`, `sessions`, `user_profiles`, `questionnaires`, `coaches`, `coach_availability`, `bookings`, `progress_entries`, `google_tokens`, `assistants`, `assistant_conversations`, and `session_notes`.

The application automatically seeds the AI assistant profiles on first startup.

## 4. Run the Application

Start the development server:

```bash
npm run dev
```

This starts both the Express backend and the Vite frontend dev server. The application will be available at:

```
http://localhost:5000
```

## 5. Authentication Setup

MeFirst uses Replit Auth (OpenID Connect) for authentication. When running outside of Replit:

- The authentication system relies on Replit's identity provider
- If deploying elsewhere, you will need to replace the auth integration in `server/replit_integrations/auth/` with your preferred authentication provider (e.g., Passport.js with local strategy, Auth0, Firebase Auth)

## 6. Google Calendar Integration (Optional)

To enable Google Calendar integration for coaches:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**
4. Create OAuth 2.0 credentials (Web Application type)
5. Set the authorized redirect URI to: `http://localhost:5000/api/auth/google/callback`
6. Add the Client ID and Client Secret to your `.env` file

Coaches can then connect their Google Calendar from the coach dashboard to auto-create calendar events with Google Meet links when approving bookings.

## Project Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (frontend + backend) |
| `npm run db:push` | Push schema changes to the database |

## Architecture Overview

```
Browser (React + Vite)
    │
    ▼
Express.js Server (port 5000)
    │
    ├── API Routes (/api/*)
    │     ├── Profile & Questionnaire
    │     ├── Coaches & Bookings
    │     ├── AI Assistant (OpenAI)
    │     ├── Session Notes
    │     └── Google Calendar OAuth
    │
    ├── Static File Serving (/uploads/*)
    │
    └── PostgreSQL (via Drizzle ORM)
```

## Troubleshooting

**Database connection fails:**
- Verify your `DATABASE_URL` is correct and PostgreSQL is running
- Ensure the database exists: `createdb mefirst`

**AI assistant not responding:**
- Check that `OPENAI_API_KEY` is set and valid
- The app uses the `gpt-4o-mini` model

**File uploads not working:**
- The `uploads/` directory is created automatically at the project root
- Ensure the process has write permissions to the directory

**Google Calendar not connecting:**
- Verify OAuth redirect URI matches your local URL exactly
- Check that the Google Calendar API is enabled in your Google Cloud project
