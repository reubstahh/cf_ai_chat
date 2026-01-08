import { DurableObject } from "cloudflare:workers";

// Message type for conversation history
interface ChatMessage {
	role: "user" | "assistant" | "system";
	content: string;
}

// Chat request body
interface ChatRequest {
	message: string;
	sessionId?: string;
}

// Chat response body
interface ChatResponse {
	response: string;
	sessionId: string;
}

/**
 * ChatSession Durable Object - stores conversation history using SQLite
 */
export class MyDurableObject extends DurableObject<Env> {
	private sql: SqlStorage;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sql = ctx.storage.sql;

		// Initialize the messages table if it doesn't exist
		this.sql.exec(`
			CREATE TABLE IF NOT EXISTS messages (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				role TEXT NOT NULL,
				content TEXT NOT NULL,
				created_at INTEGER DEFAULT (unixepoch())
			)
		`);
	}

	/**
	 * Get all messages in the conversation history
	 */
	async getHistory(): Promise<ChatMessage[]> {
		const cursor = this.sql.exec(`SELECT role, content FROM messages ORDER BY id ASC`);
		const messages: ChatMessage[] = [];
		for (const row of cursor) {
			messages.push({
				role: row.role as ChatMessage["role"],
				content: row.content as string,
			});
		}
		return messages;
	}

	/**
	 * Add a message to the conversation history
	 */
	async addMessage(role: ChatMessage["role"], content: string): Promise<void> {
		this.sql.exec(`INSERT INTO messages (role, content) VALUES (?, ?)`, role, content);
	}

	/**
	 * Clear the conversation history
	 */
	async clearHistory(): Promise<void> {
		this.sql.exec(`DELETE FROM messages`);
	}

	/**
	 * Chat with the AI - maintains conversation context
	 */
	async chat(userMessage: string): Promise<string> {
		// Add user message to history
		await this.addMessage("user", userMessage);

		// Get full conversation history
		const history = await this.getHistory();

		// Build messages array for the AI with system prompt
		const messages: ChatMessage[] = [
			{
				role: "system",
				content: "You are a helpful, friendly AI assistant. Keep your responses concise but informative.",
			},
			...history,
		];

		// Call Llama 3.3 via Workers AI
		const response = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
			messages: messages,
		});

		// Extract the response text (handle both string and object responses)
		const assistantMessage =
			typeof response === "string"
				? response
				: (response as { response?: string }).response || "I apologize, but I couldn't generate a response.";

		// Add assistant response to history
		await this.addMessage("assistant", assistantMessage);

		return assistantMessage;
	}
}

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);

		// Handle CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type",
				},
			});
		}

		// API routes
		if (url.pathname === "/api/chat" && request.method === "POST") {
			try {
				const body = (await request.json()) as ChatRequest;
				const { message, sessionId = "default" } = body;

				if (!message || typeof message !== "string") {
					return Response.json({ error: "Message is required" }, { status: 400 });
				}

				// Get or create a chat session Durable Object
				const stub = env.MY_DURABLE_OBJECT.getByName(sessionId);

				// Chat with the AI
				const response = await stub.chat(message);

				return Response.json(
					{ response, sessionId } as ChatResponse,
					{
						headers: {
							"Access-Control-Allow-Origin": "*",
							"Content-Type": "application/json",
						},
					}
				);
			} catch (error) {
				console.error("Chat error:", error);
				return Response.json(
					{ error: "Failed to process chat request" },
					{ status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
				);
			}
		}

		// Get conversation history
		if (url.pathname === "/api/history" && request.method === "GET") {
			const sessionId = url.searchParams.get("sessionId") || "default";
			const stub = env.MY_DURABLE_OBJECT.getByName(sessionId);
			const history = await stub.getHistory();

			return Response.json(
				{ history, sessionId },
				{
					headers: {
						"Access-Control-Allow-Origin": "*",
						"Content-Type": "application/json",
					},
				}
			);
		}

		// Clear conversation history
		if (url.pathname === "/api/clear" && request.method === "DELETE") {
			const sessionId = url.searchParams.get("sessionId") || "default";
			const stub = env.MY_DURABLE_OBJECT.getByName(sessionId);
			await stub.clearHistory();

			return Response.json(
				{ success: true, sessionId },
				{
					headers: {
						"Access-Control-Allow-Origin": "*",
						"Content-Type": "application/json",
					},
				}
			);
		}

		// Health check endpoint
		if (url.pathname === "/api/health") {
			return Response.json({ status: "ok", timestamp: new Date().toISOString() });
		}

		// Let static assets handler serve everything else (including /)
		return new Response("Not Found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;
