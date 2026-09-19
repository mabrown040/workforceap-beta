/**
 * JSON request bodies that must be a plain object.
 *
 * `request.json()` happily returns the JSON literal `null`, a number, a string
 * or an array. Routes that only guard the parse (`try { await req.json() }`)
 * then throw on the first property read (`body.field` on `null`) and the
 * generic catch turns that into a 500. Reading through this helper answers
 * every non-object body the same way as malformed JSON, so a route can return
 * a 400 `{ error }` with one check.
 */
export type JsonObject = Record<string, unknown>;

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parses the body as JSON and returns it only when it is a plain object;
 * returns `null` for a body that is not JSON or for JSON that is not an
 * object (`null`, `[]`, `"text"`, `42`).
 *
 * `T` is the caller's declared shape. Only object-ness is verified here, the
 * same contract the routes already relied on with `as Body` casts; callers
 * still type-check each field they read.
 */
export async function readJsonObjectBody<T extends object = JsonObject>(request: Request): Promise<T | null> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return null;
  }
  return isJsonObject(parsed) ? (parsed as T) : null;
}
