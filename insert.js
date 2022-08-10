const {processTrackedEntityInstances} = require("./process");
const {fromPairs} = require("lodash");
const args = process.argv.slice(2);

const processAll = async () => {
	const otherArgs = fromPairs(args.slice(3).map((x) => {
		return x.split("=");
	}));
	await processTrackedEntityInstances(args[0], args[1], args[2], otherArgs);
};
processAll().then(() => console.log("Done"));
