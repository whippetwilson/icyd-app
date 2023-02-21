const schedule = require("node-schedule");
const {
	processTrackedEntityInstances,
	useTracker,
	useProgramStage,
	fetchUnits4Instances,
	useLoader,
} = require("./process");
const args = process.argv.slice(2);
let running = {};
const transfer = async (program) => {
	try {
		if (program === "RDEklSXCD4C") {
			console.log("Fetching facilities");
			const processedUnits = await fetchUnits4Instances();
			console.log("Fetching metadata");
			const { sessions } = await useLoader();
			await processTrackedEntityInstances(program, 50, 100, useTracker, {
				lastUpdatedDuration: "4h",
				processedUnits,
				sessions,
			});
		} else if (program === "IXxHJADVCkb") {
			console.log("Fetching facilities");
			const processedUnits = await fetchUnits4Instances();
			console.log("Fetching metadata");
			const { sessions } = await useLoader();
			await processTrackedEntityInstances(program, 50, 100, useProgramStage, {
				lastUpdatedDuration: "4h",
				processedUnits,
				sessions,
			});
		} else {
			await processTrackedEntityInstances(program, 50, 100, null, {
				lastUpdatedDuration: "4h",
			});
		}
	} catch (error) {
		console.log(error.message);
	}
	running = { ...running, [program]: false };
};
schedule.scheduleJob("*/30 * * * *", async () => {
	await transfer(args[0]);
});
