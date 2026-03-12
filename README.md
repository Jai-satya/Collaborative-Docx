# Collaborative Docx

A premium collaborative document editor built for clarity, elegance, and real-time teamwork. Featuring rich typography, live cursors, version history, and a distraction-free writing experience.

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)
![TipTap](https://img.shields.io/badge/TipTap-2.11-1a1a2e)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)

---

## Features

### Editor

- **Rich Text Editing** — Bold, italic, underline, strikethrough, superscript, subscript, headings (H1–H6), blockquotes, code blocks, horizontal rules
- **Text Alignment** — Left, center, right, and justify
- **Text Styling** — Font color, highlight, text transform (uppercase/lowercase/capitalize)
- **Lists** — Ordered, unordered, and interactive task lists with checkboxes
- **Tables** — Insert and edit tables with configurable rows, columns, and header rows
- **Links** — Insert, edit, and remove hyperlinks with a popover UI
- **Typography** — Smart quotes, em dashes, and typographic enhancements powered by TipTap

### Collaboration

- **Real-Time Sync** — Content updates broadcast instantly via Supabase Realtime channels
- **Live Cursors** — See collaborators' cursor positions in real time
- **User Presence** — Active user avatars shown in the document header
- **Document Sharing** — Generate share links with view or edit permissions
- **Password Protection** — Optionally password-protect shared documents
- **Comments** — Thread-based commenting on documents

### Productivity

- **Find & Replace** — Search with regex and case-sensitive matching (`Ctrl+Shift+H`)
- **Document Outline** — Auto-generated heading navigation for long documents
- **Writing Goals** — Set word count targets and track streaks
- **Word Frequency** — Bar chart of the top 20 most-used words
- **Pomodoro Timer** — Built-in 25/5/15 timer in the status bar
- **Keyboard Shortcuts** — Comprehensive reference panel accessible from the status bar

### Writing Modes

- **Focus Mode** — Dims non-active paragraphs (`Ctrl+Shift+F`)
- **Typewriter Mode** — Keeps the current line centered on screen (`Ctrl+Shift+T`)
- **Zen Mode** — Full-screen, distraction-free writing

### Document Management

- **Version History** — Snapshots saved to database on manual save; preview, compare, and restore any version
- **Export** — Download or copy as HTML, Markdown, Plain Text, or JSON
- **Auto-Save** — Content synced on every edit with debounced saves
- **Manual Save** — `Ctrl+S` or the Save button to explicitly save and create a version snapshot

### SEO & Performance

- **Dynamic Meta Tags** — Per-page title, description, Open Graph, and Twitter Card tags via `react-helmet-async`
- **Structured Data** — JSON-LD schema for WebApplication
- **robots.txt & Sitemap** — Proper crawl directives for public and private routes
- **Canonical URLs** — Automatic canonical link tags on every page

---

## Tech Stack

| Layer         | Technology                                   |
| ------------- | -------------------------------------------- |
| **Framework** | React 18.3 + TypeScript 5.5                  |
| **Build**     | Vite 5.4 (SWC)                               |
| **Editor**    | TipTap 2.11 with 17+ extensions              |
| **Styling**   | Tailwind CSS 3.4 + Shadcn UI + Framer Motion |
| **Backend**   | Supabase (Auth, PostgreSQL, Realtime, RLS)   |
| **State**     | TanStack React Query 5                       |
| **Routing**   | React Router 6                               |
| **SEO**       | react-helmet-async                           |
| **Charts**    | Recharts                                     |

---

## Database Schema

```
documents          — id, title, content, created_by, status, parent_id, is_template
comments           — id, document_id, content, created_by
document_shares    — id, document_id, share_token, permission_level, password_hash
document_versions  — id, document_id, content, word_count, char_count, created_by
```

All tables use **Row Level Security (RLS)** — users can only access their own documents and documents shared with them.

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** or **bun**
- A [Supabase](https://supabase.com) project

### 1. Clone the repository

```bash
git clone https://github.com/your-username/Collaborative-Docx.git
cd Collaborative-Docx
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### 4. Set up the database

Option A — Using Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

Option B — Run the migration SQL files manually in the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql):

- `supabase/migrations/20260306172511_*.sql`
- `supabase/migrations/20260312000000_create_document_versions.sql`

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project Structure

```
src/
├── components/
│   ├── ui/              # Shadcn UI primitives
│   ├── DocumentEditor   # Core TipTap editor with toolbar and status bar
│   ├── EditorToolbar    # Formatting buttons adn panel toggles
│   ├── EditorStatusBar  # Word count, timer, mode indicators
│   ├── Comments         # Document commenting
│   ├── DocumentList     # Dashboard document grid
│   ├── DocumentShareDialog
│   ├── ExportDocument   # Multi-format export
│   ├── FindReplace      # Search and replace
│   ├── KeyboardShortcuts
│   ├── LinkInsert       # Hyperlink popover
│   ├── TableInsert      # Table configuration dialog
│   ├── VersionHistory   # Database-backed version snapshots
│   ├── WordFrequency    # Word usage analytics
│   ├── WritingGoals     # Word count goal tracking
│   ├── DocumentOutline  # Heading-based navigation
│   ├── RemoteCursors    # Real-time cursor rendering
│   ├── PomodoroTimer    # Focus timer
│   └── SEO              # Dynamic meta tags
├── pages/
│   ├── Index            # Landing page
│   ├── Auth             # Sign in / Sign up
│   ├── Dashboard        # Document management
│   ├── Document         # Editor view
│   ├── SharedDocument   # Shared document view
│   └── NotFound         # 404
├── hooks/               # Custom React hooks
├── utils/               # Helpers (cursor, password, version)
├── integrations/        # Supabase client and types
└── lib/                 # Utility functions
```

---

## Scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start development server |
| `npm run build`   | Production build         |
| `npm run preview` | Preview production build |
| `npm run lint`    | Run ESLint               |

---

## Keyboard Shortcuts

| Shortcut       | Action                         |
| -------------- | ------------------------------ |
| `Ctrl+S`       | Save document + create version |
| `Ctrl+Shift+F` | Toggle Focus Mode              |
| `Ctrl+Shift+H` | Toggle Find & Replace          |
| `Ctrl+Shift+T` | Toggle Typewriter Mode         |
| `Ctrl+B`       | Bold                           |
| `Ctrl+I`       | Italic                         |
| `Ctrl+U`       | Underline                      |
| `Ctrl+Shift+X` | Strikethrough                  |
| `Ctrl+Z`       | Undo                           |
| `Ctrl+Shift+Z` | Redo                           |
| `Escape`       | Exit Zen Mode                  |

---

## License

This project is open source under the [MIT License](LICENSE)..
