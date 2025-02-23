import { PluginBase, AgentContext, createLogger } from "@maiar-ai/core";
import { Keypair } from "@solana/web3.js";
import { generateBuyTemplate } from "./templates.js";
import { BuySchema } from "./types.js";
import { PumpfunService } from "./pumpfun.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { solanaConnection } from "../../connection.js";
interface PluginPumpConfig {
  owner: Keypair;
  rpc: string;
}

const logger = createLogger("plugin:pump");
export class PluginPump extends PluginBase {
  private service: PumpfunService;
  constructor(private config: PluginPumpConfig) {
    super({
      id: "plugin-pump",
      name: "Pumpfun Plugin",
      description:
        "Used by the agent to buy and sell tokens on pumpfun before they bond",
    });

    this.service = new PumpfunService({
      provider: new AnchorProvider(
        solanaConnection,
        new Wallet(this.config.owner)
      ),
      owner: this.config.owner,
    });
    // 2 executors: 1 buy, 1 sell

    this.addExecutor({
      name: "buy",
      description:
        "Use this method when you want to purchase tokens on pump funn before they migrate",
      execute: async (context: AgentContext) => {
        // @ts-ignore
        const params = await this.runtime.operations.getObject(
          BuySchema,
          generateBuyTemplate(context.contextChain),
          { temperature: 0.5 }
        );
        const { mint, tokenAmount } = params;

        logger.info(
          `Got price buy params: ${JSON.stringify(params, undefined, 2)}`
        );

        if (!mint || !tokenAmount) {
          return {
            success: false,
            error: "No input mint or tokenAmount provided!",
          };
        }

        const signature = await this.service.buy(mint, tokenAmount);
        return {
          success: true,
          data: {
            link: `https://solscan.io/tx/${signature}`,
            helpfulInstruction:
              "This is a link to a transaction viewer, include it in your response",
          },
        };
      },
    });

    this.addExecutor({
      name: "sell",
      description:
        "Use this method when you want to sell tokens on pump fun before they migrate",
      execute: async (context: AgentContext) => {
        // @ts-ignore
        const params = await this.runtime.operations.getObject(
          BuySchema,
          generateBuyTemplate(context.contextChain),
          { temperature: 0.5 }
        );
        const { mint, tokenAmount } = params;

        logger.info(
          `Got price sell params: ${JSON.stringify(params, undefined, 2)}`
        );

        if (!mint || !tokenAmount) {
          return {
            success: false,
            error: "No input mint or tokenAmount provided!",
          };
        }

        const signature = await this.service.sell(mint, tokenAmount);
        return {
          success: true,
          data: {
            link: `https://solscan.io/tx/${signature}`,
            helpfulInstruction:
              "This is a link to a transaction viewer, include it in your response",
          },
        };
      },
    });
  }

  // 1 trigger: subscribe to the PF program and listen for bonding/new tokens
}
