import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { generateSetInputSchema, generatedSetSchema, ERROR_TAGS } from "@/lib/game/generator";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Must be signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedInput = generateSetInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return NextResponse.json({ error: "Invalid input", details: parsedInput.error.flatten() }, { status: 400 });
  }
  const input = parsedInput.data;

  // Cheap pre-check so we don't spend an AI call before confirming the
  // teacher actually has a try left. consume_ai_generation() re-checks this
  // authoritatively (and atomically) after a successful generation below.
  const { data: teacher } = await supabase.from("teachers").select("plan, ai_generations_used").eq("id", user.id).single();
  if (teacher?.plan === "free" && (teacher.ai_generations_used ?? 0) >= 2) {
    return NextResponse.json({ error: "FREE_PLAN_AI_LIMIT: Free plan is limited to 2 AI generations" }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI generator isn't configured on this server yet." }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const wrongCount = Math.max(1, Math.round((input.count * input.wrongPercent) / 100));
  const correctCount = input.count - wrongCount;

  const prompt = `You write statements for "Bid It Right", a classroom game where teams bid coins on whether a statement is correct or incorrect.

Subject: ${input.subject}
Level: ${input.level}
Topic or target point: ${input.topic}
${input.commonErrors ? `Common errors to include where natural: ${input.commonErrors}\n` : ""}
Generate exactly ${input.count} statements: ${correctCount} correct and ${wrongCount} incorrect.

Rules:
- Each incorrect statement must contain exactly one error, so the fix is unambiguous.
- Errors must be plausible mistakes a real learner at this level would make — never random typos or nonsense.
- Vocabulary and sentence length must fit the stated level.
- No two statements may repeat the same idea or near-duplicate wording.
- For every incorrect statement, give the corrected version and a one-line explanation a teacher could read aloud, plus an error_tag from: ${ERROR_TAGS.join(", ")}.
- Correct statements must have correction and error_tag set to null.
- Keep each statement under ~20 words so it reads well on a projector.`;

  let response;
  try {
    response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      tool_choice: { type: "tool", name: "submit_statements" },
      tools: [
        {
          name: "submit_statements",
          description: "Submit the generated set of statements.",
          input_schema: {
            type: "object",
            properties: {
              statements: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    is_correct: { type: "boolean" },
                    correction: { type: ["string", "null"] },
                    explanation: { type: ["string", "null"] },
                    error_tag: { type: ["string", "null"], enum: [...ERROR_TAGS, null] },
                  },
                  required: ["text", "is_correct", "correction", "explanation", "error_tag"],
                },
              },
            },
            required: ["statements"],
          },
        },
      ],
    });
  } catch (err) {
    console.error("AI generation request failed", err);
    return NextResponse.json({ error: "The AI generator is temporarily unavailable. Please try again." }, { status: 502 });
  }

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json({ error: "The AI didn't return a usable draft. Please try again." }, { status: 502 });
  }

  const parsedOutput = generatedSetSchema.safeParse(toolUse.input);
  if (!parsedOutput.success) {
    console.error("AI output failed validation", parsedOutput.error.flatten());
    return NextResponse.json({ error: "The AI draft didn't match the expected format. Please try again." }, { status: 502 });
  }

  const { data: updatedTeacher, error: consumeError } = await supabase.rpc("consume_ai_generation");
  if (consumeError) {
    // Someone else (another tab, or the pre-check racing a concurrent request)
    // used up the last free try between our check and now.
    return NextResponse.json({ error: consumeError.message }, { status: 403 });
  }

  return NextResponse.json({
    statements: parsedOutput.data.statements,
    aiGenerationsUsed: updatedTeacher?.ai_generations_used ?? null,
  });
}
