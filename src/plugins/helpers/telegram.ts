import { createLogger, UserInputContext } from "@maiar-ai/core";
import {
  PluginTelegram,
  TelegramContext,
  TelegramPlatformContext,
} from "@maiar-ai/plugin-telegram";
import { Composer } from "telegraf";
import { z } from "zod";
import { Agent } from "../../db/models.js";

const logger = createLogger("plugin:helpers:composer");

export function makeComposer(agent: Agent) {
  const composer = new Composer<TelegramContext>();

  composer.command("profile", async (ctx) => {
    return await ctx.reply(
      `<a href="https://cubie.fun/agent/${agent.id}">View my profile</a>`,
      { parse_mode: "HTML" }
    );
  });

  composer.command("ca", async (ctx) => {
    return await ctx.reply(`<code>${agent.mint}</code>`, {
      parse_mode: "HTML",
    });
  });

  composer.on("message", async (ctx) => {
    const text = ctx.text || "";
    const message = ctx.message;
    const chatId = message.chat.id;
    const userId = ctx.from.id;
    const plugin = ctx.plugin as PluginTelegram;

    try {
      const pluginId = plugin.id;
      const userContext: UserInputContext = {
        id: `${pluginId}-${ctx.message.message_id}`,
        pluginId: pluginId,
        type: "user_input",
        action: "receiveMessage",
        content: text,
        timestamp: Date.now(),
        rawMessage: text,
        user: userId.toString(),
        messageHistory: [
          {
            role: "user",
            content: text,
            timestamp: Date.now(),
          },
        ],
        helpfulInstruction: `Message from Telegram user ${userId}`,
      };

      const platformContext: TelegramPlatformContext = {
        platform: pluginId,
        responseHandler: async (response: unknown) => {
          const { text, image } = await plugin.runtime.operations.getObject(
            z.object({
              text: z.string(),
              image: z.string().optional(),
            }),
            generateTelegramResponse(response as string),
            { temperature: 0.1 }
          );

          logger.info(
            `Parsed telegram response ${JSON.stringify({ text, image })}`
          );

          if (image) {
            return await ctx.replyWithPhoto(image, {
              caption: text,
              parse_mode: "HTML",
            });
          }

          return ctx.reply(text, { parse_mode: "HTML" });
        },
        metadata: {
          chatId,
        },
      };

      try {
        await plugin.runtime.createEvent(userContext, platformContext);
        logger.debug("Successfully queued Telegram message for processing");
      } catch (error) {
        logger.error("Failed to queue Telegram message", {
          error: error instanceof Error ? error.message : String(error),
          user: userId,
          chatId,
        });
      }
    } catch (error) {
      logger.error("Error processing Telegram message", {
        error: error instanceof Error ? error.message : String(error),
        ctx: {
          chatId,
          userId,
        },
      });
    }
  });

  return composer;
}

function generateTelegramResponse(response: string): string {
  return `
    Generate a response template for the users request by extracting out the important text from the response and an optional image link. Your response should be a JSON object with 2 fields, text and image.
    The response should be related to the original message you received from the user. 

    Do NOT include any metadata, context information, or explanation of how the response was generated.
    If the response contains an image, you should include the image link in the response.
    If the response contains a reference to the image you should strip that out of the text.
    All other text should be included in the text field.

    Formatting RULES:
    - The supplied text may be in markdown format
    - You have access to the following subset of tags: <b>, <strong>, <i>, <em>, <u>, <ins>, <s>, <strike>, <del>, <span>, <a>, <tg-emoji>, <code>, <pre>, <blockquote>
    - You should convert the markdown to the tags using the following rules:
      - *text* -> <b>text</b>
      - _text_ -> <i>text</i>
      - \`text\` -> <code>text</code>
      - ~text~ -> <s>text</s>
      - \`\`\`text\`\`\` -> <pre>text</pre>
      - [text](url) -> <a href="url">text</a>
      - [text](tg://user?id=123456789) -> <a href="tg://user?id=123456789">text</a>
    - DO NOT include any other tags in the response. 
    - DO NOT include any other markdown formatting in the response.
    - YOU ARE REQUIRED to add an additional whitespace ('\\n') between products, and their descriptions.
    - YOU ARE REQUIRED to seperate products by 2 new lines 
    - REPLACE ALL OCCURENCES OF <, >, & THAT ARE NOT PART OF A TAG WITH &lt;, &gt;, &amp; respectively.
    Here is the data you received from the user:
    ${JSON.stringify(response, null, 2)}

    Return a JSON object with 2 fields, text and image.
    
    Example of valid response:
    {
       "text": "Bears are mammals of the family Ursidae. They are classified as caniforms, or doglike carnivorans.",
        "image": "https://example.com/image.jpg"
    }
    `;
}
