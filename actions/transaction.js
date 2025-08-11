"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const serializeAmount = (obj) => ({
  ...obj,
  amount: obj.amount.toNumber(),
});

// Create Transaction
export async function createTransaction(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) throw new Error("User not found");

  const account = await db.account.findUnique({
    where: { id: data.accountId, userId: user.id },
  });
  if (!account) throw new Error("Account not found");

  const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
  const newBalance = account.balance.toNumber() + balanceChange;

  const transaction = await db.$transaction(async (tx) => {
    const newTransaction = await tx.transaction.create({
      data: {
        ...data,
        userId: user.id,
        nextRecurringDate:
          data.isRecurring && data.recurringInterval
            ? calculateNextRecurringDate(data.date, data.recurringInterval)
            : null,
      },
    });

    await tx.account.update({
      where: { id: data.accountId },
      data: { balance: newBalance },
    });

    return newTransaction;
  });

  revalidatePath("/dashboard");
  revalidatePath(`/account/${transaction.accountId}`);

  return { success: true, data: serializeAmount(transaction) };
}

export async function getTransaction(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) throw new Error("User not found");

  const transaction = await db.transaction.findUnique({
    where: { id, userId: user.id },
  });
  if (!transaction) throw new Error("Transaction not found");

  return serializeAmount(transaction);
}

export async function updateTransaction(id, data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) throw new Error("User not found");

  const originalTransaction = await db.transaction.findUnique({
    where: { id, userId: user.id },
    include: { account: true },
  });
  if (!originalTransaction) throw new Error("Transaction not found");

  const oldBalanceChange =
    originalTransaction.type === "EXPENSE"
      ? -originalTransaction.amount.toNumber()
      : originalTransaction.amount.toNumber();

  const newBalanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
  const netBalanceChange = newBalanceChange - oldBalanceChange;

  const transaction = await db.$transaction(async (tx) => {
    const updated = await tx.transaction.update({
      where: { id, userId: user.id },
      data: {
        ...data,
        nextRecurringDate:
          data.isRecurring && data.recurringInterval
            ? calculateNextRecurringDate(data.date, data.recurringInterval)
            : null,
      },
    });

    await tx.account.update({
      where: { id: data.accountId },
      data: { balance: { increment: netBalanceChange } },
    });

    return updated;
  });

  revalidatePath("/dashboard");
  revalidatePath(`/account/${data.accountId}`);

  return { success: true, data: serializeAmount(transaction) };
}

// Get User Transactions
export async function getUserTransactions(query = {}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) throw new Error("User not found");

  const transactions = await db.transaction.findMany({
    where: { userId: user.id, ...query },
    include: { account: true },
    orderBy: { date: "desc" },
  });

  return { success: true, data: transactions };
}

// Scan Receipt — Fixed with correct Gemini model
export async function scanReceipt(file) {
  try {
    console.log("📸 Starting scanReceipt");

    // ✅ Fixed: Using correct model name
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // Changed from "gemini-2.0-pro-latest"
    });

    const arrayBuffer = await file.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString("base64");

    console.log("🗂️ File converted to base64. Size:", base64String.length);

    const prompt = `
      Analyze this receipt image and extract the following information. Based on the items purchased, select the most appropriate category from this list:

      AVAILABLE CATEGORIES:
      - "groceries" (for food items, produce, household supplies from grocery stores)
      - "food" (for restaurants, takeout, dining out)
      - "transportation" (for fuel, parking, car maintenance, public transport)
      - "utilities" (for electricity, water, gas, internet, phone bills)
      - "healthcare" (for medical, dental, pharmacy, insurance)
      - "shopping" (for clothing, electronics, home goods, general retail)
      - "entertainment" (for movies, games, streaming services)
      - "housing" (for rent, mortgage, property tax, maintenance)
      - "education" (for tuition, books, courses)
      - "personal" (for haircut, gym, beauty, personal care)
      - "travel" (for flights, hotels, vacation expenses)
      - "insurance" (for life, home, vehicle insurance)
      - "gifts" (for gifts and donations)
      - "bills" (for bank fees, service charges)
      - "other-expense" (for anything that doesn't fit other categories)

      Extract and return ONLY this JSON format:
      {
        "amount": number,
        "date": "ISO string",
        "description": "string",
        "merchantName": "string", 
        "category": "exact_category_id_from_list_above"
      }

      IMPORTANT RULES:
      - Look at the merchant name and items to determine category
      - Grocery stores (Walmart, Target grocery section, supermarkets) = "groceries"
      - Restaurants/fast food = "food" 
      - Gas stations = "transportation"
      - Pharmacies = "healthcare"
      - Clothing stores = "shopping"
      - Use "other-expense" only if truly uncertain
      - If it's NOT a receipt, return {} only
      - Return ONLY valid JSON, no other text
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      },
      prompt,
    ]);

    console.log("✅ Gemini API responded:", result);

    const response = await result.response;
    const text = await response.text();

    console.log("📄 Raw Gemini response:", text);

    const cleanedText = text.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();

    console.log("🧹 Cleaned:", cleanedText);

    const data = JSON.parse(cleanedText);

    if (!data || Object.keys(data).length === 0) {
      console.warn("⚠️ Gemini returned empty JSON");
      return {};
    }

    return {
      amount: parseFloat(data.amount),
      date: new Date(data.date),
      description: data.description,
      merchantName: data.merchantName,
      category: data.category,
    };
  } catch (error) {
    console.error("❌ scanReceipt failed:", error);
    throw new Error("Failed to scan receipt");
  }
}

// Calculate next recurring date
function calculateNextRecurringDate(startDate, interval) {
  const date = new Date(startDate);
  switch (interval) {
    case "DAILY": 
      date.setDate(date.getDate() + 1); 
      break;
    case "WEEKLY": 
      date.setDate(date.getDate() + 7); 
      break;
    case "MONTHLY": 
      date.setMonth(date.getMonth() + 1); 
      break;
    case "YEARLY": 
      date.setFullYear(date.getFullYear() + 1); 
      break;
  }
  return date;
}