import { Plugin } from "@maiar-ai/core";
import { PluginCharacter } from "@maiar-ai/plugin-character";
import { PluginTelegram } from "@maiar-ai/plugin-telegram";
import { PluginTextGeneration } from "@maiar-ai/plugin-text";
import { PluginX } from "@maiar-ai/plugin-x";
import { Agent } from "../db/models.js";
import { AgentInfo, AgentInfoType } from "../db/models/agentInfo.js";
import { PluginXPost } from "../postTweetScheduler.js";
import { PluginJupiter } from "./plugin-jupiter/plugin.js";

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

export async function constructAgentPlugins(agent: Agent) {
  if (!agent) {
    return [];
  }
  const plugins: Plugin[] = [
    new PluginTextGeneration(),
    new PluginCharacter({
      character: makeCharacter(agent),
    }),
    new PluginJupiter({ token: agent.mint }),
  ];

  if (agent.tw_email && agent.tw_password && agent.tw_handle) {
    plugins.push(
      new PluginXPost({
        intervalMinutes: 60,
        intervalRandomizationMinutes: 30,
      }),
      new PluginX({
        email: agent.tw_email,
        password: agent.tw_password,
        username: agent.tw_handle,
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
