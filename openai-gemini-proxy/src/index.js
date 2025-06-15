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
      // 适配 Gemini
      const geminiPayload = {
        contents: [
          { parts: [ { text: body.prompt } ] }
        ]
      };
      const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + env.GEMINI_API_KEY, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(geminiPayload)
      });
      if (!resp.ok) {
        const errorText = await resp.text();
        return new Response("Gemini API Error: " + errorText, { status: 502 });
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