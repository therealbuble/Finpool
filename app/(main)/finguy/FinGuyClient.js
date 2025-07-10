
"use client";
import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Mic, MicOff } from "lucide-react";

export default function FinGuyClient({ initialAccounts, initialTransactions }) {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text:
        "👋 Hi, I'm FinGuy! I'm here to help with all your financial questions - budgeting, investments, saving strategies, expense tracking, and more. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  const userContext = {
    accounts: initialAccounts || [],
    transactions: initialTransactions || [],
  };

  // Fix hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setListening(false);
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          setListening(false);
        };

        recognition.onend = () => {
          setListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const handleMicClick = () => {
    if (recognitionRef.current) {
      if (!listening) {
        recognitionRef.current.start();
        setListening(true);
      } else {
        recognitionRef.current.stop();
        setListening(false);
      }
    } else {
      alert("Sorry, your browser does not support Speech Recognition.");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (mounted) {
      scrollToBottom();
    }
  }, [messages, mounted]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", text: input };
    const currentInput = input;
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput("");
    setLoading(true);

    try {
      const conversationHistory = currentMessages.filter(
        (msg) =>
          msg.text !==
          "👋 Hi, I'm FinGuy! I'm here to help with all your financial questions - budgeting, investments, saving strategies, expense tracking, and more. What would you like to know?"
      );

      const res = await fetch("/api/finguy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentInput,
          conversationHistory: conversationHistory,
          userContext: userContext,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.reply) {
        setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: "⚠️ I didn't receive a proper response. Please try again.",
          },
        ]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "⚠️ Connection error. Please check your internet and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-red-700 mb-2">FinGuy</h1>
            <p className="text-slate-600">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  const totalBalance = userContext.accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-red-700 mb-2">FinGuy Chat</h1>
          <p className="text-slate-600">Your Personal Financial Assistant</p>
          {userContext.accounts.length > 0 && (
            <p className="text-sm text-green-600 mt-2">
              Connected to your accounts • Total Balance: $
              {totalBalance.toFixed(2)} • {userContext.accounts.length} account
              {userContext.accounts.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 h-[600px] flex flex-col">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={`${msg.role}-${idx}-${msg.text.slice(0, 20)}`}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "bot" && (
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-red-600" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] p-4 rounded-2xl ${
                    msg.role === "bot"
                      ? "bg-red-50 text-slate-800 border border-red-100"
                      : "bg-red-600 text-white"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-red-600" />
                </div>
                <div className="bg-red-50 text-slate-800 border border-red-100 p-4 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-red-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-red-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-sm text-slate-600">
                      FinGuy is thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Container */}
          <div className="border-t border-slate-200 p-4">
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about stocks, investments, gold prices, budgeting, crypto..."
                className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={loading}
                maxLength={500}
              />
              <button
                onClick={handleMicClick}
                className={`px-4 py-3 rounded-xl transition-colors flex items-center gap-2 shadow-sm ${
                  listening
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                }`}
                disabled={loading}
                title="Voice input"
              >
                {listening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span className="hidden sm:inline">Stop</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span className="hidden sm:inline">Speak</span>
                  </>
                )}
              </button>
              <button
                onClick={sendMessage}
                className="bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                disabled={loading || !input.trim()}
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500 text-center">
              FinGuy knows about your accounts and can provide personalized
              financial advice
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
