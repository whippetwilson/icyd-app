const {
	processTrackedEntityInstances,
	useTracker,
	fetchUnits4Instances,
	useLoader,
	useProgramStage,
} = require("./process");

const processAll = async () => {
	console.log("Fetching units");
	const processedUnits = await fetchUnits4Instances();
	console.log("Fetching metadata");
	const { sessions } = await useLoader();
	console.log("Processing program RDEklSXCD4C ");
	await processTrackedEntityInstances("RDEklSXCD4C", 500, 100, useTracker, {
		processedUnits,
		sessions,
	});
	console.log("Processing program HEWq6yr4cs5 ");
	await processTrackedEntityInstances("HEWq6yr4cs5", 250, 100, null, {
		processedUnits,
		sessions,
	});
	console.log("Processing program IXxHJADVCkb ");
	await processTrackedEntityInstances("IXxHJADVCkb", 50, 100, useProgramStage, {
		processedUnits,
		sessions,
	});
};
processAll().then(() => console.log("Done"));
