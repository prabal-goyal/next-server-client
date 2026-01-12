"use client"

import { useState } from "react"

type MutationState<T> = {
  data?: T
  error?: string
  loading: boolean
}

export function useAutoMutation<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE"
) {
  const [state, setState] = useState<MutationState<T>>({
    loading: false,
  })

  async function mutate(body?: unknown) {
    const controller = new AbortController()
    setState({ loading: true, data: undefined, error: undefined })
    try {
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method,
          path,
          body,
        }),
        signal: controller.signal
      })

      const data = await res.json()

      setState({
        data,
        loading: false,
      })

      return data
    } catch (err: any) {
      if (err.name === "AbortError") return

      setState({
        error: "Request failed",
        loading: false,
      })

      throw err
    }
  }

  return {
    ...state,
    mutate,
  }
}
