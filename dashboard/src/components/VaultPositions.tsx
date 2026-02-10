"use client";

import { useState, useEffect } from "react";

interface StakePosition {
  stakeAccount: string;
  validatorVote: string;
  validatorName?: string;
  stakedAmount: number;
  status: "activating" | "active" | "deactivating" | "inactive";
  activationEpoch: number | null;
  deactivationEpoch: number | null;
}

interface ValidatorInfo {
  name: string;
  commission: number;
  location?: string;
}

interface PositionGroup {
  status: "active" | "activating" | "deactivating" | "inactive";
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  positions: StakePosition[];
  totalSol: number;
}

const STAKER_SPACE_VOTE = "3S4jVg5p1rw7t8MS5UtjhnChmo6ABdmh3nyXTVzAyP9f";

export function VaultPositions() {
  const [positions, setPositions] = useState<StakePosition[]>([]);
  const [validatorNames, setValidatorNames] = useState<Map<string, ValidatorInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [totalStaked, setTotalStaked] = useState(0);
  const [currentEpoch, setCurrentEpoch] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const posRes = await fetch("/api/agent/positions");
        const posData = await posRes.json();
        
        if (posData.positions) {
          setPositions(posData.positions);
          setTotalStaked(posData.totalStaked || 0);
          setCurrentEpoch(posData.currentEpoch || 0);
          
          const validatorVotes = [...new Set(posData.positions.map((p: StakePosition) => p.validatorVote))] as string[];
          const nameMap = new Map<string, ValidatorInfo>();
          for (const vote of validatorVotes) {
            try {
              const valRes = await fetch(`/api/validators?vote=${vote}`);
              const valData = await valRes.json();
              if (valData.validator) {
                nameMap.set(vote, {
                  name: valData.validator.name,
                  commission: valData.validator.commission,
                  location: valData.validator.location?.country,
                });
              }
            } catch (e) {
              console.error("Failed to fetch validator:", vote, e);
            }
          }
          setValidatorNames(nameMap);
        }
      } catch (error) {
        console.error("Failed to fetch positions:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl p-4 md:p-6 border border-[var(--border)]">
        <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Stake Positions</h2>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-[var(--bg-elevated)] rounded-lg" />
          <div className="h-16 bg-[var(--bg-elevated)] rounded-lg" />
        </div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl p-4 md:p-6 border border-[var(--border)]">
        <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Stake Positions</h2>
        <div className="text-center py-8 text-[var(--text-secondary)]">
          <div className="text-3xl mb-2">🥩</div>
          <div className="text-sm">No active stakes yet</div>
          <div className="text-xs mt-1">Deposit SOL and the agent will stake automatically</div>
        </div>
      </div>
    );
  }

  // Group positions by status
  const groupConfigs: Omit<PositionGroup, "positions" | "totalSol">[] = [
    { status: "active", label: "Active", emoji: "🟢", color: "text-[var(--accent)]", bgColor: "bg-[var(--accent)]/5", borderColor: "border-[var(--accent)]/20", description: "Earning staking rewards" },
    { status: "activating", label: "Warming Up", emoji: "🟡", color: "text-yellow-400", bgColor: "bg-yellow-400/5", borderColor: "border-yellow-400/20", description: "Pending activation this epoch" },
    { status: "deactivating", label: "Cooling Down", emoji: "🟠", color: "text-orange-400", bgColor: "bg-orange-400/5", borderColor: "border-orange-400/20", description: "Being unstaked, ~2 day cooldown" },
    { status: "inactive", label: "Ready to Withdraw", emoji: "🔵", color: "text-blue-400", bgColor: "bg-blue-400/5", borderColor: "border-blue-400/20", description: "Fully deactivated, can be withdrawn" },
  ];

  const groups: PositionGroup[] = groupConfigs
    .map((config) => {
      const groupPositions = positions.filter((p) => p.status === config.status);
      return {
        ...config,
        positions: groupPositions,
        totalSol: groupPositions.reduce((sum, p) => sum + p.stakedAmount, 0),
      };
    })
    .filter((g) => g.positions.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base md:text-lg font-semibold">Stake Positions</h2>
        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
          <span>Epoch {currentEpoch}</span>
          <span>•</span>
          <span>{positions.length} positions</span>
          <span>•</span>
          <span className="text-[var(--accent)] font-medium">{totalStaked.toFixed(2)} SOL</span>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.status} className={`rounded-xl border ${group.borderColor} ${group.bgColor} overflow-hidden`}>
          {/* Group Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)]/50">
            <div className="flex items-center gap-2">
              <span>{group.emoji}</span>
              <span className={`font-semibold text-sm ${group.color}`}>{group.label}</span>
              <span className="text-xs text-[var(--text-muted)]">({group.positions.length})</span>
              <span className="text-xs text-[var(--text-muted)] hidden sm:inline">— {group.description}</span>
            </div>
            <span className={`font-bold text-sm ${group.color}`}>{group.totalSol.toFixed(3)} SOL</span>
          </div>

          {/* Positions */}
          <div className="divide-y divide-[var(--border)]/30">
            {group.positions.map((pos) => {
              const validator = validatorNames.get(pos.validatorVote);
              const isStakerSpace = pos.validatorVote === STAKER_SPACE_VOTE;

              return (
                <div key={pos.stakeAccount} className="px-4 py-2.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    {isStakerSpace && <span className="text-xs" title="Staker Space validator">⭐</span>}
                    <span className="font-medium text-sm truncate">
                      {pos.validatorName || validator?.name || `${pos.validatorVote.slice(0, 8)}...`}
                    </span>
                    {validator?.commission !== undefined && (
                      <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">{validator.commission}% fee</span>
                    )}
                    {validator?.commission !== undefined && (group.status === "active" || group.status === "activating") && (
                      <span className="text-[10px] text-[var(--accent)] hidden sm:inline">
                        {(7.0 * (1 - validator.commission / 100)).toFixed(2)}% APY
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {pos.activationEpoch && group.status === "active" && (
                      <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">since epoch {pos.activationEpoch}</span>
                    )}
                    {pos.deactivationEpoch && group.status === "deactivating" && currentEpoch > 0 && (
                      <span className="text-[10px] text-orange-400 hidden sm:inline">
                        ~{Math.max(0, pos.deactivationEpoch + 1 - currentEpoch)} epoch(s) left
                      </span>
                    )}
                    <span className="text-sm font-mono font-medium w-24 text-right">{pos.stakedAmount.toFixed(3)} SOL</span>
                    <a
                      href={`https://explorer.solana.com/address/${pos.stakeAccount}?cluster=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--text-muted)] hover:text-[var(--accent)] text-xs transition-colors"
                    >
                      ↗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
