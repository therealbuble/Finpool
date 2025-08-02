import { getUserAccounts, getDashboardData } from "@/actions/dashboard";
import FinGuyClient from "./FinGuyClient";

export default async function FinGuyPage() {
  // Fetch user data on the server side using your existing functions
  const [accounts, transactions] = await Promise.all([
    getUserAccounts(),
    getDashboardData(),
  ]);

  // Pass the data to the client component
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 relative">
      <FinGuyClient 
        initialAccounts={accounts}
        initialTransactions={transactions}
      />
    </main>
  );
}