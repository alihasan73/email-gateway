const express = require("express");
const app = express();
const cors = require("cors");
const helmet = require("helmet");
const router = require("./routes/v1");
const {init} = require("./models");
const config = require('./config/config');
const schedule = require('./services/scheduler.service')


app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", router);


app.get("/", (req, res) => {
  res.send("Hello World App Email Gateway!");
})

const {runRealtimeTail} = require("./helpers/logEntry.helper");


// const ctrl = runRealtimeTail({ 
//   host: config.email.smtp_5.host,
//   port: config.email.smtp_5.port,
//   username: config.email.smtp_5.username,
//   password: config.email.smtp_5.password,
//   command: config.email.smtp_5.command
// })




async function start() {
  try {
    // console.log(new Date("08:47").toISOString())
    schedule.start({});
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
