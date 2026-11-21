import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { rateLimit } from "@/app/api/_utils/rateLimit";
import { buildEmailVerifyUrl, isEmailVerified } from "@/lib/emailVerification";
import { sendEmailVerificationEmail } from "@/lib/bookingMailer";
import { resolveSiteUrl } from "@/lib/email/templates";

export const runtime = "nodejs";

export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const limited = await rateLimit({
    request,
    key: `auth:verify-resend:${auth.business.id}`,
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json({ detail: "Please wait a little before asking for another email." }, { status: 429 });
  }

  if (isEmailVerified(auth.business)) {
    return NextResponse.json({ ok: true, already_verified: true });
  }

  const verifyUrl = buildEmailVerifyUrl({
    site: resolveSiteUrl(),
    businessId: auth.business.id,
    email: auth.business.email,
  });
  const result = await sendEmailVerificationEmail({ business: auth.business, verifyUrl });
  if (!result?.ok) {
    return NextResponse.json({ detail: "We couldn't send the email. Try again shortly." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
