import { mappingRepository } from "@/lib/analytics/server";
import { MappingError } from "@/lib/analytics/mappings";
import {
  requestSession,
  sameOrigin,
  boundedJSON,
  privateHeaders,
} from "@/lib/expenses/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: privateHeaders });
export async function GET(request: Request) {
  if (!requestSession(request))
    return reply({ error: "Administrator sign-in required." }, 401);
  try {
    const repo = await mappingRepository();
    const history = new URL(request.url).searchParams.get("history");
    return history
      ? reply({ history: await repo.history(history) })
      : reply({
          mappings: await repo.list(),
          source: "manual — not API-verified",
        });
  } catch {
    return reply(
      {
        error:
          "Manual mapping storage is unavailable. Configure the application database.",
      },
      503,
    );
  }
}
async function write(request: Request, deactivate: boolean) {
  if (!requestSession(request))
    return reply({ error: "Administrator sign-in required." }, 401);
  if (!sameOrigin(request))
    return reply({ error: "Same-origin request required." }, 403);
  try {
    const input = (await boundedJSON(request)) as Record<string, unknown>;
    if (!input || typeof input !== "object")
      return reply({ error: "Invalid mapping input." }, 400);
    const repo = await mappingRepository();
    if (deactivate) {
      if (typeof input.id !== "string" || !Number.isSafeInteger(input.version))
        return reply({ error: "Mapping ID and version required." }, 400);
      return reply({
        mapping: await repo.deactivate(input.id, input.version as number),
      });
    }
    if (typeof input.requestId !== "string" || input.attest !== true)
      return reply(
        { error: "Explicit identifier/evidence attestation is required." },
        400,
      );
    return reply({ mapping: await repo.create(input, input.requestId) }, 201);
  } catch (error) {
    if (error instanceof MappingError)
      return reply(
        {
          error:
            error.code === "OVERLAP"
              ? "An active mapping overlaps this service date range. Deactivate the old mapping or choose non-overlapping dates."
              : error.code === "CONFLICT"
                ? "A mapping changed or conflicts with existing evidence. Reload and review."
                : error.code === "NOT_FOUND"
                  ? "Mapping not found."
                  : "Invalid mapping identifiers, dates or evidence.",
        },
        ["OVERLAP", "CONFLICT"].includes(error.code)
          ? 409
          : error.code === "NOT_FOUND"
            ? 404
            : 400,
      );
    return reply(
      {
        error:
          "Mapping request or storage is unavailable. No panel operation was performed.",
      },
      503,
    );
  }
}
export async function POST(request: Request) {
  return write(request, false);
}
export async function PATCH(request: Request) {
  return write(request, true);
}
