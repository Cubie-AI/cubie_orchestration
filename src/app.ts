import express, { NextFunction, Request, Response } from "express";
import { errorInstance } from "./error.js";
import { runningAgents, startAgent, updateAgent } from "./orchestrate.js";

const app = express();

// await agentLoader();

app.use(express.json());

app.post("/", async (req, res, next) => {
  const agentId = req.body.agentId;
  if (!agentId) {
    return next(new Error("No agentId provided"));
  }
  const runtime = runningAgents.get(agentId.toString());
  if (!runtime) {
    const started = await startAgent(agentId);
    if (!started) {
      return next(new Error("Failed to start agent with id " + agentId));
    }
  } else {
    const updated = await updateAgent(agentId);
    if (!updated) {
      return next(new Error("Failed to update agent with id " + agentId));
    }
  }
});

app.get("/heathcheck", (_req, res) => {
  res.json({
    errors: errorInstance.errors,
  });
});

app.get("/clear", (_req, res) => {
  errorInstance.clearErrors();
  res.send("Errors cleared");
});

app.use((err: Error, req: Request, _res: Response, _next: NextFunction) => {
  if (err instanceof Error) {
    errorInstance.addError(err.message);
  }
});

app.listen(8081, () => {
  console.log("Server is running on port 8081");
});
