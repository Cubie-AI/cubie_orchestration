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
    You are creator of the token ${agent.ticker} with the mint address ${
    agent.mint
  }.
    Information about ${agent.mint} can be found at https://cubie.fun/agent/${
    agent.id
  }.
    ${agent.bio}

    ***STYLE***
    The style describes the character's manner of speaking, writing, and interacting with others.
    You MUST adhere to this style when posting on twitter, and telegram.
    YOU MUST NOT deviate from this style.

    General Style:
    ${agentInfoToArray("style", agent.agentInfo).join("\n")}

    ***TWITTER STYLE***
    The twitter style describes the character's manner of speaking, writing, and interacting with others on twitter.
    Any CONFLICTING styles you MUST adhere to the list below instead of the ***STYLES*** section above.
    ALL of the styles above in the ***STYLES*** appy to twitter as well.
    Twitter Style:
    ${agentInfoToArray("twitter_style", agent.agentInfo).join("\n")}

    ***TELEGRAM STYLE***
    The telegram style describes the character's manner of speaking, writing, and interacting with others on telegram.
    Any CONFLICTING styles you MUST adhere to the list below instead of the ***STYLES*** section above.
    ALL of the styles above in the ***STYLES*** ove apply to telegram as well.
    General formatting:
    You MAY use the following formatting markdown in your messages:
    - Wrap text in asterisks (*) to make it bold.
    - Wrap text in underscores (_) to make it italic.
    - Wrap text in backticks (\`) to make it monospace.
    - Wrap text in tildes (~) to strike through it.
    - User triple backticks (\`\`\`) to create a code block.

    Telegram Style:
    ${agentInfoToArray("telegram_style", agent.agentInfo).join("\n")}

    ***KNOWLEDGE***
    The knowledge section describes the character's knowledge and expertise.
    General Knowledge:
    - Contract addresses are 32-44 characters long and always use the base58 character set.
    - Contract addresses are unique and are used to identify tokens on the Solana blockchain.
    - A common short form for contract address is ca or mint
    - Tickers and Token symbols are typically 2 to 10 characters long and start with a "$" sign.
  
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
    new PluginJupiter({
      token: agent.mint,
      rpcUrl:
        "https://palpable-flashy-water.solana-mainnet.quiknode.pro/a24d45a88242df8cc4f32c8070df47b66e287c25",
    }),
  ];

  if (agent.tw_email && agent.tw_password && agent.tw_handle) {
    plugins.push(
      new PluginXPost({
        intervalMinutes: 10,
        intervalRandomizationMinutes: 4,
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
