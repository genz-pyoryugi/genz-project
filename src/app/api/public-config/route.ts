import { NextResponse } from "next/server";

// Supabase address + publishable key for the static pages in /public (they can't read env vars).
// Both are NEXT_PUBLIC values — already public by design. Never return server-only keys here.
export function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? null,
  });
}
