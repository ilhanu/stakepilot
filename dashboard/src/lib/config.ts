/**
 * StakePilot Configuration - TESTNET
 * 
 * Central config for the hackathon demo
 */

import { PublicKey } from "@solana/web3.js";

// Network
export const NETWORK = "testnet" as const;
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.testnet.solana.com";
export const EXPLORER_CLUSTER = "testnet";

// Program & Vault (testnet deployment)
export const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");
export const VAULT_PDA = new PublicKey("HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u");

// Agent
export const AGENT_WALLET = new PublicKey("By596jaboXuq2jt6EKB8XuMMWxpccTdEJdmmgL1HoBny");

// Staker Space validator (testnet)
export const STAKER_SPACE_VALIDATOR = new PublicKey("3S4jVg5p1rw7t8MS5UtjhnChmo6ABdmh3nyXTVzAyP9f");
export const STAKER_SPACE_IDENTITY = "33LfdA2yKS6m7E8pSanrKTKYMhpYHEGaSWtNNB5s7xnm";

// Explorer links
export function explorerUrl(address: string, type: "address" | "tx" = "address"): string {
  return `https://explorer.solana.com/${type}/${address}?cluster=${EXPLORER_CLUSTER}`;
}

export function solscanUrl(address: string, type: "account" | "tx" = "account"): string {
  return `https://solscan.io/${type}/${address}?cluster=${EXPLORER_CLUSTER}`;
}
