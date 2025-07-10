import { createClient } from "@supabase/supabase-js";

// Always create your Supabase client once
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Fetch all goals.
 */
export async function fetchGoals() {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Add a new goal.
 */
export async function addGoal({ title, target, saved = 0 }) {
  const { data, error } = await supabase
    .from("goals")
    .insert({
      title,
      target_amount: parseFloat(target),
      saved_amount: parseFloat(saved),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing goal.
 */
export async function updateGoal(id, { title, target, saved }) {
  const { data, error } = await supabase
    .from("goals")
    .update({
      title,
      target_amount: parseFloat(target),
      saved_amount: parseFloat(saved),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a goal.
 */
export async function deleteGoal(id) {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
  return true;
}

/**
 * Update saved amount only.
 */
export async function updateSavedAmount(id, newSaved) {
  const { data, error } = await supabase
    .from("goals")
    .update({
      saved_amount: parseFloat(newSaved),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
