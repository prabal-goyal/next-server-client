export { createServerClient } from "./createServerClient"

export { useAutoQuery } from "./client/useAutoQuery"
export { useAutoMutation } from "./client/useAutoMutation"

export { serverQuery } from "./server/serverQuery"
export { createProxyHandler } from "./server/createProxyHandler"
export { requireAuth, allow } from "./server/guards"
export type { Guard, GuardResult } from "./server/guards"

export { createAutoClient } from "./createAutoClient"
export type { ApiSchema, TypedClient } from "./schema"

