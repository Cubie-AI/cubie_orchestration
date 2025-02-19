import fetch from "node-fetch";
import { JupiterToken ,DexScreenerInfo, AddressInformation } from "./types.js";
import {Connection, PublicKey} from "@solana/web3.js";
import {  TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {createLogger} from '@maiar-ai/core';
// We want : Aggregated Token Information
// - Basic Jupiter data. 
//

const logger = createLogger("service:jupiter");

interface JupiterServiceConfig {
  rpcUrl: string;
  wsUrl?: string;
}

export class JupiterService {
  connection: Connection;

  constructor(private config: JupiterServiceConfig) {
    this.connection = new Connection(config.rpcUrl, {
      ...(config.wsUrl && { wsEndpoint: config.wsUrl }),
    });
  }

  async getTokenInfo(token: string): Promise<JupiterToken> {
    const response = await fetch(`https://tokens.jup.ag/token/${token}`);
    return (await response.json()) as JupiterToken;
  }

  async getDexInfo(token: string): Promise<DexScreenerInfo[]> {
    logger.info(`Fetching dex info for token: ${token}`);
    const response = await fetch(
      `https://api.dexscreener.com/token-pairs/v1/solana/${token}`
    );
    return (await response.json()) as DexScreenerInfo[];
  }

  async getAddressHoldings(address: string): Promise<any> {
    try {
      logger.info(`Fetching address holdings for address: ${address}`);
      
    const addressHolding = await this.connection.getParsedTokenAccountsByOwner(
      new PublicKey(address),
      { 
        programId: TOKEN_PROGRAM_ID 
      },
      "confirmed"
    );
      const holdings: AddressInformation[] = addressHolding.value.map((holding) => ({
        mint: holding?.account?.data?.parsed?.info?.mint,
        amount: holding?.account?.data?.parsed?.info?.tokenAmount?.uiAmount,
        owner: holding?.account?.data?.parsed?.info?.owner,
        isNative: holding?.account?.data?.parsed?.info?.isNative,
      }));
      return holdings.filter((holding) => holding.amount !== 0);
    } catch (error) {
      console.error("Failed to get address holdings:", error);
    }
  }
}
