import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/db";
import { SCOPES } from "@/lib/google-calendar";

// PM OAuth2 callback — exchanges code for tokens and stores them
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state"); // pmId encoded in state

  if (!code || !state) {
    return NextResponse.redirect(new URL("/pm?error=missing_params", req.url));
  }

  const pmId = state; // In production: use a signed JWT state to prevent CSRF

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL(`/pm?pmId=${pmId}&error=no_refresh_token&hint=revoke_and_retry`, req.url)
      );
    }

    // Verify the PM exists
    const pm = await prisma.pM.findUnique({ where: { id: pmId } });
    if (!pm) return NextResponse.redirect(new URL(`/pm?pmId=${pmId}&error=pm_not_found`, req.url));

    // Encrypt tokens (base64 for now — use KMS in production)
    const accessTokenEncrypted = Buffer.from(tokens.access_token!).toString("base64");
    const refreshTokenEncrypted = Buffer.from(tokens.refresh_token).toString("base64");

    await prisma.pMOAuthToken.upsert({
      where: { pmId },
      create: {
        pmId,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenExpiry: new Date(tokens.expiry_date ?? Date.now() + 3600_000),
        scopesGranted: SCOPES,
      },
      update: {
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenExpiry: new Date(tokens.expiry_date ?? Date.now() + 3600_000),
        scopesGranted: SCOPES,
      },
    });

    await prisma.pM.update({
      where: { id: pmId },
      data: { calendarConnected: true },
    });

    return NextResponse.redirect(new URL(`/pm?pmId=${pmId}&connected=true`, req.url));
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL(`/pm?pmId=${pmId}&error=oauth_failed`, req.url));
  }
}
