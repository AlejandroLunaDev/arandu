import type { NextRequest } from "next/server";
import { refreshSession } from "@/auth/refresh-session";

export function proxy(request: NextRequest) {
  return refreshSession(request);
}

// Only the app and Google's way back hold a session; the landing never needs one.
export const config = { matcher: ["/app/:path*", "/auth/:path*"] };
