"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";

interface MevEvent {
  id: string;
  voteAccount: string;
  name: string | null;
  mevSol: number;
  timestamp: number;
  isRisingStar: boolean;
}

// Simulated real-time MEV events (in production, this would be a websocket)
function generateMockEvent(): MevEvent {
  const names = [
    "Everstake", "Chorus One", "Figment", "Triton", "Laine",
    "Shinobi Systems", "Solana Beach", "P2P.org", "Coinbase",
    "Anonymous Validator", "Hidden Gem", "Rising Star ⭐",
    "Small but Mighty", "Decentralization Hero", null
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

// Falling number component
function FallingNumber({ event, onComplete }: { event: MevEvent; onComplete: () => void }) {
  const startX = Math.random() * 90 + 5; // 5-95%
  const duration = 8 + Math.random() * 4; // 8-12 seconds
  const size = Math.min(24, 12 + event.mevSol * 0.8);
  
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
      <div className={`flex flex-col items-center ${event.isRisingStar ? "text-yellow-400" : "text-green-400"} font-mono opacity-80`}>
        <span className="whitespace-nowrap">
          {event.mevSol.toFixed(2)} SOL
        </span>
        <span className="text-xs opacity-60 whitespace-nowrap">
          {event.name || event.voteAccount.slice(0, 8)}
        </span>
        {event.isRisingStar && <span className="text-yellow-400">🌟</span>}
      </div>
    </div>
  );
}

// Stats display
function LiveStats({ events, totalMev }: { events: MevEvent[]; totalMev: number }) {
  const eventsPerMinute = events.filter(e => Date.now() - e.timestamp < 60000).length;
  const risingStarMev = events
    .filter(e => e.isRisingStar && Date.now() - e.timestamp < 60000)
    .reduce((sum, e) => sum + e.mevSol, 0);
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-gray-900/80 backdrop-blur border border-green-500/30 rounded-xl p-4 text-center">
        <div className="text-3xl font-bold text-green-400 font-mono">
          {totalMev.toFixed(2)}
        </div>
        <div className="text-xs text-gray-400">Total MEV (session)</div>
      </div>
      <div className="bg-gray-900/80 backdrop-blur border border-cyan-500/30 rounded-xl p-4 text-center">
        <div className="text-3xl font-bold text-cyan-400 font-mono">
          {eventsPerMinute}
        </div>
        <div className="text-xs text-gray-400">Events / min</div>
      </div>
      <div className="bg-gray-900/80 backdrop-blur border border-yellow-500/30 rounded-xl p-4 text-center">
        <div className="text-3xl font-bold text-yellow-400 font-mono">
          {risingStarMev.toFixed(2)}
        </div>
        <div className="text-xs text-gray-400">Rising Star MEV</div>
      </div>
      <div className="bg-gray-900/80 backdrop-blur border border-purple-500/30 rounded-xl p-4 text-center">
        <div className="text-3xl font-bold text-purple-400 font-mono">
          {events.length}
        </div>
        <div className="text-xs text-gray-400">Total events</div>
      </div>
    </div>
  );
}

// Recent events feed
function EventFeed({ events }: { events: MevEvent[] }) {
  const recentEvents = events.slice(-20).reverse();
  
  return (
    <div className="bg-gray-900/80 backdrop-blur border border-gray-700 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Live Feed
        </h3>
        <span className="text-xs text-gray-500">Last 20 events</span>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {recentEvents.map((event) => (
          <div
            key={event.id}
            className={`px-4 py-2 border-b border-gray-800/50 flex items-center justify-between hover:bg-gray-800/30 transition ${
              event.isRisingStar ? "bg-yellow-900/10" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              {event.isRisingStar && <span className="text-yellow-400">🌟</span>}
              <div>
                <div className="text-sm font-medium">
                  {event.name || "Anonymous"}
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  {event.voteAccount.slice(0, 8)}...
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-mono font-bold ${event.isRisingStar ? "text-yellow-400" : "text-green-400"}`}>
                +{event.mevSol.toFixed(3)} SOL
              </div>
              <div className="text-xs text-gray-500">
                {new Date(event.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LiveMevPage() {
  const [events, setEvents] = useState<MevEvent[]>([]);
  const [activeEvents, setActiveEvents] = useState<MevEvent[]>([]);
  const [totalMev, setTotalMev] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Generate new events
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      const newEvent = generateMockEvent();
      setEvents(prev => [...prev, newEvent]);
      setActiveEvents(prev => [...prev, newEvent]);
      setTotalMev(prev => prev + newEvent.mevSol);
    }, 500 + Math.random() * 1500); // Random interval 0.5-2s
    
    return () => clearInterval(interval);
  }, [isPaused]);

  const removeActiveEvent = (id: string) => {
    setActiveEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden">
      <Header />
      
      {/* CSS for falling animation */}
      <style jsx global>{`
        @keyframes fall {
          0% {
            transform: translateY(-100px);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
      `}</style>
      
      <main className="container mx-auto px-4 py-8 relative">
        {/* Header */}
        <section className="mb-8 text-center relative z-10">
          <div className="text-5xl mb-4">⚡</div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Live MEV Flow
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-4">
            Watch MEV rewards flow through validators in real-time.
            <span className="text-yellow-400"> 🌟 Rising Stars</span> highlighted.
          </p>
          
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              isPaused 
                ? "bg-green-600 hover:bg-green-500 text-white" 
                : "bg-gray-800 hover:bg-gray-700 text-gray-300"
            }`}
          >
            {isPaused ? "▶️ Resume" : "⏸️ Pause"}
          </button>
        </section>

        {/* Stats */}
        <LiveStats events={events} totalMev={totalMev} />

        {/* Main visualization area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Matrix rain area */}
          <div className="lg:col-span-2 relative h-96 bg-gray-900/30 rounded-xl border border-gray-800 overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-green-900/10 via-transparent to-cyan-900/10"></div>
            
            {/* Grid lines */}
            <div className="absolute inset-0 opacity-10">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="absolute h-full border-l border-green-500/20" style={{ left: `${i * 5}%` }}></div>
              ))}
            </div>
            
            {/* Falling numbers */}
            {activeEvents.map((event) => (
              <FallingNumber
                key={event.id}
                event={event}
                onComplete={() => removeActiveEvent(event.id)}
              />
            ))}
            
            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-6xl font-bold text-green-400/20 font-mono">
                  {totalMev.toFixed(2)}
                </div>
                <div className="text-lg text-gray-600">Total MEV</div>
              </div>
            </div>
            
            {/* Info tooltip */}
            <div className="absolute bottom-4 left-4 text-xs text-gray-500 bg-gray-900/80 px-3 py-2 rounded-lg">
              💡 <span className="text-yellow-400">Yellow = Rising Stars</span> (small validators with momentum)
            </div>
          </div>

          {/* Event feed */}
          <EventFeed events={events} />
        </div>

        {/* Educational section */}
        <section className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <div className="text-2xl mb-3">💰</div>
            <h3 className="font-semibold mb-2">What is MEV?</h3>
            <p className="text-sm text-gray-400">
              MEV (Maximal Extractable Value) is the profit validators can earn by 
              ordering transactions in their blocks. It&apos;s a key component of validator revenue.
            </p>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <div className="text-2xl mb-3">🌟</div>
            <h3 className="font-semibold mb-2">Why Rising Stars?</h3>
            <p className="text-sm text-gray-400">
              Small validators with improving MEV trends deserve attention. 
              Supporting them helps decentralize Solana and can yield great returns.
            </p>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <div className="text-2xl mb-3">📊</div>
            <h3 className="font-semibold mb-2">Real Data</h3>
            <p className="text-sm text-gray-400">
              This visualization is simulated for demo. In production, it would connect 
              to real-time Jito block data via WebSocket.
            </p>
          </div>
        </section>

        {/* Call to action */}
        <section className="mt-12 text-center bg-gradient-to-r from-green-900/30 to-cyan-900/30 border border-green-800/30 rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-2">Ready to Stake?</h2>
          <p className="text-gray-400 mb-4">
            Use our AI-powered routing to find the best validators for your stake.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="/rising-stars"
              className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 rounded-lg transition font-medium"
            >
              🌟 View Rising Stars
            </a>
            <a
              href="/"
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              Back to Dashboard
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
