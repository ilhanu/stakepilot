"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AgentDocsPage() {
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Agent API Documentation
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">StakePilot Agent API</h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-2xl">
            Build AI agents that interact with the StakePilot autonomous staking vault on Solana.
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-1">
              {[
                { id: "overview", label: "Overview" },
                { id: "quickstart", label: "Quick Start" },
                { id: "endpoints", label: "Endpoints" },
                { id: "authentication", label: "Authentication" },
                { id: "contract", label: "Smart Contract" },
                { id: "examples", label: "Examples" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition ${
                    activeSection === item.id
                      ? "bg-purple-500/10 text-purple-400"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-12">
            {/* Overview */}
            <section id="overview">
              <h2 className="text-2xl font-bold mb-4">Overview</h2>
              <div className="prose prose-invert max-w-none">
                <p className="text-[var(--text-secondary)] mb-4">
                  StakePilot is a smart contract vault where:
                </p>
                <ul className="space-y-2 text-[var(--text-secondary)]">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)]">•</span>
                    <span><strong className="text-white">Users</strong> deposit SOL and set staking preferences</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">•</span>
                    <span><strong className="text-white">Agents</strong> analyze validators and execute optimal staking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--coral)]">•</span>
                    <span><strong className="text-white">Security</strong>: Agents can stake but NEVER withdraw to themselves</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-purple-400">🤖</span>
                  <span className="font-semibold">Base URL</span>
                </div>
                <code className="text-sm text-purple-300 font-mono">
                  https://stakepilot-olig.vercel.app/api/agent
                </code>
              </div>
            </section>

            {/* Quick Start */}
            <section id="quickstart">
              <h2 className="text-2xl font-bold mb-4">Quick Start</h2>
              <div className="space-y-4">
                <CodeBlock
                  title="1. Get vault status"
                  code={`curl https://stakepilot-olig.vercel.app/api/agent/vault`}
                />
                <CodeBlock
                  title="2. Get qualified validators"
                  code={`curl https://stakepilot-olig.vercel.app/api/agent/validators`}
                />
                <CodeBlock
                  title="3. Get staking plan with reasoning"
                  code={`curl https://stakepilot-olig.vercel.app/api/agent/analyze`}
                />
                <CodeBlock
                  title="4. Execute staking (requires auth)"
                  code={`curl -X POST https://stakepilot-olig.vercel.app/api/agent/stake \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"allocations": [{"validatorVote": "49DJ...", "amount": 1.0}]}'`}
                />
              </div>
            </section>

            {/* Endpoints */}
            <section id="endpoints">
              <h2 className="text-2xl font-bold mb-4">Endpoints</h2>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[var(--text-secondary)]">Read Operations (No Auth)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-[var(--border)]">
                        <th className="py-3 px-4">Endpoint</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { path: "/vault", method: "GET", desc: "Vault status (balance, deposits, users)" },
                        { path: "/validators", method: "GET", desc: "List qualified validators with scores" },
                        { path: "/positions", method: "GET", desc: "Current stake positions" },
                        { path: "/analyze", method: "GET", desc: "Run decision algorithm, get staking plan" },
                        { path: "/docs", method: "GET", desc: "OpenAPI specification (JSON)" },
                      ].map((e) => (
                        <tr key={e.path} className="border-b border-[var(--border)]">
                          <td className="py-3 px-4 font-mono text-[var(--accent)]">{e.path}</td>
                          <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs">{e.method}</span></td>
                          <td className="py-3 px-4 text-[var(--text-secondary)]">{e.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h3 className="text-lg font-semibold text-[var(--text-secondary)] mt-8">Write Operations (Auth Required)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-[var(--border)]">
                        <th className="py-3 px-4">Endpoint</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { path: "/stake", method: "POST", desc: "Execute staking to validators" },
                        { path: "/unstake", method: "POST", desc: "Deactivate stake positions" },
                      ].map((e) => (
                        <tr key={e.path} className="border-b border-[var(--border)]">
                          <td className="py-3 px-4 font-mono text-[var(--accent)]">{e.path}</td>
                          <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-xs">{e.method}</span></td>
                          <td className="py-3 px-4 text-[var(--text-secondary)]">{e.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Authentication */}
            <section id="authentication">
              <h2 className="text-2xl font-bold mb-4">Authentication</h2>
              <p className="text-[var(--text-secondary)] mb-4">
                Write operations require an API key in the Authorization header:
              </p>
              <CodeBlock
                code={`Authorization: Bearer <your-api-key>`}
              />
              <div className="mt-4 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
                <h4 className="font-semibold mb-2">Validator Criteria</h4>
                <p className="text-sm text-[var(--text-secondary)] mb-3">
                  The agent only stakes to validators meeting these requirements:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {[
                    { label: "Stake", value: "< 1M SOL" },
                    { label: "Commission", value: "≤ 5%" },
                    { label: "MEV Comm", value: "≤ 10%" },
                    { label: "Uptime", value: "> 95%" },
                  ].map((c) => (
                    <div key={c.label} className="p-2 rounded-lg bg-[var(--bg-primary)]">
                      <div className="text-[var(--text-muted)] text-xs">{c.label}</div>
                      <div className="font-semibold text-[var(--accent)]">{c.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Smart Contract */}
            <section id="contract">
              <h2 className="text-2xl font-bold mb-4">Smart Contract</h2>
              
              <div className="space-y-4 mb-6">
                <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-[var(--text-muted)]">Program ID</div>
                      <code className="text-xs font-mono text-[var(--accent)] break-all">
                        66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b
                      </code>
                    </div>
                    <div>
                      <div className="text-[var(--text-muted)]">Vault PDA</div>
                      <code className="text-xs font-mono text-[var(--accent)] break-all">
                        HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-3">Security Model</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <h4 className="font-semibold text-green-400 mb-2">✓ Agent CAN</h4>
                  <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
                    <li>• Stake vault funds TO validators</li>
                    <li>• Deactivate stakes for rebalancing</li>
                    <li>• Return deactivated SOL to vault</li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <h4 className="font-semibold text-red-400 mb-2">✗ Agent CANNOT</h4>
                  <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
                    <li>• Withdraw SOL to itself</li>
                    <li>• Transfer to external addresses</li>
                    <li>• Change vault settings</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Examples */}
            <section id="examples">
              <h2 className="text-2xl font-bold mb-4">Examples</h2>
              
              <h3 className="text-lg font-semibold mb-3">TypeScript Agent</h3>
              <CodeBlock
                language="typescript"
                code={`import axios from 'axios';

const API = 'https://stakepilot-olig.vercel.app/api/agent';
const API_KEY = 'your-api-key';

async function runStakingAgent() {
  // 1. Check vault state
  const { data: vault } = await axios.get(\`\${API}/vault\`);
  console.log(\`Available: \${vault.availableToStake} SOL\`);

  if (vault.availableToStake < 1) {
    console.log('Insufficient balance');
    return;
  }

  // 2. Get analysis and staking plan
  const { data: analysis } = await axios.get(\`\${API}/analyze\`);
  console.log('Action:', analysis.action);
  console.log('Reasoning:', analysis.reasoning);

  if (analysis.action !== 'stake') return;

  // 3. Execute staking
  const allocations = analysis.analysis.map((v: any) => ({
    validatorVote: v.voteAccount,
    amount: v.allocation,
  }));

  const { data: result } = await axios.post(
    \`\${API}/stake\`,
    { allocations },
    { headers: { Authorization: \`Bearer \${API_KEY}\` } }
  );

  console.log('Result:', result);
}

// Run hourly
setInterval(runStakingAgent, 60 * 60 * 1000);
runStakingAgent();`}
              />

              <h3 className="text-lg font-semibold mb-3 mt-8">AI Agent Prompt</h3>
              <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] font-mono text-sm text-[var(--text-secondary)]">
                <p>You are a Solana staking agent for StakePilot. Your goal is to optimize staking yield while supporting network decentralization.</p>
                <br />
                <p>Available tools:</p>
                <p>- GET /api/agent/vault - Check vault balance</p>
                <p>- GET /api/agent/validators - Get qualified validators</p>
                <p>- GET /api/agent/analyze - Get recommended staking plan</p>
                <p>- POST /api/agent/stake - Execute staking</p>
                <br />
                <p>When vault has &gt;1 SOL available, analyze and execute the optimal staking plan.</p>
              </div>
            </section>

            {/* CTA */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-500/10 via-[var(--bg-card)] to-[var(--accent)]/5 border border-purple-500/20 text-center">
              <h3 className="text-2xl font-bold mb-3">Ready to Build?</h3>
              <p className="text-[var(--text-secondary)] mb-6">
                Check the live vault or explore the API documentation.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/vault" className="btn-primary px-6 py-3">
                  View Vault →
                </Link>
                <a
                  href="/api/agent/docs"
                  target="_blank"
                  className="btn-secondary px-6 py-3"
                >
                  OpenAPI Spec
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeBlock({ title, code, language = "bash" }: { title?: string; code: string; language?: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-[var(--border)]">
      {title && (
        <div className="px-4 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border)] text-sm text-[var(--text-secondary)]">
          {title}
        </div>
      )}
      <pre className="p-4 bg-[var(--bg-card)] overflow-x-auto">
        <code className="text-sm font-mono text-[var(--text-secondary)]">{code}</code>
      </pre>
    </div>
  );
}
