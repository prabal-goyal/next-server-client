import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createServerClient } from "../createServerClient"

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "DELETE"])

export function createProxyHandler() {
	return async function POST(req: Request): Promise<Response> {
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
