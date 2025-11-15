import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Message {
  sender: "user" | "ai";
  content: string;
}

interface AnalysisRequest {
  conversation_id: string;
}

function analyzeClarity(messages: Message[]): number {
  let score = 85;
  for (const msg of messages) {
    if (msg.sender === "ai") {
      if (msg.content.length < 20) score -= 5;
      if (msg.content.length > 1000) score -= 3;
      const questionMarks = (msg.content.match(/\?/g) || []).length;
      if (questionMarks === 0 && msg.content.length > 100) score -= 5;
    }
  }
  return Math.max(0, Math.min(100, score));
}

function analyzeRelevance(messages: Message[]): number {
  let score = 90;
  let offTopicCount = 0;
  
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].sender === "ai" && i > 0) {
      const userMsg = messages[i - 1].content.toLowerCase();
      const aiMsg = messages[i].content.toLowerCase();
      
      const userWords = new Set(userMsg.split(/\s+/));
      const aiWords = new Set(aiMsg.split(/\s+/));
      const commonWords = [...userWords].filter(w => aiWords.has(w) && w.length > 3).length;
      
      if (commonWords === 0) offTopicCount++;
    }
  }
  
  score -= offTopicCount * 15;
  return Math.max(0, Math.min(100, score));
}

function analyzeAccuracy(messages: Message[]): number {
  let score = 80;
  
  for (const msg of messages) {
    if (msg.sender === "ai") {
      const vaguePhrases = [
        "i think",
        "probably",
        "maybe",
        "not sure",
        "possibly",
      ];
      
      const msgLower = msg.content.toLowerCase();
      const vagueCount = vaguePhrases.filter(p => msgLower.includes(p)).length;
      score -= vagueCount * 5;
    }
  }
  
  return Math.max(0, Math.min(100, score));
}

function analyzeCompleteness(messages: Message[]): number {
  let score = 85;
  let incompleteResponses = 0;
  
  for (const msg of messages) {
    if (msg.sender === "ai") {
      if (msg.content.includes("...") || msg.content.endsWith("?")) {
        incompleteResponses++;
      }
      if (msg.content.length < 30 && !msg.content.includes("?")) {
        score -= 5;
      }
    }
  }
  
  score -= incompleteResponses * 10;
  return Math.max(0, Math.min(100, score));
}

function analyzeSentiment(messages: Message[]): "positive" | "neutral" | "negative" {
  const positiveWords = [
    "great",
    "excellent",
    "thank",
    "happy",
    "love",
    "awesome",
    "perfect",
    "wonderful",
  ];
  const negativeWords = [
    "bad",
    "terrible",
    "awful",
    "angry",
    "frustrated",
    "disappointed",
    "hate",
    "worst",
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  for (const msg of messages) {
    if (msg.sender === "user") {
      const msgLower = msg.content.toLowerCase();
      positiveCount += positiveWords.filter(w => msgLower.includes(w)).length;
      negativeCount += negativeWords.filter(w => msgLower.includes(w)).length;
    }
  }

  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

function analyzeEmpathy(messages: Message[]): number {
  const empathyPhrases = [
    "i understand",
    "i appreciate",
    "sorry",
    "unfortunately",
    "thank you",
    "glad to help",
    "happy to",
  ];

  let score = 50;
  let empathyCount = 0;

  for (const msg of messages) {
    if (msg.sender === "ai") {
      const msgLower = msg.content.toLowerCase();
      const count = empathyPhrases.filter(p => msgLower.includes(p)).length;
      empathyCount += count;
    }
  }

  score += Math.min(empathyCount * 15, 50);
  return Math.min(100, score);
}

function analyzeResponseTime(messages: Message[]): number {
  if (messages.length < 2) return 100;
  return 85;
}

function analyzeResolution(messages: Message[]): boolean {
  const resolutionPhrases = [
    "resolved",
    "fixed",
    "solved",
    "completed",
    "done",
    "shipped",
    "processed",
  ];

  for (const msg of messages) {
    if (msg.sender === "ai") {
      const msgLower = msg.content.toLowerCase();
      if (resolutionPhrases.some(p => msgLower.includes(p))) {
        return true;
      }
    }
  }

  return false;
}

function analyzeEscalation(messages: Message[]): boolean {
  const escalationPhrases = [
    "escalate",
    "manager",
    "supervisor",
    "specialist",
    "level 2",
    "transfer",
  ];

  for (const msg of messages) {
    if (msg.sender === "ai") {
      const msgLower = msg.content.toLowerCase();
      if (escalationPhrases.some(p => msgLower.includes(p))) {
        return true;
      }
    }
  }

  return false;
}

function analyzeFallbackFrequency(messages: Message[]): number {
  const fallbackPhrases = [
    "i don't know",
    "not sure",
    "cannot help",
    "unable to",
    "i'm not aware",
  ];

  let count = 0;

  for (const msg of messages) {
    if (msg.sender === "ai") {
      const msgLower = msg.content.toLowerCase();
      count += fallbackPhrases.filter(p => msgLower.includes(p)).length;
    }
  }

  return count;
}

function calculateOverallScore(analysis: {
  clarity_score: number;
  relevance_score: number;
  accuracy_score: number;
  completeness_score: number;
  empathy_score: number;
  response_time_avg: number;
  resolution_rate: boolean;
  escalation_needed: boolean;
}): number {
  const scores = [
    analysis.clarity_score,
    analysis.relevance_score,
    analysis.accuracy_score,
    analysis.completeness_score,
    analysis.empathy_score,
    analysis.response_time_avg,
  ];

  let average = scores.reduce((a, b) => a + b, 0) / scores.length;

  if (analysis.resolution_rate) average += 5;
  if (analysis.escalation_needed) average -= 10;

  return Math.max(0, Math.min(100, average));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conversation_id }: AnalysisRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: messagesData, error: messagesError } = await supabase
      .from("messages")
      .select("sender, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });

    if (messagesError) throw messagesError;

    const messages: Message[] = messagesData || [];

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages found for this conversation" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const clarity_score = analyzeClarity(messages);
    const relevance_score = analyzeRelevance(messages);
    const accuracy_score = analyzeAccuracy(messages);
    const completeness_score = analyzeCompleteness(messages);
    const sentiment = analyzeSentiment(messages);
    const empathy_score = analyzeEmpathy(messages);
    const response_time_avg = analyzeResponseTime(messages);
    const resolution_rate = analyzeResolution(messages);
    const escalation_needed = analyzeEscalation(messages);
    const fallback_frequency = analyzeFallbackFrequency(messages);

    const overall_satisfaction_score = calculateOverallScore({
      clarity_score,
      relevance_score,
      accuracy_score,
      completeness_score,
      empathy_score,
      response_time_avg,
      resolution_rate,
      escalation_needed,
    });

    const analysisData = {
      conversation_id,
      clarity_score,
      relevance_score,
      accuracy_score,
      completeness_score,
      sentiment,
      empathy_score,
      response_time_avg,
      resolution_rate,
      escalation_needed,
      fallback_frequency,
      overall_satisfaction_score,
    };

    const { error: upsertError } = await supabase
      .from("conversation_analyses")
      .upsert(analysisData);

    if (upsertError) throw upsertError;

    await supabase
      .from("conversations")
      .update({ analyzed_at: new Date().toISOString() })
      .eq("id", conversation_id);

    return new Response(JSON.stringify(analysisData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
