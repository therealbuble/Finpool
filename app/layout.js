import { Inter } from "next/font/google";
import "./globals.css";
import Header from "../components/header"; // Changed to lowercase 'header' to match your file name
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "FinPool",
  description: "One stop Finance Platform",
  icons: {
    icon: "/F.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <Header />

          <main className="min-h-screen">{children}</main>

          <footer className="bg-blue-50 py-12">
            <div className="container mx-auto px-4 text-center text-gray-600">
              <p>© 2025 Team F4. All rights reserved.</p>
            </div>
          </footer>

          <Toaster richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}