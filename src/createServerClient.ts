export type ServerClientConfig = {
	baseURL: string
	getToken?: () => string | undefined | Promise<string | undefined>

}

export type ServerClient = {
	get<T>(path: string): Promise<T>
	post<T>(path: string, body: unknown): Promise<T>
	put<T>(path: string, body: unknown): Promise<T>
	delete<T>(path: string): Promise<T>
}

export function createServerClient(
	config: ServerClientConfig
): ServerClient {
	async function request<T>(
		method: string,
		path: string,
		body?: unknown
	): Promise<T> {

		const url = `${config.baseURL}${path}`

		const headers = new Headers()


		if (config.getToken) {
			const token = config.getToken()
			if (token) {
				headers.set("Authorization", `Bearer ${token}`)
			}
		}

		if (body) {
			headers.set("Content-Type", "application/json")
		}

		const response = await fetch(url, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		})

		if (!response.ok) {
			throw new Error(`Request failed: ${response.status}`)
		}

		return response.json()
	}


	return {
		get(path) {
			return request("GET", path)
		},
		post(path, body) {
			return request("POST", path, body)
		},
		put(path, body) {
			return request("PUT", path, body)
		},
		delete(path) {
			return request("DELETE", path)
		},
	}
}
