import { createLogger } from "@maiar-ai/core";
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import fetch from "node-fetch";
import {
  getTokenDecimals,
  getTokensByAddressOrTicker,
} from "../../db/repositories/token.js";
import { AddressInformation, DexScreenerInfo, JupiterToken } from "./types.js";

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

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: number | null;
  priceImpactPct: string;
  routePlan: {
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }[];
  contextSlot: number;
  timeTaken: number;
}

interface PriceParams {
  inputMint: string;
  vsMint: string;
}
const jupiterTags = {
  strict: 5,
  verified: 4,
  community: 3,
  "birdeye-trending": 2,
  unknown: 0,
};

interface PriceData {
  id: string;
  type: string;
  price: string;
}

type JupiterPriceResponse = {
  data: Record<string, PriceData>;
};

interface QuoteParams {
  inputMint: string;
  outputMint: string;
  direction: "ExactIn" | "ExactOut";
  amount: number;
}

export class JupiterService {
  connection: Connection;

  constructor(private config: JupiterServiceConfig) {
    this.connection = new Connection(this.config.rpcUrl, {
      ...(this.config.wsUrl && { wsEndpoint: this.config.wsUrl }),
    });
  }

  async getContractAddressByTicker(ticker: string): Promise<ScoredToken> {
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
      const tagScore = token.tags.split(",").reduce((acc, tag) => {
        return acc + jupiterTags[tag as keyof typeof jupiterTags];
      }, 0);
      const score = tagScore + (token.dailyVolume || 0);
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
        score: isFinite(score) ? score : 0,
      };
    });

    tokensScored.sort((a, b) => a.score - b.score);
    logger.info(JSON.stringify(tokensScored, undefined, 2));
    return tokensScored[-1];
  }

  async getTokenInfo(token: string): Promise<JupiterToken> {
    const response = await fetch(`https://tokens.jup.ag/token/${token}`);
    return (await response.json()) as JupiterToken;
  }

  async getQuote(params: QuoteParams) {
    const { inputMint, outputMint, amount, direction } = params;
    const inputDecimals = await getTokenDecimals(inputMint);
    const outputDecimals = await getTokenDecimals(outputMint);

    const inAmount =
      direction === "ExactIn"
        ? Math.floor(amount * Math.pow(10, inputDecimals))
        : Math.floor(amount * Math.pow(10, outputDecimals));

    logger.info(
      JSON.stringify(
        { inputMint, outputMint, direction, inputDecimals, outputDecimals },
        null,
        2
      )
    );
    const quoteResponse = (await (
      await fetch(
        `https://api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${inAmount}&swapMode=${direction}&slippageBps=150&restrictIntermediateTokens=true`
      )
    ).json()) as JupiterQuoteResponse;

    const result =
      direction === "ExactIn"
        ? Number(quoteResponse.outAmount) / Math.pow(10, outputDecimals)
        : Number(quoteResponse.inAmount) / Math.pow(10, inputDecimals);

    return result;
  }

  async getPrice(params: PriceParams) {
    const prices = (await (
      await fetch(
        `https://api.jup.ag/price/v2?ids=${params.inputMint}&vsToken=${params.vsMint}`
      )
    ).json()) as JupiterPriceResponse;

    logger.info(JSON.stringify(prices, undefined, 2));
    const price = Object.values(prices.data).filter(
      (dataPrice) => dataPrice.id === params.inputMint
    );

    return price[0].price;
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

  async getAccountType(address: string): Promise<string> {
    const info = await this.connection.getParsedAccountInfo(
      new PublicKey(address)
    );
    if (info?.value?.data && "parsed" in info.value?.data)
      return info.value.data.parsed;
    return "account";
  }
}
