# MeFirst - Personal Wellness Coaching App

MeFirst is a HIPAA-aware personal wellness coaching web application that connects users with certified wellness coaches through a guided onboarding experience. It supports two user roles — **patients** and **coaches** — and includes AI-powered wellness assistants for ongoing patient support between sessions.

## Key Features

### For Patients
- **Guided Onboarding**: Multi-step questionnaire covering wellness goals (multi-select), motivation, success vision, personal values wheel, and coaching style preferences
- **Coach Matching & Booking**: Browse real coaches, view availability, and book sessions with calendar integration
- **AI Wellness Assistants**: 5 specialty AI coaches (fitness, productivity, sleep, stress, general wellness) auto-assigned based on your goals, following NBHWC Scope of Practice with Motivational Interviewing (OARS) techniques
- **Proactive Check-ins**: Context-aware suggestion chips, 48-hour session reminders, and mid-conversation progress prompts
- **Values Wheel**: Visual self-assessment across 9 life areas with history tracking over time
- **HIPAA Consent Flow**: Privacy notice and session recording consent before accessing the dashboard
- **Profile Settings**: Manage display name, phone, profile picture, recording consent, and dark/light appearance

### For Coaches
- **Coach Registration**: Interactive 10-step onboarding (title, specialties, experience, certifications, session style, client types, max clients, superpower, bio)
- **Patient Management**: View assigned patients with profiles, questionnaire data, AI conversation summaries, and message counts
- **Session Notes**: Write notes per booking with AI-powered summarization into structured NBHWC coaching reports (agenda, tools & techniques, accountability, progress notes, values wheel updates)
- **AI Session Prep**: Auto-generated insights for upcoming sessions (key topics, concerns, wins, suggested talking points)
- **Availability Management**: Set weekly recurring time slots for patient bookings
- **Google Calendar Integration**: Per-coach OAuth2 for auto-creating calendar events with Google Meet links on booking approval
- **Booking Workflow**: Approve, decline, reschedule, or complete bookings with full status tracking

### AI Capabilities
- 5 specialty assistants aligned to common wellness goals
- Motivational Interviewing (MI) with OARS techniques in every conversation
- Barrier identification and problem-solving strategies
- Proactive homework follow-up and win celebration
- Conversation summaries auto-generated every 10 messages for coach review
- Session notes AI analysis into structured coaching reports
- Auto-updated values wheel based on session discussions

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite, TailwindCSS, Shadcn UI, Framer Motion |
| Backend | Express.js, PostgreSQL, Drizzle ORM |
| Authentication | Replit Auth (OpenID Connect) |
| AI | OpenAI GPT-4o-mini |
| Calendar | Google OAuth2 + googleapis |
| Fonts | Plus Jakarta Sans (body), Lora (headings) |
| Theme | Teal/sage wellness palette with dark mode support |

## Project Structure

```
src/
├── client/                  # React frontend
│   ├── src/
│   │   ├── pages/           # Route pages (dashboard, onboarding, booking, etc.)
│   │   ├── components/      # Reusable UI components (Shadcn-based)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities and query client
│   │   ├── App.tsx          # Route definitions
│   │   └── main.tsx         # Entry point
│   └── index.html
├── server/                  # Express backend
│   ├── routes.ts            # All API route handlers
│   ├── storage.ts           # Database access layer (IStorage interface)
│   ├── openai.ts            # AI assistant logic, MI prompts, session analysis
│   ├── google-calendar.ts   # Google Calendar OAuth & event creation
│   ├── seed.ts              # Database seeding (assistants)
│   ├── db.ts                # Database connection
│   └── replit_integrations/ # Auth integration
├── shared/                  # Shared types and schema
│   └── schema.ts            # Drizzle ORM schema + Zod validation
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── drizzle.config.ts
```

## User Roles

- **Patient** (default): Goes through onboarding, books sessions, chats with AI assistant, tracks progress
- **Coach**: Registers via `/coach-register`, manages availability, reviews patients, writes session notes

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` / `sessions` | Authentication (Replit Auth) |
| `user_profiles` | Role, goals, preferences, values wheel, consent, profile image |
| `questionnaires` | Goal motivation, success vision, about-you answers |
| `coaches` | Coach profiles with onboarding data |
| `coach_availability` | Weekly recurring time slots |
| `bookings` | Session bookings with status tracking and Google Meet links |
| `progress_entries` | Patient wellness check-ins |
| `google_tokens` | Per-coach Google OAuth tokens |
| `assistants` | AI assistant profiles and system prompts |
| `assistant_conversations` | Per-user chat history and summaries |
| `session_notes` | Per-booking coach notes with AI summaries |

## License

This project is open source. See [LICENSE](LICENSE) for details.
