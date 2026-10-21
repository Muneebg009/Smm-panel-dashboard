import { requestSession, privateHeaders } from "@/lib/expenses/auth";
import { analyticsSource } from "@/lib/analytics/source";
import {
  analyze,
  parseQuery,
  applyProviderMappings,
} from "@/lib/analytics/engine";
import { analyticsCSV } from "@/lib/analytics/export";
import {
  mappingRepository,
  mappingStorageConfigured,
} from "@/lib/analytics/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!requestSession(request))
    return Response.json(
      { error: "Administrator sign-in required." },
      { status: 401, headers: privateHeaders },
    );
  try {
    const params = new URL(request.url).searchParams;
    const q = parseQuery(params);
    let source = analyticsSource(q.mode);
    let manualMappings = 0;
    if (q.mode === "live" && mappingStorageConfigured()) {
      const mappings = await (await mappingRepository()).list();
      manualMappings = mappings.filter((m) => m.active).length;
      source = applyProviderMappings(source, mappings, q.end);
    }
    const exporting = params.get("format") === "csv";
    const result = analyze(source, q, exporting);
    result.manualMappings = manualMappings;
    const detail = params.get("detail");
    if (detail) {
      const all = analyze(
        source,
        { ...q, status: "All", search: "", view: "orders" },
        true,
      );
      const row = all.rows.find((o) => o.id === detail);
      if (!row)
        return Response.json(
          {
            error:
              "Order detail is unavailable in this source and filter context.",
          },
          { status: 404, headers: privateHeaders },
        );
      return Response.json(
        {
          order: row,
          mode: q.mode,
          historyAvailable:
            "statusHistory" in row && row.statusHistory !== null,
        },
        { headers: privateHeaders },
      );
    }
    if (exporting)
      return new Response(analyticsCSV(result, q), {
        headers: {
          ...privateHeaders,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${q.mode}-${q.view}-${q.currency}-${q.start}-${q.end}.csv"`,
        },
      });
    return Response.json(result, { headers: privateHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const inputMessages = [
      "Invalid ",
      "Select an inclusive",
      "Unsupported currency",
      "Search is too long",
      "Export exceeds",
    ];
    if (inputMessages.some((prefix) => message.startsWith(prefix)))
      return Response.json(
        { error: message },
        { status: 400, headers: privateHeaders },
      );
    return Response.json(
      {
        error:
          "Analytics are unavailable because source integrity or application storage could not be verified. No live panel request was made.",
      },
      { status: 503, headers: privateHeaders },
    );
  }
}
