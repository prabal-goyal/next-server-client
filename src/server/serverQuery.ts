import { cookies } from "next/headers"
import { createServerClient } from "../createServerClient"

export async function serverQuery<T>(path: string): Promise<T> {
	const client = createServerClient({
		baseURL: process.env.API_URL!,
		getToken: async () => (await cookies()).get("accessToken")?.value,
	})

	return client.get<T>(path)
}
