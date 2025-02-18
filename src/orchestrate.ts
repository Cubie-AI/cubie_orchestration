import "dotenv/config";

// Suppress deprecation warnings
process.removeAllListeners("warning");

import { createLogger, createRuntime } from "@maiar-ai/core";

import path from "path";

// Import all plugins
import { SQLiteProvider } from "@maiar-ai/memory-sqlite";
import { OpenAIProvider } from "@maiar-ai/model-openai";
import { PluginCharacter } from "@maiar-ai/plugin-character";
import { PluginTelegram } from "@maiar-ai/plugin-telegram";
import { PluginTextGeneration } from "@maiar-ai/plugin-text";
import { Op } from "sequelize";
import { Agent, AgentInfo } from "./db/models.js";
import { AgentInfoType } from "./db/models/agentInfo.js";
import { getAgentById } from "./db/repositories.js";
import { PluginXInternal } from "./plugin-x/plugin.js";
import { PluginXPost } from "./postTweetScheduler.js";

const logger = createLogger("agent:orchestrate");
export const runningAgents = new Map<
  string,
  ReturnType<typeof createRuntime>
>();

function agentInfoToArray(
  type: AgentInfoType,
  agentInfo: AgentInfo[]
): string[] {
  return (agentInfo || [])
    .filter((info) => info.type === type)
    .map((info) => info.data);
}

function makeCharacter(agent: Agent): string {
  return `
    You are called ${agent.name}. 

    ***BIOGRAPHY***
    The biography describes the character's background, personality, and motivations. 
    Biography:
    ${agent.bio}

    ***STYLE***
    The style describes the character's manner of speaking, writing, and interacting with others.
    You MUST adhere to this style when posting on twitter, and telegram.
    YOU MUST NOT deviate from this style.
    Style:
    ${agentInfoToArray("style", agent.agentInfo).join("\n")}

    ***TWITTER STYLE***
    The twitter style describes the character's manner of speaking, writing, and interacting with others on twitter.
    ALL of the styles in the ***STYLES*** section above take precedence over this style.
    ALL of the styles abin the ***STYLES*** ove apply to telegram as well.
    Twitter Style:
    ${agentInfoToArray("twitter_style", agent.agentInfo).join("\n")}

    ***TELEGRAM STYLE***
    The telegram style describes the character's manner of speaking, writing, and interacting with others on telegram.
    ALL of the styles in the ***STYLES*** section above take precedence over this style.
    ALL of the styles abin the ***STYLES*** ove apply to telegram as well.
    Telegram Style:
    ${agentInfoToArray("telegram_style", agent.agentInfo).join("\n")}

    ***KNOWLEDGE***
    The knowledge section describes the character's knowledge and expertise.
    Knowledge:
    ${agentInfoToArray("knowledge", agent.agentInfo).join("\n")}
  
    `;
}

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

    const plugins = [
      new PluginTextGeneration(),
      new PluginCharacter({
        character: makeCharacter(agent),
      }),
    ];
    if (agent.telegram_bot_token) {
      plugins.push(
        new PluginTelegram({
          token: agent.telegram_bot_token,
        })
      );
    }

    if (agent.tw_handle && agent.tw_password && agent.tw_email) {
      plugins.push(
        new PluginXInternal({
          username: agent.tw_handle,
          password: agent.tw_password,
          email: agent.tw_email,
        }),
        new PluginXPost({
          intervalMinutes: 30,
          intervalRandomizationMinutes: 15,
        })
      );
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
      plugins: plugins,
    });

    await runtime.start();

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
      id: {
        [Op.notIn]: running,
      },
    },
  });

  await Promise.all(newAgents.map((agent) => startAgent(agent.id)));
}
