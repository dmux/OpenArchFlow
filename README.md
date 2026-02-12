# OpenArchFlow

OpenArchFlow is an open-source Progressive Web App (PWA) designed for software architects and DevOps professionals. It allows you to generate interactive AWS architecture diagrams from text prompts using AI, following official AWS visual standards.

## Features

- **Zero-Login:** No account required. Start designing immediately.
- **Local-First:** Diagrams are saved locally in your browser (`localStorage`/`IndexedDB`). No centralized database.
- **Hybrid Editing:** AI generates the initial draft, but you have full control to drag, connect, and modify components.
- **Dual AI Engine:** 
  - **Cloud:** Google Gemini (optimized for latency).
  - **Local:** WebLLM (runs entirely in your browser via WebGPU) for privacy and offline capability.
- **AWS Conformity:** Uses AWS Documentation MCP to ensure up-to-date service recommendations and best practices.

## Tech Stack

- **Framework:** Next.js 16+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Diagramming:** React Flow + elkjs (Auto-layout)
- **State Management:** Zustand
- **AI:** Google Gemini / WebLLM

## Getting Started

### Prerequisites

- Node.js (v25+ recommended)
- pnpm

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/open-arch-flow.git
   cd open-arch-flow
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Set up environment variables:**

   Copy or rename `.env.example` to `.env.local` and fill in the required keys (e.g., `GEMINI_API_KEY`, `UPSTASH_REDIS_REST_URL`, etc.).

   ```bash
   cp .env.example .env.local
   ```

4. **Run the development server:**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## License


## Author

Rafael Sales <rafael.sales@gmail.com>
