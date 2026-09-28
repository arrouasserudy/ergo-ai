// Apply the migrations at boot instead of on the first database access: if one fails
// the server exits before serving traffic, so the Fly deploy fails its health check.
export async function migrateOnBoot() {
  try {
    await import("./db");
  } catch (error) {
    console.error("Database migration failed, refusing to start.", error);
    process.exit(1);
  }
}
