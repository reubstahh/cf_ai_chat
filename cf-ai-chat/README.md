# CF AI Chat

A conversational AI chat application built on Cloudflare Workers using Llama 3.3 and Durable Objects.

## Features

- **LLM Integration**: Uses Meta's Llama 3.3 70B model via Cloudflare Workers AI
- **Conversation Memory**: Durable Objects with SQLite storage maintain conversation history
- **Session Management**: Multiple independent chat sessions supported
- **Simple Chat UI**: Clean, responsive web interface

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Chat UI       │────▶│  Worker         │────▶│  Durable Object │
│   (HTML/JS)     │◀────│  (Router)       │◀────│  (SQLite)       │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Workers AI     │
                        │  (Llama 3.3)    │
                        └─────────────────┘
```

- **Worker**: Routes requests to appropriate handlers
- **Durable Object**: Stores conversation history per session using SQLite
- **Workers AI**: Runs Llama 3.3 inference

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

## Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd cf-ai-chat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Login to Cloudflare** (if not already)
   ```bash
   npx wrangler login
   ```

4. **Generate TypeScript types**
   ```bash
   npm run cf-typegen
   ```

## Running Locally

Start the development server:

```bash
npm run dev
```

Open http://localhost:8787 in your browser.

## Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

Your app will be available at `https://cf-ai-chat.<your-subdomain>.workers.dev`

## API Endpoints

### POST /api/chat
Send a message and receive an AI response.

**Request:**
```json
{
  "message": "Hello, how are you?",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "response": "I'm doing well, thank you for asking! How can I help you today?",
  "sessionId": "session-id"
}
```

### GET /api/history
Retrieve conversation history for a session.

**Query params:** `sessionId` (optional, defaults to "default")

**Response:**
```json
{
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" }
  ],
  "sessionId": "session-id"
}
```

### DELETE /api/clear
Clear conversation history for a session.

**Query params:** `sessionId` (optional, defaults to "default")

**Response:**
```json
{
  "success": true,
  "sessionId": "session-id"
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Project Structure

```
cf-ai-chat/
├── src/
│   └── index.ts          # Worker + Durable Object implementation
├── public/
│   └── index.html        # Chat UI
├── wrangler.jsonc        # Cloudflare configuration
├── package.json
├── tsconfig.json
├── README.md
└── PROMPTS.md            # AI prompts documentation
```

## Configuration

The `wrangler.jsonc` file contains:
- **AI binding**: Connects to Workers AI for Llama 3.3 access
- **Durable Objects**: Configures SQLite-backed chat sessions
- **Assets**: Serves the chat UI from `/public`

## Technologies Used

- [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless compute
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/) - Stateful coordination
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) - AI inference
- [Llama 3.3 70B](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/) - Large language model
- TypeScript
