"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#DCCDE8] to-white">
      <div className="max-w-4xl mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 p-6 hover:shadow-xl hover:scale-[1.02] transition duration-200">
        <h1 className="text-2xl font-bold text-[#00100B]">Log in</h1>
        <p className="mt-2 text-sm text-gray-600">
          Use your email and password to access your account.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-[#14BDEB] outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-[#14BDEB] outline-none"
              placeholder="Enter your password"
            />
          </div>

          {error ? (
            <p className="bg-red-100 text-red-600 rounded-xl px-4 py-2">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#00100B] text-white rounded-xl px-4 py-2 font-medium hover:bg-[#14BDEB] hover:text-black transition duration-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-5 text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-[#14BDEB] underline">
            Sign up
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
