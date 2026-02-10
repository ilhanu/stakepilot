import { NextResponse } from "next/server";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

export const dynamic = "force-dynamic";

const VAULT_PDA = new PublicKey("HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u");
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.testnet.solana.com";
const VALIDATORS_APP_TOKEN = process.env.VALIDATORS_APP_TOKEN || "uawTM1ynsnonDJ9z8YUun59F";

// Solana base staking APY (approximate, varies by epoch)
const BASE_STAKING_APY = 7.0;

interface ValidatorInfo {
  vote_account: string;
  commission: number;
  name?: string;
}

/**
 * GET /api/agent/apy
 * 
 * Returns estimated APY for the vault based on:
 * - Active stake positions and their validators
 * - Each validator's commission rate
 * - Solana base staking rate (~7%)
 * - Net APY = base_rate * (1 - commission/100)
 */
export async function GET() {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const epochInfo = await connection.getEpochInfo();
    const currentEpoch = epochInfo.epoch;

    // Get all vault stake accounts
    const stakeAccounts = await connection.getProgramAccounts(
      new PublicKey("Stake11111111111111111111111111111111111111"),
      {
        filters: [{ memcmp: { offset: 12, bytes: VAULT_PDA.toBase58() } }],
      }
    );

    // Parse positions
    const positions: { voter: string; amount: number; status: string }[] = [];
    for (const account of stakeAccounts) {
      const data = account.account.data;
      const delegationOffset = 124;
      if (data.length > delegationOffset + 72) {
        const voterPubkey = new PublicKey(data.slice(delegationOffset, delegationOffset + 32));
        const stake = Number(data.readBigUInt64LE(delegationOffset + 32)) / LAMPORTS_PER_SOL;
        const activationEpoch = Number(data.readBigUInt64LE(delegationOffset + 40));
        const deactivationEpoch = Number(data.readBigUInt64LE(delegationOffset + 48));

        let status: string;
        if (deactivationEpoch !== 0xffffffffffffffff && deactivationEpoch <= currentEpoch) {
          status = "inactive";
        } else if (deactivationEpoch !== 0xffffffffffffffff) {
          status = "deactivating";
        } else if (activationEpoch >= currentEpoch) {
          status = "activating";
        } else {
          status = "active";
        }

        positions.push({ voter: voterPubkey.toBase58(), amount: stake, status });
      }
    }

    // Get active/activating positions (earning yield)
    const earning = positions.filter(p => p.status === "active" || p.status === "activating");
    const notEarning = positions.filter(p => p.status === "deactivating" || p.status === "inactive");
    const totalEarning = earning.reduce((s, p) => s + p.amount, 0);
    const totalNotEarning = notEarning.reduce((s, p) => s + p.amount, 0);
    const totalStaked = totalEarning + totalNotEarning;

    // Fetch validator commissions from validators.app
    let validatorMap = new Map<string, ValidatorInfo>();
    try {
      const res = await fetch(
        `https://www.validators.app/api/v1/validators/testnet.json?order=score&limit=200`,
        { headers: { Token: VALIDATORS_APP_TOKEN }, next: { revalidate: 300 } }
      );
      if (res.ok) {
        const validators: ValidatorInfo[] = await res.json();
        for (const v of validators) {
          validatorMap.set(v.vote_account, v);
        }
      }
    } catch {
      // Fall back to default commission assumption
    }

    // Calculate weighted average APY for earning positions
    const positionDetails: {
      validator: string;
      validatorName: string;
      amount: number;
      commission: number;
      netApy: number;
      status: string;
    }[] = [];

    let weightedApySum = 0;

    for (const pos of positions) {
      const vInfo = validatorMap.get(pos.voter);
      const commission = vInfo?.commission ?? 5; // default 5% if unknown
      const name = vInfo?.name || `${pos.voter.slice(0, 8)}...`;
      
      // Net APY after commission
      const netApy = pos.status === "active" || pos.status === "activating"
        ? BASE_STAKING_APY * (1 - commission / 100)
        : 0; // deactivating/inactive earns nothing

      if (pos.status === "active" || pos.status === "activating") {
        weightedApySum += netApy * pos.amount;
      }

      positionDetails.push({
        validator: pos.voter,
        validatorName: name,
        amount: pos.amount,
        commission,
        netApy: parseFloat(netApy.toFixed(2)),
        status: pos.status,
      });
    }

    // Weighted average APY across earning positions
    const avgApy = totalEarning > 0 ? weightedApySum / totalEarning : 0;
    
    // Effective APY considers all capital (including cooling/idle)
    const effectiveApy = totalStaked > 0 ? weightedApySum / totalStaked : 0;

    return NextResponse.json({
      success: true,
      apy: {
        base: BASE_STAKING_APY,
        avgNet: parseFloat(avgApy.toFixed(2)),
        effective: parseFloat(effectiveApy.toFixed(2)),
        avgCommission: totalEarning > 0
          ? parseFloat((positionDetails
              .filter(p => p.status === "active" || p.status === "activating")
              .reduce((s, p) => s + p.commission * p.amount, 0) / totalEarning).toFixed(1))
          : 0,
      },
      summary: {
        totalEarning: parseFloat(totalEarning.toFixed(4)),
        totalNotEarning: parseFloat(totalNotEarning.toFixed(4)),
        totalStaked: parseFloat(totalStaked.toFixed(4)),
        positionCount: positions.length,
        earningCount: earning.length,
      },
      positions: positionDetails.sort((a, b) => b.amount - a.amount),
      currentEpoch,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("APY calculation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
