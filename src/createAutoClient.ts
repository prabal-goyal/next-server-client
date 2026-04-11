import { createServerClient, type ServerClient } from "./createServerClient"
import type { ApiSchema, TypedClient } from "./schema"

async function proxyFetch<T>(
	method: string,
	path: string,
	body?: unknown
): Promise<T> {
	const res = await fetch("/api/proxy", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ method, path, body }),
	})

	if (!res.ok) {
		throw new Error(`Request failed: ${res.status}`)
	}

	return res.json()
}

function createClientBridge(): ServerClient {
	return {
		get<T>(path: string) {
			return proxyFetch<T>("GET", path)
		},
		post<T>(path: string, body: unknown) {
			return proxyFetch<T>("POST", path, body)
		},
		put<T>(path: string, body: unknown) {
			return proxyFetch<T>("PUT", path, body)
		},
		delete<T>(path: string) {
			return proxyFetch<T>("DELETE", path)
		},
	}
}

function buildClient(): ServerClient {
	if (typeof window === "undefined") {
		return createServerClient({
			baseURL: process.env.API_URL!,
			getToken: async () => {
				// Dynamic import keeps `next/headers` out of the client bundle.
				const { cookies } = await import("next/headers")
				return (await cookies()).get("accessToken")?.value
			},
		})
	}

	return createClientBridge()
}

/**
 * Creates a universal API client that automatically selects its execution
 * strategy based on rendering context — no configuration required.
 *
 * - **Server** (`typeof window === "undefined"`): calls the external API
 *   directly via `createServerClient`, reading `API_URL` from the environment
 *   and the Bearer token from the `accessToken` cookie.
 *
 * - **Client** (browser): routes every request through `/api/proxy` so that
 *   auth tokens remain server-only and never appear in the browser.
 *
 * Optionally pass a schema type parameter for end-to-end type safety:
 *
 * ```ts
 * type MyApi = {
 *   GET: { "/users/me": { response: User } }
 *   POST: { "/posts": { body: CreatePostInput; response: Post } }
 * }
 *
 * const client = createAutoClient<MyApi>()
 *
 * const user = await client.get("/users/me")          // → User
 * await client.post("/posts", { title: "Hello" })     // body is typed
 * await client.get("/wrong")                          // compile error
 * ```
 */
export function createAutoClient(): ServerClient
export function createAutoClient<Schema extends ApiSchema>(): TypedClient<Schema>
export function createAutoClient(): ServerClient {
	return buildClient()
}
