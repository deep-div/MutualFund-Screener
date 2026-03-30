
# Mutual Fund Screener - Frontend

React + Vite + TypeScript frontend for the Mutual Fund Screener project.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- Firebase Auth

## Prerequisites

- Node.js 18+ (recommended)
- npm

## Environment Variables

Create `frontend/.env`:

```env
VITE_FIREBASE_API_KEY="<firebase-api-key>"
VITE_FIREBASE_AUTH_DOMAIN="<project>.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="<project-id>"
VITE_FIREBASE_STORAGE_BUCKET="<project>.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="<sender-id>"
VITE_FIREBASE_APP_ID="<app-id>"
VITE_FIREBASE_MEASUREMENT_ID="<measurement-id>"

VITE_API_BASE_URL="http://127.0.0.1:8000"
```

## Installation

```bash
cd frontend
npm install
```

## Run Locally

```bash
npm run dev
```

Dev server URL: `http://localhost:4000`  
The app expects backend API at `VITE_API_BASE_URL`.

## Scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run build:dev` - development-mode build
- `npm run preview` - preview production build
- `npm run lint` - run ESLint
- `npm run test` - run tests once (Vitest)
- `npm run test:watch` - run tests in watch mode

## Routes

- `/` - main screener view
- `/filters/:savedFilterId` - screener view with saved filter
- `/profile` - user profile/watchlist views
- `/:schemeSlug/:schemeId` - fund analytics page
