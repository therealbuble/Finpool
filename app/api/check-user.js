// pages/api/check-user.js

import { checkUser } from "@/lib/checkUser";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const user = await checkUser();
    return res.status(200).json(user);
  } catch (error) {
    console.error("❌ API error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
}
