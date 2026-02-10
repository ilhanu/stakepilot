import { NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.testnet.solana.com";

export async function GET() {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const epochInfo = await connection.getEpochInfo();
    
    const epochProgress = epochInfo.slotIndex / epochInfo.slotsInEpoch;
    const slotsRemaining = epochInfo.slotsInEpoch - epochInfo.slotIndex;
    const slotTimeMs = 400; // ~400ms per slot on testnet
    const msRemaining = slotsRemaining * slotTimeMs;
    const hoursRemaining = msRemaining / 3600000;
    
    // Estimate epoch end time
    const epochEndEstimate = new Date(Date.now() + msRemaining).toISOString();
    
    // Cron runs every 8 hours (0:00, 8:00, 16:00 UTC)
    const now = new Date();
    const currentHour = now.getUTCHours();
    const nextCronHour = Math.ceil(currentHour / 8) * 8;
    const nextCron = new Date(now);
    nextCron.setUTCHours(nextCronHour >= 24 ? 0 : nextCronHour, 0, 0, 0);
    if (nextCron <= now) nextCron.setUTCDate(nextCron.getUTCDate() + 1);
    
    // Read last run from agent state
    let lastRun = null;
    try {
      const statePath = path.join(process.cwd(), "public", "agent-state.json");
      if (fs.existsSync(statePath)) {
        const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
        lastRun = state.lastRun || null;
      }
    } catch {}
    
    return NextResponse.json({
      epoch: epochInfo.epoch,
      epochProgress: Math.round(epochProgress * 1000) / 10, // 1 decimal %
      epochHoursRemaining: Math.round(hoursRemaining * 10) / 10,
      epochEndEstimate,
      slotsRemaining,
      slotsInEpoch: epochInfo.slotsInEpoch,
      nextAgentRun: nextCron.toISOString(),
      lastAgentRun: lastRun,
      cronIntervalHours: 8,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
