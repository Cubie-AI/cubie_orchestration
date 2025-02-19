import { BaseContextItem } from "@maiar-ai/core";

export function generateTokenInfoTemplate(contextChain: BaseContextItem[]): string {
  return `
    Generate a query for by extracting the contract address from the user request. Your response should be a JSON object with a single "token" field containing your response.
    The response should be related to the original message you received from the user. 

    Do NOT include any metadata, context information, or explanation of how the response was generated.
    Look for a relevant solana token contract address in the user's message.
    The address is typically 32 to 44 characters long and starts and base58 encoded.

    Here is the Context Chain of the users initial message, and your internal operations which generated useful data for your response:
    ${JSON.stringify(contextChain, null, 2)}

    Return a JSON object with a single "token" field containing your response.
    
    Example of valid response:
    {
        "token": "2MH8ga3TuLvuvX2GUtVRS2BS8B9ujZo3bj5QeAkMpump"
    }
    `;
}
