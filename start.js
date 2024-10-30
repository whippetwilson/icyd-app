const path = require("path");
const Runner = require("moleculer").Runner;

const runner = new Runner();

runner
	.start([
		process.argv[0],
		__filename,
		"--config",
		path.join(__dirname, "moleculer.config.js"),
		"--env",
		path.join(__dirname, "services"),
	])
	.catch((err) => {
		console.error(err.message);
		process.exit(1);
	});
