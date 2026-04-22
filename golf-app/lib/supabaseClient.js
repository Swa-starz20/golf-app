import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ❌ DO NOT throw error here
// Instead, just create client safely

export const supabase = createClient(
  supabaseUrl || "",
  supabaseAnonKey || ""
);