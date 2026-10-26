import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Paddle signs webhooks as `Paddle-Signature: ts=<unix>;h1=<hex hmac>`, where
// the hmac is computed over `${ts}:${rawBody}` using the notification
// destination's secret key. The raw, unparsed body must be used — any
// re-serialization invalidates the signature. See
// https://developer.paddle.com/webhooks/signature-verification
function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(";").map((p) => p.split("=") as [string, string]));
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  // Reject stale signatures (5 minute tolerance) to limit replay risk.
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(h1, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  const rpcSecret = process.env.PADDLE_WEBHOOK_RPC_SECRET;
  if (!webhookSecret || !rpcSecret) {
    console.error("Paddle webhook received but PADDLE_WEBHOOK_SECRET / PADDLE_WEBHOOK_RPC_SECRET isn't configured.");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("paddle-signature");

  if (!verifySignature(rawBody, signatureHeader, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventType: string = event.event_type ?? "";

  // Only subscription lifecycle events affect plan status; ignore the rest
  // (transaction.*, customer.*, etc.) with a plain ack.
  if (!eventType.startsWith("subscription.")) {
    return NextResponse.json({ received: true });
  }

  const sub = event.data;
  const teacherId: string | undefined = sub?.custom_data?.teacher_id;
  if (!teacherId) {
    console.error(`Paddle webhook ${eventType} (sub ${sub?.id}) had no custom_data.teacher_id — nothing to update.`);
    return NextResponse.json({ received: true });
  }

  const status: string = sub.status;
  const plan = status === "active" || status === "trialing" ? "pro" : "free";

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error } = await supabase.rpc("apply_paddle_subscription", {
    p_secret: rpcSecret,
    p_teacher_id: teacherId,
    p_plan: plan,
    p_paddle_customer_id: sub.customer_id ?? null,
    p_paddle_subscription_id: sub.id ?? null,
    p_subscription_status: status,
    p_current_period_ends_at: sub.current_billing_period?.ends_at ?? null,
  });

  if (error) {
    console.error("apply_paddle_subscription failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
