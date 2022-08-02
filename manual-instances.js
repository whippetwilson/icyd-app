const moment = require("moment");
const {chunk} = require("lodash");
const {processTrackedEntityInstances, useTracker} = require("./process");
const generate = async (instances) => {
	// try {
	console.log("Working on AVAT");
	const tei = await processTrackedEntityInstances("RDEklSXCD4C", 100, 100, {
		trackedEntityInstance: instances,
	});
	console.log("Generating the layering");
	await useTracker(
		[
			moment().subtract(3, "quarters"),
			moment().subtract(2, "quarters"),
			moment().subtract(1, "quarters"),
			moment(),
		],
		[instances]
	);
	// } catch (error) {
	// 	console.log(error.message);
	// }
};

const args = process.argv.slice(2);

generate(args[0]).then(() => console.log("Done"));
