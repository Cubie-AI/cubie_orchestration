import { createLogger } from "@maiar-ai/core";
import { Op } from "sequelize";
import { Token } from "../models/token.js";

const logger = createLogger("db:repositories:token");
export async function getTokensByAddressOrTicker(tickerOrCa: string) {
  try {
    const symbol = `^\\$${tickerOrCa.replace("$", "")}$`;
    logger.info(`Getting token details for ${symbol}`);

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
