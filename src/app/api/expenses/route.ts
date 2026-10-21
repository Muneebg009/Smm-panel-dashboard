import {
  expenseRepository,
  expenseStorageConfigured,
} from "@/lib/expenses/server";
import { ExpenseError } from "@/lib/expenses/repository";
import {
  requestSession,
  sameOrigin,
  boundedJSON,
  privateHeaders,
} from "@/lib/expenses/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const response = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: privateHeaders });
export async function GET(request: Request) {
  if (!requestSession(request))
    return response({ error: "Administrator sign-in required." }, 401);
  if (!expenseStorageConfigured())
    return response(
      { error: "Durable expense storage is not configured." },
      503,
    );
  try {
    const repo = await expenseRepository();
    const id = new URL(request.url).searchParams.get("history");
    if (id) return response({ history: await repo.history(id) });
    return response({
      expenses: await repo.list(),
      source: "manual",
      currencyConversion: false,
    });
  } catch {
    return response(
      { error: "Expense storage is unavailable. No data has been fabricated." },
      503,
    );
  }
}
async function save(request: Request, edit: boolean) {
  if (!requestSession(request))
    return response({ error: "Administrator sign-in required." }, 401);
  if (!sameOrigin(request))
    return response({ error: "Same-origin request required." }, 403);
  try {
    const input = await boundedJSON(request);
    if (!input || typeof input !== "object")
      return response({ error: "Invalid expense." }, 400);
    const payload = input as Record<string, unknown>;
    if (
      edit &&
      (typeof payload.id !== "string" || typeof payload.version !== "number")
    )
      return response({ error: "Expense ID and version are required." }, 400);
    if (
      !edit &&
      (typeof payload.createRequestId !== "string" ||
        !/^[a-f0-9-]{36}$/.test(payload.createRequestId))
    )
      return response({ error: "A valid idempotency key is required." }, 400);
    const repo = await expenseRepository();
    return response(
      {
        expense: await repo.save(
          payload,
          edit ? (payload.id as string) : undefined,
          edit ? (payload.version as number) : undefined,
          edit ? undefined : (payload.createRequestId as string),
        ),
      },
      edit ? 200 : 201,
    );
  } catch (error) {
    if (error instanceof ExpenseError)
      return response(
        {
          error:
            error.code === "CONFLICT"
              ? "This expense changed. Reload before editing."
              : error.code === "NOT_FOUND"
                ? "Expense not found."
                : "Invalid expense fields or decimal precision.",
        },
        error.code === "CONFLICT"
          ? 409
          : error.code === "NOT_FOUND"
            ? 404
            : 400,
      );
    return response(
      {
        error:
          "Expense storage or request is unavailable. No successful save is confirmed.",
      },
      503,
    );
  }
}
export async function POST(request: Request) {
  return save(request, false);
}
export async function PATCH(request: Request) {
  return save(request, true);
}
