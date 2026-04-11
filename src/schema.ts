// ── Route shape ────────────────────────────────────────────────────────────────

export type ApiSchema = Partial<{
	GET: Record<string, { response: unknown }>
	POST: Record<string, { body: unknown; response: unknown }>
	PUT: Record<string, { body: unknown; response: unknown }>
	DELETE: Record<string, { response: unknown }>
}>

// ── Internal helpers ────────────────────────────────────────────────────────────

// When a method is absent from the schema, fall back to `string` (any path)
// so the untyped call signature is preserved.
type Paths<Routes> = Routes extends object ? keyof Routes & string : string

// Look up a value by path, falling back to `Fallback` when the method / path
// is not in the schema.
type Get<Obj, K extends string, Fallback = unknown> =
	Obj extends Record<K, infer V> ? V : Fallback

type ResponseOf<Routes, P extends string> =
	Get<Routes, P> extends { response: infer R } ? R : unknown

type BodyOf<Routes, P extends string> =
	Get<Routes, P> extends { body: infer B } ? B : unknown

// ── Public typed-client surface ─────────────────────────────────────────────────

export type TypedClient<Schema extends ApiSchema> = {
	get<P extends Paths<Schema["GET"]>>(
		path: P
	): Promise<ResponseOf<Schema["GET"], P>>

	post<P extends Paths<Schema["POST"]>>(
		path: P,
		body: BodyOf<Schema["POST"], P>
	): Promise<ResponseOf<Schema["POST"], P>>

	put<P extends Paths<Schema["PUT"]>>(
		path: P,
		body: BodyOf<Schema["PUT"], P>
	): Promise<ResponseOf<Schema["PUT"], P>>

	delete<P extends Paths<Schema["DELETE"]>>(
		path: P
	): Promise<ResponseOf<Schema["DELETE"], P>>
}
