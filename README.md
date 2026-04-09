# auto-server-client

A unified, secure data-access layer for Next.js App Router that eliminates the need to write individual Server Actions for every API request.

## Features

- 🔒 **Secure by default** - Tokens and secrets never leave the server
- 🎯 **Single API client** - One configuration, use everywhere
- 🪝 **React hooks** - `useAutoQuery` and `useAutoMutation` for client components
- 📄 **SSR support** - `serverQuery` helper for Server Components
- 🚀 **Zero boilerplate** - No need to write Server Actions for each endpoint

## Installation

```bash
npm install auto-server-client
```

## Quick Start

### 1. Create the Proxy Route

Create `app/api/proxy/route.ts` in your Next.js app:

```typescript
import { createProxyHandler } from "auto-server-client";

export const POST = createProxyHandler();
```

That's it. The handler reads `process.env.API_URL` and the `accessToken` cookie automatically.

### 2. Set Environment Variables

Add your API base URL to `.env.local`:

```env
API_URL=https://api.example.com
```

### 3. Use in Your Components

#### Client Components (with hooks)

```typescript
"use client";

import { useAutoQuery, useAutoMutation } from "auto-server-client";

export default function TodoList() {
  // Fetch data
  const { data, loading, error } = useAutoQuery("/todos");

  // Mutate data
  const { mutate, loading: isCreating } = useAutoMutation("/todos", "POST");

  const handleCreate = async () => {
    try {
      const newTodo = await mutate({ title: "New Todo", completed: false });
      console.log("Created:", newTodo);
    } catch (error) {
      console.error("Failed to create:", error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button onClick={handleCreate} disabled={isCreating}>
        Create Todo
      </button>
      <ul>
        {data?.map((todo: any) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

#### Server Components

The package exports a `serverQuery` helper that works out of the box if your token is stored in a cookie named `accessToken`:

```typescript
import { serverQuery } from "auto-server-client";

export default async function TodoPage() {
  // This runs on the server and can access cookies/headers securely
  const todo = await serverQuery("/todos/1");

  return (
    <div>
      <h1>{todo.title}</h1>
      <p>Status: {todo.completed ? "Done" : "Pending"}</p>
    </div>
  );
}
```

> **Note:** The default `serverQuery` expects:
> - `process.env.API_URL` to be set
> - An `accessToken` cookie for authentication
> 
> If you need different token handling or cookie names, create a custom helper (see [Custom Server Query](#custom-server-query) section).

## API Reference

### `createProxyHandler()`

Creates a Next.js route handler for the proxy endpoint. Use this to register the `/api/proxy` route in your app with a single line.

**Returns:** A `POST` route handler function compatible with Next.js App Router.

**Requirements:**
- `process.env.API_URL` must be set
- An `accessToken` cookie is used for authentication (read server-side)

**Example:**
```typescript
// app/api/proxy/route.ts
import { createProxyHandler } from "auto-server-client";

export const POST = createProxyHandler();
```

---

### `createServerClient(config)`

Creates a server-side API client with automatic token injection.

**Parameters:**
- `config.baseURL` (string, required): Base URL for your API
- `config.getToken` (function, optional): Async function that returns the authentication token

**Returns:** `ServerClient` object with methods: `get`, `post`, `put`, `delete`

**Example:**
```typescript
const client = createServerClient({
  baseURL: "https://api.example.com",
  getToken: async () => {
    const cookies = await import("next/headers").then(m => m.cookies());
    return cookies.get("accessToken")?.value;
  },
});

const data = await client.get("/users");
```

### `useAutoQuery<T>(path)`

React hook for fetching data in client components.

**Parameters:**
- `path` (string): API endpoint path (e.g., "/users/123")

**Returns:**
```typescript
{
  data?: T;
  loading: boolean;
  error?: string;
}
```

**Example:**
```typescript
const { data, loading, error } = useAutoQuery<User>("/users/1");
```

### `useAutoMutation<T>(path, method)`

React hook for mutations in client components.

**Parameters:**
- `path` (string): API endpoint path
- `method` ("POST" | "PUT" | "DELETE"): HTTP method

**Returns:**
```typescript
{
  mutate: (body?: unknown) => Promise<T>;
  data?: T;
  loading: boolean;
  error?: string;
}
```

**Example:**
```typescript
const { mutate, loading } = useAutoMutation<User>("/users", "POST");
const newUser = await mutate({ name: "John", email: "john@example.com" });
```

### `serverQuery<T>(path)`

Helper function for fetching data in Server Components.

**Parameters:**
- `path` (string): API endpoint path

**Returns:** `Promise<T>`

**Requirements:**
- `process.env.API_URL` must be set
- An `accessToken` cookie must be present (for authenticated requests)

**Example:**
```typescript
const user = await serverQuery<User>("/users/1");
```

## Advanced Usage

### Custom Token Retrieval

You can customize how tokens are retrieved based on your authentication setup:

```typescript
import { headers } from "next/headers";

const client = createServerClient({
  baseURL: process.env.API_URL!,
  getToken: async () => {
    const headersList = await headers();
    return headersList.get("authorization")?.replace("Bearer ", "");
  },
});
```

### Error Handling

The hooks return error states you can handle:

```typescript
const { data, error, loading } = useAutoQuery("/todos");

if (error) {
  // Handle error - show toast, redirect, etc.
  return <ErrorComponent message={error} />;
}
```

For mutations, wrap in try/catch:

```typescript
const { mutate } = useAutoMutation("/todos", "POST");

try {
  await mutate({ title: "New Todo" });
} catch (error) {
  // Handle error
  console.error("Mutation failed:", error);
}
```

## Security Considerations

- ✅ **Tokens are server-only**: The `getToken` function runs on the server, so tokens never appear in client-side code
- ✅ **Proxy validation**: The proxy route validates methods and paths before forwarding requests
- ✅ **Cookie-based auth**: Tokens should be stored in HTTP-only cookies for maximum security
- ⚠️ **Path validation**: Ensure your proxy validates paths to prevent SSRF attacks
- ⚠️ **Rate limiting**: Consider adding rate limiting to the proxy route in production

## How It Works

1. **Client Components**: Hooks (`useAutoQuery`/`useAutoMutation`) POST to `/api/proxy` with `{ method, path, body }`
2. **Proxy Route**: Registered in your app via `createProxyHandler()` — reads the token from cookies server-side and forwards the request to your API
3. **Server Components**: Use `serverQuery` or `createServerClient` directly to fetch data during SSR
4. **Token Injection**: Tokens are automatically injected as Bearer tokens in the `Authorization` header

## Why Use This?

Traditional Next.js App Router patterns require:
- Writing a Server Action for every API call
- Duplicating fetch logic across files
- Managing tokens in multiple places
- Client components unable to call authenticated APIs directly

`auto-server-client` solves this by:
- Providing a single server-side API client
- Offering secure proxy for client components
- Providing simple hooks for reads and writes
- Supporting SSR helpers for Server Components

All without exposing tokens or secrets to the browser.

## License

MIT
