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
