import { Sequelize } from "sequelize";
import {
  DATABASE_HOST,
  DATABASE_NAME,
  DATABASE_PASSWORD,
  DATABASE_PORT,
  DATABASE_USER,
} from "../constants.js";
console.log(
  `Connecting to database: ${DATABASE_USER}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}`
);

export const db = new Sequelize(
  DATABASE_NAME,
  DATABASE_USER,
  DATABASE_PASSWORD,
  {
    host: DATABASE_HOST,
    port: parseInt(DATABASE_PORT),
    dialect: "mariadb",
    logging: false,
  }
);
