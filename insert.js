const { processTrackedEntityInstances } = require("./process");

const processAll = async () => {
  for (const program of ["IXxHJADVCkb"]) {
    console.log(`Working on ${program}`);
    await processTrackedEntityInstances(program);
  }
};

processAll().then(() => console.log("Done"));
