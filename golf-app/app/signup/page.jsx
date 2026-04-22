"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsLoading(false);
      return;
    }

    const userId = data?.user?.id;

    if (userId) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: userId, email }, { onConflict: "id" });

      // In some Supabase setups, auth user creation and profile FK checks can be out of sync
      // during signup. We allow signup to continue and create/update profile on dashboard load.
      if (profileError && profileError.code !== "23503") {
        setError(profileError.message);
        setIsLoading(false);
        return;
      }
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#DCCDE8] to-white">
      <div className="max-w-4xl mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 p-6 hover:shadow-xl hover:scale-[1.02] transition duration-200">
        <h1 className="text-2xl font-bold text-[#00100B]">Sign up</h1>
        <p className="mt-2 text-sm text-gray-600">
          Create an account with your email and password.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSignup}>
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
              minLength={6}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-[#14BDEB] outline-none"
              placeholder="Minimum 6 characters"
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
            {isLoading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="mt-5 text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#14BDEB] underline">
            Log in
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
