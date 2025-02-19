import { Agent } from "./models/agent.js";
import { AgentInfo } from "./models/agentInfo.js";
import { Nonce } from "./models/nonce.js";
import { People } from "./models/people.js";
import {Token} from "./models/token.js";

People.belongsTo(Agent, {
  foreignKey: "agentId",
});

Agent.hasMany(AgentInfo, {
  foreignKey: "agentId",
  as: "agentInfo",
});

AgentInfo.belongsTo(Agent, {
  foreignKey: "agentId",
});

await Agent.sync({});
await People.sync({});
await AgentInfo.sync({});
await Nonce.sync({});
await Token.sync({});

export { Agent, AgentInfo, Nonce, People };
