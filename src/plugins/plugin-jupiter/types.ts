import { z } from "zod";
export interface JupiterToken {
  name: string;
  address: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  tags: string[];
  daily_volume: number;
  minted_at: string;
  supply: number;
  freeze_authority: string;
  mint_authority: string;
}

interface BuySellCount {
  buys: number;
  sells: number;
}
type TimedKeys = "m5" | "h1" | "h6" | "h24";
export interface TimedMarkedData {
  baseToken: {
    address: string;
  };
  txns: Record<TimedKeys, BuySellCount>;
  volume: Record<TimedKeys, number>;
}

interface BaseDexScreenerInfo {
  url: string;
  chainId: string;
}
export interface DexScreenerInfo extends BaseDexScreenerInfo {
  dexId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: Record<TimedKeys, BuySellCount>;
  volume: Record<TimedKeys, number>;
  priceChange: Record<TimedKeys, number>;
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
}

export interface DexScreenerBoostedTokens extends BaseDexScreenerInfo {
  tokenAddress: string;
  amount: number;
  totalAmount: number;
  icon: string;
  header: string;
  description: string;
  links: {
    type: string;
    label: string;
    url: string;
  }[];
}

export interface AddressInformation {
  isNative: boolean;
  mint: string;
  owner: string;
  amount: number;
}

export const JupiterTokenInfoSchema = z.object({
  token: z.string(),
});

export const JupiterAddressSchema = z.object({
  address: z.string(),
});

export const TickerSchema = z.object({
  ticker: z.string(),
});

export const QuoteParamsSchema = z.object({
  inputMint: z.string(),
  outputMint: z.string(),
  direction: z.union([z.literal("ExactIn"), z.literal("ExactOut")]),
  amount: z.number(),
});
