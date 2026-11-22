import { type NextRequest, NextResponse } from "next/server";
import { signInWithIdentity, supabaseServer } from "@/auth/sign-in";

// Google's way back (O01's "Já tenho uma conta" and O21). Whatever happened, the person lands on /app, whose door
// sends them on: into the room, or to the onboarding when the sign-in was cancelled or refused.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    if (data.session) {
      try {
        await signInWithIdentity(data.session.access_token);
      } catch {
        // The API refused (banned, an identity Supabase vouched for but the API did not take): no session changes.
      } finally {
        // Supabase only proved who the person is: the session is the API's from here on.
        await supabase.auth.signOut({ scope: "local" });
      }
    }
  }
  return NextResponse.redirect(new URL("/app", request.url));
}
