// Remove edge runtime to avoid timeout issues
// export const runtime = "edge";
export const dynamic = "force-dynamic";




export async function POST(req) {
  try {
    const { message, conversationHistory = [], userContext = null } = await req.json();

    if (!message || !message.trim()) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    // Build user context information for the prompt
    let userContextInfo = "";
    if (userContext && userContext.accounts && userContext.transactions) {
      const { accounts, transactions } = userContext;
      
      // Calculate financial summary
      const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
      const totalTransactions = transactions.length;
      const recentExpenses = transactions
        .filter(t => t.type === "EXPENSE")
        .slice(0, 5)
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Get spending by category for recent transactions
      const categorySpending = {};
      transactions.filter(t => t.type === "EXPENSE").slice(0, 10).forEach(t => {
        categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
      });
      
      const topCategories = Object.entries(categorySpending)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([cat, amount]) => `${cat}: ${amount.toFixed(2)}`)
        .join(", ");

      userContextInfo = `

USER FINANCIAL CONTEXT:
- Total Account Balance: ${totalBalance.toFixed(2)}
- Number of Accounts: ${accounts.length}
- Account Types: ${accounts.map(acc => `${acc.name} (${acc.type})`).join(", ")}
- Recent Transactions: ${totalTransactions} total
- Recent Expenses (last 5): ${recentExpenses.toFixed(2)}
- Top Spending Categories: ${topCategories || "No spending data"}
- Default Account: ${accounts.find(acc => acc.isDefault)?.name || "None"}

Use this information to provide personalized financial advice. You can reference their current balance, spending patterns, and account details when relevant.`;
    }

    // Enhanced prompt for financial focus
    const systemPrompt = `You are FinGuy, a helpful financial assistant. You provide advice and answers related to ALL financial and investment topics.

IMPORTANT: Always remember the conversation context. When someone says "it" or "that", refer back to what was previously discussed.

FINANCIAL TOPICS YOU HANDLE:
- Personal finance management and budgeting
- Investment advice (stocks, bonds, mutual funds, ETFs, crypto)
- Market analysis and stock prices
- Commodity prices (gold, silver, oil, etc.)
- Currency exchange rates and forex
- Real estate investments
- Retirement planning and savings strategies
- Debt management and credit
- Banking and account management
- Financial planning and wealth building
- Insurance and risk management
- Tax planning and strategies
- Economic trends and market news
- Trading strategies and portfolio management
- Business finance and entrepreneurship
- Receipt scanning and expense categorization
- Income and expense analysis

ONLY REJECT questions that are completely unrelated to finance.

Keep responses helpful and conversational. Always maintain context from previous messages in the conversation.${userContextInfo}`;

    // Build conversation contents with proper context
    const contents = [];
    
    // Add system message first
    contents.push({
      role: "user",
      parts: [{ text: systemPrompt }]
    });
    
    contents.push({
      role: "model",
      parts: [{ text: "I understand. I'm FinGuy, your financial assistant. I'll help with all financial topics and I will always remember our conversation context. When you refer to 'it', 'that', or 'those', I'll know what you're talking about from our previous discussion. I also have access to your current financial information to provide personalized advice." }]
    });

    // Add conversation history (filter out the initial greeting from both frontend and backend)
    conversationHistory.forEach(msg => {
      // Skip the initial greeting message
      if (msg.text.includes("👋 Hi, I'm FinGuy!") || 
          msg.text.includes("I understand. I'm FinGuy")) {
        return;
      }
      
      contents.push({
        role: msg.role === "bot" ? "model" : "user",
        parts: [{ text: msg.text }]
      });
    });
    
    // Add current user message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    console.log("Sending to Gemini with user context:", JSON.stringify(contents, null, 2)); // Debug log

    // Use updated model name and add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    clearTimeout(timeoutId);

    if (!geminiRes.ok) {
      console.error("Gemini API error:", geminiRes.status, geminiRes.statusText);
      return Response.json(
        { reply: "⚠️ Sorry, I'm having trouble connecting right now. Please try again." },
        { status: 200 }
      );
    }

    const data = await geminiRes.json();
    
    if (data.error) {
      console.error("Gemini API returned error:", data.error);
      return Response.json(
        { reply: "⚠️ I encountered an error. Please try rephrasing your question." },
        { status: 200 }
      );
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 
                  "⚠️ I didn't understand that. Can you ask me a financial question?";

    return Response.json({ reply });

  } catch (err) {
    console.error("FinGuy API error:", err);
    
    // Handle specific error types
    if (err.name === 'AbortError') {
      return Response.json(
        { reply: "⚠️ Request timeout. Please try asking a shorter question." },
        { status: 200 }
      );
    }

    return Response.json(
      { reply: "⚠️ I'm having technical difficulties. Please try again in a moment." },
      { status: 200 }
    );
  }
}

