import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - Fetch all goals
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const goals = await db.goal.findMany({
      orderBy: { created_at: "desc" },
    });

    // Convert Decimal to number for JSON serialization
    const serializedGoals = goals.map(goal => ({
      ...goal,
      target_amount: goal.target_amount.toNumber(),
      saved_amount: goal.saved_amount ? goal.saved_amount.toNumber() : 0,
    }));

    return NextResponse.json({ goals: serializedGoals });
  } catch (error) {
    console.error("Error fetching goals:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new goal
export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { title, target_amount, saved_amount = 0 } = await request.json();

    if (!title || !target_amount) {
      return NextResponse.json({ error: "Title and target amount are required" }, { status: 400 });
    }

    const goal = await db.goal.create({
      data: {
        title,
        target_amount: parseFloat(target_amount),
        saved_amount: parseFloat(saved_amount),
      },
    });

    const serializedGoal = {
      ...goal,
      target_amount: goal.target_amount.toNumber(),
      saved_amount: goal.saved_amount ? goal.saved_amount.toNumber() : 0,
    };

    return NextResponse.json({ goal: serializedGoal });
  } catch (error) {
    console.error("Error creating goal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update goal
export async function PUT(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id, title, target_amount, saved_amount } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Goal ID is required" }, { status: 400 });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (target_amount !== undefined) updateData.target_amount = parseFloat(target_amount);
    if (saved_amount !== undefined) updateData.saved_amount = parseFloat(saved_amount);

    const goal = await db.goal.update({
      where: { id },
      data: updateData,
    });

    const serializedGoal = {
      ...goal,
      target_amount: goal.target_amount.toNumber(),
      saved_amount: goal.saved_amount ? goal.saved_amount.toNumber() : 0,
    };

    return NextResponse.json({ goal: serializedGoal });
  } catch (error) {
    console.error("Error updating goal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}