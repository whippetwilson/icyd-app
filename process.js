const {
  differenceInMonths,
  differenceInYears,
  isBefore,
  isWithinInterval,
  parseISO,
} = require("date-fns");
const {
  every,
  fromPairs,
  groupBy,
  has,
  maxBy,
  sortBy,
  uniq,
  chunk,
  sum,
} = require("lodash");
const moment = require("moment");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const risks = {
  "Child of Non suppressed HIV+ Caregiver": "Child of HIV+ Caregiver",
  "Child of suppressed HIV+ Caregiver": "Child of HIV+ Caregiver",
  "Adolescent (9-14 yrs)": "Siblings of Index Child",
  "Malnourished (0-5 Yrs)": "Siblings of Index Child",
};

module.exports.api = axios.create({
  baseURL: "http://localhost:3001/api/",
});

module.exports.instance = axios.create({
  baseURL: process.env.ICYD_BASE_URL,
  auth: {
    username: process.env.ICYD_USERNAME,
    password: process.env.ICYD_PASSWORD,
  },
});

module.exports.fetchAll = async (query) => {
  let {
    data: { rows: allRows, columns, cursor: currentCursor },
  } = await this.api.post("wal/sql", query);

  if (currentCursor) {
    do {
      let {
        data: { rows, cursor },
      } = await this.api.post("wal/sql", { cursor: currentCursor });
      allRows = allRows.concat(rows);
      currentCursor = cursor;
    } while (!!currentCursor);
  }
  return allRows.map((r) => {
    return fromPairs(columns.map((c, i) => [c.name, r[i]]));
  });
};

module.exports.calculateQuarter = (year, quarter) => {
  if (quarter === 1) {
    return [new Date(`${year - 1}-10-01`), new Date(`${year}-03-31`)];
  }
  if (quarter === 2) {
    return [new Date(`${year - 1}-10-01`), new Date(`${year}-06-30`)];
  }
  if (quarter === 3) {
    return [new Date(`${year - 1}-10-01`), new Date(`${year}-09-30`)];
  }
  if (quarter === 4) {
    return [new Date(`${year}-10-01`), new Date(`${year}-12-31`)];
  }
  return [new Date(`${year}-10-01`), new Date(`${year}-12-31`)];
};

module.exports.findAgeGroup = (age) => {
  if (age <= 0) {
    return "< 1";
  }

  if (age > 0 && age <= 4) {
    return "1 - 4";
  }
  if (age > 4 && age <= 9) {
    return "5 - 9";
  }
  if (age > 9 && age <= 14) {
    return "10 - 14";
  }
  if (age > 14 && age <= 17) {
    return "15 - 17";
  }
  if (age > 17 && age <= 20) {
    return "18 - 20";
  }
  if (age > 20 && age <= 24) {
    return "21 - 24";
  }
  if (age >= 25) {
    return "25+";
  }
};
module.exports.mapping = {
  "MOE Journeys Plus": "Completed MOE Journeys Plus",
  "MOH Journeys curriculum": "Completed MOH Journeys",
  "No means No sessions (Boys)": "Completed NMN Boys",
  "No means No sessions (Girls)": "Completed NMN Girls",
  "No means No sessions (Boys) New Curriculum":
    "Completed NMN Boys New Curriculum",
};
module.exports.mapping2 = {
  "MOE Journeys Plus": 18,
  "MOH Journeys curriculum": 22,
  "No means No sessions (Boys)": 4,
  "No means No sessions (Girls)": 5,
  "No means No sessions (Boys) New Curriculum": 8,
  SINOVUYO: 10,
};

module.exports.hadASession = (
  allSessions,
  participantIndex,
  sessionNameIndex,
  sessionDateIndex,
  participant,
  startDate,
  endDate,
  sessions
) => {
  return !!allSessions.find((row) => {
    return (
      row[participantIndex] === participant &&
      sessions.indexOf(row[sessionNameIndex]) !== -1 &&
      isWithinInterval(parseISO(row[sessionDateIndex]), {
        start: startDate,
        end: endDate,
      })
    );
  });
};

module.exports.hasCompleted = (
  allSessions,
  participantIndex,
  sessionNameIndex,
  sessionDateIndex,
  participant,
  endDate,
  sessions,
  value
) => {
  const doneSessions = allSessions
    .filter((row) => {
      return (
        row[participantIndex] === participant &&
        sessions.indexOf(row[sessionNameIndex]) !== -1 &&
        parseISO(row[sessionDateIndex]).getTime() <= endDate.getTime()
      );
    })
    .map((row) => row[sessionNameIndex]);

  return doneSessions.length >= value;
};

module.exports.hasCompletedWithin = (
  allSessions,
  participantIndex,
  sessionNameIndex,
  sessionDateIndex,
  participant,
  startDate,
  endDate,
  sessions,
  value
) => {
  const doneSessions = allSessions
    .filter((row) => {
      return (
        row[participantIndex] === participant &&
        sessions.indexOf(row[sessionNameIndex]) !== -1 &&
        isWithinInterval(parseISO(row[sessionDateIndex]), {
          start: startDate,
          end: endDate,
        })
      );
    })
    .map((row) => row[sessionNameIndex]);

  return doneSessions.length >= value;
};

module.exports.hasCompletedAtLeast1 = (
  allSessions,
  participantIndex,
  sessionNameIndex,
  sessionDateIndex,
  participant,
  endDate,
  sessions,
  value
) => {
  const doneSessions = allSessions
    .filter((row) => {
      return (
        row[participantIndex] === participant &&
        sessions.indexOf(row[sessionNameIndex]) !== -1 &&
        parseISO(row[sessionDateIndex]).getTime() <= endDate.getTime()
      );
    })
    .map((row) => row[sessionNameIndex]);

  return doneSessions.length >= 1;
};
module.exports.isAtSchool = (age, homeVisitValue, enrollmentValue) => {
  if (age >= 6 && age <= 17) {
    if (homeVisitValue) {
      return homeVisitValue;
    }

    if (enrollmentValue === "Yes") {
      return "No";
    }
    if (enrollmentValue === "No") {
      return "Yes";
    }
  } else if (enrollmentValue) {
    if (enrollmentValue === "Yes") {
      return "No";
    }
    if (enrollmentValue === "No") {
      return "Yes";
    }
  }
  return "NA";
};

module.exports.mostCurrentEvent = (events) => {
  return maxBy(events, "eventDate");
};

module.exports.eventsBeforePeriod = (events, programStage, end) => {
  return events.filter((e) => {
    return (
      e.programStage === programStage && isBefore(parseISO(e.eventDate), end)
    );
  });
};

module.exports.eventsWithinPeriod = (events, programStage, start, end) => {
  return events.filter((e) => {
    return (
      e.eventDate &&
      e.programStage === programStage &&
      isWithinInterval(parseISO(e.eventDate), { start, end })
    );
  });
};

module.exports.findAnyEventValue = (events, dataElement) => {
  const sortedEvents = sortBy(events, (e) => e.eventDate).reverse();
  const event = sortedEvents.find(
    ({ [dataElement]: de }) => de !== null && de !== undefined
  );
  if (event) {
    return event[dataElement];
  }
  return null;
};

module.exports.allValues4DataElement = (events, dataElement, value) => {
  if (events.length > 0) {
    return events.every((e) => e[dataElement] === value);
  }

  return true;
};

module.exports.anyEventWithDataElement = (events, dataElement, value) => {
  if (events.length === 0) {
    return false;
  }
  const processed = events.find((event) => {
    return event[dataElement] === value;
  });
  return !!processed;
};
module.exports.anyEventWithDE = (events, dataElement) => {
  if (events.length === 0) {
    return false;
  }
  const processed = events.find((event) => {
    return has(event, dataElement);
  });
  return !!processed;
};

module.exports.anyEventWithAnyOfTheValue = (events, dataElement, values) => {
  const processed = events.find((event) => {
    return values.indexOf(event[dataElement]) !== -1;
  });
  if (processed) {
    return true;
  }
  return false;
};

module.exports.specificDataElement = (event, dataElement) => {
  if (event) {
    return event[dataElement];
  }
  return null;
};

module.exports.hasAYes = (event, dataElements) => {
  if (event) {
    const de = dataElements.map((de) => !!event[de]);
    return de.includes(true);
  }
  return false;
};

module.exports.allHaveValue = (event, dataElements, value) => {
  if (event) {
    const de = dataElements
      .map((de) => event[de])
      .filter((v) => v !== undefined);
    const result =
      every(de, (v) => v === value) && de.length === dataElements.length;
    return result;
  }
  return false;
};

module.exports.checkRiskAssessment = (event, dataElements, value) => {
  if (event) {
    const de = dataElements
      .map((de) => event[de])
      .filter((v) => v !== undefined);
    if (de.length === 0) {
      return 0;
    }
    if (de.length < dataElements.length) {
      if (value && every(de, (v) => v === value)) {
        return 3;
      } else if (value && de.indexOf(value) !== -1) {
        return 2;
      }
      return 1;
    }
    if (de.length === dataElements.length) {
      if (value && every(de, (v) => v === value)) {
        return 6;
      } else if (value && de.indexOf(value) !== -1) {
        return 5;
      }
      return 4;
    }
  }
  return -1;
};

module.exports.hasDataElementWithinPeriod = (events, dataElement, value) => {
  return !!events.find((e) => e[dataElement] === value);
};

module.exports.deHasAnyValue = (de, values) => {
  if (de && values.indexOf(de) !== -1) {
    return 1;
  }
  return 0;
};

module.exports.useLoader = async () => {
  const query = [
    {
      resource: "optionGroups/HkuYbbefaEM",
      params: {
        fields: "options[code]",
      },
    },
    {
      resource: "optionGroups/P4tTIlhX1yB",
      params: {
        fields: "options[code]",
      },
    },
    {
      resource: "optionGroups/WuPXlmvSfVJ",
      params: {
        fields: "options[code]",
      },
    },
    {
      resource: "optionGroups/TIObJloCVdC",
      params: {
        fields: "options[code]",
      },
    },
    {
      resource: "optionGroups/okgcyLQNVFe",
      params: {
        fields: "options[code]",
      },
    },
    {
      resource: "optionGroups/XQ3eQax0uIk",
      params: {
        fields: "options[code]",
      },
    },
    {
      resource: "optionGroups/qEium1Lrsc0",
      params: {
        fields: "options[code]",
      },
    },
    {
      resource: "optionGroups/LUR9gZUkcrr",
      params: {
        fields: "options[code]",
      },
    },
    {
      resource: "optionGroups/EYMKGdEeniO",
      params: {
        fields: "options[code]",
      },
    },
    {
      resource: "optionGroups/gmEcQwHbivM",
      params: {
        fields: "options[code]",
      },
    },
    {
      resource: "optionGroups/ptI9Geufl7R",
      params: {
        fields: "options[code]",
      },
    },
    {
      resource: "optionGroups/QHaULS891IF",
      params: {
        fields: "options[code]",
      },
    },
    {
      resource: "optionGroups/ZOAmd05j2t9",
      params: {
        fields: "options[code]",
      },
    },
  ];

  const [
    {
      data: { options },
    },
    {
      data: { options: options1 },
    },
    {
      data: { options: options2 },
    },
    {
      data: { options: options12 },
    },
    {
      data: { options: options3 },
    },
    {
      data: { options: options4 },
    },
    {
      data: { options: options5 },
    },
    {
      data: { options: options6 },
    },
    {
      data: { options: options7 },
    },
    {
      data: { options: options8 },
    },
    {
      data: { options: options9 },
    },
    {
      data: { options: options10 },
    },
    {
      data: { options: options11 },
    },
  ] = await Promise.all(
    query.map((q) =>
      this.instance.get(q.resource, {
        params: q.params,
      })
    )
  );
  return {
    sessions: {
      "MOE Journeys Plus": options.map((o) => o.code),
      "MOH Journeys curriculum": options1.map((o) => o.code),
      "No means No sessions (Boys)": options2.map((o) => o.code),
      "No means No sessions (Boys) New Curriculum": options12.map(
        (o) => o.code
      ),
      "No means No sessions (Girls)": options3.map((o) => o.code),
      "VSLA Methodology": options4.map((o) => o.code),
      "VSLA TOT": options5.map((o) => o.code),
      "Financial Literacy": options6.map((o) => o.code),
      "SPM Training": options7.map((o) => o.code),
      "Bank Linkages": options8.map((o) => o.code),
      SINOVUYO: options9.map((o) => o.code),
      ECD: options10.map((o) => o.code),
      "Saving and Borrowing": options11.map((o) => o.code),
    },
  };
};

module.exports.fetchUnits4Instances = async (trackedEntityInstances) => {
  const orgUnitColumnIndex = trackedEntityInstances.columns.findIndex(
    (c) => c.name === "orgUnit"
  );
  const orgUnits = uniq(
    trackedEntityInstances.rows.map((row) => row[orgUnitColumnIndex])
  );
  const {
    data: { organisationUnits },
  } = await this.instance.get("organisationUnits.json", {
    params: {
      filter: `id:in:[${orgUnits.join(",")}]`,
      fields: "id,name,parent[name,parent[name]]",
      paging: "false",
    },
  });
  return fromPairs(
    organisationUnits.map((unit) => {
      return [
        unit.id,
        {
          subCounty: unit.parent?.name,
          district: unit.parent?.parent?.name,
          ou: unit.name,
        },
      ];
    })
  );
};

module.exports.fetchRelationships4Instances = async (
  trackedEntityInstances
) => {
  const relationIndex = trackedEntityInstances.columns.findIndex(
    (c) => c.name === "hly709n51z0"
  );

  const allInstances = uniq(
    trackedEntityInstances.rows.map((row) => row[relationIndex])
  );
  const data = await this.fetchAll({
    query: `select trackedEntityInstance,eventDate,jiuPVqetSaV,Xkwy5P2JG24,enrollmentDate,zbAGBW6PsGd,kQCB9F39zWO,iRJUDyUBLQF from ${String(
      "HEWq6yr4cs5"
    ).toLowerCase()}`,
    filter: {
      terms: {
        ["trackedEntityInstance.keyword"]: allInstances,
      },
    },
  });
  return groupBy(data, "trackedEntityInstance");
};

module.exports.fetchGroupActivities4Instances = async (
  trackedEntityInstances
) => {
  const memberCodeColumnIndex = trackedEntityInstances.columns.findIndex(
    (c) => c.name === "HLKc2AKR9jW"
  );
  const allMemberCodes = uniq(
    trackedEntityInstances.rows.map((row) => row[memberCodeColumnIndex])
  );
  const data = await this.fetchAll({
    query: `select n20LkH4ZBF8,ypDUCAS6juy,eventDate from ${String(
      "IXxHJADVCkb"
    ).toLowerCase()}`,
    filter: {
      bool: {
        must: [
          {
            terms: {
              ["ypDUCAS6juy.keyword"]: allMemberCodes,
            },
          },
          {
            term: {
              ["programStage.keyword"]: "VzkQBBglj3O",
            },
          },
        ],
      },
    },
  });
  return groupBy(data, "ypDUCAS6juy");
};

module.exports.processPrevention = async (
  trackedEntityInstances,
  sessions,
  period
) => {
  const orgUnits = uniq(trackedEntityInstances.map(({ orgUnit }) => orgUnit));

  const {
    data: { organisationUnits: ous },
  } = await this.instance.get("organisationUnits.json", {
    params: {
      filter: `id:in:[${orgUnits.join(",")}]`,
      fields: "id,parent[name,parent[name]]",
      paging: "false",
    },
  });

  const processedUnits = fromPairs(
    ous.map((unit) => {
      return [
        unit.id,
        {
          subCounty: unit.parent?.name,
          district: unit.parent?.parent?.name,
        },
      ];
    })
  );

  return trackedEntityInstances.flatMap(
    ({ attributes, enrollments, orgUnit }) => {
      const units = processedUnits[orgUnit];
      const [{ events, enrollmentDate, orgUnitName }] = enrollments;
      const instance = fromPairs(attributes.map((a) => [a.attribute, a.value]));
      const doneSessions = events
        .filter((event) => {
          return (
            event.eventDate &&
            event.programStage === "VzkQBBglj3O" &&
            isWithinInterval(new Date(event.eventDate), {
              start: period[0],
              end: period[1],
            })
          );
        })
        .map(({ dataValues }) => {
          const code = dataValues.find(
            ({ dataElement }) => dataElement === "ypDUCAS6juy"
          );
          const session = dataValues.find(
            ({ dataElement }) => dataElement === "n20LkH4ZBF8"
          );
          return { session: session?.value, code: code?.value };
        });

      const subType = instance?.["mWyp85xIzXR"];
      const allSubTypes = String(subType).split(",");
      const completed = this.mapping[subType];
      const groupedSessions = groupBy(doneSessions, "code");
      return events
        .filter((event) => event.programStage === "aTZwDRoJnxj")
        .map((event) => {
          const elements = fromPairs(
            event.dataValues.map((dv) => [dv.dataElement, dv.value])
          );
          const individualCode = elements.ypDUCAS6juy;
          const participantSessions = groupedSessions[individualCode]?.filter(
            (i) => {
              return sessions[allSubTypes[0]].indexOf(i.session) !== -1;
            }
          );
          const sess = fromPairs(
            participantSessions?.map(({ session }) => [session, 1])
          );
          return {
            event: event.event,
            ...elements,
            ...instance,
            ...sess,
            ...units,
            parish: orgUnitName,
            enrollmentDate,
            [subType]: participantSessions?.length,
            [completed]:
              participantSessions?.length >= this.mapping2[subType] ? 1 : 0,
            completedPrevention:
              participantSessions?.length >= this.mapping2[subType] ? 1 : 0,
          };
        });
    }
  );
};

module.exports.processInstances = async (
  trackedEntityInstances,
  periods,
  sessions,
  indexCases,
  processedUnits,
  groupActivities
) => {
  let layering = [];
  const { columns, rows } = trackedEntityInstances;
  const instances = rows.map((r) => {
    return fromPairs(columns.map((c, i) => [c.name, r[i]]));
  });

  // const { data: allEvents } = await this.api.post("wal/search", {
  //   index: String("RDEklSXCD4C").toLowerCase(),
  // size: 10000,
  //   query: {
  //     terms: {
  //       ["trackedEntityInstance.keyword"]: instances.map(
  //         (i) => i.trackedEntityInstance
  //       ),
  //     },
  //   },
  // });

  const data = await this.fetchAll({
    query: `select * from ${String("RDEklSXCD4C").toLowerCase()}`,
    field_multi_value_leniency: true,
    filter: {
      bool: {
        must: [
          {
            terms: {
              ["trackedEntityInstance.keyword"]: instances.map(
                (i) => i.trackedEntityInstance
              ),
            },
          },
        ],
      },
    },
  });
  console.log(data);
  for (const instance of instances) {
    const { enrollmentDate, orgUnit, hly709n51z0, trackedEntityInstance } =
      instance;
    const units = processedUnits[orgUnit];
    const availableIndexCases = sortBy(
      indexCases[hly709n51z0],
      (e) => e.eventDate
    ).reverse();

    let indexCase = null;
    if (availableIndexCases.length > 0) {
      indexCase = availableIndexCases[0];
    }
    let houseHoldType = "";
    if (indexCase) {
      const score18 = [
        indexCase.zbAGBW6PsGd,
        indexCase.kQCB9F39zWO,
        indexCase.iRJUDyUBLQF,
      ].filter((v) => v !== undefined && v !== null);

      const yeses = score18.filter((v) => v === "Yes").length;
      const noses = score18.filter((v) => v === "No").length;

      if (score18.length === 3) {
        if (noses === 3) {
          houseHoldType = "Destitute";
        } else if (yeses === 3) {
          houseHoldType = "Ready to Grow";
        } else if (noses >= 1) {
          houseHoldType = "Struggling";
        }
      }
    }
    for (const period of periods) {
      const quarterStart = period.startOf("quarter").toDate();
      const quarterEnd = period.endOf("quarter").toDate();
      const [financialQuarterStart, financialQuarterEnd] =
        this.calculateQuarter(quarterStart.getFullYear(), period.quarter());
      const qtr = period.format("YYYY[Q]Q");
      let layer = { ...units, qtr, ...instance, houseHoldType };
      const isWithin = isWithinInterval(parseISO(enrollmentDate), {
        start: quarterStart,
        end: quarterEnd,
      });
      layer.newlyEnrolled = isWithin ? "Yes" : "No";
      layering.push(layer);
    }
  }

  // console.log(layering);
};

module.exports.useProgramStage = async (
  organisationUnits,
  period,
  sessions,
  page,
  pageSize
) => {
  if (organisationUnits.length > 0) {
    const {
      data: { trackedEntityInstances, pager },
    } = await this.instance.get("trackedEntityInstances.json", {
      params: {
        fields: "*",
        ou: organisationUnits.join(";"),
        ouMode: "DESCENDANTS",
        filter: `mWyp85xIzXR:IN:${[
          "MOE Journeys Plus",
          "MOH Journeys curriculum",
          "No means No sessions (Boys)",
          "No means No sessions (Girls)",
          "No means No sessions (Boys) New Curriculum",
        ].join(";")}`,
        page,
        pageSize,
        program: "IXxHJADVCkb",
        totalPages: true,
      },
    });
    const { total } = pager;
    changeTotal(total);
    return await this.processPrevention(
      engine,
      trackedEntityInstances,
      sessions,
      period
    );
  }
};

module.exports.generate = async (trackedEntityInstances, periods, sessions) => {
  const processedUnits = await this.fetchUnits4Instances(
    trackedEntityInstances
  );
  const indexCases = await this.fetchRelationships4Instances(
    trackedEntityInstances
  );
  const groupActivities = await this.fetchGroupActivities4Instances(
    trackedEntityInstances
  );

  const processed = this.processInstances(
    trackedEntityInstances,
    periods,
    sessions,
    indexCases,
    processedUnits,
    groupActivities
  );
};
module.exports.useTracker = async (
  periods = [moment()],
  program = "RDEklSXCD4C"
) => {
  const { data } = await this.api.post("wal/sql", {
    query: `select * from "rdeklsxcd4c-attributes" order by hly709n51z0`,
  });
  const { sessions } = await this.useLoader();
  const { columns, rows, cursor: currentCursor } = data;
  this.generate({ rows, columns }, periods, sessions);
  // if (currentCursor) {
  //   do {
  //     const {
  //       data: { rows, cursor },
  //     } = await this.api.post("wal/sql", { cursor: currentCursor });
  //     this.generate({ rows, columns }, program, periods, sessions);
  //     currentCursor = cursor;
  //   } while (!!currentCursor);
  // }
};

module.exports.flattenInstances = async (
  trackedEntityInstances,
  program,
  chunkSize
) => {
  let instances = [];
  const data = trackedEntityInstances.flatMap(
    ({
      trackedEntityInstance,
      orgUnit,
      attributes,
      enrollments,
      inactive,
      deleted,
      relationships,
    }) => {
      const processedAttributes = fromPairs(
        attributes.map(({ attribute, value }) => [attribute, value])
      );
      const allRelations = fromPairs(
        relationships.map((rel) => {
          return [
            rel.relationshipType,
            rel.from.trackedEntityInstance.trackedEntityInstance,
          ];
        })
      );
      if (enrollments.length > 0) {
        return enrollments.flatMap(
          ({ events, program, orgUnitName, enrollmentDate, incidentDate }) => {
            const instance = {
              trackedEntityInstance,
              id: trackedEntityInstance,
              orgUnit,
              ...processedAttributes,
              ...allRelations,
              inactive,
              deleted,
              enrollmentDate,
              incidentDate,
              orgUnitName,
              program,
            };
            instances.push(instance);
            if (events.length > 0) {
              return events.flatMap(
                ({
                  dataValues,
                  dueDate,
                  eventDate,
                  trackedEntityType,
                  event,
                  relationships,
                  attributes,
                  geometry,
                  notes,
                  ...eventDetails
                }) => {
                  return {
                    id: event,
                    orgUnitName,
                    enrollmentDate,
                    incidentDate,
                    dueDate,
                    eventDate,
                    event,
                    ...fromPairs(
                      dataValues.map(({ dataElement, value }) => [
                        dataElement,
                        value,
                      ])
                    ),
                    ...eventDetails,
                  };
                }
              );
            } else {
              return [];
            }
          }
        );
      } else {
        return [];
      }
    }
  );
  const foundEvents = groupBy(data, "programStage");
  try {
    const requests = Object.entries(foundEvents).flatMap(([stage, events]) => {
      return chunk(events, chunkSize).map((c) => {
        return this.api.post(`wal/index?index=${stage.toLowerCase()}`, {
          data: c,
        });
      });
    });
    const inserted = await Promise.all(
      requests.concat(
        chunk(instances, chunkSize).map((c) => {
          return this.api.post(`wal/index?index=${program.toLowerCase()}`, {
            data: c,
          });
        })
      )
    );
    const total = sum(inserted.map(({ data: { items } }) => items.length));
    console.log(total);
  } catch (error) {
    console.log(error.message);
  }
};

module.exports.flattenInstancesToAttributes = async (
  trackedEntityInstances,
  program,
  chunkSize
) => {
  const data = trackedEntityInstances.map(
    ({
      trackedEntityInstance,
      orgUnit,
      attributes,
      enrollments,
      inactive,
      deleted,
      relationships,
    }) => {
      const allRelations = fromPairs(
        relationships.map((rel) => {
          return [
            rel.relationshipType,
            rel.from.trackedEntityInstance.trackedEntityInstance,
          ];
        })
      );
      const [{ enrollmentDate }] = enrollments;
      const processedAttributes = fromPairs(
        attributes.map(({ attribute, value }) => [attribute, value])
      );
      return {
        trackedEntityInstance,
        id: trackedEntityInstance,
        orgUnit,
        ...processedAttributes,
        ...allRelations,
        inactive,
        deleted,
        enrollmentDate,
      };
    }
  );
  try {
    const inserted = await Promise.all(
      chunk(data, chunkSize).map((c) => {
        return this.api.post(
          `wal/index?index=${String(program).toLowerCase()}-attributes`,
          {
            data: c,
          }
        );
      })
    );
    const total = sum(inserted.map(({ data: { items } }) => items.length));
    console.log(total);
  } catch (error) {
    console.log(error.message);
  }
};

module.exports.processTrackedEntityInstances = async (
  program,
  pageSize,
  chunkSize
) => {
  let params = {
    fields: "*",
    ouMode: "ALL",
    program,
    totalPages: true,
    pageSize,
    page: 1,
  };
  console.log(`Working on page 1`);
  const {
    data: {
      trackedEntityInstances,
      pager: { pageCount },
    },
  } = await this.instance.get("trackedEntityInstances.json", { params });

  await this.flattenInstances(trackedEntityInstances, program, chunkSize);
  for (let page = 2; page <= pageCount; page++) {
    console.log(`Working on page ${page} of ${pageCount}`);
    const {
      data: { trackedEntityInstances },
    } = await this.instance.get("trackedEntityInstances.json", {
      params: { ...params, page },
    });
    await this.flattenInstances(trackedEntityInstances, program, chunkSize);
  }
};

module.exports.processTrackedEntityInstancesAttributes = async (
  program,
  pageSize,
  chunkSize
) => {
  let params = {
    fields:
      "trackedEntityInstance,relationships,orgUnit,inactive,deleted,attributes,enrollments[enrollmentDate]",
    ouMode: "ALL",
    program,
    totalPages: true,
    pageSize,
    page: 1,
  };
  console.log(`Working on page 1`);
  const {
    data: {
      trackedEntityInstances,
      pager: { pageCount },
    },
  } = await this.instance.get("trackedEntityInstances.json", { params });

  await this.flattenInstancesToAttributes(
    trackedEntityInstances,
    program,
    chunkSize
  );
  if (pageCount > 1) {
    for (let page = 2; page <= pageCount; page++) {
      console.log(`Working on page ${page} of ${pageCount}`);
      const {
        data: { trackedEntityInstances },
      } = await this.instance.get("trackedEntityInstances.json", {
        params: { ...params, page },
      });
      await this.flattenInstancesToAttributes(
        trackedEntityInstances,
        program,
        chunkSize
      );
    }
  }
};
