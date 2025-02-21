import { createLogger, UserInputContext } from "@maiar-ai/core";
import {
  PluginTelegram,
  TelegramContext,
  TelegramMessage,
} from "@maiar-ai/plugin-telegram";
import { Composer } from "telegraf";
import { Agent } from "../../db/models.js";

const logger = createLogger("plugin:helpers:composer");

export function makeComposer(agent: Agent) {
  const composer = new Composer<TelegramContext>();

  composer.command("link", async (ctx: TelegramContext) => {
    return await ctx.reply(
      `<a href='https://cubie.fun/agent/${agent.id}'>View my profile</a>`,
      { parse_mode: "HTML" }
    );
  });

  composer.command("ca", async (ctx: TelegramContext) => {
    return await ctx.reply(`<code>${agent.mint}</code>`, {
      parse_mode: "HTML",
    });
  });

  composer.on("message", async (ctx: TelegramContext) => {
    try {
      if (!ctx.message || (ctx.message && !("text" in ctx.message))) return;
      if (!("plugin" in ctx)) return;

      const message: TelegramMessage = {
        chatId: ctx.message.chat.id,
        text: ctx.message.text,
        username: ctx.message.from?.username,
      };

      // telegram id
      // twitter id
      // call internal loading => scoped to the bot.
      const plugin = ctx.plugin as PluginTelegram;
      const pluginId = plugin.id;
      const userContext: UserInputContext = {
        id: `${pluginId}-${ctx.message.message_id}`,
        pluginId: pluginId,
        type: "user_input",
        action: "receiveMessage",
        content: message.text,
        timestamp: Date.now(),
        rawMessage: message.text,
        user: message.username || "unknown",
        messageHistory: [
          {
            role: "user",
            content: message.text,
            timestamp: Date.now(),
          },
        ],
        helpfulInstruction: `Message from Telegram user ${
          message.username || "unknown"
        }`,
      };

      // @ts-expect-error
      const platformContext: TelegramPlatformContext = {
        platform: pluginId,
        responseHandler: async (response: unknown) => {
          await ctx.reply(String(response), { parse_mode: "HTML" });
        },
        metadata: {
          chatId: message.chatId,
        },
      };

      try {
        await plugin.runtime.createEvent(userContext, platformContext);
        logger.debug("Successfully queued Telegram message for processing");
      } catch (error) {
        logger.error("Failed to queue Telegram message", {
          error: error instanceof Error ? error.message : String(error),
          user: message.username,
          chatId: message.chatId,
        });
      }
    } catch (error) {
      logger.error("Error processing Telegram message", {
        error: error instanceof Error ? error.message : String(error),
        ctx: {
          chatId: ctx.message?.chat.id,
          username: ctx.message?.from?.username,
        },
      });
    }
  });

  return composer;
}
