export const dynamic = "force-dynamic";

async function queryHuggingFace(question, includeScrapedData = true) {
  const response = await fetch("https://therealbuble-backend.hf.space/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      include_scraped_data: includeScrapedData
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

export async function POST(req) {
  try {
    const { message } = await req.json();
    
    if (!message?.trim()) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    const hfResult = await queryHuggingFace(message, true);
    
    return Response.json({
      reply: hfResult.answer || hfResult.message || "No Response"
    });
    
  } 
  
  catch (err) {
    console.error("Route error:", err);
    return Response.json({
      reply: "⚠️ Service temporarily unavailable. Please try again."
    });
  }
}