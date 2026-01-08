# AI Prompts Documentation

This document records the AI prompts used to build this project.

## Initial Project Prompt

The following prompt was used to generate the initial implementation:

```
I'm building a Cloudflare AI app for an internship assignment. The project is already initialized in this folder with Durable Objects template.
Requirements from the assignment:

LLM (use Llama 3.3 on Workers AI)
Workflow/coordination using Workers or Durable Objects
User input via chat interface
Memory/state (conversation history)

Please help me:

Add the AI binding to wrangler.jsonc
Modify the Durable Object to store conversation history
Create a chat endpoint that calls Llama 3.3 and maintains context
Build a simple chat UI in the public folder
Create a README.md with setup and running instructions
Create a PROMPTS.md file documenting the AI prompts I used to build this

The repo name is cf-ai-chat. Keep it simple but functional.
```

## System Prompt Used in the Application

The following system prompt is used when making requests to Llama 3.3:

```
You are a helpful, friendly AI assistant. Keep your responses concise but informative.
```

This system prompt is defined in `src/index.ts` in the `chat()` method of the Durable Object. It is prepended to the conversation history before each API call.

## Implementation Details

### Conversation Context

The application maintains conversation context by:
1. Storing all messages (user and assistant) in a SQLite database within the Durable Object
2. Loading the full conversation history before each new message
3. Sending the complete history (with system prompt) to Llama 3.3

### Message Format

Messages sent to the AI follow this structure:
```typescript
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}
```

The messages array sent to the model looks like:
```json
[
  { "role": "system", "content": "You are a helpful, friendly AI assistant..." },
  { "role": "user", "content": "First user message" },
  { "role": "assistant", "content": "First AI response" },
  { "role": "user", "content": "Second user message" }
]
```

## Model Configuration

- **Model**: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- **Provider**: Cloudflare Workers AI
- **Parameters**: Default (no custom temperature, max_tokens, etc.)

## Future Improvements

Potential enhancements that could be made with additional prompts:

1. **Custom system prompts** - Allow users to customize the AI's personality
2. **Streaming responses** - Implement SSE for real-time token streaming
3. **Context window management** - Truncate old messages when context gets too long
4. **Multiple AI models** - Allow switching between different Workers AI models
5. **Prompt templates** - Pre-built prompts for specific use cases
