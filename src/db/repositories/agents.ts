import { Agent, AgentInfo } from "../models.js";

export async function getAgentById(agentId: number) {
  return Agent.findOne({
    where: {
      id: agentId,
    },
    include: [{ model: AgentInfo, as: "agentInfo" }],
  });
}
