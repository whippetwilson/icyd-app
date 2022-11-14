const schedule = require("node-schedule");
const fs = require("fs");
const { differenceInMinutes, parseISO } = require("date-fns");
const {
	processTrackedEntityInstances,
	useTracker,
	useProgramStage,
	fetchUnits4Instances,
	useLoader,
} = require("./process");
const moment = require("moment");
const args = process.argv.slice(2);
let running = {};
const transfer = async (program) => {
	if (!running[program]) {
		running = { ...running, [program]: true };
		let searches = {
			last: moment().subtract(1, "quarters").format("YYYY-MM-DD"),
		};
		try {
			searches = JSON.parse(fs.readFileSync(`./${program}.json`, "utf8"));
			fs.writeFileSync(
				`./${program}.json`,
				JSON.stringify({ ...searches, last: new Date() })
			);
		} catch (e) {
			fs.writeFileSync(
				`./${program}.json`,
				JSON.stringify({ ...searches, last: new Date() })
			);
			console.log(e);
		}
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
			if (program === "RDEklSXCD4C") {
				const processedUnits = await fetchUnits4Instances();
				console.log("Fetching metadata");
				const { sessions } = await useLoader();
				await processTrackedEntityInstances(program, 50, 100, useTracker, {
					lastUpdatedDuration,
					processedUnits,
					sessions,
				});
			} else if (program === "IXxHJADVCkb") {
				const processedUnits = await fetchUnits4Instances();
				console.log("Fetching metadata");
				const { sessions } = await useLoader();
				await processTrackedEntityInstances(program, 50, 100, useTracker, {
					lastUpdatedDuration,
					processedUnits,
					sessions,
				});
				await processTrackedEntityInstances(program, 50, 100, useProgramStage, {
					lastUpdatedDuration,
					processedUnits,
					sessions,
				});
			} else {
				await processTrackedEntityInstances(program, 50, 100, null, {
					lastUpdatedDuration,
				});
			}
		} catch (error) {
			console.log(error.message);
		}
		running = { ...running, [program]: false };
	} else {
		console.log("Already running");
	}
};
schedule.scheduleJob("*/15 * * * *", async () => {
	await transfer(args[0]);
});
