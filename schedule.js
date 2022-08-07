const schedule = require("node-schedule");
const fs = require("fs");
const {differenceInMinutes, parseISO} = require("date-fns");

const {processTrackedEntityInstances, useTracker} = require("./process");
const moment = require("moment");
let quarter = moment().format("YYYY[Q]Q");

const generate = async () => {
	let searches = JSON.parse(fs.readFileSync("./schedule.json", "utf8"));
	let lastUpdatedDuration = "1m";

	if (searches.last) {
		const minutes = differenceInMinutes(new Date(), parseISO(searches.last));
		if (minutes > 0 && minutes < 60) {
			lastUpdatedDuration = `${minutes}m`;
		} else if (minutes >= 60 && minutes <= 60 * 24) {
			lastUpdatedDuration = `${Math.floor(minutes / 60)}h`;
		} else if (minutes > 60 * 24) {
			lastUpdatedDuration = `${Math.floor(minutes / (60 * 24))}d`;
		}
	}

	const currentQuarter = moment().format("YYYY[Q]Q");
	console.log(`Fetching for ${lastUpdatedDuration}`);
	try {
		console.log("Working on HVAT");
		await processTrackedEntityInstances("HEWq6yr4cs5", 100, 100, {
			lastUpdatedDuration: "10m",
		});
		console.log("Working on GROUP ACTIVITIES");
		await processTrackedEntityInstances("IXxHJADVCkb", 100, 100, {
			lastUpdatedDuration: "10m",
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
				{lastUpdatedDuration}
			);
		}
		console.log("Done");
	} catch (error) {
		console.log(error.message);
	}
	quarter = currentQuarter;
	fs.writeFileSync(
		"./schedule.json",
		JSON.stringify({...searches, last: new Date()})
	);
};

schedule.scheduleJob("*/10 * * * *", async () => {
	await generate();

});
