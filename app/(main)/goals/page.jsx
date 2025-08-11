import { Suspense } from "react";
import { getGoals } from "@/actions/goals";
import { BarLoader } from "react-spinners";
import GoalsPageContent from "./GoalsPageContent";

export default async function GoalsPage() {
  // Fetch initial goals on the server
  let initialGoals = [];
  try {
    initialGoals = await getGoals();
  } catch (error) {
    console.error("Error fetching goals:", error);
    // If there's an error, we'll let the client component handle fetching
  }

  return (
    <div className="px-5">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-6xl font-bold tracking-tight gradient-title">
            Goals
          </h1>
          <p className="text-muted-foreground">
            Track your savings goals and achieve your financial dreams
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <BarLoader className="mt-4" width={"100%"} color="#9333ea" />
          </div>
        }
      >
        <GoalsPageContent initialGoals={initialGoals} />
      </Suspense>
    </div>
  );
}