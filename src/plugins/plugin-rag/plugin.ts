import { PluginBase, AgentContext, createLogger } from "@maiar-ai/core";

interface PluginRagConfig {
  api: string;
}

const logger = createLogger("plugin:RAG");
export class PluginRag extends PluginBase {
  constructor(private config: PluginRagConfig) {
    super({
      id: "plugin-rag",
      name: "RAG",
      description:
        "Retrieve external information specific to the agents current knowledge.",
    });

    this.addExecutor({
      name: "inject_current_information",
      description:
        "Returns the up-to date knowledge and information of this agent. Always execute inject_current_information immediately after the plugin-character",
      execute: async () => {
        let result = { success: false, error: "An unexpected error occurred" };
        if (!this.config.api) {
          result.error = "No external api provided.";
          return result;
        }
        const response = await fetch(this.config.api, {
          headers: {
            "Content-Type": "applcation/json",
          },
        });

        if (!response.ok) {
          result.error = `External api responded with status: ${response.status}`;
          return result;
        }
        const { data } = (await response.json()) as { data: string };

        logger.info(`Retrieved data :${data}`);
        if (!data) {
          result.error =
            "Malformed response from external api. Field 'data' is required but missing.";
          return result;
        }

        return {
          success: true,
          data: {
            data,
            helpfulInstruction:
              "This returns up to date information that this agent knows." +
              "This information should and can be used before calling plugin-x." +
              "Use this information to answer users queries or questions if it is related" +
              "Use this information when generating content to post on X/Twitter" +
              "This information should be prioritized over the character information.",
          },
        };
      },
    });
  }
}
