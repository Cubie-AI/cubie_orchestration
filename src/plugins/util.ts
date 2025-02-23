import { Plugin } from "@maiar-ai/core";
import { PluginCharacter } from "@maiar-ai/plugin-character";
import { PluginTelegram } from "@maiar-ai/plugin-telegram";
import { PluginTextGeneration } from "@maiar-ai/plugin-text";
import { Agent } from "../db/models.js";
import { PluginXPost } from "../postTweetScheduler.js";
import { makeCharacter } from "./helpers/character.js";
import { makeComposer } from "./helpers/telegram.js";
import { PluginJupiter } from "./plugin-jupiter/plugin.js";
import { PluginRag } from "./plugin-rag/plugin.js";
import { PluginStripe } from "./plugin-stripe/plugin.js";
import { PluginX } from "./plugin-x/plugin.js";

export async function constructAgentPlugins(agent: Agent) {
  if (!agent) {
    return [];
  }
  const plugins: Plugin[] = [
    new PluginTextGeneration(),
    new PluginCharacter({
      character: makeCharacter(agent),
    }),

    new PluginJupiter(),
    new PluginStripe({
      apiKey:
        "sk_test_51NvVb0FvEE1o5IkV0ThWMEnp7NT8p0ruTXLglsfXB38qPHIBJEBPcUHQCRLr3dSGH8kzBzNlQvpl9Cdws2OupMTX008W5lJafW",
    }),
  ];

  if (agent.api) {
    plugins.push(new PluginRag({ api: agent.api }));
  }

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
        composer: makeComposer(agent),
      })
    );
  }

  return plugins;
}
