import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";

export const dynamic = "force-dynamic";

const dataset = process.env.BIGQUERY_DATASET || "analytics_233462855";

export async function GET() {
  try {
    // Sample rows
    const [sampleRows] = await bigquery.query({
      query: `
        SELECT event_date, event_name, event_value_in_usd, user_id
        FROM \`${dataset}.events_*\`
        WHERE _TABLE_SUFFIX >= '20220518'
        LIMIT 5
      `,
    });

    // Top 20 event names and counts
    const [topEvents] = await bigquery.query({
      query: `
        SELECT event_name as event, COUNT(*) as count
        FROM \`${dataset}.events_*\`
        WHERE _TABLE_SUFFIX >= '20220518'
        GROUP BY event_name
        ORDER BY count DESC
        LIMIT 20
      `,
    });

    return NextResponse.json({ sample: sampleRows, topEvents });
  } catch (error) {
    console.error("Schema fetch error:", error);
    return NextResponse.json(
      { error: String(error), message: (error as Error)?.message },
      { status: 500 }
    );
  }
}
