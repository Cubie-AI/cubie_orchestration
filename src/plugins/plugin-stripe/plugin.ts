import { AgentContext, createLogger, PluginBase } from "@maiar-ai/core";
import { StripeService } from "./stripe.js";
import { generateCheckoutTemplate } from "./templates.js";
import { PriceParamSchema, StripeConfig } from "./types.js";

const logger = createLogger("plugin:stripe");
export class PluginStripe extends PluginBase {
  private service: StripeService;

  constructor(config: StripeConfig) {
    super({
      id: "plugin-stripe",
      name: "Stripe Shop Integration",
      description: "Supports all operations on the agents store.",
    });

    if (!config || !config.apiKey) {
      throw new Error("Invalid config provided to PluginStripe");
    }
    this.service = new StripeService(config);

    this.addExecutor({
      name: "list_all",
      description:
        "Returns all the products and prices available for purchase on the agents store.",
      execute: async () => {
        if (!this.service) {
          return {
            success: false,
            error: "Invalid stripe configuration",
          };
        }
        const data = await this.service.getProducts();

        logger.info(`Products: ${JSON.stringify(data)}`);
        return {
          success: true,
          data: {
            data,
            helpfulInformation:
              "There are all the products available on the agents store returned in JSON format." +
              "When creating a response to the user it is important to omit the variant.id field.",
          },
        };
      },
    });

    this.addExecutor({
      name: "create_payment_link",
      description:
        "Return a payment link the user can use to checkout and buy the products they requested.",
      execute: async (context: AgentContext) => {
        if (!this.service) {
          return {
            success: false,
            error: "Invalid stripe configuration",
          };
        }

        const params = await this.runtime.operations.getObject(
          PriceParamSchema,
          generateCheckoutTemplate(
            context.contextChain,
            await this.service.getProducts()
          ),
          { temperature: 0.5 }
        );

        const { products } = params;
        logger.info(`Params: ${JSON.stringify(params)}`);
        const data = await this.service.createPaymentLink(products);
        return {
          success: true,
          data: {
            url: data.url,
            helpfulInformation:
              "This is the checkout link for the customer. They can navigate to this page and complete their purchase.",
          },
        };
      },
    });
  }
}
