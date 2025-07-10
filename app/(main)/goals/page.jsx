"use client";
import React, { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase'

export default function GoalsPage() {
  // Add this temporary debug at the top
  console.log('🔍 Debug Info:');
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  console.log('Key length:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length);

  const [goals, setGoals] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showReminder, setShowReminder] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    target: "",
    saved: "",
  });

  // ✅ Load goals on mount
  useEffect(() => {
    // Test environment variables first
    console.log('Environment check:');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    fetchGoals();
  }, []);

  // ✅ Show daily reminder if goals exist
  useEffect(() => {
    if (goals.length > 0 && !reminderDismissed) {
      setShowReminder(true);
    }
  }, [goals, reminderDismissed]);

  async function fetchGoals() {
    try {
      setLoading(true);
      setError(null);
      
      // Test the connection first
      console.log('Testing Supabase connection...');
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error('Supabase error object:', error);
        console.error('Error type:', typeof error);
        console.error('Error keys:', Object.keys(error));
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Error code:', error.code);
        console.error('Full error JSON:', JSON.stringify(error, null, 2));
        
        const errorMessage = error.message || error.details || error.hint || 'Unknown database error';
        setError(`Database error: ${errorMessage}`);
        return;
      }
      
      console.log('Data received:', data);
      setGoals(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      console.error('Error stack:', err.stack);
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.target) return;

    try {
      if (editingGoal) {
        // ✅ Update goal
        const { data, error } = await supabase
          .from("goals")
          .update({
            title: formData.title,
            target_amount: parseFloat(formData.target),
            saved_amount: parseFloat(formData.saved) || 0,
          })
          .eq("id", editingGoal.id)
          .select()
          .single();

        if (error) {
          console.error('Update error:', error);
          setError(`Update error: ${error.message}`);
          return;
        }
        
        setGoals((prev) => prev.map((g) => (g.id === data.id ? data : g)));
        setEditingGoal(null);
      } else {
        // ✅ Add goal
        const { data, error } = await supabase
          .from("goals")
          .insert({
            title: formData.title,
            target_amount: parseFloat(formData.target),
            saved_amount: parseFloat(formData.saved) || 0,
          })
          .select()
          .single();

        if (error) {
          console.error('Insert error:', error);
          setError(`Insert error: ${error.message}`);
          return;
        }
        
        setGoals((prev) => [data, ...prev]);
      }

      setFormData({ title: "", target: "", saved: "" });
      setShowAddForm(false);
    } catch (err) {
      console.error('Unexpected error in submit:', err);
      setError(`Unexpected error: ${err.message}`);
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      target: goal.target_amount.toString(),
      saved: goal.saved_amount.toString(),
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) {
        console.error('Delete error:', error);
        setError(`Delete error: ${error.message}`);
        return;
      }
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      console.error('Unexpected error in delete:', err);
      setError(`Unexpected error: ${err.message}`);
    }
  };

  const updateSaved = async (id, newSaved) => {
    try {
      const safeSaved = Math.max(0, parseFloat(newSaved) || 0);

      const { data, error } = await supabase
        .from("goals")
        .update({ saved_amount: safeSaved })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error('Update saved error:', error);
        setError(`Update error: ${error.message}`);
        return;
      }
      
      setGoals((prev) => prev.map((g) => (g.id === id ? data : g)));
    } catch (err) {
      console.error('Unexpected error in updateSaved:', err);
      setError(`Unexpected error: ${err.message}`);
    }
  };

  const calculateProgress = (saved, target) => {
    return target > 0 ? (saved / target) * 100 : 0;
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingGoal(null);
    setFormData({ title: "", target: "", saved: "" });
  };

  const dismissReminder = () => {
    setShowReminder(false);
    setReminderDismissed(true);
  };

  const getMotivationalMessage = (progress) => {
    if (progress >= 100) return "Congratulations! You've reached your goal!";
    if (progress >= 80) return "Almost there! You're so close!";
    if (progress >= 50) return "Great progress! Keep going!";
    if (progress >= 25) return "Good work! Keep building!";
    return "Every bit counts! Start saving today!";
  };

  const getDailyEncouragement = () => {
    const encouragements = [
      "Small steps lead to big achievements!",
      "Your future self will thank you!",
      "Every dollar saved counts!",
      "Consistency is key. Keep going!",
      "One step closer to your dreams!",
      "Stay focused — you've got this!",
      "Visualize your goal and keep saving!",
    ];
    return encouragements[Math.floor(Math.random() * encouragements.length)];
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <p className="text-slate-600 text-lg">Loading goals...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  fetchGoals();
                }}
                className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-green-700 mb-2">My Goals</h1>
          <p className="text-slate-600">
            Set savings goals and track your progress!
          </p>
        </div>

        {/* Reminder */}
        {showReminder && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8 shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-semibold text-green-700">
                Daily Progress Reminder
              </h2>
              <button
                onClick={dismissReminder}
                className="text-slate-500 hover:text-slate-700 text-xl"
              >
                ×
              </button>
            </div>
            <p className="text-slate-700 font-medium mb-4">
              {getDailyEncouragement()}
            </p>
            {goals.map((goal) => {
              const progress = calculateProgress(
                goal.saved_amount,
                goal.target_amount
              );
              return (
                <div
                  key={goal.id}
                  className="bg-white rounded-lg p-4 border border-slate-200 mb-2"
                >
                  <div className="flex justify-between mb-2">
                    <h3 className="text-lg font-semibold text-slate-800">
                      {goal.title}
                    </h3>
                    <span className="text-sm text-green-600">
                      {progress.toFixed(1)}% Complete
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-slate-600 mb-1">
                    {getMotivationalMessage(progress)}
                  </p>
                  <p className="text-xs text-slate-500">
                    ${goal.saved_amount} of ${goal.target_amount} saved
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Goals List */}
        <div className="bg-white shadow-md rounded-xl border border-slate-200 p-6 space-y-6">
          {goals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 text-lg mb-4">No goals yet!</p>
              <p className="text-slate-400">
                Add your first goal to get started.
              </p>
            </div>
          ) : (
            goals.map((goal) => {
              const progress = calculateProgress(
                goal.saved_amount,
                goal.target_amount
              );
              return (
                <div
                  key={goal.id}
                  className="border border-green-200 rounded-xl p-4"
                >
                  <div className="flex justify-between mb-2">
                    <h2 className="text-2xl font-semibold text-green-700">
                      {goal.title}
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(goal)}
                        className="text-blue-600 hover:text-blue-800 px-2 py-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="text-red-600 hover:text-red-800 px-2 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-600 mb-2">
                    Target: ${goal.target_amount} | Saved: ${goal.saved_amount}
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="number"
                      value={goal.saved_amount}
                      min="0"
                      max={goal.target_amount}
                      onChange={(e) => updateSaved(goal.id, e.target.value)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                    />
                    <span className="text-sm text-slate-500">
                      Update saved
                    </span>
                  </div>
                  <div className="w-full bg-green-100 rounded-full h-4 mb-2">
                    <div
                      className="bg-green-600 h-4 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>{progress.toFixed(1)}% complete</span>
                    <span>
                      ${Math.max(goal.target_amount - goal.saved_amount, 0)}{" "}
                      remaining
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="mt-8 bg-white shadow-md rounded-xl border border-slate-200 p-6">
            <h3 className="text-xl font-semibold text-green-700 mb-4">
              {editingGoal ? "Edit Goal" : "Add New Goal"}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Goal Title"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              <input
                type="number"
                name="target"
                value={formData.target}
                onChange={handleInputChange}
                placeholder="Target Amount"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              <input
                type="number"
                name="saved"
                value={formData.saved}
                onChange={handleInputChange}
                placeholder="Saved Amount"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              <div className="flex gap-4">
                <button
                  onClick={handleSubmit}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg"
                >
                  {editingGoal ? "Update" : "Add Goal"}
                </button>
                <button
                  onClick={cancelForm}
                  className="bg-slate-500 text-white px-6 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {!showAddForm && (
          <div className="text-center mt-8">
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-xl"
            >
              Add New Goal
            </button>
          </div>
        )}
      </div>
    </main>
  );
}