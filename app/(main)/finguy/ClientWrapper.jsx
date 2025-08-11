"use client";

import { useState, useEffect } from 'react';
import FinGuyClient from './FinGuyClient';
import { BarLoader } from "react-spinners";

export default function ClientWrapper({ initialAccounts, initialTransactions }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-red-700 mb-2">FinGuy</h1>
            <p className="text-slate-600">Loading...</p>
          </div>
          <div className="flex justify-center">
            <BarLoader color="#dc2626" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <FinGuyClient 
      initialAccounts={initialAccounts}
      initialTransactions={initialTransactions}
    />
  );
}