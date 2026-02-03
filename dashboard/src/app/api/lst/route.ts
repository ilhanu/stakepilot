import { NextResponse } from "next/server";
import { getLstComparison } from "@/lib/lst";

export const revalidate = 300;

export async function GET() {
  try {
    const comparison = await getLstComparison();

    return NextResponse.json({
      protocols: comparison.protocols,
      bestForYield: comparison.bestForYield,
      bestForMev: comparison.bestForMev,
      bestForLiquidity: comparison.bestForLiquidity,
      recommendation: comparison.recommendation,
      updatedAt: comparison.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching LST comparison:", error);
    return NextResponse.json(
      { error: "Failed to fetch LST comparison" },
      { status: 500 }
    );
  }
}
