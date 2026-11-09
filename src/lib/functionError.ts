/**
 * Turns a supabase.functions.invoke error into the server's own message,
 * e.g. "You have used all 15 of today's AI exams. Try again tomorrow."
 * instead of "Edge Function returned a non-2xx status code".
 */
export async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === "function") {
    try {
      const body = await context.clone().json();
      if (body && typeof body.error === "string" && body.error) return body.error;
    } catch {
      /* not JSON */
    }
  }
  return fallback;
}
