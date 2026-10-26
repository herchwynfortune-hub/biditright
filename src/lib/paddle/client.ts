import { initializePaddle, type Paddle } from "@paddle/paddle-js";

let paddleInstance: Paddle | null = null;

async function getPaddle(): Promise<Paddle> {
  if (paddleInstance) return paddleInstance;

  const paddle = await initializePaddle({
    environment: (process.env.NEXT_PUBLIC_PADDLE_ENV as "sandbox" | "production") ?? "sandbox",
    token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
  });

  if (!paddle) throw new Error("Paddle failed to initialize");
  paddleInstance = paddle;
  return paddle;
}

export async function openCheckout({
  priceId,
  teacherId,
  email,
}: {
  priceId: string;
  teacherId: string;
  email: string;
}) {
  const paddle = await getPaddle();

  paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: { email },
    customData: { teacher_id: teacherId },
  });
}

export const PRICE_MONTHLY = process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY!;
export const PRICE_ANNUAL = process.env.NEXT_PUBLIC_PADDLE_PRICE_ANNUAL!;
