const {
	findAnyEventValue,
	mostCurrentEvent,
	eventsBeforePeriod,
	eventsWithinPeriod,
	specificDataElement
} = require("./process");
const moment = require("moment");


const test = () => {

	const events = [{
		eventDate: "2022-08-05T00:00:00.006",
		xxx: "test"
	}, {
		eventDate: "2022-08-06T00:00:00.006",
		xxx: "www"
	}, {
		eventDate: "2022-10-07T12:00:00.006",
		xxx: "zzzz"
	}];
	const period = moment();
	const quarterStart = period.startOf("quarter").toDate();
	const quarterEnd = period.endOf("quarter").toDate();

	console.log(specificDataElement(null, "xxx"));
};
test();
