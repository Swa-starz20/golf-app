"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [isSavingCharity, setIsSavingCharity] = useState(false);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("Free");
  const [charities, setCharities] = useState([]);
  const [selectedCharityId, setSelectedCharityId] = useState("");
  const [contributionPercent, setContributionPercent] = useState("0");
  const [charityMessage, setCharityMessage] = useState("");
  const [scoreInput, setScoreInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [scores, setScores] = useState([]);
  const [error, setError] = useState("");
  const [scoreMessage, setScoreMessage] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  const fetchScores = async (currentUserId) => {
    const { data: scoreRows, error: scoreError } = await supabase
      .from("scores")
      .select("id, score, date")
      .eq("user_id", currentUserId)
      .order("date", { ascending: false });

    if (scoreError) {
      setError(scoreError.message);
      return;
    }

    setScores(scoreRows || []);
  };

  const fetchCharities = async () => {
    const { data: charityRows, error: charityError } = await supabase
      .from("charities")
      .select("id, name")
      .order("name", { ascending: true });

    if (charityError) {
      setError(charityError.message);
      return;
    }

    setCharities(charityRows || []);
  };

  const ensureProfileExists = async (currentUserId, currentEmail) => {
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: currentUserId,
          email: currentEmail || "",
        },
        { onConflict: "id" }
      );

    if (upsertError) {
      setError("Could not prepare your profile.");
      return false;
    }

    return true;
  };

  useEffect(() => {
    const loadUserData = async () => {
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "No email available");

      const profileReady = await ensureProfileExists(user.id, user.email);
      if (!profileReady) {
        setIsLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("subscription_status, charity_id, contribution_percent")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        setError("Could not load subscription status.");
      } else {
        setSubscriptionStatus(profile?.subscription_status || "Free");
        setSelectedCharityId(profile?.charity_id ? String(profile.charity_id) : "");
        setContributionPercent(
          profile?.contribution_percent !== null &&
            profile?.contribution_percent !== undefined
            ? String(profile.contribution_percent)
            : "0"
        );
      }

      await fetchCharities();
      await fetchScores(user.id);
      setIsLoading(false);
    };

    loadUserData();
  }, [router]);

  const handleAddScore = async (event) => {
    event.preventDefault();
    setError("");
    setScoreMessage("");

    const numericScore = Number(scoreInput);

    if (!Number.isInteger(numericScore) || numericScore < 1 || numericScore > 45) {
      setError("Score must be a whole number between 1 and 45.");
      return;
    }

    if (!dateInput) {
      setError("Please choose a date.");
      return;
    }

    if (!userId) {
      setError("User not found. Please log in again.");
      return;
    }

    setIsSubmittingScore(true);

    const { data: duplicateRows, error: duplicateError } = await supabase
      .from("scores")
      .select("id")
      .eq("user_id", userId)
      .eq("date", dateInput)
      .limit(1);

    if (duplicateError) {
      setError(duplicateError.message);
      setIsSubmittingScore(false);
      return;
    }

    if (duplicateRows && duplicateRows.length > 0) {
      setError("You already added a score for this date.");
      setIsSubmittingScore(false);
      return;
    }

    const { data: oldestFirstRows, error: oldestError } = await supabase
      .from("scores")
      .select("id")
      .eq("user_id", userId)
      .order("date", { ascending: true });

    if (oldestError) {
      setError(oldestError.message);
      setIsSubmittingScore(false);
      return;
    }

    if (oldestFirstRows && oldestFirstRows.length >= 5) {
      const oldestScore = oldestFirstRows[0];
      const { error: deleteError } = await supabase
        .from("scores")
        .delete()
        .eq("id", oldestScore.id)
        .eq("user_id", userId);

      if (deleteError) {
        setError(deleteError.message);
        setIsSubmittingScore(false);
        return;
      }
    }

    const { error: insertError } = await supabase.from("scores").insert({
      user_id: userId,
      score: numericScore,
      date: dateInput,
    });

    if (insertError) {
      setError(insertError.message);
      setIsSubmittingScore(false);
      return;
    }

    await fetchScores(userId);
    setScoreInput("");
    setDateInput("");
    setScoreMessage("Score added successfully.");
    setIsSubmittingScore(false);
  };

  const handleSaveCharity = async (event) => {
    event.preventDefault();
    setError("");
    setCharityMessage("");

    if (!userId) {
      setError("User not found. Please log in again.");
      return;
    }

    if (!selectedCharityId) {
      setError("Please select a charity.");
      return;
    }

    const numericPercent = Number(contributionPercent);
    if (
      Number.isNaN(numericPercent) ||
      numericPercent < 0 ||
      numericPercent > 100
    ) {
      setError("Contribution percent must be between 0 and 100.");
      return;
    }

    setIsSavingCharity(true);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        charity_id: selectedCharityId,
        contribution_percent: numericPercent,
      })
      .eq("id", userId);

    if (updateError) {
      setError(updateError.message);
      setIsSavingCharity(false);
      return;
    }

    setCharityMessage("Charity preferences saved.");
    setIsSavingCharity(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
      setIsLoggingOut(false);
      return;
    }

    router.push("/login");
    router.refresh();
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#DCCDE8]">
        <p className="text-gray-700">Loading...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#DCCDE8] to-white px-4 py-8 animate-fadeIn">
        <p className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 p-6 text-sm text-gray-700 transition duration-200 ease-in-out">
          Loading dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#DCCDE8] to-white animate-fadeIn font-[var(--font-inter)]">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 p-6 hover:shadow-xl hover:scale-[1.01] transition duration-300 ease-in-out">
          <h1 className="font-[var(--font-poppins)] text-2xl font-bold tracking-tight text-[#00100B]">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Welcome back! Here is your account overview.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 p-6 hover:shadow-xl hover:scale-[1.01] transition duration-300 ease-in-out">
            <p className="text-sm font-medium text-[#B37BA4]">Email</p>
            <p className="mt-2 text-base text-[#14BDEB] font-semibold">{email}</p>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 p-6 hover:shadow-xl hover:scale-[1.01] transition duration-300 ease-in-out">
            <p className="text-sm font-medium text-[#B37BA4]">
              Subscription Status
            </p>
            <p className="mt-2 text-base text-[#14BDEB] font-semibold">
              {subscriptionStatus}
            </p>
          </div>
        </div>

        {error ? (
          <p className="bg-red-100 text-red-600 rounded-xl px-4 py-2">
            {error}
          </p>
        ) : null}

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-[#D99AC5]/40 p-6 hover:shadow-xl hover:scale-[1.01] transition duration-300 ease-in-out">
          <h2 className="font-[var(--font-poppins)] text-lg font-semibold text-[#00100B]">
            Charity Settings
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Choose your charity and contribution percent.
          </p>

          <form onSubmit={handleSaveCharity} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Charity
              </label>
              <select
                value={selectedCharityId}
                onChange={(event) => setSelectedCharityId(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#14BDEB] transition duration-200 ease-in-out"
                required
              >
                <option value="">Select a charity</option>
                {charities.map((charity) => (
                  <option key={charity.id} value={charity.id}>
                    {charity.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Contribution %
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={contributionPercent}
                onChange={(event) => setContributionPercent(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#14BDEB] transition duration-200 ease-in-out"
                required
              />
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={isSavingCharity}
                className="bg-[#00100B] text-white rounded-xl px-4 py-2 font-medium hover:bg-[#14BDEB] hover:text-black hover:scale-105 active:scale-95 transition duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingCharity ? "Saving..." : "Save Charity Settings"}
              </button>
            </div>
          </form>

          {charityMessage ? (
            <p className="mt-3 bg-green-100 text-green-700 rounded-xl px-4 py-2">
              {charityMessage}
            </p>
          ) : null}
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-[#B37BA4]/40 p-6 hover:shadow-xl hover:scale-[1.01] transition duration-300 ease-in-out">
          <h2 className="font-[var(--font-poppins)] text-lg font-semibold text-[#00100B]">
            Add Score
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Save a score between 1 and 45 for a specific date.
          </p>

          <form onSubmit={handleAddScore} className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Score
              </label>
              <input
                type="number"
                min={1}
                max={45}
                value={scoreInput}
                onChange={(event) => setScoreInput(event.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#14BDEB] transition duration-200 ease-in-out"
                placeholder="1-45"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                value={dateInput}
                onChange={(event) => setDateInput(event.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#14BDEB] transition duration-200 ease-in-out"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSubmittingScore}
                className="w-full bg-[#00100B] text-white rounded-xl px-4 py-2 font-medium hover:bg-[#14BDEB] hover:text-black hover:scale-105 active:scale-95 transition duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingScore ? "Saving..." : "Add Score"}
              </button>
            </div>
          </form>

          {scoreMessage ? (
            <p className="mt-3 bg-green-100 text-green-700 rounded-xl px-4 py-2">
              {scoreMessage}
            </p>
          ) : null}
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 p-6 hover:shadow-xl hover:scale-[1.01] transition duration-300 ease-in-out">
          <h2 className="font-[var(--font-poppins)] text-lg font-semibold text-[#00100B]">
            Recent Scores
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Showing your scores sorted by latest date first.
          </p>

          {scores.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">No scores yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {scores.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between items-center bg-[#DCCDE8]/50 px-4 py-3 rounded-xl border border-gray-200 hover:bg-[#DCCDE8]/80 transition duration-200 ease-in-out"
                >
                  <span className="font-medium text-[#00100B]">
                    Score: <span className="text-[#14BDEB] font-semibold">{item.score}</span>
                  </span>
                  <span className="text-gray-600">{item.date}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 p-6 hover:shadow-xl hover:scale-[1.01] transition duration-300 ease-in-out">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="bg-[#14BDEB] text-black rounded-xl px-4 py-2 font-medium hover:opacity-90 hover:scale-105 active:scale-95 transition duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>
    </div>
  );
}
