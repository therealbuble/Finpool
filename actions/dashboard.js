"use server";

import { db } from "@/lib/prisma";
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
    
    // Check if user exists by email to avoid duplicate creation
    const existingUserByEmail = await db.user.findUnique({
      where: { email: clerkUser.emailAddresses[0]?.emailAddress },
    });

    if (existingUserByEmail) {
      // Update the existing user with the Clerk ID
      user = await db.user.update({
        where: { email: clerkUser.emailAddresses[0]?.emailAddress },
        data: {
          clerkUserId: userId,
          name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" "),
          imageUrl: clerkUser.imageUrl,
        },
      });
    } else {
      // Create new user
      try {
        user = await db.user.create({
          data: {
            clerkUserId: userId,
            email: clerkUser.emailAddresses[0]?.emailAddress,
            name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" "),
            imageUrl: clerkUser.imageUrl,
          },
        });
      } catch (error) {
        // If creation fails due to unique constraint, try to find the user again
        if (error.code === 'P2002') {
          user = await db.user.findUnique({
            where: { clerkUserId: userId },
          });
          
          if (!user) {
            user = await db.user.findUnique({
              where: { email: clerkUser.emailAddresses[0]?.emailAddress },
            });
          }
          
          if (!user) {
            throw new Error("Failed to create or find user");
          }
        } else {
          throw error;
        }
      }
    }
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

    // Try to find user in your DB first
    let user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    // If not found, create the user from Clerk's session info
    if (!user) {
      // Fetch user info from Clerk
      const clerkUser = await currentUser();
      if (!clerkUser) throw new Error("Clerk user not found");
      
      // Check if user exists by email to avoid duplicate creation
      const existingUserByEmail = await db.user.findUnique({
        where: { email: clerkUser.emailAddresses[0]?.emailAddress },
      });

      if (existingUserByEmail) {
        // Update the existing user with the Clerk ID
        user = await db.user.update({
          where: { email: clerkUser.emailAddresses[0]?.emailAddress },
          data: {
            clerkUserId: userId,
            name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" "),
            imageUrl: clerkUser.imageUrl,
          },
        });
      } else {
        // Create new user
        try {
          user = await db.user.create({
            data: {
              clerkUserId: userId,
              email: clerkUser.emailAddresses[0]?.emailAddress,
              name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" "),
              imageUrl: clerkUser.imageUrl,
            },
          });
        } catch (error) {
          // If creation fails due to unique constraint, try to find the user again
          if (error.code === 'P2002') {
            user = await db.user.findUnique({
              where: { clerkUserId: userId },
            });
            
            if (!user) {
              user = await db.user.findUnique({
                where: { email: clerkUser.emailAddresses[0]?.emailAddress },
              });
            }
            
            if (!user) {
              throw new Error("Failed to create or find user");
            }
          } else {
            throw error;
          }
        }
      }
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
    
    // Check if user exists by email to avoid duplicate creation
    const existingUserByEmail = await db.user.findUnique({
      where: { email: clerkUser.emailAddresses[0]?.emailAddress },
    });

    if (existingUserByEmail) {
      // Update the existing user with the Clerk ID
      user = await db.user.update({
        where: { email: clerkUser.emailAddresses[0]?.emailAddress },
        data: {
          clerkUserId: userId,
          name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" "),
          imageUrl: clerkUser.imageUrl,
        },
      });
    } else {
      // Create new user
      try {
        user = await db.user.create({
          data: {
            clerkUserId: userId,
            email: clerkUser.emailAddresses[0]?.emailAddress,
            name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" "),
            imageUrl: clerkUser.imageUrl,
          },
        });
      } catch (error) {
        // If creation fails due to unique constraint, try to find the user again
        if (error.code === 'P2002') {
          user = await db.user.findUnique({
            where: { clerkUserId: userId },
          });
          
          if (!user) {
            user = await db.user.findUnique({
              where: { email: clerkUser.emailAddresses[0]?.emailAddress },
            });
          }
          
          if (!user) {
            throw new Error("Failed to create or find user");
          }
        } else {
          throw error;
        }
      }
    }
  }

  // Get all user transactions
  const transactions = await db.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });
  
  console.log(transactions.map(serializeTransaction));
  return transactions.map(serializeTransaction);
}