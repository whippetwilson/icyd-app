const schedule = require("node-schedule");
const initialDate = new Date();

const job = schedule.scheduleJob("* * * * *", function () {
  console.log(initialDate, new Date());
});
