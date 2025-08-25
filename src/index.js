const express = require("express");
const app = express();
const cors = require("cors");
const helmet = require("helmet");
// const v1Route = require("./routes/v1");
const router = require("./routes/v1");
const {init} = require("./models");
const config = require('./config/config');


app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", router);


app.get("/", (req, res) => {
  res.send("Hello World");
})

const {runRealtimeTail} = require("./helpers/logEntry.helper");
const smtp_config = require("./config/smtp_config");

// const ctrl = runRealtimeTail({ 
//   host: smtp_config.host_smtp_5,
//   port: smtp_config.port_smtp_5,
//   username: smtp_config.username_smtp_5,
//   password: smtp_config.password_smtp_5,
//   command: smtp_config.command_smtp_5
// })




async function start() {
  try {
    const ok = await init();
    if (ok) console.log('Database init completed');
    else console.log('Database init finished with errors (see logs)');
  } catch (err) {
    console.error('Unexpected error during init:', err && err.message ? err.message : err);
  }

  app.listen(config.port, () => {
    console.log(`Server Email Node Js app listening at http://localhost:${config.port}`);
  });
}

start();
