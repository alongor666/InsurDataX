export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Only POST allowed', { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    if (!body.prompt) {
      return new Response('Missing prompt', { status: 400 });
    }

    // 适配 OpenRouter，模型名写成 deepseek/deepseek-r1-0528:free
    const openrouterPayload = {
      model: "deepseek/deepseek-r1-0528:free",
      messages: [
        { role: "user", content: body.prompt }
      ]
    };

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + env.OPENROUTER_API_KEY
      },
      body: JSON.stringify(openrouterPayload)
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      return new Response("OpenRouter API Error: " + errorText, { status: 502 });
    }

    return new Response(resp.body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};