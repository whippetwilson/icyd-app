const moment = require("moment");

const { useTracker, fetchUnits4Instances, useLoader } = require("./process");
const generateLayering = async () => {
	console.log("Fetching units");
	const processedUnits = await fetchUnits4Instances();
	console.log("Fetching metadata");
	const { sessions } = await useLoader();
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
	await useTracker({
		processedUnits,
		sessions,
		periods,
		searchInstances: ["hHtgczvS75k"],
	});
};

generateLayering().then(() => console.log("Done"));
