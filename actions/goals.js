"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const serializeGoal = (goal) => ({
  ...goal,
  target_amount: goal.target_amount.toNumber(),
  saved_amount: goal.saved_amount ? goal.saved_amount.toNumber() : 0,
});

export async function getGoals() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const goals = await db.goal.findMany({
      orderBy: { created_at: "desc" },
    });

    return goals.map(serializeGoal);
  } catch (error) {
    console.error("Error fetching goals:", error);
    throw error;
  }
}

export async function createGoal(data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const { title, target_amount, saved_amount = 0 } = data;

    if (!title || !target_amount) {
      throw new Error("Title and target amount are required");
    }

    const goal = await db.goal.create({
      data: {
        title,
        target_amount: parseFloat(target_amount),
        saved_amount: parseFloat(saved_amount),
      },
    });

    revalidatePath("/goals");
    return { success: true, data: serializeGoal(goal) };
  } catch (error) {
    console.error("Error creating goal:", error);
    return { success: false, error: error.message };
  }
}

export async function updateGoal(id, data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.target_amount !== undefined) updateData.target_amount = parseFloat(data.target_amount);
    if (data.saved_amount !== undefined) updateData.saved_amount = parseFloat(data.saved_amount);

    const goal = await db.goal.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/goals");
    return { success: true, data: serializeGoal(goal) };
  } catch (error) {
    console.error("Error updating goal:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteGoal(id) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    await db.goal.delete({
      where: { id },
    });

    revalidatePath("/goals");
    return { success: true };
  } catch (error) {
    console.error("Error deleting goal:", error);
    return { success: false, error: error.message };
  }
}

export async function addMoneyToGoal(id, amount) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const goal = await db.goal.findUnique({
      where: { id },
    });

    if (!goal) {
      throw new Error("Goal not found");
    }

    const currentSaved = goal.saved_amount ? goal.saved_amount.toNumber() : 0;
    const newSavedAmount = currentSaved + parseFloat(amount);

    const updatedGoal = await db.goal.update({
      where: { id },
      data: {
        saved_amount: newSavedAmount,
      },
    });

    revalidatePath("/goals");
    return { success: true, data: serializeGoal(updatedGoal) };
  } catch (error) {
    console.error("Error adding money to goal:", error);
    return { success: false, error: error.message };
  }
}