import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - Fetch specific conversation with all messages
export async function GET(request, { params }) {
  try {
    console.log("=== Fetching conversation details ===");
    console.log("Conversation ID:", params.id);
    
    const { userId } = await auth();
    if (!userId) {
      console.log("No userId found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      console.log("User not found in database");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("User found:", user.id);

    const conversation = await db.conversation.findFirst({
      where: { 
        id: params.id,
        userId: user.id 
      },
      include: {
        messages: {
          orderBy: { timestamp: "asc" },
        },
      },
    });

    console.log("Conversation found:", !!conversation);
    console.log("Messages count:", conversation?.messages?.length || 0);

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Ensure messages is always an array
    const conversationData = {
      ...conversation,
      messages: conversation.messages || []
    };

    console.log("Returning conversation data");
    return NextResponse.json({ conversation: conversationData });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete specific conversation
export async function DELETE(request, { params }) {
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

    await db.conversation.delete({
      where: { 
        id: params.id,
        userId: user.id 
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}