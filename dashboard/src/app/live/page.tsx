"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface MevEvent {
  id: string;
  voteAccount: string;
  name: string | null;
  mevSol: number;
  timestamp: number;
  isRisingStar: boolean;
}

// Simulated real-time MEV events
function generateMockEvent(): MevEvent {
  const names = [
    "Everstake", "Chorus One", "Figment", "Triton", "Laine",
    "Shinobi Systems", "P2P.org", "Coinbase",
    "Hidden Gem", "Rising Star", null
  ];
  
  const isSmall = Math.random() > 0.7;
  const mevSol = isSmall 
    ? 0.1 + Math.random() * 2 
    : 1 + Math.random() * 15;

  return {
    id: Math.random().toString(36).substring(7),
    voteAccount: Array(44).fill(0).map(() => "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[Math.floor(Math.random() * 58)]).join(""),
    name: names[Math.floor(Math.random() * names.length)],
    mevSol,
    timestamp: Date.now(),
    isRisingStar: isSmall && Math.random() > 0.5,
  };
}

function FallingNumber({ event, onComplete }: { event: MevEvent; onComplete: () => void }) {
  const startX = Math.random() * 90 + 5;
  const duration = 8 + Math.random() * 4;
  const size = Math.min(20, 12 + event.mevSol * 0.5);
  
  useEffect(() => {
    const timer = setTimeout(onComplete, duration * 1000);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <div
      className="absolute animate-fall pointer-events-none"
      style={{
        left: `${startX}%`,
        animationDuration: `${duration}s`,
        fontSize: `${size}px`,
      }}
    >
      <div className={`flex flex-col items-center font-mono opacity-70 ${event.isRisingStar ? "text-amber-400" : "text-[var(--accent)]"}`}>
        <span className="whitespace-nowrap">
          {event.mevSol.toFixed(2)} SOL
        </span>
        <span className="text-xs opacity-60 whitespace-nowrap">
          {event.name || event.voteAccount.slice(0, 6)}
        </span>
        {event.isRisingStar && <span>🌟</span>}
      </div>
    </div>
  );
}

export default function LiveMevPage() {
  const [events, setEvents] = useState<MevEvent[]>([]);
  const [activeEvents, setActiveEvents] = useState<MevEvent[]>([]);
  const [totalMev, setTotalMev] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      const newEvent = generateMockEvent();
      setEvents(prev => [...prev.slice(-50), newEvent]);
      setActiveEvents(prev => [...prev, newEvent]);
      setTotalMev(prev => prev + newEvent.mevSol);
    }, 500 + Math.random() * 1500);
    
    return () => clearInterval(interval);
  }, [isPaused]);

  const removeActiveEvent = (id: string) => {
    setActiveEvents(prev => prev.filter(e => e.id !== id));
  };

  const eventsPerMinute = events.filter(e => Date.now() - e.timestamp < 60000).length;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] bg-grid overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[400px] bg-radial pointer-events-none" />
      
      
      
      <style jsx global>{`
        @keyframes fall {
          0% { transform: translateY(-100px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.7; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .animate-fall { animation: fall linear forwards; }
      `}</style>
      
      <main className="relative">
        {/* Hero */}
        <section className="pt-16 pb-8 md:pt-24 md:pb-12 px-6">
          <div className="container-lg text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-sm mb-8 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              Live MEV Flow
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-6">
              Watch MEV rewards flow through validators in real-time.
              <span className="text-amber-400"> 🌟 Rising Stars</span> highlighted.
            </p>
            
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={isPaused ? "btn-primary" : "btn-secondary"}
            >
              {isPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="pb-8 px-6">
          <div className="container-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-5 text-center">
                <div className="stat-value !text-2xl text-[var(--accent)] font-mono">
                  {totalMev.toFixed(2)}
                </div>
                <div className="stat-label">Total MEV (session)</div>
              </div>
              <div className="card p-5 text-center">
                <div className="stat-value !text-2xl font-mono">
                  {eventsPerMinute}
                </div>
                <div className="stat-label">Events / min</div>
              </div>
              <div className="card p-5 text-center">
                <div className="stat-value !text-2xl text-amber-400 font-mono">
                  {events.filter(e => e.isRisingStar).length}
                </div>
                <div className="stat-label">Rising Stars</div>
              </div>
              <div className="card p-5 text-center">
                <div className="stat-value !text-2xl font-mono">
                  {events.length}
                </div>
                <div className="stat-label">Total events</div>
              </div>
            </div>
          </div>
        </section>

        {/* Visualization */}
        <section className="pb-16 px-6">
          <div className="container-lg">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Rain area */}
              <div className="lg:col-span-2 relative h-80 md:h-96 card overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent)]/5 via-transparent to-purple-500/5"></div>
                
                {activeEvents.map((event) => (
                  <FallingNumber
                    key={event.id}
                    event={event}
                    onComplete={() => removeActiveEvent(event.id)}
                  />
                ))}
                
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-[var(--accent)]/20 font-mono">
                      {totalMev.toFixed(2)}
                    </div>
                    <div className="text-sm text-[var(--text-muted)]">Total MEV</div>
                  </div>
                </div>
                
                <div className="absolute bottom-4 left-4 text-xs text-[var(--text-muted)] bg-[var(--bg-primary)]/80 px-3 py-2 rounded-xl">
                  <span className="text-amber-400">Yellow = Rising Stars</span>
                </div>
              </div>

              {/* Feed */}
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse"></span>
                    Live Feed
                  </h3>
                  <span className="text-xs text-[var(--text-muted)]">Recent</span>
                </div>
                <div className="max-h-64 md:max-h-80 overflow-y-auto">
                  {events.slice(-15).reverse().map((event) => (
                    <div
                      key={event.id}
                      className="px-4 py-3 border-b border-[var(--border)]/50 flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {event.isRisingStar && <span>🌟</span>}
                        <span className="truncate text-[var(--text-secondary)]">
                          {event.name || "Anonymous"}
                        </span>
                      </div>
                      <span className={`font-mono shrink-0 ${event.isRisingStar ? "text-amber-400" : "text-[var(--accent)]"}`}>
                        +{event.mevSol.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Note */}
        <section className="pb-8 px-6 text-center">
          <p className="text-xs text-[var(--text-muted)]">
            This visualization is simulated. Production would connect to real Jito block data.
          </p>
        </section>

        {/* Section Divider */}
        <div className="section-divider mx-6" />

        {/* CTA */}
        <section className="py-16 px-6">
          <div className="container-lg text-center">
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/discover" className="btn-primary">
                🌟 Discover Rising Stars
              </Link>
              <Link href="/compare" className="btn-secondary">
                📊 Compare LSTs
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// Header Component
// Header imported from @/components/Header
