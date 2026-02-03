import { NextRequest, NextResponse } from "next/server";
import { 
  getAllValidators, 
  enrichValidators, 
  filterValidators,
  getLocationStats,
  ValidatorFilters,
  ValidatorMetrics 
} from "@/lib/validators-app";

export const revalidate = 300; // Cache for 5 minutes

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    
    // Parse filter params
    const filters: ValidatorFilters = {};
    
    if (params.has("minUptime")) {
      filters.minUptimePercent = parseFloat(params.get("minUptime")!);
    }
    if (params.has("maxSkipped")) {
      filters.maxSkippedSlotPercent = parseFloat(params.get("maxSkipped")!);
    }
    if (params.has("countries")) {
      filters.countries = params.get("countries")!.split(",");
    }
    if (params.has("excludeCountries")) {
      filters.excludeCountries = params.get("excludeCountries")!.split(",");
    }
    if (params.has("minAge")) {
      filters.minAgeDays = parseInt(params.get("minAge")!);
    }
    if (params.has("maxCommission")) {
      filters.maxCommission = parseInt(params.get("maxCommission")!);
    }
    if (params.has("requireJito")) {
      filters.requireJito = params.get("requireJito") === "true";
    }
    if (params.has("maxJitoCommission")) {
      filters.maxJitoCommission = parseInt(params.get("maxJitoCommission")!);
    }
    if (params.has("minScore")) {
      filters.minScore = parseFloat(params.get("minScore")!);
    }
    if (params.has("maxStake")) {
      filters.maxStakeSol = parseFloat(params.get("maxStake")!);
    }
    if (params.has("minStake")) {
      filters.minStakeSol = parseFloat(params.get("minStake")!);
    }

    const limit = parseInt(params.get("limit") || "100");
    const includeLocationStats = params.get("locationStats") === "true";

    // Fetch from validators.app
    const rawValidators = await getAllValidators({ 
      limit: 1000,  // Get more, then filter
      order: "score",
      activeOnly: true,
    });

    // Enrich with derived metrics
    const enriched = enrichValidators(rawValidators);

    // Apply filters
    const filtered = filterValidators(enriched, filters);

    // Limit results
    const results = filtered.slice(0, limit);

    // Build response
    const response: any = {
      validators: results.map((v) => ({
        // Core identity
        voteAccount: v.vote_account,
        identity: v.account,
        name: v.name,
        
        // Performance
        score: v.total_score,
        qualityTier: v.qualityTier,
        uptimePercent: v.uptimePercent,
        skippedSlotPercent: parseFloat(v.skipped_slot_percent),
        epochCredits: v.epoch_credits,
        delinquent: v.delinquent,
        
        // Location
        location: v.location,
        datacenter: v.data_center_key,
        coordinates: {
          lat: parseFloat(v.latitude),
          lng: parseFloat(v.longitude),
        },
        
        // Age
        ageInDays: v.ageInDays,
        createdAt: v.created_at,
        
        // Commission
        stakeCommission: v.commission,
        jitoEnabled: v.jito,
        jitoCommission: v.jito_commission,
        
        // Stake
        stakeSol: v.stakeSol,
        stakePools: v.stake_pools_list,
        
        // Software
        version: v.software_version,
        client: v.software_client,
        
        // Network
        pingTime: v.ping_time ? parseFloat(v.ping_time) : null,
        
        // Links
        website: v.www_url,
        avatar: v.avatar_url,
        details: v.details,
      })),
      
      meta: {
        total: filtered.length,
        returned: results.length,
        filters: Object.keys(filters).length > 0 ? filters : null,
        updatedAt: new Date().toISOString(),
      },
    };

    // Add location stats if requested
    if (includeLocationStats) {
      response.locationStats = getLocationStats(enriched).slice(0, 20);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Enhanced validators API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch validators", details: String(error) },
      { status: 500 }
    );
  }
}
