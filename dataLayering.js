const moment = require("moment");
const { useTracker } = require("./process");

useTracker(
  [
    moment().subtract(3, "quarters"),
    moment().subtract(2, "quarters"),
    moment().subtract(1, "quarters"),
    moment(),
  ],
  ["hZDnafDtjGP"]
).then(() => console.log("Done"));
