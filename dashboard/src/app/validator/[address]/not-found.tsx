import Link from "next/link";
import { Header } from "@/components/Header";

export default function ValidatorNotFound() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <main className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-6">🔍</div>
          <h1 className="text-3xl font-bold mb-4">Validator Not Found</h1>
          <p className="text-gray-400 mb-8">
            We couldn&apos;t find MEV data for this validator. They may not be
            participating in Jito MEV, or the address might be incorrect.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
