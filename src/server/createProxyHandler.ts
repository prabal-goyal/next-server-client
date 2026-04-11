import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createServerClient } from "../createServerClient"
import { allow, type Guard } from "./guards"

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "DELETE"])

type ProxyHandlerOptions = {
	guard?: Guard
	guards?: Record<string, Guard>
	default?: Guard
}

export function createProxyHandler(options?: ProxyHandlerOptions) {
	return async function POST(req: Request): Promise<Response> {
		// Global guard runs before we even parse the body
		if (options?.guard) {
			const result = await options.guard()
			if ("deny" in result) {
				return NextResponse.json({ error: "Unauthorized" }, { status: result.deny })
			}
		}

		let payload: { method?: unknown; path?: unknown; body?: unknown }

		try {
			payload = await req.json()
		} catch {
			return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
		}

		const { method, path, body } = payload

		if (typeof method !== "string" || !ALLOWED_METHODS.has(method)) {
			return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
		}

		if (typeof path !== "string" || !path.startsWith("/")) {
			return NextResponse.json({ error: "Invalid path" }, { status: 400 })
		}

		// Per-path guard: look up "METHOD /path", fall back to default
		if (options?.guards) {
			const key = `${method} ${path}`
			const guard = options.guards[key] ?? options.default ?? allow()
			const result = await guard()
			if ("deny" in result) {
				return NextResponse.json({ error: "Unauthorized" }, { status: result.deny })
			}
		}

		const client = createServerClient({
			baseURL: process.env.API_URL!,
			getToken: async () => (await cookies()).get("accessToken")?.value,
		})

		const data = await (
			method === "GET"    ? client.get(path) :
			method === "DELETE" ? client.delete(path) :
			method === "POST"   ? client.post(path, body) :
			                      client.put(path, body)
		)

		return NextResponse.json(data)
	}
}
