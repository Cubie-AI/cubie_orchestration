import { Token } from "../models/token.js";
import { Op } from "sequelize";

export async function getTokensByAddressOrTicker(tickerOrCa: string) {
  try {
    const symbol = `^\\$${tickerOrCa.replace("$", "")}$`;
    console.log(`Getting token details for ${symbol}`);

    return await Token.findAll({
      where: {
        [Op.or]: [{ symbol: { [Op.regexp]: symbol } }, { address: tickerOrCa }],
      },
      order: [["mintedAt", "ASC"]],
    });
  } catch (error) {
    console.error(error);
    throw new Error("Unable to get token details");
  }
}

export async function getTokenDecimals(address: string) {
  let decimals = 0;
  try {
    const token = await Token.findOne({
      where: {
        address,
      },
    });

    if (token) {
      decimals = token.decimals;
    }
  } catch (error) {
    console.error(error);
  }
  return decimals || 0;
}
