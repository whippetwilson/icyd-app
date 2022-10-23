const moment = require("moment");
const {useProgramStage} = require("./process");

useProgramStage({}).then(() => console.log("Done"));
