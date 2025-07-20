// middleware.js
import arcjet, { createMiddleware, detectBot, shield } from "@arcjet/next";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// ---- Arcjet Setup ----
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/account(.*)",
  "/transaction(.*)",
]);

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({
      mode: "LIVE",
    }),
    detectBot({
      mode: "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE", "GO_HTTP"],
    }),
  ],
});

// ---- Clerk Setup ----
const clerk = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (!userId && isProtectedRoute(req)) {
    const { redirectToSignIn } = await auth();
    return redirectToSignIn();
  }

  return NextResponse.next();
});

// ---- Metals Service Initialization ----
let serviceInitialized = false;

const metalsInitMiddleware = async (req) => {
  if (!serviceInitialized && process.env.NODE_ENV === "production") {
    try {
      const { initMetalsService } = await import("./lib/startup/initMetalsService");
      await initMetalsService();
      serviceInitialized = true;
    } catch (error) {
      console.error("Failed to initialize metals service in middleware:", error);
    }
  }

  return NextResponse.next();
};

// ---- Combine all ----
// Arcjet -> Clerk -> MetalsInit
export default createMiddleware(
  aj,
  clerk,
  metalsInitMiddleware
);

// ---- Config ----
export const config = {
  matcher: [
    // Match all except Next internals & static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API
    "/(api|trpc)(.*)",
  ],
};
