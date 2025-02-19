import {
  AgentContext,
  createLogger,
  PluginBase,
  PluginResult,
} from "@maiar-ai/core";
import { JupiterService } from "./jupiter.js";
import {
  generateTokenInfoTemplate,
  generateAddressInfoTemplate,
} from "./template.js";
import { JupiterTokenInfoSchema, JupiterAddressSchema } from "./types.js";

const logger = createLogger("plugin:jupiter");

interface JupiterPluginConfig {
  token: string;
  rpcUrl?: string;
  wsUrl?: string;
}

export class PluginJupiter extends PluginBase {
  private service: JupiterService;

  constructor(
    private config: JupiterPluginConfig = {
      token: "",
      rpcUrl: "https://palpable-flashy-water.solana-mainnet.quiknode.pro/a24d45a88242df8cc4f32c8070df47b66e287c25",
    }
  ) {
    super({
      id: "plugin-jupiter",
      name: "Jupiter",
      description:
        "Provide access to solana blockchain data. Do not return any data not directly related to the users request. If a tool fails only respond with a failure message.",
    });

    this.service = new JupiterService({
      rpcUrl: this.config.rpcUrl
    });

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


    this.addExecutor({
      name: "address_holdings",
      description:
        "Use this method to retrieve the holdings for a particular address" +
        "A address is 32-44 characters long and always uses the base58 character set" +
        "This method will return the tokens held by the address and other account information" ,

      execute: async (context: AgentContext): Promise<PluginResult> => {
        // @ts-ignore
        const params = await this.runtime.operations.getObject(
          JupiterAddressSchema,
          generateAddressInfoTemplate(context.contextChain),
          { temperature: 0.6 }
        );

        const query = params.address;
        logger.info(`Searching address holdings for: ${query}`);
        if (!query) {
          return {
            success: false,
            error: "No adress provided",
          };
        }
        const result = await this.service.getAddressHoldings(query);
        logger.info(JSON.stringify(result, null, 2));
        return {
          success: true,
          data: {
            token: result,
            helpfulInstruction:
              "This method will return an array of all the the token accounts and balances held by the address. It will include the mint, amount, and owner."
              + "When returning the result to the user ensure that the balance list is double spaced and easy to read. Do not outside of the token acount mint and amount.",
          },
        };
      },
    });
  }
}

export * from "./types.js";
