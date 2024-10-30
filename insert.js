const {
	processTrackedEntityInstances,
	useTracker,
	fetchUnits4Instances,
	useLoader,
	useProgramStage,
} = require("./process");

const moment = require("moment");

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
	// const { sessions } = await useLoader();
	console.log("Processing program HEWq6yr4cs5 ");
	await processTrackedEntityInstances(
		"HEWq6yr4cs5",
		250,
		100,
		processedUnits,
		null
		// {
		// 	// sessions,
		// 	periods,
		// 	// trackedEntityInstance: "N3wHKMtAPPz",
		// }
	);

	console.log("Processing program IXxHJADVCkb ");
	await processTrackedEntityInstances(
		"IXxHJADVCkb",
		50,
		100,
		processedUnits
		// useProgramStage,
		// {
		// 	sessions,
		// 	periods,
		// 	// trackedEntityInstance: "ts8JKdkApPI",
		// }
	);
	console.log("Processing program RDEklSXCD4C ");
	await processTrackedEntityInstances(
		"RDEklSXCD4C",
		500,
		100,
		processedUnits
		// useTracker,
		// {
		// 	// sessions,
		// 	periods,
		// 	// trackedEntityInstance: "HJIFLP5FYis",
		// }
	);
};
processAll().then(() => console.log("Done"));
