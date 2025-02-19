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

export interface DexScreenerInfo {
  chainId: string;
  dexId: string;
  url: string;
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

export const JupiterTokenInfoSchema = z.object({
  token: z.string(),
});
