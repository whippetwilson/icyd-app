const {generatePrevention} = require("./process");

const generateLayering2 = async () => {
	try {
		await generatePrevention();
	} catch (error) {
		console.log(error.message);
	}
};

generateLayering2().then(() => console.log("Done"));
