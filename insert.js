const { processTrackedEntityInstances } = require("./process");
const args = process.argv.slice(2);

const processAll = async () => {
  await processTrackedEntityInstances(args[0], args[1], args[2]);
};
processAll().then(() => console.log("Done"));
