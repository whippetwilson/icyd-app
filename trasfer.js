const schedule = require("node-schedule");
const fs = require("fs");
const {differenceInMinutes, parseISO} = require("date-fns");
const {processTrackedEntityInstances} = require("./process");
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
		await processTrackedEntityInstances(program, 50, 100, {lastUpdatedDuration});
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
