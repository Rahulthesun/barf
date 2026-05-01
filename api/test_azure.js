const { OpenAI } = require("openai");

const client = new OpenAI({
  apiKey: process.env.AZURE_AI_API_KEY,
  baseURL: "https://barf-claude-2-resource.openai.azure.com/openai/deployments/Phi-4-mini-instruct",
  defaultQuery: { "api-version": "2024-02-15-preview" },
  defaultHeaders: { "api-key": process.env.AZURE_AI_API_KEY }
});

async function run() {
  try {
    const res = await client.chat.completions.create({
      model: "Phi-4-mini-instruct",
      messages: [{role: "user", content: "Hi"}]
    });
    console.log("SUCCESS:", res.choices[0].message.content);
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}
run();
