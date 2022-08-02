const {columns, rows} = require("./test.json");
const {fromPairs} = require("lodash");


const data = rows.map((r) => {
	return fromPairs(columns.map((c, i) => [c.name, r[i]]));
});

console.log(data.map((d) => d.eventDate));
