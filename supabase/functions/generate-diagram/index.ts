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
    // Fail open — don't block if we can't check
    return null;
  }

  if ((count ?? 0) >= RATE_LIMIT_PER_MINUTE) {
    return new Response(
      JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Purge stale rate-limit records (> 5 minutes old)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
  await supabaseClient
    .from("ai_requests")
    .delete()
    .eq("user_id", userId)
    .eq("function_name", functionName)
    .lt("created_at", fiveMinutesAgo);

  // Record this request
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
    const rateLimitResponse = await checkRateLimit(supabaseClient, userId, "generate-diagram", corsHeaders);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await req.json();
    const description = body?.description;

    // Input validation
    if (!description || typeof description !== 'string') {
      return new Response(JSON.stringify({ error: "Invalid input: description string required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (description.length < 5) {
      return new Response(JSON.stringify({ error: "Description too short (min 5 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (description.length > 5000) {
      return new Response(JSON.stringify({ error: "Description too long (max 5000 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("API key not configured");

    const systemPrompt = `You are a microservices architecture expert. Given a description, generate a diagram as JSON.

Return ONLY valid JSON with this exact structure:
{
  "nodes": [
    {
      "id": "unique_id",
      "type": "service" | "database" | "queue" | "external",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "Node Name",
        "type": "service" | "database" | "queue" | "external",
        "externalCategory": "API" | "CDN" | "Auth" | "Payment" | "Storage" | "Analytics" | "Other",
        "internalDatabases": [],
        "internalServices": []
      }
    }
  ],
  "edges": [
    {
      "id": "edge_id",
      "source": "source_node_id",
      "target": "target_node_id",
      "type": "editable",
      "animated": true,
      "data": {
        "protocol": "REST"
      },
      "label": "REST"
    }
  ]
}

For nodes with type "external", ALWAYS set externalCategory to one of: API, CDN, Auth, Payment, Storage, Analytics, Other.
- API: generic third-party APIs
- CDN: content delivery networks (Cloudflare, Akamai)
- Auth: authentication providers (Auth0, Firebase Auth, Keycloak)
- Payment: payment gateways (Stripe, PayPal)
- Storage: cloud storage (S3, GCS, Azure Blob)
- Analytics: analytics/monitoring (Datadog, New Relic, Mixpanel)
- Other: anything that doesn't fit above

Valid protocol values for data.protocol and label:
- REST, gRPC, GraphQL, WebSocket, Kafka, AMQP, MQTT, HTTPS, TCP, UDP

Protocol Assignment Rules:
- service → service: use "REST" (default) or "gRPC" for high-performance
- service → database: ALWAYS use "TCP"
- service → queue: ALWAYS use "AMQP"
- queue → service: ALWAYS use "Kafka"
- service → external: ALWAYS use "HTTPS"
- external → service: use "REST"
- Always set both "data.protocol" and "label" to the same protocol value

Rules:
- Use descriptive names in Portuguese when possible
- Create realistic connections between services
- Include appropriate databases and queues
- Position nodes spread out (increment x by 250, y by 150)
- Return ONLY the JSON, no markdown, no explanation`;

    const result = await callWithFallback(LOVABLE_API_KEY, [
      { role: "system", content: systemPrompt },
      { role: "user", content: description },
    ]);

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let content = result.data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const diagram = JSON.parse(content);

    // Fallback: ensure every edge has a protocol
    const validProtocols = ['REST','gRPC','GraphQL','WebSocket','Kafka','AMQP','MQTT','HTTPS','TCP','UDP'];
    if (diagram.edges && Array.isArray(diagram.edges)) {
      diagram.edges = diagram.edges.map((edge: Record<string, unknown>) => {
        const edgeData = (edge.data ?? {}) as Record<string, unknown>;
        if (!edgeData.protocol) {
          const labelProtocol = validProtocols.includes(edge.label as string) ? edge.label : 'REST';
          return {
            ...edge,
            type: edge.type === 'smoothstep' ? 'editable' : (edge.type || 'editable'),
            data: { ...edgeData, protocol: labelProtocol },
            label: labelProtocol,
          };
        }
        // Ensure edge type is 'editable'
        return { ...edge, type: edge.type === 'smoothstep' ? 'editable' : (edge.type || 'editable') };
      });
    }

    return new Response(JSON.stringify(diagram), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-diagram error:", e);
    return new Response(
      JSON.stringify({ error: "Failed to generate diagram. Please try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
