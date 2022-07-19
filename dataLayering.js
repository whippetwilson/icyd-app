const moment = require("moment");
const { useTracker } = require("./process");

useTracker().then(() => console.log("Done"));
