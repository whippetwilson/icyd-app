const schedule = require("node-schedule");
const { processTrackedEntityInstances } = require("./process");
let lastUpdatedStartDate = new Date();

// const job = schedule.scheduleJob("*/15 * * * *", async function () {
//   const lastUpdatedEndDate = new Date();
//   for (const program of ["HEWq6yr4cs5", "RDEklSXCD4C", "IXxHJADVCkb"]) {
//     try {
//       await processTrackedEntityInstances(program, 100, 100);
//     } catch (error) {
//       console.log(error.message);
//     }
//   }
//   lastUpdatedStartDate = lastUpdatedEndDate;
// });

const testing = async () => {
  for (const program of ["HEWq6yr4cs5", "RDEklSXCD4C", "IXxHJADVCkb"]) {
    try {
      await processTrackedEntityInstances(program, 250, 100);
    } catch (error) {
      console.log(error.message);
    }
  }
};

testing().then(() => console.log("Done"));
