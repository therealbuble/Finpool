"use server";

import aj from "@/lib/arcjet";
import { db } from "@/lib/db";
import { request } from "@arcjet/next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const serializeTransaction = (obj) => {
  const serialized = { ...obj };
  if (obj.balance) {
    serialized.balance = obj.balance.toNumber();
  }
  if (obj.amount) {
    serialized.amount = obj.amount.toNumber();
  }
  return serialized;
};

export async function getUserAccounts() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Try to find user in your DB first
  let user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  // If not found, create the user from Clerk's session info
  if (!user) {
    // Fetch user info from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) throw new Error("Clerk user not found");
    
    user = await db.user.create({
      data: {
        clerkUserId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" "),
      },
    });
  }

  try {
    const accounts = await db.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    // Serialize accounts before sending to client
    const serializedAccounts = accounts.map(serializeTransaction);
    console.log(serializedAccounts);

    return serializedAccounts;
  } catch (error) {
    console.error(error.message);
  }
}

export async function createAccount(data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Get request data for ArcJet
    const req = await request();

    // Check rate limit
    const decision = await aj.protect(req, {
      userId,
      requested: 1, // Specify how many tokens to consume
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        const { remaining, reset } = decision.reason;
        console.error({
          code: "RATE_LIMIT_EXCEEDED",
          details: {
            remaining,
            resetInSeconds: reset,
          },
        });

        throw new Error("Too many requests. Please try again later.");
      }

      throw new Error("Request blocked");
    }

    // Try to find user in your DB first
    let user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    // If not found, create the user from Clerk's session info
    if (!user) {
      // Fetch user info from Clerk
      const clerkUser = await currentUser();
      if (!clerkUser) throw new Error("Clerk user not found");
      
      user = await db.user.create({
        data: {
          clerkUserId: userId,
          email: clerkUser.emailAddresses[0]?.emailAddress,
          name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" "),
        },
      });
    }

    // Convert balance to float before saving
    const balanceFloat = parseFloat(data.balance);
    if (isNaN(balanceFloat)) {
      throw new Error("Invalid balance amount");
    }

    // Check if this is the user's first account
    const existingAccounts = await db.account.findMany({
      where: { userId: user.id },
    });

    // If it's the first account, make it default regardless of user input
    // If not, use the user's preference
    const shouldBeDefault =
      existingAccounts.length === 0 ? true : data.isDefault;

    // If this account should be default, unset other default accounts
    if (shouldBeDefault) {
      await db.account.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create new account
    const account = await db.account.create({
      data: {
        ...data,
        balance: balanceFloat,
        userId: user.id,
        isDefault: shouldBeDefault, // Override the isDefault based on our logic
      },
    });

    // Serialize the account before returning
    const serializedAccount = serializeTransaction(account);

    revalidatePath("/dashboard");
    return { success: true, data: serializedAccount };
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getDashboardData() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Try to find user in your DB first
  let user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  // If not found, create the user from Clerk's session info
  if (!user) {
    // Fetch user info from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) throw new Error("Clerk user not found");
    
    user = await db.user.create({
      data: {
        clerkUserId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" "),
      },
    });
  }

  // Get all user transactions
  const transactions = await db.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });
  
  console.log(transactions.map(serializeTransaction));
  return transactions.map(serializeTransaction);
}