const {utils, writeFile} = require("xlsx");
const {instance} = require("./process");
const getProgramData = async (programId, identifierColumn) => {
	const {data: {organisationUnits}} = await instance.get("organisationUnits", {
		params: {
			level: 3,
			fields: "id,name",
			paging: false
		}
	});

	const allFields = await createTemplates(programId, identifierColumn);
	for (const {id, name} of organisationUnits) {
		const {data: {trackedEntityInstances}} = await instance.get("trackedEntityInstances", {
			params: {
				ou: id,
				ouMode: "DESCENDANTS",
				program: programId,
				skipPaging: true,
				fields: "trackedEntityInstance,attributes"
			}
		});
		if (trackedEntityInstances.length > 0) {
			const wb = utils.book_new();
			for (const {stageName, fields} of allFields) {
				const all = trackedEntityInstances.map(({attributes}) => {
					const a = attributes.find(({attribute}) => attribute === identifierColumn.uid);
					return fields.map((f) => {
						if (f === identifierColumn.name && a) {
							return a["value"];
						}
						return "";
					});
				});
				const ws = utils.aoa_to_sheet([fields, ...all]);
				utils.book_append_sheet(wb, ws, stageName.length < 31 ? stageName : String(stageName).substring(0, 28) + "...");
			}
			writeFile(wb, `${name}.xlsx`);
		}
	}
};

const createTemplates = async (programId, identifierColumn) => {
	let allStages = [];
	const {data: {programTrackedEntityAttributes, id, programStages}} = await instance.get(`programs/${programId}.json`, {
		params: {
			fields: "id,name,programTrackedEntityAttributes[trackedEntityAttribute[id,name]],programStages[name,programStageDataElements[dataElement[name]]]"
		}
	});
	const attribute = programTrackedEntityAttributes.find(({trackedEntityAttribute}) => trackedEntityAttribute.id === identifierColumn.uid);
	for (const {name, programStageDataElements} of programStages) {
		allStages = [...allStages, {
			stageName: name,
			fields: [attribute["trackedEntityAttribute"]["name"], "eventDate", ...programStageDataElements.map(({dataElement}) => dataElement["name"])]
		}];
	}
	return allStages;
};


getProgramData("RDEklSXCD4C", {name: "Individual Code", uid: "HLKc2AKR9jW"}).then(() => console.log("Done"));
