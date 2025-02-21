import {
  AgentContext,
  createLogger,
  PluginBase,
  PluginResult,
} from "@maiar-ai/core";
import { JupiterService } from "./jupiter.js";
import {
  generateAddressInfoTemplate,
  generatePriceTemplate,
  generateQuoteTemplate,
  generateTickerTemplate,
  generateTokenInfoTemplate,
} from "./template.js";
import {
  JupiterAddressSchema,
  JupiterTokenInfoSchema,
  PriceParamSchema,
  QuoteParamsSchema,
  TickerSchema,
} from "./types.js";

const logger = createLogger("plugin:jupiter");

interface JupiterPluginConfig {
  rpcUrl?: string;
  wsUrl?: string;
}

export class PluginJupiter extends PluginBase {
  private service: JupiterService;

  constructor(
    private config: JupiterPluginConfig = {
      rpcUrl:
        "https://palpable-flashy-water.solana-mainnet.quiknode.pro/a24d45a88242df8cc4f32c8070df47b66e287c25",
    }
  ) {
    super({
      id: "plugin-jupiter",
      name: "Jupiter",
      description:
        "Provide access to solana blockchain data. Do not return any data not directly related to the users request. If a tool fails only respond with a failure message.",
    });

    this.service = new JupiterService({
      rpcUrl:
        this.config.rpcUrl ||
        "https://palpable-flashy-water.solana-mainnet.quiknode.pro/a24d45a88242df8cc4f32c8070df47b66e287c25",
    });

    this.addExecutor({
      name: "get_price",
      description:
        "Use this method to get the price of an input mint address vs an output mint address",
      execute: async (context: AgentContext): Promise<PluginResult> => {
        // @ts-ignore
        const params = await this.runtime.operations.getObject(
          PriceParamSchema,
          generatePriceTemplate(context.contextChain),
          { temperature: 0.5 }
        );
        const {
          inputMint,
          vsMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        } = params;

        logger.info(
          `Got price params: ${JSON.stringify(params, undefined, 2)}`
        );

        if (!inputMint) {
          return {
            success: false,
            error: "No input mint provided!",
          };
        }

        const price = this.service.getPrice({ inputMint, vsMint });
        return {
          success: true,
          data: {
            price,
            helpfulInstruction:
              "This will return the price of a input mint vs an output mint. If not output mint is provided the price is per usd",
          },
        };
      },
    });

    this.addExecutor({
      name: "search_token",
      description:
        "Use this method to search for information about a token when requested by the user." +
        "A contract address is 32-44 characters long and always uses the base58 character set" +
        "This method will return in depth token information including, price changes in the last (5m, 1h, 6h, 24h), volume changes in the last (5m, 1h, 6h, 24h), and liquidity information." +
        "This method also returns the native price and the usd price of the token.",

      execute: async (context: AgentContext): Promise<PluginResult> => {
        logger.info(JSON.stringify(context, undefined, 2));
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
      name: "is_contract",
      description:
        "Use this method to check the account type of an address. If an account it a mint then you should never return the balance or holding of that account" +
        "A address is 32-44 characters long and always uses the base58 character set" +
        "This method will return the tokens held by the address and other account information",

      execute: async (context: AgentContext): Promise<PluginResult> => {
        // @ts-ignore
        const params = await this.runtime.operations.getObject(
          JupiterAddressSchema,
          generateAddressInfoTemplate(context.contextChain),
          { temperature: 0.6 }
        );

        const query = params.address;
        logger.info(`Searching address type: ${query}`);
        if (!query) {
          return {
            success: false,
            error: "No adress provided",
          };
        }
        const result = await this.service.getAccountType(query);
        logger.info(JSON.stringify(result, null, 2));
        return {
          success: true,
          data: {
            type: result,
            helpfulInstruction:
              "This method will return an array of all the the token accounts and balances held by the address. It will include the mint, amount, and owner." +
              "When returning the result to the user ensure that the balance list is double spaced and easy to read. Do not outside of the token acount mint and amount.",
          },
        };
      },
    });

    this.addExecutor({
      name: "address_holdings",
      description:
        "Use this method to retrieve the holdings for a particular address" +
        "Do not use this method for token contract addresses. Instead use the search_token executor instead." +
        "To check whether a address is a contract address invoke is_contract event" +
        "A address is 32-44 characters long and always uses the base58 character set" +
        "This method will return the tokens held by the address and other account information",

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
              "This method will return an array of all the the token accounts and balances held by the address. It will include the mint, amount, and owner." +
              "When returning the result to the user ensure that the balance list is double spaced and easy to read. Do not outside of the token acount mint and amount.",
          },
        };
      },
    });

    this.addExecutor({
      name: "ticker_to_contract",
      description:
        "Use this method to retrieve a contract address when supplied with a ticker or token symbol" +
        "Tickers will start with a '$' but they may or may not be capitalized" +
        "This method will return the contract address for the token." +
        "This method can be used as an intermediary step to retrieve token information.",

      execute: async (context: AgentContext): Promise<PluginResult> => {
        // @ts-ignore
        const params = await this.runtime.operations.getObject(
          TickerSchema,
          generateTickerTemplate(context.contextChain),
          { temperature: 0.6 }
        );

        const query = params.ticker;
        logger.info(`Searching token database: ${query}`);
        if (!query) {
          return {
            success: false,
            error: "No ticker provided",
          };
        }
        const result = await this.service.getContractAddressByTicker(query);
        logger.info(JSON.stringify(result, null, 2));
        return {
          success: true,
          data: {
            contract_address: result,
            helpfulInstruction:
              "This method will will return all the tokens with scores assigned to them" +
              "You MUST ALWAYS return the token with the largest score" +
              "You MAY prefer to return a token that has 'strict' in its tags list, followed by 'verified' followed by community" +
              "If you are unsure return the full list of tokens and let the user decide." +
              "You may choose to chain this method with the search_token method to retrieve token information.",
          },
        };
      },
    });

    this.addExecutor({
      name: "get_quote",
      description:
        "Use get a quote between 2 tokens or tickers" +
        "Tickers will start with a '$' but they may or may not be capitalized" +
        "This method will return the output amount of the transaction." +
        "This method requires contract addresses so you MAY need to chain up to 2 calls to the ticker_to_contract method to retrieve the contract address for the tokens",
      execute: async (context: AgentContext): Promise<PluginResult> => {
        // @ts-ignore
        const params = await this.runtime.operations.getObject(
          QuoteParamsSchema,
          generateQuoteTemplate(context.contextChain),
          { temperature: 0.4 }
        );

        logger.info(`Got quote params: ${JSON.stringify(params, null, 2)}`);
        if (!params) {
          return {
            success: false,
            error: "No input mint, output mint, amount or direction provided",
          };
        }
        const result = await this.service.getQuote(params);
        logger.info(JSON.stringify(result, null, 2));
        return {
          success: true,
          data: {
            outputAmount: result,
            helpfulInstruction:
              "This method returns the amount of outputMint tokens from the transaction" +
              "You MAY need to chain this method with the ticker_to_contract method to retrieve the contract address for the tokens",
          },
        };
      },
    });
  }
}

export * from "./types.js";
