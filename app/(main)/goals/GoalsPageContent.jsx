"use client";

import { useState, useEffect } from "react";
import { Target, TrendingUp, DollarSign, Trophy, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useFetch from "@/hooks/use-fetch";
import { getGoals, createGoal } from "@/actions/goals";
import { BarLoader } from "react-spinners";

export default function GoalsPageContent({ initialGoals = [] }) {
  const [goals, setGoals] = useState(initialGoals);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: "",
    target_amount: "",
    saved_amount: ""
  });

  const {
    loading: goalsLoading,
    fn: fetchGoals,
    data: goalsData,
  } = useFetch(getGoals);

  const {
    loading: createLoading,
    fn: createGoalFn,
    data: createResult,
  } = useFetch(createGoal);

  useEffect(() => {
    if (initialGoals.length === 0) {
      fetchGoals();
    }
  }, [initialGoals.length]);

  useEffect(() => {
    if (goalsData) {
      setGoals(goalsData);
    }
  }, [goalsData]);

  useEffect(() => {
    if (createResult?.success) {
      toast.success("Goal created successfully!");
      setShowAddModal(false);
      setNewGoal({ title: "", target_amount: "", saved_amount: "" });
      fetchGoals(); // Refresh the goals list
    } else if (createResult && !createResult.success) {
      toast.error(createResult.error || "Failed to create goal");
    }
  }, [createResult]);

  const handleAddGoal = async (e) => {
    e.preventDefault();
    
    if (!newGoal.title.trim()) {
      toast.error("Please enter a goal title");
      return;
    }

    const targetAmount = parseFloat(newGoal.target_amount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      toast.error("Please enter a valid target amount");
      return;
    }

    const savedAmount = parseFloat(newGoal.saved_amount) || 0;
    if (savedAmount < 0) {
      toast.error("Saved amount cannot be negative");
      return;
    }

    if (savedAmount > targetAmount) {
      toast.error("Saved amount cannot be greater than target amount");
      return;
    }

    await createGoalFn({
      title: newGoal.title.trim(),
      target_amount: targetAmount,
      saved_amount: savedAmount,
    });
  };

  // Calculate statistics
  const totalGoals = goals.length;
  const completedGoals = goals.filter(goal => (goal.saved_amount / goal.target_amount) >= 1).length;
  const totalTargetAmount = goals.reduce((sum, goal) => sum + goal.target_amount, 0);
  const totalSavedAmount = goals.reduce((sum, goal) => sum + goal.saved_amount, 0);
  const overallProgress = totalTargetAmount > 0 ? (totalSavedAmount / totalTargetAmount) * 100 : 0;

  if (goalsLoading && goals.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <BarLoader className="mt-4" width={"100%"} color="#9333ea" />
      </div>
    );
  }

  return (
    <>
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGoals}</div>
            <p className="text-xs text-muted-foreground">
              {completedGoals} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallProgress.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Across all goals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saved</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalSavedAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              of ${totalTargetAmount.toFixed(2)} target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalGoals > 0 ? ((completedGoals / totalGoals) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Goals completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Goals Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Add Goal Card - Now with click handler */}
        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer border-dashed border-2 border-gray-300 hover:border-gray-400"
          onClick={() => setShowAddModal(true)}
        >
          <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full pt-8 pb-8">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-lg font-medium text-gray-700">Add New Goal</p>
            <p className="text-sm text-gray-500 mt-1">Set a savings target</p>
          </CardContent>
        </Card>

        {/* Goal Cards */}
        {goals.map((goal) => {
          const progress = (goal.saved_amount / goal.target_amount) * 100;
          const isCompleted = progress >= 100;
          
          return (
            <Card key={goal.id} className={`transition-all hover:shadow-lg ${isCompleted ? 'border-green-500 bg-green-50' : ''}`}>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  {goal.title}
                  {isCompleted && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Completed!
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Amount Info */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      ${goal.saved_amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      of ${goal.target_amount.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-red-600">
                      ${(goal.target_amount - goal.saved_amount).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">remaining</p>
                  </div>
                </div>

                {/* Add Money Button - Simple for now */}
                {!isCompleted && (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => {
                      toast.info("Add money functionality coming soon!");
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Money
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {goals.length === 0 && !goalsLoading && (
        <div className="text-center py-12">
          <Target className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No Goals Yet
          </h3>
          <p className="text-gray-500 mb-6">
            Start by creating your first savings goal to track your progress
          </p>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Create New Goal
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddGoal} className="p-6 space-y-4">
              {/* Goal Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goal Title *
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Emergency Fund, Vacation, New Car"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full"
                  maxLength={100}
                  required
                />
              </div>

              {/* Target Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Amount *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newGoal.target_amount}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, target_amount: e.target.value }))}
                    className="pl-10 w-full"
                    required
                  />
                </div>
              </div>

              {/* Initial Saved Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Saved Amount (Optional)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newGoal.saved_amount}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, saved_amount: e.target.value }))}
                    className="pl-10 w-full"
                  />
                </div>
              </div>

              {/* Preview */}
              {newGoal.target_amount && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Preview:</p>
                  <p className="font-medium">
                    ${newGoal.saved_amount || "0"} of ${newGoal.target_amount}
                  </p>
                  <p className="text-xs text-gray-500">
                    ${((parseFloat(newGoal.target_amount) || 0) - (parseFloat(newGoal.saved_amount) || 0)).toFixed(2)} remaining
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1"
                  disabled={createLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createLoading}
                >
                  {createLoading ? "Creating..." : "Create Goal"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}