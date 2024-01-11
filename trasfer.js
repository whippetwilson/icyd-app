const schedule = require("node-schedule");
const {
	processTrackedEntityInstances,
	useTracker,
	useProgramStage,
	fetchUnits4Instances,
	useLoader,
} = require("./process");
const moment = require("moment");

// const args = process.argv.slice(2);
// let running = {};
// const transfer = async (program) => {
// 	try {
// 		const processedUnits = await fetchUnits4Instances();
// 		if (program === "RDEklSXCD4C") {
// 			console.log("Fetching facilities");
// 			console.log("Fetching metadata");
// 			const { sessions } = await useLoader();
// 			await processTrackedEntityInstances(
// 				program,
// 				50,
// 				100,
// 				processedUnits,
// 				useTracker,
// 				{
// 					lastUpdatedDuration: "27h",
// 					sessions,
// 				}
// 			);
// 		} else if (program === "IXxHJADVCkb") {
// 			console.log("Fetching facilities");
// 			const processedUnits = await fetchUnits4Instances();
// 			console.log("Fetching metadata");
// 			const { sessions } = await useLoader();
// 			await processTrackedEntityInstances(
// 				program,
// 				50,
// 				100,
// 				processedUnits,
// 				useProgramStage,
// 				{
// 					lastUpdatedDuration: "27h",
// 					sessions,
// 				}
// 			);
// 		} else {
// 			await processTrackedEntityInstances(
// 				program,
// 				50,
// 				100,
// 				processedUnits,
// 				null,
// 				{
// 					lastUpdatedDuration: "27h",
// 				}
// 			);
// 		}
// 	} catch (error) {
// 		console.log(error.message);
// 	}
// 	running = { ...running, [program]: false };
// };

const processAll = async () => {
	const periods = [
		moment().subtract(12, "quarters"),
		moment().subtract(11, "quarters"),
		moment().subtract(10, "quarters"),
		moment().subtract(9, "quarters"),
		moment().subtract(8, "quarters"),
		moment().subtract(7, "quarters"),
		moment().subtract(6, "quarters"),
		moment().subtract(5, "quarters"),
		moment().subtract(4, "quarters"),
		moment().subtract(3, "quarters"),
		moment().subtract(2, "quarters"),
		moment().subtract(1, "quarters"),
		moment(),
	];
	console.log("Fetching units");
	const processedUnits = await fetchUnits4Instances();
	console.log("Fetching metadata");
	const { sessions } = await useLoader();

	console.log("Processing program HEWq6yr4cs5 ");
	await processTrackedEntityInstances(
		"HEWq6yr4cs5",
		250,
		100,
		processedUnits,
		null,
		{
			sessions,
			periods,
			lastUpdatedDuration: "1d",
		}
	);

	console.log("Processing program IXxHJADVCkb ");
	await processTrackedEntityInstances(
		"IXxHJADVCkb",
		50,
		100,
		processedUnits,
		useProgramStage,
		{
			sessions,
			periods,
			lastUpdatedDuration: "1d",
		}
	);
	console.log("Processing program RDEklSXCD4C ");
	await processTrackedEntityInstances(
		"RDEklSXCD4C",
		500,
		100,
		processedUnits,
		useTracker,
		{
			sessions,
			periods,
			lastUpdatedDuration: "1d",
		}
	);
};
schedule.scheduleJob("0 * * * *", async () => {
	await processAll();
});
