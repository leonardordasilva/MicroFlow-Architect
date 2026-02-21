import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { description } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
      "type": "smoothstep",
      "animated": true,
      "label": "optional label"
    }
  ]
}

Types:
- "service": microservice/API
- "database": database (PostgreSQL, MongoDB, Redis, etc.)
- "queue": message queue (RabbitMQ, Kafka, SQS, etc.)
- "external": external service (Stripe, SendGrid, AWS S3, etc.)

Rules:
- Use descriptive names in Portuguese when possible
- Create realistic connections between services
- Include appropriate databases and queues
- Position nodes spread out (increment x by 250, y by 150)
- Return ONLY the JSON, no markdown, no explanation`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: description },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Add credits to your workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    let content = result.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const diagram = JSON.parse(content);

    return new Response(JSON.stringify(diagram), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-diagram error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
