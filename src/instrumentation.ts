// Runs once when the server starts, before it handles requests.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { migrateOnBoot } = await import("./instrumentation-node");
    await migrateOnBoot();
  }
}
