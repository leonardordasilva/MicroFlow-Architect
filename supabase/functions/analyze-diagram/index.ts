import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((o) => o.trim()).filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0] || "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const MODEL_CASCADE = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
];

async function callWithFallback(apiKey: string, messages: { role: string; content: string }[]) {
  for (const model of MODEL_CASCADE) {
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages }),
      });
      if (response.status === 429 || response.status === 503) {
        console.warn(`Model ${model} returned ${response.status}, trying next...`);
        continue;
      }
      if (response.status === 402) {
        return { error: "Payment required. Add credits to your workspace.", status: 402 };
      }
      if (!response.ok) {
        const t = await response.text();
        console.error(`AI gateway error (${model}):`, response.status, t);
        continue;
      }
      const result = await response.json();
      return { data: result, status: 200 };
    } catch (e) {
      console.error(`Model ${model} failed:`, e);
      continue;
    }
  }
  return { error: "All AI models unavailable. Try again later.", status: 503 };
}

// ─── Rate Limiting ───
const RATE_LIMIT_PER_MINUTE = parseInt(Deno.env.get("AI_RATE_LIMIT_PER_MINUTE") || "10", 10);

async function checkRateLimit(
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  functionName: string,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

  const { count, error } = await supabaseClient
    .from("ai_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("function_name", functionName)
    .gte("created_at", oneMinuteAgo);

  if (error) {
    console.error("Rate limit check error:", error);
    return null;
  }

  if ((count ?? 0) >= RATE_LIMIT_PER_MINUTE) {
    return new Response(
      JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  await supabaseClient
    .from("ai_requests")
    .insert({ user_id: userId, function_name: functionName });

  return null;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = (claimsData.claims as Record<string, string>).sub;

    // Rate limiting
    const rateLimitResponse = await checkRateLimit(supabaseClient, userId, "analyze-diagram", corsHeaders);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await req.json();
    const diagram = body?.diagram;

    // Input validation: ensure diagram is an object with nodes/edges arrays
    if (!diagram || typeof diagram !== 'object') {
      return new Response(JSON.stringify({ error: "Invalid input: diagram object required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (Array.isArray(diagram.nodes) && diagram.nodes.length > 200) {
      return new Response(JSON.stringify({ error: "Too many nodes (max 200)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (Array.isArray(diagram.edges) && diagram.edges.length > 500) {
      return new Response(JSON.stringify({ error: "Too many edges (max 500)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Limit serialized size to 500KB
    const diagramStr = JSON.stringify(diagram);
    if (diagramStr.length > 512000) {
      return new Response(JSON.stringify({ error: "Payload too large (max 500KB)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("API key not configured");

    const systemPrompt = `You are a senior software architect. Analyze the microservices architecture diagram and provide a comprehensive review in Portuguese (Brazilian).

Include:
1. **Visão Geral**: Brief summary of the architecture
2. **Pontos Fortes**: What's good about this design
3. **Pontos de Atenção**: Potential issues or risks
4. **Sugestões de Melhoria**: Specific recommendations
5. **Escalabilidade**: How well it would scale
6. **Resiliência**: Single points of failure, fault tolerance

Be specific and actionable. Reference actual services by name.`;

    const diagramDescription = diagramStr;

    const result = await callWithFallback(LOVABLE_API_KEY, [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze this microservices architecture:\n\n${diagramDescription}` },
    ]);

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = result.data.choices?.[0]?.message?.content || "Sem análise disponível.";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-diagram error:", e);
    return new Response(
      JSON.stringify({ error: "Failed to analyze diagram. Please try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
