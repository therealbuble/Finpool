import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - Fetch all conversations for user
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

    const conversations = await db.conversation.findMany({
      where: { userId: user.id },
      include: {
        messages: {
          orderBy: { timestamp: "asc" },
          take: 1, // Just get the first message for preview
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new conversation
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

    const { title, messages } = await request.json();

    const conversation = await db.conversation.create({
      data: {
        title,
        userId: user.id,
        messages: {
          create: messages.map((msg) => ({
            role: msg.role,
            content: msg.text || msg.content,
          })),
        },
      },
      include: {
        messages: true,
      },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update existing conversation
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

    const { id, messages } = await request.json();

    // Delete existing messages and create new ones
    await db.message.deleteMany({
      where: { conversationId: id },
    });

    const conversation = await db.conversation.update({
      where: { id, userId: user.id },
      data: {
        updatedAt: new Date(),
        messages: {
          create: messages.map((msg) => ({
            role: msg.role,
            content: msg.text || msg.content,
          })),
        },
      },
      include: {
        messages: true,
      },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Error updating conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}