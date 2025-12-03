<div align="center">  
  <h1>Doraemon Paper Comicizer</h1>
  <p><strong>Turn dense academic PDFs into kid-friendly Doraemon comics powered by Gemini 3 Pro via OpenRouter.</strong></p>
  <p>    
    <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white">
    <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white">
  </p>
  <p>
    <a href="./README.md">English</a> |
    <a href="./README.zh.md">中文</a> |
    <a href="./README.ja.md">日本語</a>
  </p>
</div>

## Table of contents
- [Overview](#overview)
- [Demo](#demo)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment variables](#environment-variables)
  - [Run locally](#run-locally)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
- [Available scripts](#available-scripts)
- [Troubleshooting](#troubleshooting)
- [Star history](#star-history)

## Overview
**Paper Comicizer** ingests any academic PDF, asks Gemini 3 Pro to summarize the core ideas, plans a Doraemon-themed lesson, and renders every page of the lesson as a comic strip. The UI focuses on clarity: upload a file, monitor three workflow stages (analyze → plan → generate), and browse the generated comic with thumbnails and page navigation.

## Screenshot
<img width="897" height="472" alt="chrome_2025-11-28_14-20-29" src="https://github.com/user-attachments/assets/94c72fff-ba18-43b1-8d5a-cf83eec20acd" />


## Features
- 📄 **PDF ingestion** – drag-and-drop upload converts any PDF to base64 before sending it to OpenRouter’s Gemini endpoints.
- 🤖 **Multi-step reasoning** – Gemini (via OpenRouter) analyzes the paper, plans the narrative, and renders each panel.
- 🎨 **Live comic rendering** – each generated page appears immediately in the Comic Viewer with full-size previews and thumbnails.
- 🔐 **Env-based key management** – surfaces missing/invalid OpenRouter keys with a friendly onboarding panel.
- ⚙️ **Service layer** – `services/geminiService.ts` centralizes prompt templates, OpenRouter payloads, and typed responses.
- 🧠 **Typed workflow state** – `AppStatus`, `ProcessingState`, and `ComicPage` keep the UI predictable and resilient.

## Tech stack
| Layer | Details |
| --- | --- |
| Front-end | React 19 + TypeScript, Vite 6 |
| Styling | Utility classes (Tailwind-style) with playful fonts and gradients |
| AI | OpenRouter Responses API (Gemini 3 Pro text + image models) |
| Build | Vite dev server, static export-ready |

## Getting started

### Prerequisites
- **Node.js 18.18+** (Vite 6 requires modern Node runtimes)
- npm 9+ (comes with recent Node releases)
- An **OpenRouter API key** (https://openrouter.ai/) with access to `google/gemini-3-pro-preview` and `google/gemini-3-pro-image-preview`

### Installation
```bash
# clone your fork, then:
cd Paper-Comicizer
npm install
```

### Environment variables
Create a `.env.local` file with your OpenRouter credentials (only the API key is strictly required):
```bash
OPENROUTER_API_KEY="sk-or-..."
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
MODEL_LOGIC="google/gemini-3-pro-preview"
MODEL_IMAGE="google/gemini-3-pro-image-preview"
APP_URL="http://localhost:3000"         # Used for the HTTP-Referer header
APP_TITLE="AGI比特君 论文转漫画"    # Shows up in OpenRouter dashboards
```

### Run locally
```bash
npm run dev
```
Open the printed localhost URL. Upload a PDF and watch the progress indicator walk through the three stages.

To create an optimized production build:
```bash
npm run build
npm run preview      # optional: serve the dist folder locally
```

## Project structure
```
.
├── App.tsx                 # App workflow coordinator (upload → progress → viewer)
├── components/
│   ├── FileUpload.tsx      # Drag-and-drop area + PDF validation
│   ├── ProgressBar.tsx     # Stage-aware progress + errors
│   └── ComicViewer.tsx     # Thumbnail navigator & page viewer
├── services/
│   └── geminiService.ts    # OpenRouter helpers for analyze, plan, render
├── constants.ts            # Prompt strings and shared model configuration
├── types.ts                # Strong typing for app status and comic pages
├── metadata.json           # AI Studio metadata for deployment
└── vite.config.ts          # Vite + React plugin setup
```

## How it works
1. **Validate key** – The app ensures `OPENROUTER_API_KEY` is configured and warns when the OpenRouter request fails for auth reasons.
2. **Analyze** – `analyzePaper` sends the PDF (base64 data URL) to Gemini 3 Pro via OpenRouter for summarization.
3. **Plan** – `planStory` requests a JSON plan that breaks the topic into kid-friendly scenes.
4. **Generate** – For each plan step, `generateComicPage` calls the OpenRouter image modality and streams progress back to the UI.
5. **Review** – `ComicViewer` displays full-resolution images with captions so you can retell the paper to younger audiences.

## Available scripts
| Script | Description |
| --- | --- |
| `npm run dev` | Start Vite in development mode with HMR |
| `npm run build` | Bundle the app for production |
| `npm run preview` | Preview the production build locally |

## Troubleshooting
- **"OpenRouter API Key Required" panel** – Add `OPENROUTER_API_KEY` to `.env.local`, restart `npm run dev`, then reload the browser tab.
- **401/UNAUTHENTICATED errors** – Double-check the key value, `HTTP-Referer` (`APP_URL`), and whether the chosen model is enabled for your OpenRouter account.
- **Stuck on analysis** – Large PDFs can exceed token limits; trim the document or summarize the paper manually before uploading.
- **Blank images** – Re-run the workflow or verify `MODEL_IMAGE` points to an image-capable Gemini model.

## Star history
[![Star History Chart](https://api.star-history.com/svg?repos=redreamality/Paper-Comicizer&type=Date)](https://star-history.com/#redreamality/Paper-Comicizer&Date)

Happy comicizing! 🎨📚
