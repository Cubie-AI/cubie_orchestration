import { z } from "zod";

export const BuySchema = z.object({
  inputMint: z.string(),
  vsMint: z.string(),
});
