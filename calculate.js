const {queryActivities} = require("./process");
const {districts} = require("./districts");

const generate = async () => {
	for (const district of districts) {
		console.log("Generating for " + district.label);
		await queryActivities(district);
	}
};

generate().then(() => console.log("Done"));
