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

export const JupiterTokenInfoSchema = z.object({
  token: z.string(),
});
