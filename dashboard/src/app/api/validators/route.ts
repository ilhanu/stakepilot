export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import {
  getAllValidators,
  getQualifiedValidators,
  getTopValidators,
  getValidator,
  STAKER_SPACE_VALIDATOR,
  formatValidator,
  estimateApy,
} from "@/lib/validators";

/**
 * Validators API - TESTNET ONLY
 * 
 * Query params:
 * - filter: "all" | "qualified" | "top" (default: qualified)
 * - limit: max results (default: 50 for all, 20 for top)
 * - vote: specific vote account to fetch
 * - search: search by name or address
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const filter = searchParams.get("filter") || "qualified";
  const limit = parseInt(searchParams.get("limit") || (filter === "top" ? "20" : "50"));
  const vote = searchParams.get("vote");
  const search = searchParams.get("search");

  try {
    // Single validator lookup
    if (vote) {
      const validator = await getValidator(vote);
      if (!validator) {
        return NextResponse.json(
          { error: "Validator not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        validator: {
          ...validator,
          ...formatValidator(validator),
          estimatedApy: estimateApy(validator),
        },
        network: "testnet",
      });
    }

    // Fetch validators based on filter
    let validators;
    switch (filter) {
      case "all":
        validators = (await getAllValidators()).slice(0, limit);
        break;
      case "top":
        validators = await getTopValidators(limit);
        break;
      case "qualified":
      default:
        validators = (await getQualifiedValidators()).slice(0, limit);
        break;
    }

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      validators = validators.filter(v =>
        v.name.toLowerCase().includes(searchLower) ||
        v.voteAccount.toLowerCase().includes(searchLower) ||
        v.identity.toLowerCase().includes(searchLower)
      );
    }

    // Format response
    const formattedValidators = validators.map(v => ({
      voteAccount: v.voteAccount,
      identity: v.identity,
      name: v.name,
      commission: v.commission,
      mevCommission: v.mevCommission,
      activatedStake: v.activatedStake,
      ...formatValidator(v),
      estimatedApy: estimateApy(v),
      delinquent: v.delinquent,
      isJito: v.isJito,
      isDz: v.isDz,
      uptime: v.uptime,
      totalScore: v.totalScore,
      location: v.location,
      avatarUrl: v.avatarUrl,
      website: v.website,
    }));

    return NextResponse.json({
      success: true,
      network: "testnet",
      filter,
      count: formattedValidators.length,
      stakerSpaceValidator: STAKER_SPACE_VALIDATOR,
      validators: formattedValidators,
    });
  } catch (error) {
    console.error("Error fetching validators:", error);
    return NextResponse.json(
      { error: "Failed to fetch validators", details: String(error) },
      { status: 500 }
    );
  }
}
