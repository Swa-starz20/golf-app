import { supabase } from "@/lib/supabaseClient";

function generateDrawNumbers() {
  const numbers = new Set();

  while (numbers.size < 5) {
    const randomNumber = Math.floor(Math.random() * 45) + 1;
    numbers.add(randomNumber);
  }

  return Array.from(numbers).sort((a, b) => a - b);
}

async function insertDraw(drawNumbers) {
  const { data, error } = await supabase
    .from("draws")
    .insert({ numbers: drawNumbers })
    .select("id, numbers")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function buildLatestScoresByUser(scoreRows) {
  const latestScoresByUser = {};

  for (const row of scoreRows || []) {
    const currentList = latestScoresByUser[row.user_id] || [];

    if (currentList.length < 5) {
      currentList.push(row.score);
      latestScoresByUser[row.user_id] = currentList;
    }
  }

  return latestScoresByUser;
}

function getMatchCount(drawNumbers, userScores) {
  const drawSet = new Set(drawNumbers);
  const uniqueUserScores = new Set(userScores);
  let matches = 0;

  for (const score of uniqueUserScores) {
    if (drawSet.has(score)) {
      matches += 1;
    }
  }

  return matches;
}

export async function runDraw() {
  const drawNumbers = generateDrawNumbers();
  const draw = await insertDraw(drawNumbers);

  const { data: allScores, error: scoreError } = await supabase
    .from("scores")
    .select("user_id, score")
    .order("user_id", { ascending: true })
    .order("date", { ascending: false });

  if (scoreError) {
    throw new Error(scoreError.message);
  }

  const latestScoresByUser = buildLatestScoresByUser(allScores);
  const winnersToInsert = [];

  for (const [userId, userScores] of Object.entries(latestScoresByUser)) {
    const matchCount = getMatchCount(drawNumbers, userScores);

    if (matchCount >= 3) {
      winnersToInsert.push({
        draw_id: draw.id,
        user_id: userId,
        match_count: matchCount,
      });
    }
  }

  if (winnersToInsert.length > 0) {
    const { error: winnerError } = await supabase
      .from("winners")
      .insert(winnersToInsert);

    if (winnerError) {
      throw new Error(winnerError.message);
    }
  }

  const winnerIds = winnersToInsert.map((item) => item.user_id);
  let winnerProfiles = [];

  if (winnerIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", winnerIds);

    if (profileError) {
      throw new Error(profileError.message);
    }

    winnerProfiles = profiles || [];
  }

  const winners = winnersToInsert.map((winner) => {
    const profile = winnerProfiles.find((item) => item.id === winner.user_id);

    return {
      userId: winner.user_id,
      email: profile?.email || "No email",
      matchCount: winner.match_count,
    };
  });

  return {
    drawId: draw.id,
    drawNumbers,
    winnerCount: winnersToInsert.length,
    winners,
  };
}
