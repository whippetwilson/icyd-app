const moment = require("moment");
const {useProgramStage} = require("./process");

useProgramStage([
	moment().subtract(3, "quarters"),
	moment().subtract(2, "quarters"),
	moment().subtract(1, "quarters"),
	moment()
]).then(() => console.log("Done"));
