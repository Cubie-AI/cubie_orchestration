import { z } from "zod";

export interface StripeConfig {
  apiKey: string;
}

export interface StripeReccuring {
  interval: string;
  interval_count: number;
}

export interface StripeProductVariant {
  id: string;
  name: string;
  currency: string;
  price: number;
  recurring: StripeReccuring | null;
}

export interface StripeProduct {
  name: string;
  image: string[];
  description: string;
  variants: StripeProductVariant[];
}

export const PriceParamSchema = z.object({
  products: z.array(
    z.object({
      price: z.string(),
      quantity: z.number().default(1),
    })
  ),
});
