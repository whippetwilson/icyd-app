const {processTrackedEntityInstances, useTracker} = require("./process");
const generate = async () => {
	try {
		// console.log("Working on HVAT");
		// await processTrackedEntityInstances("HEWq6yr4cs5", 100, 100);
		// console.log("Working on GROUP ACTIVITIES");
		// await processTrackedEntityInstances("IXxHJADVCkb", 100, 100);
		// console.log("Generating the layering");
		await useTracker();
	} catch (error) {
		console.log(error.message);
	}
};
generate().then(() => console.log("Done"));
