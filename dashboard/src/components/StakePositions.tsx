"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatSol, truncateAddress } from "@/lib/utils";

interface StakeAccount {
  pubkey: string;
  lamports: number;
  state: "active" | "inactive" | "activating" | "deactivating";
  voter?: string;
  activationEpoch?: number;
}

interface LstBalance {
  mint: string;
  name: string;
  symbol: string;
  balance: number;
  value: number; // in SOL equivalent
}

export function StakePositions() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [stakeAccounts, setStakeAccounts] = useState<StakeAccount[]>([]);
  const [lstBalances, setLstBalances] = useState<LstBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [solBalance, setSolBalance] = useState<number>(0);

  useEffect(() => {
    if (!connected || !publicKey) {
      setStakeAccounts([]);
      setLstBalances([]);
      setSolBalance(0);
      return;
    }

    async function fetchPositions() {
      if (!publicKey) return;
      setLoading(true);

      try {
        // Fetch SOL balance
        const balance = await connection.getBalance(publicKey);
        setSolBalance(balance / 1e9);

        // Fetch stake accounts
        const stakeAccountsRes = await connection.getParsedProgramAccounts(
          new (await import("@solana/web3.js")).PublicKey(
            "Stake11111111111111111111111111111111111111"
          ),
          {
            filters: [
              {
                memcmp: {
                  offset: 12,
                  bytes: publicKey.toBase58(),
                },
              },
            ],
          }
        );

        const parsedAccounts: StakeAccount[] = stakeAccountsRes.map(
          (account: any) => {
            const parsed = account.account.data.parsed?.info;
            const stake = parsed?.stake;
            const meta = parsed?.meta;

            let state: StakeAccount["state"] = "inactive";
            if (stake?.delegation) {
              const { activationEpoch, deactivationEpoch } = stake.delegation;
              if (deactivationEpoch !== "18446744073709551615") {
                state = "deactivating";
              } else if (activationEpoch !== "18446744073709551615") {
                state = "active";
              }
            }

            return {
              pubkey: account.pubkey.toBase58(),
              lamports: account.account.lamports,
              state,
              voter: stake?.delegation?.voter,
              activationEpoch: stake?.delegation?.activationEpoch
                ? parseInt(stake.delegation.activationEpoch)
                : undefined,
            };
          }
        );

        setStakeAccounts(parsedAccounts);

        // Fetch LST token balances
        const lstMints = [
          {
            mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
            name: "Jito Staked SOL",
            symbol: "jitoSOL",
            ratio: 1.25,
          },
          {
            mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
            name: "Marinade Staked SOL",
            symbol: "mSOL",
            ratio: 1.18,
          },
          {
            mint: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
            name: "BlazeStake",
            symbol: "bSOL",
            ratio: 1.15,
          },
        ];

        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: new (await import("@solana/web3.js")).PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
        );

        const balances: LstBalance[] = [];
        for (const lst of lstMints) {
          const tokenAccount = tokenAccounts.value.find(
            (acc: any) =>
              acc.account.data.parsed.info.mint === lst.mint
          );
          if (tokenAccount) {
            const amount =
              tokenAccount.account.data.parsed.info.tokenAmount.uiAmount || 0;
            if (amount > 0) {
              balances.push({
                mint: lst.mint,
                name: lst.name,
                symbol: lst.symbol,
                balance: amount,
                value: amount * lst.ratio,
              });
            }
          }
        }

        setLstBalances(balances);
      } catch (error) {
        console.error("Error fetching positions:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPositions();
  }, [connected, publicKey, connection]);

  if (!connected) {
    return null;
  }

  const totalStaked =
    stakeAccounts.reduce((sum, acc) => sum + acc.lamports, 0) / 1e9;
  const totalLst = lstBalances.reduce((sum, lst) => sum + lst.value, 0);
  const totalValue = solBalance + totalStaked + totalLst;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">👛</span> Your Stake Positions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-gray-400">
            Loading your positions...
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">SOL Balance</p>
                <p className="text-2xl font-bold">{solBalance.toFixed(2)} SOL</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">Native Staked</p>
                <p className="text-2xl font-bold">{totalStaked.toFixed(2)} SOL</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">Liquid Staked</p>
                <p className="text-2xl font-bold">≈{totalLst.toFixed(2)} SOL</p>
              </div>
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-blue-400">
                  {totalValue.toFixed(2)} SOL
                </p>
              </div>
            </div>

            {/* LST Balances */}
            {lstBalances.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-400 mb-3">
                  Liquid Staking Tokens
                </h4>
                <div className="space-y-2">
                  {lstBalances.map((lst) => (
                    <div
                      key={lst.mint}
                      className="flex items-center justify-between bg-gray-800/30 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {lst.symbol === "jitoSOL"
                            ? "🟢"
                            : lst.symbol === "mSOL"
                            ? "🔵"
                            : "🟠"}
                        </span>
                        <div>
                          <p className="font-medium">{lst.symbol}</p>
                          <p className="text-xs text-gray-500">{lst.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {lst.balance.toFixed(4)} {lst.symbol}
                        </p>
                        <p className="text-xs text-gray-500">
                          ≈ {lst.value.toFixed(2)} SOL
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Native Stake Accounts */}
            {stakeAccounts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">
                  Native Stake Accounts
                </h4>
                <div className="space-y-2">
                  {stakeAccounts.map((acc) => (
                    <div
                      key={acc.pubkey}
                      className="flex items-center justify-between bg-gray-800/30 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">🎯</span>
                        <div>
                          <p className="font-mono text-sm">
                            {truncateAddress(acc.pubkey, 8)}
                          </p>
                          {acc.voter && (
                            <p className="text-xs text-gray-500">
                              Validator: {truncateAddress(acc.voter, 6)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            acc.state === "active"
                              ? "success"
                              : acc.state === "activating"
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {acc.state}
                        </Badge>
                        <p className="font-semibold">
                          {formatSol(acc.lamports)} SOL
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stakeAccounts.length === 0 && lstBalances.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <p>No staking positions found.</p>
                <p className="text-sm mt-1">
                  Start staking to earn rewards!
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
