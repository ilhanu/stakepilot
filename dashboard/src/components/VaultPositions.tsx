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

export function VaultPositions() {
  const [positions, setPositions] = useState<StakePosition[]>([]);
  const [validatorNames, setValidatorNames] = useState<Map<string, ValidatorInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [totalStaked, setTotalStaked] = useState(0);
  const [currentEpoch, setCurrentEpoch] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch positions
        const posRes = await fetch("/api/agent/positions");
        const posData = await posRes.json();
        
        if (posData.positions) {
          setPositions(posData.positions);
          setTotalStaked(posData.totalStaked || 0);
          setCurrentEpoch(posData.currentEpoch || 0);
          
          // Fetch validator names for each position
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-[var(--accent)] bg-[var(--accent)]/10";
      case "activating": return "text-blue-400 bg-blue-400/10";
      case "deactivating": return "text-orange-400 bg-orange-400/10";
      case "inactive": return "text-gray-400 bg-gray-400/10";
      default: return "text-gray-400 bg-gray-400/10";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Active";
      case "activating": return "Warming Up";
      case "deactivating": return "Cooling Down";
      case "inactive": return "Inactive";
      default: return status;
    }
  };

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

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-4 md:p-6 border border-[var(--border)]">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="text-base md:text-lg font-semibold">Stake Positions</h2>
        <div className="text-xs md:text-sm text-[var(--text-secondary)]">
          Epoch {currentEpoch}
        </div>
      </div>
      
      {positions.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-secondary)]">
          <div className="text-3xl mb-2">🥩</div>
          <div className="text-sm">No active stakes yet</div>
          <div className="text-xs mt-1">Deposit SOL and the agent will stake automatically</div>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] rounded-lg mb-4">
            <div>
              <div className="text-xs text-[var(--text-secondary)]">Total Staked</div>
              <div className="text-lg font-bold text-[var(--accent)]">{totalStaked.toFixed(2)} SOL</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[var(--text-secondary)]">Validators</div>
              <div className="text-lg font-bold">{positions.length}</div>
            </div>
          </div>
          
          {/* Positions List */}
          <div className="space-y-2 md:space-y-3">
            {positions.map((pos) => {
              const validator = validatorNames.get(pos.validatorVote);
              const isStakerSpace = pos.validatorVote === "3S4jVg5p1rw7t8MS5UtjhnChmo6ABdmh3nyXTVzAyP9f";
              
              return (
                <div 
                  key={pos.stakeAccount} 
                  className={`p-3 rounded-lg border transition-colors ${
                    isStakerSpace 
                      ? "bg-[var(--accent)]/5 border-[var(--accent)]/20" 
                      : "bg-[var(--bg-elevated)] border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isStakerSpace && (
                        <span className="text-xs">⭐</span>
                      )}
                      <span className="font-medium text-sm truncate">
                        {validator?.name || `${pos.validatorVote.slice(0, 8)}...`}
                      </span>
                      {validator?.location && (
                        <span className="text-xs text-[var(--text-secondary)]">
                          {validator.location === "NL" ? "🇳🇱" : validator.location}
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(pos.status)}`}>
                      {getStatusLabel(pos.status)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                      <span>{pos.stakedAmount.toFixed(3)} SOL</span>
                      {validator?.commission !== undefined && (
                        <span>{validator.commission}% fee</span>
                      )}
                    </div>
                    <a
                      href={`https://explorer.solana.com/address/${pos.stakeAccount}?cluster=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:underline"
                    >
                      View →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
