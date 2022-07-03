const {
  processTrackedEntityInstances,
  processTrackedEntityInstancesAttributes,
} = require("./process");
const args = process.argv.slice(2);

const processAll = async () => {
  await processTrackedEntityInstancesAttributes(args[0], args[1], args[2]);
};
processAll().then(() => console.log("Done"));
