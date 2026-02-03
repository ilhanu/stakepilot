/**
 * Solana RPC utilities
 */

const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com";

export interface EpochInfo {
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
  absoluteSlot: number;
  blockHeight: number;
  transactionCount: number | null;
}

export async function getEpochInfo(): Promise<EpochInfo> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getEpochInfo",
    }),
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`RPC error: ${res.status}`);
  }

  const data = await res.json();
  return data.result;
}

export async function getCurrentEpoch(): Promise<number> {
  const epochInfo = await getEpochInfo();
  return epochInfo.epoch;
}

export function getEpochProgress(epochInfo: EpochInfo): number {
  return (epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100;
}

export function getTimeUntilNextEpoch(epochInfo: EpochInfo): string {
  const remainingSlots = epochInfo.slotsInEpoch - epochInfo.slotIndex;
  const secondsPerSlot = 0.4; // ~400ms per slot
  const remainingSeconds = remainingSlots * secondsPerSlot;
  
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  
  return `${hours}h ${minutes}m`;
}
