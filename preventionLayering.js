const moment = require("moment");
const {generatePrevention} = require("./process");

generatePrevention([
	moment().subtract(3, "quarters"),
	moment().subtract(2, "quarters"),
	moment().subtract(1, "quarters"),
	moment()
]).then(() => console.log("Done"));
