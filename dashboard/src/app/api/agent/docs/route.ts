import { NextResponse } from "next/server";

/**
 * Agent API Documentation
 * 
 * This endpoint serves OpenAPI documentation for AI agents
 * to interact with the StakePilot vault.
 */

const OPENAPI_SPEC = {
  openapi: "3.0.0",
  info: {
    title: "StakePilot Agent API",
    version: "1.0.0",
    description: `
# StakePilot Agent API

API for AI agents to interact with the StakePilot autonomous staking vault on Solana.

## Overview

StakePilot is a smart contract vault where:
- **Users** deposit SOL and set staking preferences
- **Agents** analyze validators and execute optimal staking decisions
- **Security**: Agents can stake but NEVER withdraw to themselves

## Authentication

Agents authenticate via API key in the Authorization header:
\`\`\`
Authorization: Bearer <agent-api-key>
\`\`\`

## Core Workflow

1. **GET /api/agent/vault** - Read vault state (balance, deposits, users)
2. **GET /api/agent/validators** - Get qualified validators with scores
3. **POST /api/agent/analyze** - Run decision algorithm, get staking plan
4. **POST /api/agent/stake** - Execute staking to validators
5. **POST /api/agent/unstake** - Deactivate stakes for rebalancing

## On-Chain Contract

- **Program ID**: \`66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b\`
- **Vault PDA**: \`HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u\`
- **Network**: Devnet (Mainnet coming soon)
`,
  },
  servers: [
    {
      url: "https://stakepilot-olig.vercel.app/api/agent",
      description: "Production (Devnet)",
    },
    {
      url: "http://localhost:3000/api/agent",
      description: "Local development",
    },
  ],
  paths: {
    "/vault": {
      get: {
        operationId: "getVaultStatus",
        summary: "Get vault status",
        description: "Returns current vault state including balances, deposits, and user count.",
        tags: ["Vault"],
        responses: {
          "200": {
            description: "Vault status",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VaultStatus" },
                example: {
                  vault: {
                    address: "HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u",
                    balance: 1.5,
                    totalDeposits: 1.5,
                    totalStaked: 0,
                    totalUsers: 1,
                  },
                  agent: "By596jaboXuq2jt6EKB8XuMMWxpccTdEJdmmgL1HoBny",
                  availableToStake: 1.4,
                  timestamp: "2026-02-05T12:00:00.000Z",
                },
              },
            },
          },
        },
      },
    },
    "/validators": {
      get: {
        operationId: "getValidators",
        summary: "Get qualified validators",
        description: `Returns validators that meet StakePilot criteria:
- Stake < 1M SOL (decentralization)
- Commission ≤ 5%
- MEV Commission ≤ 10%  
- Uptime > 95%
- Includes Staker Space validator`,
        tags: ["Validators"],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20 },
            description: "Max validators to return",
          },
          {
            name: "minScore",
            in: "query",
            schema: { type: "number", default: 80 },
            description: "Minimum WizScore",
          },
        ],
        responses: {
          "200": {
            description: "List of qualified validators",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    validators: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Validator" },
                    },
                    count: { type: "integer" },
                    criteria: { $ref: "#/components/schemas/ValidatorCriteria" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/analyze": {
      post: {
        operationId: "analyzeAndPlan",
        summary: "Analyze validators and create staking plan",
        description: `Runs the agent decision algorithm:
1. Fetch vault state
2. Get qualified validators
3. Score and rank by APY + decentralization
4. Allocate available balance across top validators
5. Return reasoning chain and staking plan`,
        tags: ["Agent"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  maxValidators: {
                    type: "integer",
                    default: 5,
                    description: "Max validators to stake to",
                  },
                  minStakePerValidator: {
                    type: "number",
                    default: 0.5,
                    description: "Minimum SOL per validator",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Analysis result with staking plan",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AnalysisResult" },
              },
            },
          },
        },
      },
    },
    "/stake": {
      post: {
        operationId: "executeStake",
        summary: "Execute staking to validators",
        description: `Executes the staking plan by:
1. Building stake transactions
2. Signing with agent keypair
3. Submitting to Solana
4. Returning transaction signatures

**Requires agent authentication.**`,
        tags: ["Agent"],
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["allocations"],
                properties: {
                  allocations: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["validatorVote", "amount"],
                      properties: {
                        validatorVote: {
                          type: "string",
                          description: "Validator vote account pubkey",
                        },
                        amount: {
                          type: "number",
                          description: "SOL amount to stake",
                        },
                      },
                    },
                  },
                  dryRun: {
                    type: "boolean",
                    default: false,
                    description: "If true, build but don't submit transactions",
                  },
                },
              },
              example: {
                allocations: [
                  {
                    validatorVote: "StakerSpaceVa1idator11111111111111111111111",
                    amount: 0.5,
                  },
                ],
                dryRun: false,
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Staking execution result",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StakeResult" },
              },
            },
          },
          "401": {
            description: "Unauthorized - invalid or missing API key",
          },
        },
      },
    },
    "/unstake": {
      post: {
        operationId: "executeUnstake",
        summary: "Deactivate stake positions",
        description: `Deactivates stake accounts for rebalancing or withdrawals.
After deactivation, stakes enter cooldown (~2 days).

**Requires agent authentication.**`,
        tags: ["Agent"],
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["stakeAccounts"],
                properties: {
                  stakeAccounts: {
                    type: "array",
                    items: { type: "string" },
                    description: "Stake account pubkeys to deactivate",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Unstake result",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UnstakeResult" },
              },
            },
          },
        },
      },
    },
    "/positions": {
      get: {
        operationId: "getPositions",
        summary: "Get current stake positions",
        description: "Returns all stake accounts owned by the vault with their status.",
        tags: ["Vault"],
        responses: {
          "200": {
            description: "Stake positions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    positions: {
                      type: "array",
                      items: { $ref: "#/components/schemas/StakePosition" },
                    },
                    totalStaked: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      apiKey: {
        type: "http",
        scheme: "bearer",
        description: "Agent API key",
      },
    },
    schemas: {
      VaultStatus: {
        type: "object",
        properties: {
          vault: {
            type: "object",
            properties: {
              address: { type: "string" },
              balance: { type: "number", description: "SOL balance in vault" },
              totalDeposits: { type: "number" },
              totalStaked: { type: "number" },
              totalUsers: { type: "integer" },
            },
          },
          agent: { type: "string", description: "Agent wallet pubkey" },
          availableToStake: { type: "number", description: "SOL available to stake" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      Validator: {
        type: "object",
        properties: {
          name: { type: "string" },
          voteAccount: { type: "string" },
          totalApy: { type: "number", description: "Total APY including MEV" },
          wizScore: { type: "number", description: "StakeWiz quality score (0-100)" },
          commission: { type: "number", description: "Base commission %" },
          mevCommission: { type: "number", description: "MEV commission %" },
          activatedStake: { type: "number", description: "Current stake in SOL" },
          uptime: { type: "number", description: "Uptime percentage" },
          delinquent: { type: "boolean" },
        },
      },
      ValidatorCriteria: {
        type: "object",
        properties: {
          maxStake: { type: "number", description: "Max stake (1M SOL)" },
          maxCommission: { type: "number", description: "Max commission (5%)" },
          maxMevCommission: { type: "number", description: "Max MEV commission (10%)" },
          minUptime: { type: "number", description: "Min uptime (95%)" },
        },
      },
      AnalysisResult: {
        type: "object",
        properties: {
          timestamp: { type: "string", format: "date-time" },
          vaultBalance: { type: "number" },
          availableToStake: { type: "number" },
          reasoning: {
            type: "array",
            items: { type: "string" },
            description: "Step-by-step decision reasoning",
          },
          action: {
            type: "string",
            enum: ["stake", "hold", "rebalance"],
          },
          status: {
            type: "string",
            enum: ["pending", "executing", "completed", "simulated"],
          },
          analysis: {
            type: "array",
            items: { $ref: "#/components/schemas/ValidatorAllocation" },
          },
        },
      },
      ValidatorAllocation: {
        type: "object",
        properties: {
          name: { type: "string" },
          voteAccount: { type: "string" },
          totalApy: { type: "number" },
          wizScore: { type: "number" },
          stake: { type: "number" },
          commission: { type: "number" },
          mevCommission: { type: "number" },
          uptime: { type: "number" },
          allocation: { type: "number", description: "SOL to stake" },
          reasons: {
            type: "array",
            items: { type: "string" },
            description: "Why this validator was selected",
          },
        },
      },
      StakeResult: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          stakesCreated: { type: "integer" },
          totalStaked: { type: "number" },
          transactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                signature: { type: "string" },
                validator: { type: "string" },
                amount: { type: "number" },
              },
            },
          },
          errors: { type: "array", items: { type: "string" } },
        },
      },
      UnstakeResult: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          deactivated: { type: "integer" },
          transactions: { type: "array", items: { type: "string" } },
          errors: { type: "array", items: { type: "string" } },
        },
      },
      StakePosition: {
        type: "object",
        properties: {
          stakeAccount: { type: "string" },
          validatorVote: { type: "string" },
          validatorName: { type: "string" },
          stakedAmount: { type: "number" },
          status: {
            type: "string",
            enum: ["activating", "active", "deactivating", "inactive"],
          },
          activationEpoch: { type: "integer" },
          deactivationEpoch: { type: "integer" },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(OPENAPI_SPEC);
}
