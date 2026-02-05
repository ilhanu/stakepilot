export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { fetchAllValidators, getFilteredValidators } from "@/lib/validators-app";

export const revalidate = 300; // Cache for 5 minutes

/**
 * GET /api/validators-full
 * 
 * Returns full validator data from validators.app with filtering options.
 * 
 * Query params:
 * - minStake: minimum stake in SOL (default: 0)
 * - maxCommission: maximum commission % (default: 100)
 * - maxConcentration: max datacenter concentration (default: 1)
 * - excludeDelinquent: exclude delinquent validators (default: true)
 * - limit: max results (default: 100)
 * - search: search by name or vote account
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const minStake = parseFloat(searchParams.get("minStake") || "0");
  const maxCommission = parseFloat(searchParams.get("maxCommission") || "100");
  const maxConcentration = parseFloat(searchParams.get("maxConcentration") || "1");
  const excludeDelinquent = searchParams.get("excludeDelinquent") !== "false";
  const limit = parseInt(searchParams.get("limit") || "100");
  const search = searchParams.get("search");

  try {
    let validators = await getFilteredValidators({
      minStake,
      maxCommission,
      maxDatacenterConcentration: maxConcentration,
      excludeDelinquent,
    });

    // Apply search filter
    if (search) {
      const lowerSearch = search.toLowerCase();
      validators = validators.filter(
        (v) =>
          (v.name || "").toLowerCase().includes(lowerSearch) ||
          v.vote_account.toLowerCase().includes(lowerSearch)
      );
    }

    // Sort by stake (highest first)
    validators.sort((a, b) => b.stakeSol - a.stakeSol);

    // Apply limit
    validators = validators.slice(0, limit);

    return NextResponse.json({
      validators: validators.map((v) => ({
        voteAccount: v.vote_account,
        name: v.name || null,
        commission: v.commission,
        stakeSol: v.stakeSol,
        delinquent: v.delinquent,
        location: v.location,
        datacenter: v.data_center_key || null,
        qualityTier: v.qualityTier,
        uptimePercent: v.uptimePercent,
        ageInDays: v.ageInDays,
        jito: v.jito || false,
        jitoCommission: v.jito_commission || null,
        netBaseApy: v.netBaseApy,
        netMevApy: v.netMevApy,
        netTotalApy: v.netTotalApy,
      })),
      count: validators.length,
      totalValidators: (await fetchAllValidators()).length,
      filters: {
        minStake,
        maxCommission,
        maxConcentration,
        excludeDelinquent,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching validators:", error);
    return NextResponse.json(
      { error: "Failed to fetch validators" },
      { status: 500 }
    );
  }
}
