import { BaseContextItem } from "@maiar-ai/core";
import { StripeProduct } from "./types.js";

export function generateCheckoutTemplate(
  contextChain: BaseContextItem[],
  products: StripeProduct[]
) {
  return `
    Generate a checkout cart template for the users request by extracting out the list of product variants they are looking to purchase.
    Your response should be a JSON object with 1 field, a list of products.
    Each product in the list MUST contain price and quantity fields.
    The response should be related to the original message you received from the user.

    Do NOT include any metadata, context information, or explanation of how the response was generated.
    Select the variant.id for each product the user is requesting from the products available on the agents store and include it in the price field along with a quantity.
    The price ID will typically start with 'price_'
    If you are unsure about a variant, ask for clarification.
    The quantity is optional and the default is 1
    
    Here is the list of products available on the agents store:
    ${JSON.stringify(products, null, 2)}

    Here is the Context Chain of the users initial message, and your internal operations which generated useful data for your response:
    ${JSON.stringify(contextChain, null, 2)}

    Return a JSON object with 2 fields, price, quantity.
    
    Example of valid response:
    {
      products: [
        {
          price: 'price_1MoC3TLkdIwHu7ixcIbKelAC',
          quantity: 1,
        },
        {
          price: 'price_4nkf3k4gj31g41gj41nkgj',
          quantity: 2,
        }
      ]
    }

  `;
}
