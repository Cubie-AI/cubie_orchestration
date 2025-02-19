import {
  AgentContext,
  createLogger,
  PluginBase,
  PluginResult,
} from "@maiar-ai/core";
import { JupiterService } from "./jupiter.js";
import { generateTokenInfoTemplate } from "./template.js";
import { JupiterTokenInfoSchema } from "./types.js";

const logger = createLogger("plugin:jupiter");

interface JupiterPluginConfig {
  token: string;
}

export class PluginJupiter extends PluginBase {
  private service: JupiterService;

  constructor(private config: JupiterPluginConfig) {
    super({
      id: "plugin-jupiter",
      name: "Jupiter",
      description:
        "Providers information about the token deployed for/by the agent.",
    });

    this.service = new JupiterService();

    // this.addExecutor({
    //   name: "inject_agents_token",
    //   description:
    //     "This token was created by you the agent. This plugin must be run immediately after the character plugin every single time a pipeline is constructed no matter what. The purpose is to inform you about the current state of your own token.",
    //   execute: async (): Promise<PluginResult> => {
    //     const tokenInfo = await this.service.getTokenInfo(this.config.token);
    //     logger.info(
    //       `Token info for ${this.config.token}: ${JSON.stringify(tokenInfo)}`
    //     );

    //     return {
    //       success: true,
    //       data: {
    //         token: tokenInfo,
    //         helpfulInstruction: `This is the is current information about your token. Use this information to answer the user's question and to provide a reference if they request it.`,
    //       },
    //     };
    //   },
    // });

    // this.addExecutor({
    //   name: "search_token",
    //   description: "Use this method to search for information about a token when requested by the user." +
    //   "A contract address is 32-44 characters long and always uses the base58 character set" + 
    //   "This method will return relevant information about the token such as: Name, Token Symbol, Mint authority (can new supply be created), Freeze authority (can user accounts be froze).",
      
    //   execute: async (context: AgentContext): Promise<PluginResult> => {

    //     // @ts-ignore
    //     const params = await this.runtime.operations.getObject(
    //       JupiterTokenInfoSchema,
    //       generateTokenInfoTemplate(context.contextChain),
    //       { temperature: 0.2 }
    //     );

    //     const query = params.token;
    //     logger.info(`Searching for token info: ${query}`);
    //     const result = await this.service.getTokenInfo(query);

    //     return {
    //       success: true,
    //       data: {
    //         ...result,
    //         helpfulInstruction:
    //           "This is information about the token. It includes whether or not new supply can be created and whether or not user accounts can be frozen. It also includes the daily volume and metadata about the token.",
    //       },
    //     };
    //   },
    // });

  this.addExecutor({
    name: "search_token",
    description:
      "Use this method to search for information about a token when requested by the user." +
      "A contract address is 32-44 characters long and always uses the base58 character set" +
      "This method will return in depth token information including, price changes in the last (5m, 1h, 6h, 24h), volume changes in the last (5m, 1h, 6h, 24h), and liquidity information." +
      "This method also returns the native price and the usd price of the token.",

    execute: async (context: AgentContext): Promise<PluginResult> => {
      // @ts-ignore
      const params = await this.runtime.operations.getObject(
        JupiterTokenInfoSchema,
        generateTokenInfoTemplate(context.contextChain),
        { temperature: 0.2 }
      );

      const query = params.token;
      logger.info(`Searching for token info: ${query}`);
      if (!query) {
        return {
          success: false,
          error: "No token provided",
        };
      }
      const result = await this.service.getDexInfo(query);
      logger.info(JSON.stringify(result, null, 2));
      return {
        success: true,
        data: {
          token: result[0],
          helpfulInstruction:
            "This method will return in depth token information including, price changes in the last (5m, 1h, 6h, 24h), volume changes in the last (5m, 1h, 6h, 24h), and liquidity information." +
            "This method also returns the native price and the usd price of the token." +
            "Before returning the result to the user analyze the data and include a descriptive summary",
        },
      };
    },
  });
  
  }
}

export * from "./types.js";
