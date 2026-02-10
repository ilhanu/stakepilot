"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false, loading: () => <div className="h-10 w-32 bg-[var(--bg-elevated)] rounded-xl animate-pulse" /> }
);
import {
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { AgentActivity } from "@/components/AgentActivity";
import { VaultPositions } from "@/components/VaultPositions";

const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");

function encodeU64(value: number): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, value & 0xffffffff, true);
  view.setUint32(4, Math.floor(value / 0x100000000), true);
  return new Uint8Array(buffer);
}
const VAULT_PDA = new PublicKey("HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u");

interface VaultStatus {
  totalDeposits: number;
  totalStaked: number;
  totalUsers: number;
  userDeposit: number;
  userPendingUnstake: number;
}

interface PositionSummary {
  active: number;
  activating: number;
  deactivating: number;
  inactive: number;
  total: number;
  count: number;
}

interface ActivityEntry {
  type: string;
  summary: string;
  timestamp: string;
  txSignature?: string;
}

interface Recommendation {
  validator: string;
  validatorName: string;
  allocatedAmount: number;
  expectedApy: number;
  score: number;
  wizScore?: number;
}

// ─── Vault State Card ────────────────────────────────────────────────
function VaultStateCard({ label, value, subtitle, color, icon }: {
  label: string; value: string; subtitle?: string; color: string; icon: string;
}) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">{label}</span>
      </div>
      <div className={`text-2xl md:text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-[var(--text-muted)] mt-0.5">SOL</div>
      {subtitle && <div className="text-[10px] text-[var(--text-muted)] mt-1">{subtitle}</div>}
    </div>
  );
}

// ─── Flow Bar ────────────────────────────────────────────────────────
function FlowBar({ positions }: { positions: PositionSummary }) {
  const total = positions.active + positions.activating + positions.deactivating + positions.inactive;
  if (total === 0) return null;
  const pct = (v: number) => Math.max((v / total) * 100, v > 0 ? 4 : 0);

  return (
    <div className="mt-1">
      <div className="flex rounded-full h-2.5 overflow-hidden bg-[var(--bg-elevated)]">
        {positions.active > 0 && (
          <div className="bg-[var(--accent)] transition-all" style={{ width: `${pct(positions.active)}%` }} title={`Active: ${positions.active.toFixed(2)}`} />
        )}
        {positions.activating > 0 && (
          <div className="bg-yellow-400 transition-all" style={{ width: `${pct(positions.activating)}%` }} title={`Warming Up: ${positions.activating.toFixed(2)}`} />
        )}
        {positions.deactivating > 0 && (
          <div className="bg-orange-400 transition-all" style={{ width: `${pct(positions.deactivating)}%` }} title={`Cooling Down: ${positions.deactivating.toFixed(2)}`} />
        )}
        {positions.inactive > 0 && (
          <div className="bg-blue-400 transition-all" style={{ width: `${pct(positions.inactive)}%` }} title={`Withdrawable: ${positions.inactive.toFixed(2)}`} />
        )}
      </div>
      <div className="flex items-center gap-3 mt-2 flex-wrap text-[10px] text-[var(--text-muted)]">
        {positions.active > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--accent)]" />Active</span>}
        {positions.activating > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />Warming Up</span>}
        {positions.deactivating > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" />Cooling Down</span>}
        {positions.inactive > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />Withdrawable</span>}
      </div>
    </div>
  );
}

// ─── Agent Status Widget ─────────────────────────────────────────────
function AgentStatusWidget({ activity, positionCount, currentEpoch }: {
  activity: ActivityEntry[]; positionCount: number; currentEpoch: number;
}) {
  const [schedule, setSchedule] = useState<{
    epoch: number; epochProgress: number; epochHoursRemaining: number;
    nextAgentRun: string; lastAgentRun: string | null; cronIntervalHours: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/agent/schedule").then(r => r.json()).then(setSchedule).catch(() => {});
    const interval = setInterval(() => {
      fetch("/api/agent/schedule").then(r => r.json()).then(setSchedule).catch(() => {});
    }, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const lastAction = activity[0];
  const now = new Date();

  const formatRelative = (d: Date) => {
    const diff = Math.abs(now.getTime() - d.getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m ago`;
  };

  const formatUntil = (iso: string) => {
    const diff = new Date(iso).getTime() - now.getTime();
    if (diff <= 0) return "imminent";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `~${mins}m`;
    return `~${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const epochPct = schedule?.epochProgress ?? 0;

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
        <span className="text-sm font-semibold">Autonomous Agent</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] font-medium">ACTIVE</span>
        <span className="text-[10px] text-[var(--text-muted)] ml-auto">every {schedule?.cronIntervalHours ?? 8}h</span>
      </div>
      
      {/* Epoch Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1">
          <span>Epoch {schedule?.epoch ?? currentEpoch}</span>
          <span>{epochPct}% — {schedule ? `~${schedule.epochHoursRemaining}h left` : "..."}</span>
        </div>
        <div className="w-full h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${epochPct}%`,
              background: epochPct >= 80 
                ? 'linear-gradient(90deg, var(--accent), var(--accent-secondary))' 
                : 'var(--accent)',
              opacity: epochPct >= 80 ? 1 : 0.6,
            }}
          />
        </div>
        {epochPct >= 80 && (
          <div className="text-[10px] text-[var(--accent)] mt-1">⚡ Rebalancing window open</div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-[var(--text-muted)]">Last Action</div>
          <div className="font-medium truncate" title={lastAction?.summary}>
            {lastAction ? lastAction.summary.slice(0, 40) : "—"}
          </div>
          <div className="text-[var(--text-muted)]">{lastAction ? formatRelative(new Date(lastAction.timestamp)) : "—"}</div>
        </div>
        <div>
          <div className="text-[var(--text-muted)]">Next Rebalance</div>
          <div className="font-medium text-[var(--accent)]">{schedule ? formatUntil(schedule.nextAgentRun) : "—"}</div>
        </div>
        <div>
          <div className="text-[var(--text-muted)]">Positions</div>
          <div className="font-medium">{positionCount}</div>
        </div>
        <div>
          <div className="text-[var(--text-muted)]">Strategy</div>
          <div className="font-medium text-[10px]">Commission-watch</div>
        </div>
      </div>
      {/* Recent activity mini-log */}
      {activity.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]/50 space-y-1.5 max-h-28 overflow-y-auto">
          {activity.slice(0, 5).map((a, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <span className={`mt-0.5 shrink-0 ${
                a.type === "stake" ? "text-[var(--accent)]" :
                a.type === "deactivate" ? "text-orange-400" :
                a.type === "withdraw" ? "text-blue-400" :
                a.type === "error" ? "text-red-400" : "text-[var(--text-muted)]"
              }`}>
                {a.type === "stake" ? "↗" : a.type === "deactivate" ? "⏸" : a.type === "withdraw" ? "↙" : a.type === "error" ? "✗" : "◉"}
              </span>
              <span className="text-[var(--text-secondary)] truncate">{a.summary}</span>
              {a.txSignature && (
                <a href={`https://explorer.solana.com/tx/${a.txSignature}?cluster=testnet`} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline shrink-0">tx↗</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function VaultPage() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [positionSummary, setPositionSummary] = useState<PositionSummary>({ active: 0, activating: 0, deactivating: 0, inactive: 0, total: 0, count: 0 });
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([]);
  const [vaultBalance, setVaultBalance] = useState(0);
  const [availableToStake, setAvailableToStake] = useState(0);

  const [apyData, setApyData] = useState<{
    avgNet: number; effective: number; base: number; avgCommission: number;
  } | null>(null);

  const [unstakeRequestTime, setUnstakeRequestTime] = useState(0);

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [txPending, setTxPending] = useState(false);

  const fetchData = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    setError(null);

    try {
      const balance = await connection.getBalance(publicKey);
      setWalletBalance(balance / LAMPORTS_PER_SOL);

      const vaultAccount = await connection.getAccountInfo(VAULT_PDA);
      if (!vaultAccount) { setError("Vault not found"); return; }

      const vaultData = vaultAccount.data.slice(8);
      const totalDeposits = Number(vaultData.readBigUInt64LE(64)) / LAMPORTS_PER_SOL;
      const totalStaked = Number(vaultData.readBigUInt64LE(72)) / LAMPORTS_PER_SOL;
      const totalUsers = Number(vaultData.readBigUInt64LE(80));

      const [userDepositPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("deposit"), publicKey.toBuffer()], PROGRAM_ID
      );
      let userDeposit = 0, userPendingUnstake = 0, unstakeRequestTime = 0;
      const userDepositAccount = await connection.getAccountInfo(userDepositPDA);
      if (userDepositAccount) {
        const depositData = userDepositAccount.data.slice(8);
        userDeposit = Number(depositData.readBigUInt64LE(32)) / LAMPORTS_PER_SOL;
        userPendingUnstake = Number(depositData.readBigUInt64LE(40)) / LAMPORTS_PER_SOL;
        unstakeRequestTime = Number(depositData.readBigInt64LE(48));
      }

      setVaultStatus({ totalDeposits, totalStaked, totalUsers, userDeposit, userPendingUnstake });
      setUnstakeRequestTime(unstakeRequestTime);

      // Fetch positions summary + vault balance + activity in parallel
      const [posRes, vaultRes, actRes, recRes, apyRes] = await Promise.all([
        fetch("/api/agent/positions").then(r => r.json()).catch(() => null),
        fetch("/api/agent/vault").then(r => r.json()).catch(() => null),
        fetch("/api/agent/activity?limit=10").then(r => r.json()).catch(() => null),
        fetch("/api/agent/recommend?balance=1000&maxValidators=5").then(r => r.json()).catch(() => null),
        fetch("/api/agent/apy").then(r => r.json()).catch(() => null),
      ]);

      if (posRes?.positions) {
        const ps = posRes.positions as { status: string; stakedAmount: number }[];
        const summary: PositionSummary = { active: 0, activating: 0, deactivating: 0, inactive: 0, total: 0, count: ps.length };
        for (const p of ps) {
          const amt = p.stakedAmount || 0;
          if (p.status === "active") summary.active += amt;
          else if (p.status === "activating") summary.activating += amt;
          else if (p.status === "deactivating") summary.deactivating += amt;
          else if (p.status === "inactive") summary.inactive += amt;
          summary.total += amt;
        }
        setPositionSummary(summary);
        setCurrentEpoch(posRes.currentEpoch || 0);
      }

      if (vaultRes) {
        setVaultBalance(vaultRes.balance ?? vaultRes.vaultBalance ?? 0);
        setAvailableToStake(vaultRes.availableToStake ?? vaultRes.available ?? (vaultRes.balance ?? 0));
      }

      if (actRes?.activities) {
        setRecentActivity(actRes.activities);
      }

      if (recRes?.success) {
        setRecommendations(recRes.decision.recommendations);
      }

      if (apyRes?.success) {
        setApyData(apyRes.apy);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load vault data");
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (connected && publicKey) { fetchData(); }
    else { setLoading(false); }
  }, [connected, publicKey, fetchData]);

  const handleDeposit = async () => {
    if (!publicKey || !signTransaction) return;
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 0.01) { setError("Minimum deposit is 0.01 SOL"); return; }
    setTxPending(true); setError(null); setSuccess(null);
    try {
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      const [userDepositPDA] = PublicKey.findProgramAddressSync([Buffer.from("deposit"), publicKey.toBuffer()], PROGRAM_ID);
      const discriminator = new Uint8Array([0xf2, 0x23, 0xc6, 0x89, 0x52, 0xe1, 0xf2, 0xb6]);
      const amountBuffer = encodeU64(lamports);
      const data = new Uint8Array(16); data.set(discriminator, 0); data.set(amountBuffer, 8);
      const instruction = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: VAULT_PDA, isSigner: false, isWritable: true },
          { pubkey: userDepositPDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(data),
      });
      const transaction = new Transaction().add(instruction);
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = publicKey;
      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature, "confirmed");
      setSuccess(`Deposited ${amount} SOL! Tx: ${signature.slice(0, 8)}...`);
      setDepositAmount(""); fetchData();
    } catch (err: any) {
      console.error("Deposit failed:", err); setError(err.message || "Deposit failed");
    } finally { setTxPending(false); }
  };

  const handleRequestUnstake = async () => {
    if (!publicKey || !signTransaction) return;
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) { setError("Enter a valid amount"); return; }
    if (vaultStatus && amount > vaultStatus.userDeposit) { setError("Amount exceeds your deposit"); return; }
    setTxPending(true); setError(null); setSuccess(null);
    try {
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      const [userDepositPDA] = PublicKey.findProgramAddressSync([Buffer.from("deposit"), publicKey.toBuffer()], PROGRAM_ID);
      const discriminator = new Uint8Array([0x2c, 0x9a, 0x6e, 0xfd, 0xa0, 0xca, 0x36, 0x22]);
      const amountBuffer = encodeU64(lamports);
      const data = new Uint8Array(16); data.set(discriminator, 0); data.set(amountBuffer, 8);
      const instruction = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: VAULT_PDA, isSigner: false, isWritable: false },
          { pubkey: userDepositPDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: false },
        ],
        data: Buffer.from(data),
      });
      const transaction = new Transaction().add(instruction);
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = publicKey;
      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature, "confirmed");
      setSuccess(`Unstake requested for ${amount} SOL! Available after cooldown.`);
      setWithdrawAmount(""); fetchData();
    } catch (err: any) {
      console.error("Request unstake failed:", err); setError(err.message || "Request unstake failed");
    } finally { setTxPending(false); }
  };

  const handleWithdraw = async () => {
    if (!publicKey || !signTransaction || !vaultStatus) return;
    const amount = vaultStatus.userPendingUnstake;
    if (amount <= 0) { setError("No pending unstake to withdraw"); return; }

    // Check cooldown (1 hour on testnet)
    const now = Math.floor(Date.now() / 1000);
    const cooldownSeconds = 3600;
    if (unstakeRequestTime > 0 && now - unstakeRequestTime < cooldownSeconds) {
      const remaining = cooldownSeconds - (now - unstakeRequestTime);
      const mins = Math.ceil(remaining / 60);
      setError(`Cooldown not complete. ${mins} minute${mins !== 1 ? "s" : ""} remaining.`);
      return;
    }

    setTxPending(true); setError(null); setSuccess(null);
    try {
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      const [userDepositPDA] = PublicKey.findProgramAddressSync([Buffer.from("deposit"), publicKey.toBuffer()], PROGRAM_ID);
      // withdraw discriminator: sha256("global:withdraw")[0..8]
      const discriminator = new Uint8Array([0xb7, 0x12, 0x46, 0x9c, 0x94, 0x6d, 0xa1, 0x22]);
      const amountBuffer = encodeU64(lamports);
      const data = new Uint8Array(16); data.set(discriminator, 0); data.set(amountBuffer, 8);
      const instruction = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: VAULT_PDA, isSigner: false, isWritable: true },
          { pubkey: userDepositPDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
        ],
        data: Buffer.from(data),
      });
      const transaction = new Transaction().add(instruction);
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = publicKey;
      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature, "confirmed");
      setSuccess(`Withdrawn ${amount.toFixed(4)} SOL! Tx: ${signature.slice(0, 8)}...`);
      fetchData();
    } catch (err: any) {
      console.error("Withdraw failed:", err); setError(err.message || "Withdraw failed");
    } finally { setTxPending(false); }
  };

  const cooldownReady = unstakeRequestTime > 0 && (Math.floor(Date.now() / 1000) - unstakeRequestTime) >= 3600;

  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Testnet Banner */}
      <div className="bg-[var(--accent)]/10 border-b border-[var(--accent)]/20 py-2 px-4 text-center">
        <span className="text-[var(--accent)] text-sm font-medium">
          🧪 Running on Solana Testnet —{" "}
          <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline ml-1">Get testnet SOL</a>
        </span>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        {/* Title */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">Staker Space Vault</h1>
            <p className="text-[var(--text-secondary)] text-sm">Autonomous AI agent staking to quality decentralized validators</p>
          </div>
          {connected && <WalletMultiButton className="!bg-[var(--bg-elevated)] !border !border-[var(--border)] !rounded-xl !text-sm !font-medium" />}
        </div>

        {!connected ? (
          <div className="bg-[var(--bg-card)] rounded-2xl p-12 text-center border border-[var(--border)]">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-[var(--text-secondary)] mb-6">Connect your wallet to deposit and earn staking rewards</p>
            <WalletMultiButton className="!bg-[var(--accent)] hover:!bg-[var(--accent-hover)] !text-black !rounded-xl !font-semibold" />
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--accent)] border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-6">

            {/* ═══ HERO: APY + Key Metrics ═══ */}
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                {/* APY */}
                <div className="flex items-center gap-6 md:gap-10">
                  <div>
                    <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Vault APY</div>
                    <div className="text-4xl md:text-5xl font-bold text-[var(--accent)]">
                      {apyData && apyData.avgNet > 0 ? `${apyData.avgNet.toFixed(2)}%` : "6.65%"}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">net after validator fees</div>
                  </div>
                  <div className="h-16 w-px bg-[var(--border)] hidden md:block" />
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Total Staked</div>
                      <div className="text-lg font-bold">{positionSummary.active.toFixed(2)} <span className="text-sm text-[var(--text-muted)]">SOL</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Validators</div>
                      <div className="text-lg font-bold">{positionSummary.count}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Available</div>
                      <div className="text-lg font-bold text-[var(--text-secondary)]">{availableToStake.toFixed(2)} <span className="text-sm text-[var(--text-muted)]">SOL</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Avg Commission</div>
                      <div className="text-lg font-bold text-[var(--text-secondary)]">{apyData?.avgCommission ?? 5}%</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Flow Bar */}
              {positionSummary.total > 0 && (
                <div className="mt-6 pt-5 border-t border-[var(--border)]/50">
                  <FlowBar positions={positionSummary} />
                </div>
              )}
            </div>

            {/* ═══ DEPOSIT / WITHDRAW + YOUR POSITION ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Your Position */}
              <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border)]">
                <h2 className="text-sm font-semibold mb-4 text-[var(--text-secondary)] uppercase tracking-wide">Your Position</h2>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-[var(--text-muted)] text-[10px] uppercase">Wallet</div>
                    <div className="text-xl font-bold mt-0.5">{walletBalance.toFixed(2)}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">SOL</div>
                  </div>
                  <div>
                    <div className="text-[var(--text-muted)] text-[10px] uppercase">Deposited</div>
                    <div className="text-xl font-bold text-[var(--accent)] mt-0.5">{vaultStatus?.userDeposit.toFixed(2) || "0"}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">SOL</div>
                  </div>
                  <div>
                    <div className="text-[var(--text-muted)] text-[10px] uppercase">Withdrawable</div>
                    <div className="text-xl font-bold text-blue-400 mt-0.5">{positionSummary.inactive.toFixed(2)}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">SOL</div>
                  </div>
                </div>
              </div>

              {/* Deposit / Withdraw */}
              <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border)]">
                {error && <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">{error}</div>}
                {success && <div className="mb-3 p-2.5 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg text-[var(--accent)] text-xs">{success}</div>}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Deposit SOL</label>
                    <div className="flex gap-2">
                      <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0.00"
                        className="flex-1 min-w-0 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]" disabled={txPending} />
                      <button onClick={handleDeposit} disabled={txPending || !depositAmount}
                        className="px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold text-sm text-black transition whitespace-nowrap">
                        {txPending ? "..." : "Deposit"}
                      </button>
                    </div>
                    <button onClick={() => setDepositAmount(walletBalance.toFixed(4))} className="mt-1 text-[10px] text-[var(--accent)] hover:text-[var(--accent-hover)]">
                      Max: {walletBalance.toFixed(2)} SOL
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Request Unstake</label>
                    <div className="flex gap-2">
                      <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="0.00"
                        className="flex-1 min-w-0 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--coral)]" disabled={txPending} />
                      <button onClick={handleRequestUnstake} disabled={txPending || !withdrawAmount}
                        className="px-4 py-2.5 bg-[var(--coral)] hover:opacity-90 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold text-sm text-white transition whitespace-nowrap">
                        {txPending ? "..." : "Unstake"}
                      </button>
                    </div>
                    <button onClick={() => setWithdrawAmount(vaultStatus?.userDeposit.toFixed(4) || "0")} className="mt-1 text-[10px] text-[var(--coral)] hover:opacity-80">
                      Max: {vaultStatus?.userDeposit.toFixed(2) || "0"} SOL
                    </button>
                  </div>

                  {/* Withdraw ready funds */}
                  {vaultStatus && vaultStatus.userPendingUnstake > 0 && (
                    <div className="pt-3 border-t border-[var(--border)]/50">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs text-[var(--text-secondary)]">Ready to Withdraw</label>
                        <span className="text-sm font-bold text-blue-400">{vaultStatus.userPendingUnstake.toFixed(4)} SOL</span>
                      </div>
                      {cooldownReady ? (
                        <button onClick={handleWithdraw} disabled={txPending}
                          className="w-full px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold text-sm text-white transition">
                          {txPending ? "..." : `Withdraw ${vaultStatus.userPendingUnstake.toFixed(4)} SOL`}
                        </button>
                      ) : (
                        <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] rounded-lg p-3 text-center">
                          ⏳ Cooldown in progress — available {unstakeRequestTime > 0 
                            ? `in ~${Math.max(0, Math.ceil((3600 - (Math.floor(Date.now()/1000) - unstakeRequestTime)) / 60))} min`
                            : "soon"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ═══ POSITIONS (clean) ═══ */}
            <VaultPositions />

            {/* ═══ ADVANCED / AGENT DETAILS (collapsed by default) ═══ */}
            <div className="border border-[var(--border)] rounded-xl overflow-hidden">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] transition text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-muted)]">🤖</span>
                  <span className="font-medium">Agent Details & Activity</span>
                  <span className="text-[10px] text-[var(--text-muted)]">— logs, epoch progress, validator targets</span>
                </div>
                <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${showAdvanced ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAdvanced && (
                <div className="border-t border-[var(--border)] bg-[var(--bg-primary)] p-4 md:p-6 space-y-6">
                  {/* Agent Status + Epoch */}
                  <AgentStatusWidget activity={recentActivity} positionCount={positionSummary.count} currentEpoch={currentEpoch} />

                  {/* Agent Activity Log */}
                  <AgentActivity />

                  {/* Validator Targets */}
                  {recommendations.length > 0 && (
                    <div className="bg-[var(--bg-card)] rounded-xl p-4 md:p-6 border border-[var(--border)]">
                      <h2 className="text-base font-semibold mb-3">Validator Targets</h2>
                      <p className="text-[var(--text-secondary)] text-xs mb-3">The agent stakes to these quality decentralized validators</p>
                      <div className="space-y-2">
                        {recommendations.map((rec, i) => (
                          <div key={rec.validator} className="flex items-center justify-between p-2.5 md:p-3 bg-[var(--bg-elevated)] rounded-lg">
                            <div className="flex items-center gap-2 md:gap-3 min-w-0">
                              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary)] flex items-center justify-center text-xs md:text-sm font-bold shrink-0">{i + 1}</div>
                              <div className="min-w-0">
                                <div className="font-medium text-sm truncate">{rec.validatorName}</div>
                                <div className="text-[10px] text-[var(--text-secondary)] font-mono">{rec.validator.slice(0, 6)}...</div>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <div className="text-[var(--accent)] font-medium text-sm">{(rec.expectedApy ?? 0).toFixed(1)}%</div>
                              <div className="text-[10px] text-[var(--text-secondary)]">Score: {(rec.score ?? rec.wizScore ?? 0).toFixed(0)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Technical Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
                      <h3 className="text-sm font-semibold mb-3">Vault Stats</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-[var(--text-muted)]">Total Deposits</span><span className="font-medium">{vaultStatus?.totalDeposits.toFixed(2)} SOL</span></div>
                        <div className="flex justify-between"><span className="text-[var(--text-muted)]">Total Staked</span><span className="font-medium text-[var(--accent)]">{vaultStatus?.totalStaked.toFixed(2)} SOL</span></div>
                        <div className="flex justify-between"><span className="text-[var(--text-muted)]">Depositors</span><span className="font-medium">{vaultStatus?.totalUsers || 0}</span></div>
                      </div>
                    </div>
                    <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
                      <h3 className="text-sm font-semibold mb-3">Vault Info</h3>
                      <div className="space-y-2 text-xs">
                        <div>
                          <div className="text-[var(--text-muted)]">Network</div>
                          <div className="font-mono text-[var(--accent)]">Testnet</div>
                        </div>
                        <div>
                          <div className="text-[var(--text-muted)]">Vault Address</div>
                          <a href={`https://explorer.solana.com/address/${VAULT_PDA.toBase58()}?cluster=testnet`} target="_blank" rel="noopener noreferrer"
                            className="font-mono text-[var(--accent)] hover:underline break-all text-[11px]">{VAULT_PDA.toBase58().slice(0, 20)}...</a>
                        </div>
                        <div>
                          <div className="text-[var(--text-muted)]">Program</div>
                          <a href={`https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=testnet`} target="_blank" rel="noopener noreferrer"
                            className="font-mono text-[var(--accent)] hover:underline break-all text-[11px]">{PROGRAM_ID.toBase58().slice(0, 20)}...</a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
