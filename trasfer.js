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
		const processedUnits = await fetchUnits4Instances();
		if (program === "RDEklSXCD4C") {
			console.log("Fetching facilities");
			console.log("Fetching metadata");
			const { sessions } = await useLoader();
			await processTrackedEntityInstances(
				program,
				50,
				100,
				processedUnits,
				useTracker,
				{
					lastUpdatedDuration: "27h",
					sessions,
				}
			);
		} else if (program === "IXxHJADVCkb") {
			console.log("Fetching facilities");
			const processedUnits = await fetchUnits4Instances();
			console.log("Fetching metadata");
			const { sessions } = await useLoader();
			await processTrackedEntityInstances(
				program,
				50,
				100,
				processedUnits,
				useProgramStage,
				{
					lastUpdatedDuration: "27h",
					sessions,
				}
			);
		} else {
			await processTrackedEntityInstances(
				program,
				50,
				100,
				processedUnits,
				null,
				{
					lastUpdatedDuration: "27h",
				}
			);
		}
	} catch (error) {
		console.log(error.message);
	}
	running = { ...running, [program]: false };
};
schedule.scheduleJob("0 1 * * *", async () => {
	await transfer(args[0]);
});
