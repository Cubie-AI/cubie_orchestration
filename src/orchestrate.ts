import "dotenv/config";

// Suppress deprecation warnings
process.removeAllListeners("warning");

import { createLogger, createRuntime } from "@maiar-ai/core";

import path from "path";

// Import all plugins
import { SQLiteProvider } from "@maiar-ai/memory-sqlite";
import { OpenAIProvider } from "@maiar-ai/model-openai";
import { Op } from "sequelize";
import { Agent } from "./db/models.js";
import { getAgentById } from "./db/repositories.js";
import { constructAgentPlugins } from "./plugins/util.js";

const logger = createLogger("agent:orchestrate");
export const runningAgents = new Map<
  string,
  ReturnType<typeof createRuntime>
>();

export async function deleteAgent(agentId: number) {
  const runtime = runningAgents.get(agentId.toString());
  if (runtime) {
    await runtime.stop();
    runningAgents.delete(agentId.toString());
  }
}

export async function updateAgent(agentId: number) {
  let result = false;
  try {
    logger.info(`Updating agent ${agentId}`);
    const agent = await getAgentById(agentId);

    const runtime = runningAgents.get(agentId.toString());
    if (!runtime) {
      logger.error(`Agent ${agentId} is not running`);
      return false;
    }

    await runtime.stop();
    logger.info(`Agent ${agentId} stopped`);

    return await startAgent(agentId);
  } catch (error) {
    console.error("Failed to update agent:", error);
  }
}

export async function startAgent(agentId: number) {
  let result = false;
  try {
    const agent = await getAgentById(agentId);

    logger.info(`Starting agent ${agentId}`);
    if (!agent) {
      console.error(`Agent with id ${agentId} not found`);
      return false;
    }

    // Create and start the agent
    const runtime = createRuntime({
      model: new OpenAIProvider({
        model: "gpt-4o",
        apiKey: process.env.OPENAI_API_KEY as string,
      }),
      memory: new SQLiteProvider({
        dbPath: path.join(
          process.cwd(),
          "data",
          `agent-${agentId}-conversations.db`
        ),
      }),
      plugins: await constructAgentPlugins(agent),
    });

    await runtime.start().catch((error) => {
      console.error("Failed to start agent:", error);
    });

    runningAgents.set(agentId.toString(), runtime);
    result = true;
  } catch (error) {
    console.error("Failed to start agent:", error);
    runningAgents.delete(agentId.toString());
  }
  return result;
}

export async function agentLoader() {
  console.log("Loading new agents");
  const running = Array.from(runningAgents.keys()).map((id) => parseInt(id));
  const newAgents = await Agent.findAll({
    where: {
      [Op.and]: [
        {
          status: "active",
        },
        {
          id: {
            [Op.notIn]: running,
          },
        },
      ],
    },
  });

  await Promise.all(newAgents.map((agent) => startAgent(agent.id)));
}
