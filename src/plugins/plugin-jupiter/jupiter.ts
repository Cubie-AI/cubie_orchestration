import fetch from "node-fetch";
import { JupiterToken } from "./types.js";

export class JupiterService {
  async getTokenInfo(token: string): Promise<JupiterToken> {
    const response = await fetch(`https://tokens.jup.ag/token/${token}`);
    return (await response.json()) as JupiterToken;
  }
}
