import { getUserAccounts, getDashboardData } from "@/actions/dashboard";
import ClientWrapper from './ClientWrapper';

export default async function FinGuyPage() {
  // Fetch user data on the server side using your existing functions
  const [accounts, transactions] = await Promise.all([
    getUserAccounts(),
    getDashboardData(),
  ]);

  // Pass the data to the client component
  return (
    <ClientWrapper 
      initialAccounts={accounts}
      initialTransactions={transactions}
    />
  );
}