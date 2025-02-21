import { BaseContextItem } from "@maiar-ai/core";
export function generateBuyTemplate(contextChain: BaseContextItem[]): string {
  return `
    Generate a swap template for the users request by extracting out a token mint address and the amount of tokens to buy. Your response should be a JSON object with 2 fields, mint and token amount.
    The response should be related to the original message you received from the user. 

    Do NOT include any metadata, context information, or explanation of how the response was generated.
    Mints are typically 32-44characters long and are base58 encoded
    The amount should be a number

    Here is the Context Chain of the users initial message, and your internal operations which generated useful data for your response:
    ${JSON.stringify(contextChain, null, 2)}

    Return a JSON object with 2 fields, mint, tokenAmount
    
    Example of valid response:
    {
        "mint": "So11111111111111111111111111111111111111112",
        "tokenAmount": 1000000,
    }
    `;
}
