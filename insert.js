const { processTrackedEntityInstances } = require("./process");

const processAll = async () => {
  for (const program of ["HEWq6yr4cs5", "RDEklSXCD4C", "IXxHJADVCkb"]) {
    console.log(`Working on ${program}`);
    await processTrackedEntityInstances(program);
  }
};

processAll().then(() => console.log("Done"));
