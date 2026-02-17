# MicroFlow Architect

## Overview
A specialized visualization tool for microservices architecture. It renders complex service interactions, queues, and databases based on architectural definitions and uses Google Gemini AI to analyze the system flow and generate diagrams from text descriptions.

## Recent Changes
- 2026-02-17: Initial Replit setup — configured Vite for port 5000, removed CDN importmap in favor of bundled dependencies, set up deployment.

## Project Architecture
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (via CDN script tag)
- **Diagram Library**: React Flow v11
- **AI Integration**: Google Gemini (`@google/genai`) — requires `API_KEY` environment variable
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
- `API_KEY` — Google Gemini API key (optional, needed for AI features)

## User Preferences
- Language: Portuguese (Brazilian) for UI text
