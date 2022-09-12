const schedule = require("node-schedule");
const fs = require("fs");
const {differenceInMinutes, parseISO} = require("date-fns");
const {processTrackedEntityInstances, useTracker, useProgramStage} = require("./process");
const moment = require("moment");
const args = process.argv.slice(2);
const transfer = async (program) => {
	let searches = JSON.parse(fs.readFileSync(`./${program}.json`, "utf8"));
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
	console.log(`Fetching for ${lastUpdatedDuration}`);
	try {
		const instances = await processTrackedEntityInstances(program, 50, 100, {lastUpdatedDuration});
		if (program === "RDEklSXCD4C") {
			await useTracker([
				moment().subtract(3, "quarters"),
				moment().subtract(2, "quarters"),
				moment().subtract(1, "quarters"),
				moment(),
			], instances);
		}
		if (program === "IXxHJADVCkb") {
			await useProgramStage([
				moment().subtract(3, "quarters"),
				moment().subtract(2, "quarters"),
				moment().subtract(1, "quarters"),
				moment()
			], instances);
		}
	} catch (error) {
		console.log(error.message);
	}
	fs.writeFileSync(
		`./${program}.json`,
		JSON.stringify({...searches, last: new Date()})
	);
};
schedule.scheduleJob("*/1 * * * *", async () => {
	await transfer(args[0]);
});
