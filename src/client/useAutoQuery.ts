"use client"

import { useEffect, useState } from "react"

type QueryState<T> = {
	data?: T
	error?: string
	loading: boolean
}

export function useAutoQuery<T>(path: string): QueryState<T> {
	const [state, setState] = useState<QueryState<T>>({
		loading: true,
	})

	useEffect(() => {
		const controller = new AbortController();

		(async () => {
			try {
				const res = await fetch("/api/proxy", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						method: "GET",
						path,
					}),
					signal: controller.signal,
				})

				const data = await res.json()

				setState({
					data,
					loading: false,
				})
			} catch (err: any) {
				if (err.name === "AbortError") return

				setState({
					error: "Request failed",
					loading: false,
				})
			}

		})()
		return () => {
			controller.abort()
		}
	}, [path])

	return state
}
