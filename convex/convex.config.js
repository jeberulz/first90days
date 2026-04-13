import { defineApp } from "convex/server";
import rag from "@convex-dev/rag/convex.config.js";
import workpool from "@convex-dev/workpool/convex.config.js";

const app = defineApp();
app.use(rag);
app.use(workpool, { name: "embedPool" });
app.use(workpool, { name: "enrichPool" });
// File extraction pool — M0 pipeline stage. CPU-bound (pdf-parse), so
// low parallelism keeps a single user's bulk upload from starving others.
app.use(workpool, { name: "extractPool" });

export default app;
