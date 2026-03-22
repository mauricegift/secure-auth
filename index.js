const config = require("./config");
const { db } = require("./lib");
const app = require("./lib/server");

async function start() {
  await db.connectDB();

  app.listen(config.PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${config.PORT} [${config.NODE_ENV}]`);
  });
}

start();
