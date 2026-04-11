import { cookies } from "next/headers"

export type GuardResult = { allow: true } | { deny: number }
export type Guard = () => Promise<GuardResult>

export function requireAuth(): Guard {
	return async () => {
		const token = (await cookies()).get("accessToken")?.value
		return token ? { allow: true } : { deny: 401 }
	}
}

export function allow(): Guard {
	return async () => ({ allow: true })
}
