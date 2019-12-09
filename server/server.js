const dotenv = require("dotenv");
dotenv.config();

const app = require("./app").app;
const config = require("config");

const server = app.listen(config.get("server.port"), () => {
  const address = server.address();
  const { port } = address;
  console.log(`Server running on port ${port}`);
});
