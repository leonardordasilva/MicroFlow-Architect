# MicroFlow Architect

## Overview
A specialized visualization tool for microservices architecture. It renders complex service interactions, queues, and databases based on architectural definitions and uses Google Gemini AI to analyze the system flow and generate diagrams from text descriptions.

## Recent Changes
- 2026-02-17: Initial Replit setup — configured Vite for port 5000, removed CDN importmap in favor of bundled dependencies, set up deployment.
- 2026-02-17: Integrated Replit AI Integrations for Gemini — no user API key needed, updated model to gemini-2.5-flash.
- 2026-02-17: Added Express backend (server.ts) to proxy Gemini API calls from frontend. Frontend calls /api/* which Vite proxies to localhost:3001 in dev. In production, Express serves static files on port 5000.

## Project Architecture
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (via CDN script tag)
- **Diagram Library**: React Flow v11
- **AI Integration**: Google Gemini (`@google/genai`) via Replit AI Integrations (no user API key needed)
- **Export**: html-to-image for PNG export

### Directory Structure
```
/                    - Root project files
├── App.tsx          - Main application component
├── index.tsx        - React entry point
├── index.html       - HTML template
├── constants.ts     - Initial nodes/edges and defaults
├── types.ts         - TypeScript type definitions
├── vite.config.ts   - Vite configuration (port 5000, all hosts allowed)
├── components/      - React components
│   ├── AnalysisPanel.tsx
│   ├── ConfirmationModal.tsx
│   ├── CustomEdge.tsx
│   ├── CustomNode.tsx
│   ├── NameModal.tsx
│   ├── QuantityModal.tsx
│   └── TextToDiagramModal.tsx
└── services/
    └── geminiService.ts  - Gemini AI integration
```

### Environment Variables
- `AI_INTEGRATIONS_GEMINI_API_KEY` — Auto-configured by Replit AI Integrations
- `AI_INTEGRATIONS_GEMINI_BASE_URL` — Auto-configured by Replit AI Integrations
- Vite injects these at build time via `process.env.API_KEY` and `process.env.GEMINI_BASE_URL`

## User Preferences
- Language: Portuguese (Brazilian) for UI text
