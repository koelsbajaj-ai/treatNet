import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error(
    "Missing ANTHROPIC_API_KEY. Set it in .env.local (see .env.example)."
  );
}

// Server-only, same reasoning as lib/supabase.ts. Only ever imported from
// app/api/* route handlers.
export const anthropic = new Anthropic({ apiKey });
