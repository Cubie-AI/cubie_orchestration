import { createLogger, PluginBase, UserInputContext } from "@maiar-ai/core";

const log = createLogger("plugin:x-post-invocation");

export const xPostTemplate = `
You're going to write a post for X. The post needs to fit in a single tweet.
Talk about whatever you want if it fits your character description and is on topic.
The last function you will call in the pipeline is "post_tweet" where you will post the tweet to X.
`;

interface XPostPluginConfig {
  intervalMinutes: number;
  intervalRandomizationMinutes: number;
}

export class PluginXPost extends PluginBase {
  constructor(private config: XPostPluginConfig) {
    super({
      id: "plugin-x-post",
      name: "X Posting",
      description:
        "Trigger that invokes the agent to post to X on a random interval",
    });

    // triggers invoke agent behavior, start here
    this.addTrigger({
      id: "http_request_listener",
      start: async () => {
        const scheduleNextPost = async () => {
          // Recalculate random interval each time
          const intervalMs =
            (this.config.intervalMinutes +
              Math.random() * this.config.intervalRandomizationMinutes) *
            60 *
            1000;

          // Create new context chain with a direction to make a post.
          const initialContext: UserInputContext = {
            id: `${this.id}-${Date.now()}`,
            pluginId: this.id,
            type: "user_input",
            action: "receive_message",
            content: xPostTemplate,
            timestamp: Date.now(),
            rawMessage: xPostTemplate,
            user: "self-invoked-post-intuition-trigger",
          };

          log.info("Creating x post event");
          await this.runtime.createEvent(initialContext);

          // Schedule next post
          log.info(`Scheduling next post in ${intervalMs}ms`);
          setTimeout(scheduleNextPost, intervalMs);
        };

        // Start the first scheduling
        await scheduleNextPost();
      },
    });
  }
}
