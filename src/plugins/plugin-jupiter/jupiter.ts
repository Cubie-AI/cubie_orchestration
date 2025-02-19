import fetch from "node-fetch";
import { JupiterToken ,DexScreenerInfo } from "./types.js";

// We want : Aggregated Token Information
// - Basic Jupiter data. 
//
export class JupiterService {
  async getTokenInfo(token: string): Promise<JupiterToken> {
    const response = await fetch(`https://tokens.jup.ag/token/${token}`);
    return (await response.json()) as JupiterToken;
  }

  async getDexInfo(token: string): Promise<DexScreenerInfo[]> {
    const response = await fetch(
      `https://api.dexscreener.com/token-pairs/v1/solana/${token}`
    );
    return (await response.json()) as DexScreenerInfo[];
  }
}
