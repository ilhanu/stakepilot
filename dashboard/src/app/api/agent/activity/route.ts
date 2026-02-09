import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

/**
 * GET /api/agent/activity
 * 
 * Returns agent activity log (written by agent-execute.ts).
 * Falls back to on-chain transaction history if no log file exists.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");

  try {
    // Try reading the activity log file
    const logPath = path.join(process.cwd(), "public", "agent-activity.json");
    
    if (fs.existsSync(logPath)) {
      const activities = JSON.parse(fs.readFileSync(logPath, "utf-8"));
      return NextResponse.json({
        activities: activities.slice(0, limit),
        count: Math.min(activities.length, limit),
        source: "log",
      });
    }

    // No log file — return empty with hint
    return NextResponse.json({
      activities: [],
      count: 0,
      source: "none",
      hint: "Agent has not run yet. Activity will appear after the first agent execution.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, activities: [], count: 0 },
      { status: 500 }
    );
  }
}
