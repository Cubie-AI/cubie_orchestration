import { Agent } from "../models.js";

export async function getAgentById(agentId: number) {
  return Agent.findOne({
    where: {
      id: agentId,
    },
  });
}
