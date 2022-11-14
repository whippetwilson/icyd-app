const {
	processTrackedEntityInstances,
	useTracker,
	fetchUnits4Instances,
	useLoader,
	useProgramStage,
} = require("./process");
const { fromPairs } = require("lodash");

const processAll = async () => {
	const processedUnits = await fetchUnits4Instances();
	const { sessions } = await useLoader();
	await processTrackedEntityInstances("HEWq6yr4cs5", 50, 100, null, {
		processedUnits,
		sessions,
	});
	await processTrackedEntityInstances("RDEklSXCD4C", 50, 100, useTracker, {
		processedUnits,
		sessions,
	});
	await processTrackedEntityInstances("IXxHJADVCkb", 50, 100, useProgramStage, {
		processedUnits,
		sessions,
	});
};
processAll().then(() => console.log("Done"));
