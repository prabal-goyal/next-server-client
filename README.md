# auto-server-client

A unified, secure data-access layer for Next.js App Router. One client that works in Server Components, Client Components, and Route Handlers — with no configuration required.

## Features

- **Universal client** — same API everywhere, context detected automatically
- **Secure by default** — tokens never leave the server
- **End-to-end type safety** — schema-first typed paths and responses
- **Auth guards** — protect proxy routes without touching business logic
- **React hooks** — `useAutoQuery` and `useAutoMutation` for client components

## Installation

```bash
npm install auto-server-client
```

## Setup

### 1. Set environment variable

```env
API_URL=https://api.example.com
```

### 2. Create the proxy route

```ts
// app/api/proxy/route.ts
import { createProxyHandler } from "auto-server-client"

export const POST = createProxyHandler()
```

That's it. The handler reads `API_URL` and the `accessToken` cookie automatically.

---

## Universal Client

`createAutoClient()` detects whether it's running on the server or in the browser and picks the right strategy automatically:

- **Server** (Server Component, Route Handler) → calls the external API directly
- **Browser** (Client Component) → routes through `/api/proxy`, keeping the token server-only

```ts
// works in a Server Component, Client Component, or Route Handler — identical code
const client = createAutoClient()

const posts = await client.get("/posts")
const post  = await client.post("/posts", { title: "Hello" })
await client.put("/posts/1", { title: "Updated" })
await client.delete("/posts/1")
```

> When called inside a Client Component the request is triggered from the browser and routed through `/api/proxy`. The token is never exposed — the proxy reads it server-side before forwarding.

---

## End-to-End Type Safety

Pass a schema type to `createAutoClient()` to get typed paths, typed responses, and typed request bodies.

```ts
// lib/api.ts
import { createAutoClient } from "auto-server-client"

type MyApi = {
  GET: {
    "/posts":     { response: Post[] }
    "/users/me":  { response: User }
  }
  POST: {
    "/posts": { body: CreatePostInput; response: Post }
  }
  DELETE: {
    "/posts": { response: void }
  }
}

export const client = createAutoClient<MyApi>()
```

```ts
const posts = await client.get("/posts")         // Post[]  — inferred, no cast needed
const user  = await client.get("/users/me")      // User    — inferred

await client.post("/posts", { title: "Hello" })  // body must be CreatePostInput

await client.get("/wrong")                       // compile error — not in schema
await client.post("/posts", { nme: "Hi" })       // compile error — wrong body shape
```

Without a schema, the client behaves as before — any path, manual type cast:

```ts
const client = createAutoClient()
const data = await client.get<Post[]>("/posts")
```

---

## Auth Guards

Guards run inside `createProxyHandler()` before any request is forwarded to the external API.

### Protect all routes

```ts
import { createProxyHandler, requireAuth } from "auto-server-client"

export const POST = createProxyHandler({
  guard: requireAuth(), // returns 401 if accessToken cookie is missing
})
```

### Mixed public and protected routes

```ts
import { createProxyHandler, requireAuth, allow } from "auto-server-client"

export const POST = createProxyHandler({
  guards: {
    "GET /posts":    allow(),        // public
    "POST /posts":   requireAuth(),  // must be logged in
    "DELETE /posts": requireAuth(),  // must be logged in
  },
  default: allow(), // paths not listed are public
})
```

Flip `default` to protect everything unless explicitly allowed:

```ts
export const POST = createProxyHandler({
  guards: {
    "GET /posts": allow(), // the only public route
  },
  default: requireAuth(), // everything else requires auth
})
```

### Custom guard

```ts
import { defineGuard } from "auto-server-client"
import { cookies } from "next/headers"

const myGuard = defineGuard(async () => {
  const token = (await cookies()).get("accessToken")?.value
  if (!token) return { deny: 401 }

  const payload = verifyJwt(token)
  if (!payload) return { deny: 401 }

  return { allow: true }
})

export const POST = createProxyHandler({ guard: myGuard })
```

> Role-based access control (admin, editor, etc.) should stay in your backend. Guards at the proxy layer only answer one question: **is there a valid session?**

---

## React Hooks

For Client Components that need reactive state (loading, error, re-fetching).

### `useAutoQuery`

```ts
"use client"

import { useAutoQuery } from "auto-server-client"

export default function PostList() {
  const { data, loading, error } = useAutoQuery<Post[]>("/posts")

  if (loading) return <p>Loading...</p>
  if (error)   return <p>Error: {error}</p>

  return <ul>{data?.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
```

### `useAutoMutation`

```ts
"use client"

import { useAutoMutation } from "auto-server-client"

export default function CreatePost() {
  const { mutate, loading } = useAutoMutation<Post>("/posts", "POST")

  return (
    <button
      disabled={loading}
      onClick={() => mutate({ title: "New Post" })}
    >
      Create
    </button>
  )
}
```

---

## API Reference

### `createAutoClient<Schema>()`

Returns a universal client. Detects server vs. browser at runtime.

| Method | Signature |
|---|---|
| `get` | `(path) => Promise<Response>` |
| `post` | `(path, body) => Promise<Response>` |
| `put` | `(path, body) => Promise<Response>` |
| `delete` | `(path) => Promise<Response>` |

### `createProxyHandler(options?)`

Creates the Next.js `POST` route handler for `/api/proxy`.

| Option | Type | Description |
|---|---|---|
| `guard` | `Guard` | Runs on every request |
| `guards` | `Record<"METHOD /path", Guard>` | Per-path guards |
| `default` | `Guard` | Fallback when no per-path guard matches. Defaults to `allow()` |

### `requireAuth()`

Returns `401` if the `accessToken` cookie is missing.

### `allow()`

Always passes. Use to explicitly mark a route as public in a `guards` map.

### `serverQuery<T>(path)`

One-line server-side fetch for Server Components. Reads `API_URL` and `accessToken` cookie automatically.

```ts
const user = await serverQuery<User>("/users/me")
```

### `createServerClient(config)`

Low-level server-side client for custom token handling.

```ts
const client = createServerClient({
  baseURL: process.env.API_URL!,
  getToken: async () => (await cookies()).get("myToken")?.value,
})
```

---

## How It Works

```
Client Component                  Server
      │                              │
      │  POST /api/proxy             │
      │  { method, path, body }      │
      │─────────────────────────────>│  guard runs (is there a token?)
      │                              │  token read from cookie
      │                              │  request forwarded to external API
      │  { data }                    │
      │<─────────────────────────────│
```

Server Components skip the proxy entirely and call the external API in-process.

## License

MIT
