const { AIProjectClient } = require("@azure/ai-projects");
const { AzureKeyCredential } = require("@azure/core-auth");

const connectionString = "https://barf-claude-2-resource.services.ai.azure.com/api/projects/barf-claude-2";
const key = process.env.AZURE_AI_API_KEY;
async function run() {
  try {
    const projectClient = new AIProjectClient(connectionString, new AzureKeyCredential(key));
    const chat = await projectClient.telemetry.getClient(); // wait, how to get openai client?
  } catch (e) {
    console.error(e.message);
  }
}
run();
