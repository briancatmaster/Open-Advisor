# OpenAdvisor — UMich AI Degree Advisor

AI-powered academic planning for University of Michigan students. Upload your degree audit, set your career goals, and get a personalized course pathway with a built-in AI advisor.

---

## Setup

**1. Install dependencies**
```bash
npm install
```

**2. Add your API key**

Open `.env.local` and fill in your OpenRouter key:
```
OPENROUTER_API_KEY=sk-or-...
DEFAULT_MODEL=openai/gpt-4o-mini
```

To swap models later, just change `DEFAULT_MODEL` — no code changes needed. Any model on [openrouter.ai/models](https://openrouter.ai/models) works.

**3. Run the dev server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## App Flow

| Step | URL | What happens |
|------|-----|-------------|
| 1 | `/` | Landing page |
| 2 | `/upload` | Upload your degree audit PDF (Wolverine Access → Student Records → Degree Audit → Save as PDF) |
| 3 | `/profile` | Enter year, major, home school/program, career goal, AP/transfer credits |
| 4 | `/dashboard` | Course recommendations + semester planner + AI advisor |

---

## Course Database

The app now uses a single curated source:

- `courses_master.db` (Atlas-style schema from data mining pipeline)

Normalized API rows now also include:
```
source, atlas_url, prereq_hard_codes, prereq_advisory_text, top_degrees
```

---

## Project Structure

```
app/
  page.tsx              # Landing
  upload/page.tsx       # Audit upload
  profile/page.tsx      # Profile builder
  dashboard/page.tsx    # Main 3-panel dashboard
  api/
    parse-audit/        # POST: PDF → course list
    courses/            # GET: search + ranked recommendations
    advise/             # POST: streaming chat (OpenRouter)

lib/
  claude.ts             # OpenRouter client + system prompt builder
  store.ts              # Zustand global state
  audit-parser.ts       # PDF → taken/remaining courses
  course-ranker.ts      # Scoring algorithm
  db.ts                 # SQLite (better-sqlite3)
  types.ts              # Shared TypeScript interfaces

courses_master.db       # Curated Atlas-style source used by app/runtime
schema.md               # Human-readable schema reference for agent context
```

---

## Build

```bash
npm run build
npm start
```
