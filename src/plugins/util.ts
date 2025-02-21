import { Plugin } from "@maiar-ai/core";
import { PluginCharacter } from "@maiar-ai/plugin-character";
import { PluginTelegram } from "@maiar-ai/plugin-telegram";
import { PluginTextGeneration } from "@maiar-ai/plugin-text";
import { PluginX } from "@maiar-ai/plugin-x";
import { Agent } from "../db/models.js";
import { PluginXPost } from "../postTweetScheduler.js";
import { makeCharacter } from "./helpers/character.js";
import { PluginJupiter } from "./plugin-jupiter/plugin.js";
import { PluginRag } from "./plugin-rag/plugin.js";

export async function constructAgentPlugins(agent: Agent) {
  if (!agent) {
    return [];
  }
  const plugins: Plugin[] = [
    new PluginTextGeneration(),
    new PluginCharacter({
      character: makeCharacter(agent),
    }),
    new PluginRag({
      api: agent.api,
    }),
    new PluginJupiter(),
  ];

  if (agent.tw_email && agent.tw_password && agent.tw_handle) {
    plugins.push(
      new PluginXPost({
        intervalMinutes: 30,
        intervalRandomizationMinutes: 30,
      }),
      new PluginX({
        email: agent.tw_email,
        password: agent.tw_password,
        username: agent.tw_handle,
        mentionsCheckIntervalMins: 2,
        loginRetries: 3,
      })
    );
  }

  if (agent.telegram && agent.telegram_bot_token) {
    plugins.push(
      new PluginTelegram({
        token: agent.telegram_bot_token,
      })
    );
  }

  return plugins;
}
