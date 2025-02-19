import fetch from "node-fetch";
import { JupiterToken, DexScreenerInfo, AddressInformation } from "./types.js";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, NATIVE_MINT } from "@solana/spl-token";
import { createLogger } from "@maiar-ai/core";
import { getTokensByAddressOrTicker } from "../../db/repositories/token.js";

const logger = createLogger("service:jupiter");

// Goals:
//  - Find more token information data streams. Like i want volume changes, price changes alerts, etc.
interface JupiterServiceConfig {
  rpcUrl: string;
  wsUrl?: string;
}

// fix this later
interface ScoredToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  mintedAt: number;
  dailyVolume: number;
  tags: string;
  freezeAuthority: string;
  mintAuthority: string;
  score: number;
}

const jupiterTags = {
  strict: 5,
  verified: 4,
  community: 3,
  "birdeye-trending": 2,
  unknown: 0,
};

export class JupiterService {
  connection: Connection;

  constructor(private config: JupiterServiceConfig) {
    this.connection = new Connection(this.config.rpcUrl, {
      ...(this.config.wsUrl && { wsEndpoint: this.config.wsUrl }),
    });
  }

  async getContractAddressByTicker(ticker: string): Promise<ScoredToken[]> {
    logger.info(`Fetching contract address for ticker: ${ticker}`);
    const tokens = await getTokensByAddressOrTicker(ticker);

    // calculate a score for the token:
    // - strict: + 5
    // - verified: + 4
    // - community: + 3
    // - unknown: 0
    //
    // Add daily volume to the score
    // take top 5 ->> sort by mintedAt ????
    const tokensScored: ScoredToken[] = tokens.map((token) => {
      const score = token.tags.split(",").reduce((acc, tag) => {
        return acc + jupiterTags[tag as keyof typeof jupiterTags];
      }, 0);
      return {
        name: token.name,
        symbol: token.symbol,
        address: token.address,
        mintedAt: token.mintedAt,
        dailyVolume: token.dailyVolume,
        freezeAuthority: token.freezeAuthority,
        mintAuthority: token.mintAuthority,
        decimals: token.decimals,
        logoURI: token.logoURI,
        tags: token.tags,
        score: score + token.dailyVolume,
      };
    });

    logger.info(JSON.stringify(tokensScored, null, 2));
    return tokensScored.slice(0, 5);
  }

  async getTokenInfo(token: string): Promise<JupiterToken> {
    const response = await fetch(`https://tokens.jup.ag/token/${token}`);
    return (await response.json()) as JupiterToken;
  }

  // async mostBoostedTokensOnSolana(): Promise<DexScreenerBoostedTokens[]> {
  //   const response = await fetch(
  //     "https://api.dexscreener.com/token-boosts/top/v1",
  //     {
  //       method: "GET",
  //       headers: {},
  //     }
  //   );
  //   const data = await response.json() as DexScreenerBoostedTokens[];

  //   return data.filter((token) => token.chainId === "solana");
  // }

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
      const holdings: AddressInformation[] = [];

      const publicKey = new PublicKey(address);
      const solanaHoldings = await this.connection.getParsedAccountInfo(
        publicKey,
        {
          commitment: "confirmed",
        }
      );

      holdings.push({
        mint: NATIVE_MINT.toString(),
        amount: (solanaHoldings.value?.lamports || 0) / LAMPORTS_PER_SOL || 0,
        owner: address.toString(),
        isNative: true,
      });

      const addressHolding =
        await this.connection.getParsedTokenAccountsByOwner(
          publicKey,
          {
            programId: TOKEN_PROGRAM_ID,
          },
          "confirmed"
        );

      holdings.push(
        ...addressHolding.value.map((holding) => ({
          mint: holding?.account?.data?.parsed?.info?.mint,
          amount: holding?.account?.data?.parsed?.info?.tokenAmount?.uiAmount,
          owner: holding?.account?.data?.parsed?.info?.owner,
          isNative: holding?.account?.data?.parsed?.info?.isNative,
        }))
      );

      return holdings.filter((holding) => holding.amount !== 0);
    } catch (error) {
      console.error("Failed to get address holdings:", error);
    }
  }
}
