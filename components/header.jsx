// components/Header.jsx
"use client";

import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { PenBox, LayoutDashboard, BarChart3, Target } from "lucide-react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Image from "next/image";

const Header = () => {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    const check = async () => {
      if (isSignedIn) {
        const res = await fetch("/api/check-user", { method: "POST" });
        const data = await res.json();
        console.log("User checked/created:", data);
      }
    };
    check();
  }, [isSignedIn]);

  return (
    <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo with hover animation */}
        <Link href="/" className="transition-transform duration-200 hover:scale-105">
          <Image
            src={"/log.png"}
            alt="FinPool Logo"
            width={200}
            height={60}
            className="h-12 w-auto object-contain"
          />
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          <SignedOut>
            <a 
              href="#features" 
              className="text-gray-600 hover:text-blue-600 transition-all duration-300 hover:scale-105 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-blue-600 after:transition-all after:duration-300 hover:after:w-full"
            >
              Features
            </a>
            <a 
              href="#testimonials" 
              className="text-gray-600 hover:text-blue-600 transition-all duration-300 hover:scale-105 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-blue-600 after:transition-all after:duration-300 hover:after:w-full"
            >
              Testimonials
            </a>
          </SignedOut>
        </div>

        <div className="flex items-center space-x-4">
          <SignedIn>
            {/* Dashboard Button with animations */}
            <Link href="/dashboard">
              <Button 
                variant="outline" 
                className="transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-blue-500 hover:bg-blue-50 group"
              >
                <LayoutDashboard 
                  size={18} 
                  className="transition-transform duration-300 group-hover:rotate-12" 
                />
                <span className="hidden md:inline">Dashboard</span>
              </Button>
            </Link>

            

            {/* FinGuy Button with enhanced animations */}
            <Link href="/finguy">
              <Button className="bg-red-600 hover:bg-red-700 text-white shadow-md transition-all duration-300 hover:scale-105 hover:shadow-xl hover:rotate-1 active:scale-95">
                <span className="transition-all duration-300">FinGuy</span>
              </Button>
            </Link>

            {/* Goals Button with animations */}
            <Link href="/goals">
              <Button 
                variant="outline"
                className="transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-green-500 hover:bg-green-50 group"
              >
                <Target 
                  size={18} 
                  className="transition-transform duration-300 group-hover:rotate-90" 
                />
                <span className="hidden md:inline">Goals</span>
              </Button>
            </Link>

            {/* Add Transaction Button with animations */}
            <Link href="/transaction/create">
              <Button className="transition-all duration-300 hover:scale-105 hover:shadow-lg hover:bg-gray-800 group active:scale-95">
                <PenBox 
                  size={18} 
                  className="transition-transform duration-300 group-hover:-rotate-12" 
                />
                <span className="hidden md:inline">Add Transaction</span>
              </Button>
            </Link>
          </SignedIn>

          <SignedOut>
            <SignInButton forceRedirectUrl="/dashboard">
              <Button 
                variant="outline"
                className="transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-blue-500 hover:bg-blue-50"
              >
                Login / Signup
              </Button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <div className="transition-transform duration-200 hover:scale-105">
              <UserButton appearance={{ elements: { avatarBox: "w-10 h-10" } }} />
            </div>
          </SignedIn>
        </div>
      </nav>
    </header>
  );
};

export default Header;