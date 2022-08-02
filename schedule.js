const schedule = require("node-schedule");
const {processTrackedEntityInstances, useTracker} = require("./process");
const moment = require("moment");
let quarter = moment().format("YYYY[Q]Q");

const generate = async () => {
	const currentQuarter = moment().format("YYYY[Q]Q");
	try {
		console.log("Working on HVAT");
		await processTrackedEntityInstances("HEWq6yr4cs5", 100, 100, {
			lastUpdatedDuration: "30m",
		});
		console.log("Working on GROUP ACTIVITIES");
		await processTrackedEntityInstances("IXxHJADVCkb", 100, 100, {
			lastUpdatedDuration: "30m",
		});
		console.log("Working on AVAT");
		const tei = await processTrackedEntityInstances("RDEklSXCD4C", 100, 100, {
			lastUpdatedDuration: "30m",
		});
		console.log("Generating the layering");
		if (quarter !== currentQuarter) {
			console.log("This is new quarter Generating the layering afresh");
			await useTracker([
				moment().subtract(3, "quarters"),
				moment().subtract(2, "quarters"),
				moment().subtract(1, "quarters"),
				moment(),
			]);
		} else {
			await useTracker(
				[
					moment().subtract(3, "quarters"),
					moment().subtract(2, "quarters"),
					moment().subtract(1, "quarters"),
					moment(),
				],
				tei.flat()
			);
		}
		console.log("Done");
	} catch (error) {
		console.log(error.message);
	}
	quarter = currentQuarter;
};

schedule.scheduleJob("*/15 * * * *", async () => {
	await generate();
});
