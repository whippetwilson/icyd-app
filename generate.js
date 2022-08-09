const {processTrackedEntityInstances, useTracker} = require("./process");
const moment = require("moment");
const generate = async () => {

	try {

		// console.log("Working on HVAT");
		// await processTrackedEntityInstances("HEWq6yr4cs5", 250, 100);
		// console.log("Working on GROUP ACTIVITIES");
		// await processTrackedEntityInstances("IXxHJADVCkb", 100, 100);
		// console.log("Generating the layering");
		const args = process.argv.slice(2);
		const page = args.length > 0 ? args[0] : 1;
		await useTracker([
			moment().subtract(3, "quarters"),
			moment().subtract(2, "quarters"),
			moment().subtract(1, "quarters"),
			moment(),
		], {page});
	} catch (error) {
		console.log(error.message);
	}
};

generate().then(() => console.log("Done"));
