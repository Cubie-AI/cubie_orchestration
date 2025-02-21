import { z } from "zod";

export const BuySchema = z.object({
  mint: z.string(),
  tokenAmount: z.number(),
});
