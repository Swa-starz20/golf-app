"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { runDraw } from "@/lib/drawService";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_EMAIL = "subuchake1@gmail.com";

export default function AdminPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setAdminEmail(user.email || "");
      setIsAdmin((user.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase());
      setIsCheckingAccess(false);
    };

    checkAdmin();
  }, [router]);

  const handleRunDraw = async () => {
    if (!isAdmin) {
      setError("Only admin can run draws.");
      return;
    }

    setError("");
    setResult(null);
    setIsRunning(true);

    try {
      const drawResult = await runDraw();
      setResult(drawResult);
    } catch (runError) {
      setError(runError.message || "Failed to run draw.");
    } finally {
      setIsRunning(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#DCCDE8]">
        <p className="text-gray-700">Loading...</p>
      </div>
    );
  }

  if (isCheckingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#DCCDE8] to-white px-4 py-8 animate-fadeIn">
        <p className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 p-6 text-sm text-gray-700 transition duration-200 ease-in-out">
          Checking admin access...
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#DCCDE8] to-white animate-fadeIn font-[var(--font-inter)]">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 p-6 hover:shadow-xl hover:scale-[1.01] transition duration-300 ease-in-out">
            <h1 className="font-[var(--font-poppins)] text-2xl font-bold tracking-tight text-[#00100B]">
              Admin Panel
            </h1>
            <p className="mt-3 bg-red-100 text-red-600 rounded-xl px-4 py-2">
              Access denied. Current user: {adminEmail || "Unknown user"}
            </p>
            <p className="mt-2 text-sm text-gray-700">
              Only <span className="text-[#14BDEB] font-semibold">{ADMIN_EMAIL}</span> can use this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#DCCDE8] to-white animate-fadeIn font-[var(--font-inter)]">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 p-6 hover:shadow-xl hover:scale-[1.01] transition duration-300 ease-in-out">
          <h1 className="font-[var(--font-poppins)] text-2xl font-bold tracking-tight text-[#00100B]">
            Admin Panel
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Trigger a new draw and store winners automatically.
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-[#B37BA4]/40 p-6 hover:shadow-xl hover:scale-[1.01] transition duration-300 ease-in-out">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleRunDraw}
              disabled={isRunning}
              className="bg-[#00100B] text-white rounded-xl px-4 py-2 font-medium hover:bg-[#14BDEB] hover:text-black hover:scale-105 active:scale-95 transition duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunning ? "Running draw..." : "Run Draw"}
            </button>
          </div>

          {error ? (
            <p className="mt-4 bg-red-100 text-red-600 rounded-xl px-4 py-2">
              {error}
            </p>
          ) : null}

          {result ? (
            <div className="mt-4 bg-[#14BDEB]/20 rounded-xl p-4 border border-[#14BDEB]/40 animate-fadeIn">
              <p className="text-sm text-[#00100B]">
                Draw created: <span className="text-[#14BDEB] font-semibold">#{result.drawId}</span>
              </p>
              <p className="text-sm text-[#00100B] mt-1">
                Numbers: <span className="text-[#14BDEB] font-semibold">{result.drawNumbers.join(", ")}</span>
              </p>
              <p className="text-sm text-[#00100B] mt-1">
                Winners stored: <span className="text-[#14BDEB] font-semibold">{result.winnerCount}</span>
              </p>
            </div>
          ) : null}
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-[#D99AC5]/40 p-6 hover:shadow-xl hover:scale-[1.01] transition duration-300 ease-in-out">
          <h2 className="font-[var(--font-poppins)] text-lg font-semibold text-[#00100B]">
            Winners
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Winners from the latest draw run on this page.
          </p>

          {!result ? (
            <p className="mt-4 text-sm text-gray-600">
              Run a draw to see winners.
            </p>
          ) : result.winners.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">No winners in this draw.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-[#00100B] bg-[#DCCDE8]/60 rounded-l-xl border border-[#B37BA4]/30">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-[#00100B] bg-[#DCCDE8]/60 border-y border-[#B37BA4]/30">
                      User ID
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-[#00100B] bg-[#DCCDE8]/60 rounded-r-xl border border-[#B37BA4]/30">
                      Matches
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.winners.map((winner) => (
                    <tr key={winner.userId} className="transition duration-200 ease-in-out hover:scale-[1.01]">
                      <td className="px-4 py-3 text-[#00100B] bg-white/90 rounded-l-xl border border-[#D99AC5]/30">
                        {winner.email}
                      </td>
                      <td className="px-4 py-3 text-gray-600 bg-white/90 border-y border-[#D99AC5]/30">
                        {winner.userId}
                      </td>
                      <td className="px-4 py-3 text-[#00100B] bg-white/90 rounded-r-xl border border-[#D99AC5]/30">
                        <span className="text-[#14BDEB] font-semibold">{winner.matchCount}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
