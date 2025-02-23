import { Stripe } from "stripe";
import { StripeConfig, StripeProduct } from "./types.js";

export class StripeService {
  private stripeClient: Stripe;

  constructor(config: StripeConfig) {
    if (!config || !config.apiKey) {
      throw new Error("Invalid stripe config.");
    }

    this.stripeClient = new Stripe(config.apiKey);
  }

  async getProducts(): Promise<StripeProduct[]> {
    const products = await this.stripeClient.products.list({
      active: true,
    });

    const prices = await this.stripeClient.prices.list({
      active: true,
    });

    const result = products.data.map((product) => {
      const productPrices = prices.data.filter(
        (price) => price.product === product.id
      );

      return {
        name: product.name,
        image: product.images,
        description: product.description,
        variants: productPrices.map((productPrice) => ({
          id: productPrice.id,
          name: productPrice.nickname || product.name,
          currency: productPrice.currency,
          price: (productPrice.unit_amount || 0) / 100,
          recurring: productPrice.recurring && {
            interval: productPrice.recurring.interval,
            interval_count: productPrice.recurring.interval_count,
          },
        })),
      } as StripeProduct;
    });
    return result;
  }

  async createPaymentLink(products: { price: string; quantity: number }[]) {
    const paymentLink = await this.stripeClient.paymentLinks.create({
      line_items: [
        ...products.map((product) => ({
          price: product.price,
          quantity: product.quantity || 1,
        })),
      ],
    });

    return paymentLink;
  }
}
