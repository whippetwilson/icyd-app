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

module.exports.instance = axios.create({
  baseURL: process.env.ICYD_BASE_URL,
  auth: {
    username: process.env.ICYD_USERNAME,
    password: process.env.ICYD_PASSWORD,
  },
});

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
  const orgUnits = uniq(trackedEntityInstances.map(({ orgUnit }) => orgUnit));
  const {
    data: { organisationUnits },
  } = await this.instance.get("organisationUnits.json", {
    params: {
      filter: `id:in:[${orgUnits.join(",")}]`,
      fields: "id,parent[name,parent[name]]",
      paging: "false",
    },
  });
  return fromPairs(
    organisationUnits.map((unit) => {
      return [
        unit.id,
        { subCounty: unit.parent?.name, district: unit.parent?.parent?.name },
      ];
    })
  );
};

module.exports.fetchRelationships4Instances = async (
  trackedEntityInstances,
  ou
) => {
  const currentData = trackedEntityInstances.map(
    ({ relationships: [relationship] }) => {
      if (relationship) {
        return relationship?.from?.trackedEntityInstance.trackedEntityInstance;
      }
    }
  );
  const {
    data: { trackedEntityInstances: indexCases },
  } = await this.instance.get("trackedEntityInstances", {
    params: {
      fields:
        "trackedEntityInstance,attributes,enrollments[enrollmentDate,program,events[eventDate,programStage]]",
      ou,
      ouMode: "DESCENDANTS",
      program: "HEWq6yr4cs5",
      trackedEntityInstance: uniq(currentData).join(";"),
      skipPaging: "true",
    },
  });
  return fromPairs(
    indexCases.map((indexCase) => {
      return [indexCase.trackedEntityInstance, indexCase];
    })
  );
};

module.exports.fetchGroupActivities4Instances = async (
  trackedEntityInstances
) => {
  const householdMemberCodes = trackedEntityInstances.flatMap(
    ({ attributes }) => {
      const attribute = attributes.find((a) => a.attribute === "HLKc2AKR9jW");
      if (attribute) {
        return [attribute.value];
      }
      return [];
    }
  );

  const {
    data: { headers, rows },
  } = await this.instance.get("events/query.json", {
    params: {
      ouMode: "ALL",
      programStage: "VzkQBBglj3O",
      skipPaging: "true",
      filter: `ypDUCAS6juy:IN:${householdMemberCodes.join(";")}`,
    },
  });

  const sessionNameIndex = headers.findIndex(
    (header) => header.name === "n20LkH4ZBF8"
  );
  const participantIndex = headers.findIndex(
    (header) => header.name === "ypDUCAS6juy"
  );
  const sessionDateIndex = headers.findIndex(
    (header) => header.name === "eventDate"
  );

  return { rows, sessionNameIndex, participantIndex, sessionDateIndex };
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

module.exports.processInstances = (
  program,
  trackedEntityInstances,
  periods,
  sessions,
  indexCases,
  processedUnits,
  groupActivities,
  previousData
) => {
  const { rows, sessionNameIndex, participantIndex, sessionDateIndex } =
    groupActivities;

  return periods.flatMap((period) => {
    const quarterStart = period.startOf("quarter").toDate();
    const quarterEnd = period.endOf("quarter").toDate();
    const [financialQuarterStart, financialQuarterEnd] = this.calculateQuarter(
      quarterStart.getFullYear(),
      period.quarter()
    );
    const qtr = period.format("YYYY[Q]Q");
    return trackedEntityInstances.map(
      ({
        orgUnit,
        attributes,
        trackedEntityInstance,
        relationships: [relationship],
        enrollments,
      }) => {
        const units = processedUnits[orgUnit];
        const [{ trackedEntityInstance: eventInstance, orgUnitName }] =
          enrollments;
        const [enrollmentDate] = enrollments
          .map((e) => e.enrollmentDate)
          .sort();
        const allEvents = enrollments.flatMap(({ events }) => {
          return events
            .filter(({ deleted }) => deleted === false)
            .map(({ dataValues, event, eventDate, programStage }) => {
              return {
                event,
                eventDate,
                trackedEntityInstance: eventInstance,
                programStage,
                ...fromPairs(
                  dataValues.map(({ dataElement, value }) => [
                    dataElement,
                    value,
                  ])
                ),
              };
            });
        });
        const parent =
          indexCases[
            relationship?.from?.trackedEntityInstance.trackedEntityInstance
          ];

        let child = fromPairs(
          attributes.map(({ attribute, value }) => [
            `${program}_${attribute}`,
            value,
          ])
        );
        child = {
          qtr,
          trackedEntityInstance,
          id: `${trackedEntityInstance}${qtr}`,
          [`${program}_orgUnit`]: orgUnit,
          [`${program}_orgUnitName`]: orgUnitName,
          [`${program}_enrollmentDate`]: enrollmentDate,
          [`${program}_type`]: "Comprehensive",
          ...units,
          ...child,
        };
        if (parent) {
          const {
            enrollments: [
              {
                enrollmentDate,
                program: parentProgram,
                events: [event],
              },
            ],
          } = parent;
          let eventDetails = {
            [`${parentProgram}_enrollmentDate`]: enrollmentDate,
          };
          if (event) {
            const { programStage: parentProgramStage, eventDate } = event;
            eventDetails = {
              ...eventDetails,
              [`${parentProgram}_${parentProgramStage}_eventDate`]: eventDate,
            };
          }
          child = {
            ...child,
            ...fromPairs(
              parent.attributes.map(({ attribute, value }) => [
                `${parentProgram}_${attribute}`,
                value,
              ])
            ),
            hasEnrollment: !!enrollmentDate,
            ...eventDetails,
          };
        }

        const isWithin = isWithinInterval(parseISO(enrollmentDate), {
          start: quarterStart,
          end: quarterEnd,
        });
        // One Year before quarter end starting octerber
        const riskAssessmentsDuringYear = this.eventsWithinPeriod(
          allEvents,
          "B9EI27lmQrZ",
          financialQuarterStart,
          financialQuarterEnd
        );
        const referralsDuringYear = this.eventsWithinPeriod(
          allEvents,
          "yz3zh5IFEZm",
          financialQuarterStart,
          financialQuarterEnd
        );

        // During Quarter

        const referralsDuringQuarter = this.eventsWithinPeriod(
          allEvents,
          "yz3zh5IFEZm",
          quarterStart,
          quarterEnd
        );

        const homeVisitsDuringQuarter = this.eventsWithinPeriod(
          allEvents,
          "HaaSLv2ur0l",
          quarterStart,
          quarterEnd
        );
        const viralLoadDuringQuarter = this.eventsWithinPeriod(
          allEvents,
          "kKlAyGUnCML",
          quarterStart,
          quarterEnd
        );

        const serviceProvisionDuringQuarter = this.eventsWithinPeriod(
          allEvents,
          "yz3zh5IFEZm",
          quarterStart,
          quarterEnd
        );
        const serviceLinkagesDuringQuarter = this.eventsWithinPeriod(
          allEvents,
          "SxnXrDtSJZp",
          quarterStart,
          quarterEnd
        );

        // Before or during quarter starts

        const previousReferrals = this.eventsBeforePeriod(
          allEvents,
          "yz3zh5IFEZm",
          quarterStart
        );

        const previousViralLoads = this.eventsBeforePeriod(
          allEvents,
          "yz3zh5IFEZm",
          quarterStart
        );

        const homeVisitsBe4Quarter = this.eventsBeforePeriod(
          allEvents,
          "HaaSLv2ur0l",
          quarterEnd
        );
        const viralLoadsBe4Quarter = this.eventsBeforePeriod(
          allEvents,
          "kKlAyGUnCML",
          quarterEnd
        );

        const currentRiskAssessment = this.mostCurrentEvent(
          riskAssessmentsDuringYear
        );
        const currentReferral = this.mostCurrentEvent(referralsDuringYear);
        const anyViralLoad = this.mostCurrentEvent(viralLoadsBe4Quarter);
        const hivResult = this.specificDataElement(
          currentReferral,
          "XTdRWh5MqPw"
        );

        child = {
          ...child,
          ["RDEklSXCD4C_HaaSLv2ur0l_tM67MBdox3O"]: child[
            "RDEklSXCD4C_HaaSLv2ur0l_tM67MBdox3O"
          ]
            ? 1
            : 0,
          newlyEnrolled: isWithin ? "Yes" : "No",
        };

        if (viralLoadsBe4Quarter.length > 0) {
          child = {
            ...child,
            hivStatus: "+",
          };
        } else if (hivResult) {
          child = {
            ...child,
            hivStatus:
              hivResult === "Positive"
                ? "+"
                : hivResult === "Negative"
                ? "-"
                : "",
          };
        } else {
          child = {
            ...child,
            hivStatus:
              child["RDEklSXCD4C_HzUL8LTDPga"] === "Positive"
                ? "+"
                : child["RDEklSXCD4C_HzUL8LTDPga"] === "Negative"
                ? "-"
                : child["RDEklSXCD4C_HzUL8LTDPga"] === "Dont Know (DK)"
                ? "DK"
                : "",
          };
        }

        const isNotAtRiskAdult = this.checkRiskAssessment(
          currentRiskAssessment,
          [
            "WwMOTHl2cOz",
            "uf6tkJtuWpt",
            "zpvSpZxMYIV",
            "O6O0ADYLwua",
            "VOCmw7bULXR",
            "FHu4YfcrIQw",
            "Dny6B3ubQEa",
            "h7JCV3YLRJO",
            "VtnameiqmRy",
          ],
          "false"
        );

        const tbScreeningChild = this.checkRiskAssessment(
          currentRiskAssessment,
          ["DgCXKSDPTWn", "Rs5qrKay7Gq", "QEm2B8LZtzd", "X9n17I5Ibdf"]
        );
        const tbScreeningChild17 = this.checkRiskAssessment(
          currentRiskAssessment,
          [
            "DgCXKSDPTWn",
            "Rs5qrKay7Gq",
            "QEm2B8LZtzd",
            "X9n17I5Ibdf",
            "Oi6CUuucUCP",
          ]
        );
        const tbScreeningAdult = this.checkRiskAssessment(
          currentRiskAssessment,
          ["If8hDeux5XE", "ha2nnIeFgbu", "NMtrXN3NBqY", "Oi6CUuucUCP"]
        );

        const atTBRiskChild = this.checkRiskAssessment(
          currentRiskAssessment,
          ["DgCXKSDPTWn", "Rs5qrKay7Gq", "QEm2B8LZtzd", "X9n17I5Ibdf"],
          "true"
        );
        const atTBRiskChild17 = this.checkRiskAssessment(
          currentRiskAssessment,
          [
            "DgCXKSDPTWn",
            "Rs5qrKay7Gq",
            "QEm2B8LZtzd",
            "X9n17I5Ibdf",
            "Oi6CUuucUCP",
          ],
          "true"
        );
        const atTBRiskAdult = this.checkRiskAssessment(
          currentRiskAssessment,
          ["If8hDeux5XE", "ha2nnIeFgbu", "NMtrXN3NBqY", "Oi6CUuucUCP"],
          "true"
        );

        const isNotAtRisk = this.checkRiskAssessment(
          currentRiskAssessment,
          [
            "WlTMjkcP6gv",
            "Y8kX45XGXXI",
            "NN0M618qUFX",
            "MH5BGP1Ww2Q",
            "p3FSiLQ1q6T",
            "x1bL4w5EsPL",
            "dunvFwnbGQF",
            "oI9btGSwA7P",
          ],
          "false"
        );
        const serviceProvided = this.specificDataElement(
          currentReferral,
          "XWudTD2LTUQ"
        );
        const unknownOther = this.findAnyEventValue(
          riskAssessmentsDuringYear,
          "cTV8aMqnVbe"
        );

        child = {
          ...child,
          linked: this.deHasAnyValue(serviceProvided, [
            "Started HIV treatment",
            "PEP",
            "HCT/ Tested for HIV",
            "Intensive Adherence Counseling (IAC)",
            "Viral Load Testing",
            "Provided with ARVs",
          ]),
        };

        if (serviceProvided === "HCT/ Tested for HIV") {
          child = { ...child, testedForHIV: 1 };
        } else {
          child = { ...child, testedForHIV: 0 };
        }

        if (child["RDEklSXCD4C_nDUbdM2FjyP"] === "Primary caregiver") {
          child = { ...child, primaryCareGiver: "1" };
        } else {
          child = { ...child, primaryCareGiver: 0 };
        }
        const ageGroup = child["RDEklSXCD4C_N1nMqKtYKvI"];
        const hVatDate = child["HEWq6yr4cs5_enrollmentDate"];
        const age = differenceInYears(quarterEnd, parseISO(ageGroup));
        if (ageGroup && ageGroup.length === 10) {
          child = {
            ...child,
            [`RDEklSXCD4C_ageGroup`]: this.findAgeGroup(age),
          };
        }
        if (ageGroup && ageGroup.length === 10) {
          child = { ...child, [`RDEklSXCD4C_age`]: Number(age).toString() };
        }
        if (
          isWithinInterval(parseISO(hVatDate), {
            start: quarterStart,
            end: quarterEnd,
          })
        ) {
          child = { ...child, [`HEWq6yr4cs5_jiuPVqetSaV`]: 1 };
        } else {
          child = { ...child, [`HEWq6yr4cs5_jiuPVqetSaV`]: 0 };
        }
        if (
          child["hivStatus"] &&
          child["hivStatus"] !== "+" &&
          riskAssessmentsDuringYear.length > 0
        ) {
          child = { ...child, [`RDEklSXCD4C_B9EI27lmQrZ_vBqh2aiuHOV`]: 1 };
        } else {
          child = { ...child, [`RDEklSXCD4C_B9EI27lmQrZ_vBqh2aiuHOV`]: 0 };
        }

        if (serviceProvided && serviceProvided === "HCT/ Tested for HIV") {
          child = { ...child, OVC_TST_REFER: 1 };
        } else {
          child = { ...child, OVC_TST_REFER: 0 };
        }
        if (hivResult && child.OVC_TST_REFER === 1) {
          child = { ...child, OVC_TST_REPORT: 1 };
        } else {
          child = { ...child, OVC_TST_REPORT: 0 };
        }

        if (child.hivStatus === "+" && age < 18) {
          child = {
            ...child,
            riskFactor: "CLHIV",
          };
        } else {
          child = {
            ...child,
            riskFactor:
              this.findAnyEventValue(homeVisitsBe4Quarter, "rQBaynepqjy") ||
              child[`RDEklSXCD4C_nDUbdM2FjyP`],
          };
        }

        child = {
          ...child,
          memberStatus:
            this.findAnyEventValue(homeVisitsBe4Quarter, "tM67MBdox3O") ===
            "true"
              ? "Active"
              : this.findAnyEventValue(homeVisitsBe4Quarter, "VEw6HHnx8mR")
              ? this.findAnyEventValue(homeVisitsBe4Quarter, "VEw6HHnx8mR")
              : "No Home Visit",
        };
        child = {
          ...child,
          householdStatus: !!this.findAnyEventValue(
            homeVisitsBe4Quarter,
            "PpUByWk3p8N"
          )
            ? this.findAnyEventValue(homeVisitsBe4Quarter, "PpUByWk3p8N")
            : child["hasEnrollment"]
            ? "Active"
            : "Not Enrolled",
        };
        child = {
          ...child,
          enrolledInSchool: this.isAtSchool(
            age,
            "",
            child["RDEklSXCD4C_h4pXErY01YR"]
          ),
        };

        const homeVisitor = this.findAnyEventValue(
          homeVisitsBe4Quarter,
          "i6XGAmzx3Ri"
        );
        const dataEntrant = this.findAnyEventValue(
          homeVisitsDuringQuarter,
          "YY5zG4Bh898"
        );
        const dataEntrant1 = child["HEWq6yr4cs5_Xkwy5P2JG24"];

        const dataEntrant2 = this.findAnyEventValue(
          viralLoadDuringQuarter,
          "YY5zG4Bh898"
        );
        const homeVisitorContact = this.findAnyEventValue(
          homeVisitsBe4Quarter,
          "BMzryoryhtX"
        );

        child = {
          ...child,
          homeVisitor,
          onArt: "",
          facility: "",
          artNo: "",
          homeVisitorContact,
          dataEntrant: dataEntrant || dataEntrant1 || dataEntrant2,
        };

        if (
          viralLoadsBe4Quarter.length > 0 &&
          !!this.findAnyEventValue(viralLoadsBe4Quarter, "aBc9Lr1z25H")
        ) {
          child = {
            ...child,
            artNo: this.findAnyEventValue(viralLoadsBe4Quarter, "aBc9Lr1z25H"),
          };

          child = {
            ...child,
            facility: this.findAnyEventValue(
              viralLoadsBe4Quarter,
              "usRWNcogGX7"
            ),
          };
        }
        if (
          viralLoadsBe4Quarter.length > 0 &&
          this.findAnyEventValue(viralLoadsBe4Quarter, "xyDBnQTdZqS")
        ) {
          child = {
            ...child,
            [`onArt`]: this.findAnyEventValue(
              viralLoadsBe4Quarter,
              "xyDBnQTdZqS"
            )
              ? 1
              : "",
          };
        } else if (child["hivStatus"] === "+") {
          child = {
            ...child,
            [`onArt`]: "No VL",
          };
        } else {
          child = {
            ...child,
            [`onArt`]: "",
          };
        }

        if (
          child["hivStatus"] !== "+" &&
          child["RDEklSXCD4C_umqeJCVp4Zq"] === "NA"
        ) {
          child = {
            ...child,
            ["RDEklSXCD4C_umqeJCVp4Zq"]: "",
          };
        } else if (child["hivStatus"] === "+") {
          child = {
            ...child,
            ["RDEklSXCD4C_umqeJCVp4Zq"]:
              child["RDEklSXCD4C_umqeJCVp4Zq"] === "Yes" ? 1 : 0,
          };
        }

        const artStartDate = this.findAnyEventValue(
          viralLoadsBe4Quarter,
          "epmIBD8gh7G"
        );

        const lastViralLoadDate = this.findAnyEventValue(
          viralLoadsBe4Quarter,
          "Ti0huZXbAM0"
        );
        const viralTestDone = this.findAnyEventValue(
          viralLoadsBe4Quarter,
          "cM7dovIX2Dl"
        );
        const viralLoadResultsReceived = this.findAnyEventValue(
          viralLoadsBe4Quarter,
          "te2VwealaBT"
        );
        const viralLoadStatus = this.findAnyEventValue(
          viralLoadsBe4Quarter,
          "AmaNW7QDuOV"
        );
        const viralLoadCopies = this.findAnyEventValue(
          viralLoadsBe4Quarter,
          "b8p0uWaYRhY"
        );
        const regimen = this.findAnyEventValue(
          viralLoadsBe4Quarter,
          "nZ1omFVYFkT"
        );
        const weight = this.findAnyEventValue(
          viralLoadsBe4Quarter,
          "Kjtt7SV26zL"
        );
        if (child["hivStatus"] === "+") {
          if (!!artStartDate) {
            const daysOnArt = differenceInMonths(
              quarterEnd,
              parseISO(artStartDate)
            );
            if (daysOnArt >= 6) {
              child = {
                ...child,
                ovcEligible: 1,
              };
            } else if (!!lastViralLoadDate) {
              child = {
                ...child,
                ovcEligible: 1,
              };
            } else {
              child = {
                ...child,
                ovcEligible: "NE",
              };
            }
          } else if (!!lastViralLoadDate) {
            child = {
              ...child,
              ovcEligible: 1,
            };
          } else {
            child = {
              ...child,
              ovcEligible: "No VL",
            };
          }
          child = { ...child, lastViralLoadDate };

          if (!!lastViralLoadDate && child.ovcEligible === 1) {
            const monthsSinceLastViralLoad = differenceInMonths(
              quarterEnd,
              parseISO(lastViralLoadDate)
            );
            if (monthsSinceLastViralLoad <= 12) {
              child = {
                ...child,
                VLTestDone:
                  viralTestDone === "true"
                    ? 1
                    : viralTestDone === "false"
                    ? 0
                    : 0,
                VLStatus: viralLoadStatus,
              };
            } else {
              child = {
                ...child,
                VLTestDone: 0,
              };
            }
          } else {
            child = {
              ...child,
              VLTestDone: 0,
            };
          }
          if (!!viralLoadResultsReceived && child.VLTestDone === 1) {
            child = {
              ...child,
              ovcVL: viralLoadResultsReceived === "true" ? 1 : 0,
            };
          } else {
            child = {
              ...child,
              ovcVL: 0,
            };
          }

          if (child.ovcVL === 1) {
            child = {
              ...child,
              copies: viralLoadCopies,
              VLSuppressed: viralLoadStatus === "Suppressed" ? 1 : 0,
            };
          } else {
            child = {
              ...child,
              ovcVL: 0,
              VLSuppressed: 0,
            };
          }
        } else {
          child = {
            ...child,
            VLTestDone: "",
            ovcEligible: "",
            ovcVL: "",
            VLStatus: "",
          };
        }
        child = {
          ...child,
          VSLA: this.hadASession(
            rows,
            participantIndex,
            sessionNameIndex,
            sessionDateIndex,
            child["RDEklSXCD4C_HLKc2AKR9jW"],
            quarterStart,
            quarterEnd,
            [
              ...sessions["VSLA Methodology"],
              ...sessions["VSLA TOT"],
              ...sessions["Saving and Borrowing"],
            ]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          fLiteracy: this.hadASession(
            rows,
            participantIndex,
            sessionNameIndex,
            sessionDateIndex,
            child["RDEklSXCD4C_HLKc2AKR9jW"],
            quarterStart,
            quarterEnd,
            sessions["Financial Literacy"]
          )
            ? 1
            : 0,
          fHomeBasedLiteracy:
            (this.anyEventWithDE(homeVisitsDuringQuarter, "PBiFAeCVnot") ||
              this.anyEventWithDE(homeVisitsDuringQuarter, "Xlw16qiDxqk") ||
              this.anyEventWithDE(homeVisitsDuringQuarter, "rOTbGzSfKbs")) &&
            age >= 15
              ? 1
              : 0,
        };
        child = {
          ...child,
          [`bankLinkages`]:
            this.anyEventWithAnyOfTheValue(
              serviceLinkagesDuringQuarter,
              "NxQ4EZUB0fr",
              [
                "F1. Access credit services",
                "F2. Access saving services",
                "F3. Insurance services/ Health Fund",
              ]
            ) ||
            this.hadASession(
              rows,
              participantIndex,
              sessionNameIndex,
              sessionDateIndex,
              child["RDEklSXCD4C_HLKc2AKR9jW"],
              quarterStart,
              quarterEnd,
              sessions["Bank Linkages"]
            )
              ? 1
              : 0,
        };
        child = {
          ...child,
          agriBusiness: this.anyEventWithAnyOfTheValue(
            serviceLinkagesDuringQuarter,
            "NxQ4EZUB0fr",
            [
              "A1. Input Markets through voucher",
              "A2. input such as seeds and poultry",
              "A3. training in agricultural production",
            ]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          spmTraining: this.hadASession(
            rows,
            participantIndex,
            sessionNameIndex,
            sessionDateIndex,
            child["RDEklSXCD4C_HLKc2AKR9jW"],
            quarterStart,
            quarterEnd,
            sessions["SPM Training"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          micro: this.anyEventWithAnyOfTheValue(
            serviceLinkagesDuringQuarter,
            "NxQ4EZUB0fr",
            ["B1. Access to credit services", "B2. Access to saving services"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          igaBooster: this.anyEventWithAnyOfTheValue(
            serviceLinkagesDuringQuarter,
            "NxQ4EZUB0fr",
            ["O3. IGA Booster"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          tempConsumption:
            this.anyEventWithAnyOfTheValue(
              serviceLinkagesDuringQuarter,
              "NxQ4EZUB0fr",
              ["UF12 Temporary Food Support"]
            ) ||
            this.anyEventWithAnyOfTheValue(
              referralsDuringQuarter,
              "XWudTD2LTUQ",
              ["Temporary Food Support"]
            )
              ? 1
              : 0,
        };
        child = {
          ...child,
          vlsaOvcFund: this.anyEventWithAnyOfTheValue(
            serviceLinkagesDuringQuarter,
            "NxQ4EZUB0fr",
            ["UF3 VSLA OVC protection Fund"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          educationFund: this.anyEventWithAnyOfTheValue(
            serviceLinkagesDuringQuarter,
            "NxQ4EZUB0fr",
            ["UF09 OVC VSLA Education Fund"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          heathFund: this.anyEventWithAnyOfTheValue(
            serviceLinkagesDuringQuarter,
            "NxQ4EZUB0fr",
            ["UF10 OVC VSLA Health Fund"]
          )
            ? 1
            : 0,
        };

        child = {
          ...child,
          educationSubsidy:
            this.anyEventWithAnyOfTheValue(
              serviceLinkagesDuringQuarter,
              "NxQ4EZUB0fr",
              ["O1. Education subsidy"]
            ) ||
            this.anyEventWithAnyOfTheValue(
              referralsDuringQuarter,
              "XWudTD2LTUQ",
              ["Educational support"]
            )
              ? 1
              : 0,
        };
        child = {
          ...child,
          homeLearning: this.anyEventWithAnyOfTheValue(
            serviceLinkagesDuringQuarter,
            "NxQ4EZUB0fr",
            ["Home Learning"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          nonFormalEducation:
            this.anyEventWithAnyOfTheValue(
              serviceLinkagesDuringQuarter,
              "NxQ4EZUB0fr",
              ["O2. None Formal Education"]
            ) ||
            this.anyEventWithAnyOfTheValue(
              referralsDuringQuarter,
              "XWudTD2LTUQ",
              ["Vocational/Apprenticeship"]
            )
              ? 1
              : 0,
        };

        child = {
          ...child,
          educationInformation:
            (this.anyEventWithDE(homeVisitsDuringQuarter, "sTyaaJxvR5S") ||
              this.anyEventWithDE(homeVisitsDuringQuarter, "oyQActIi370") ||
              this.anyEventWithDE(homeVisitsDuringQuarter, "P7nd91Mkhol") ||
              this.anyEventWithDE(homeVisitsDuringQuarter, "leNiACgoBcL")) &&
            age >= 6
              ? 1
              : 0,
        };
        if (
          this.deHasAnyValue(serviceProvided, [
            "Started HIV treatment",
            "PEP",
            "HCT/ Tested for HIV",
            "Intensive Adherence Counseling (IAC)",
            "Viral Load Testing",
            "Provided with ARVs",
          ]) === 1 ||
          this.anyEventWithAnyOfTheValue(
            serviceLinkagesDuringQuarter,
            "HzDRzHCuzdf",
            ["HTS"]
          )
        ) {
          child = { ...child, HTSReferral: 1 };
        } else {
          child = { ...child, HTSReferral: 0 };
        }

        child = {
          ...child,
          nonDisclosureSupport:
            this.anyEventWithDE(homeVisitsDuringQuarter, "rLc3CF2VeOC") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "xSS9QHbuT4S")
              ? 1
              : 0,
        };
        child = {
          ...child,
          artInitiation: this.anyEventWithAnyOfTheValue(
            referralsDuringQuarter,
            "XWudTD2LTUQ",
            ["Initiated on HIV Treatment"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          homeDrugDelivery: this.deHasAnyValue(serviceProvided, [
            "Home drug delivery",
          ]),
        };
        child = {
          ...child,
          artAdherenceEducation:
            this.anyEventWithDE(homeVisitsDuringQuarter, "NxhBKqINsZY") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "svrj6VtHjay") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "NJZ13SXf8XV")
              ? 1
              : 0,
        };
        child = {
          ...child,
          iac:
            this.anyEventWithDataElement(
              viralLoadDuringQuarter,
              "iHdNYfm1qlz",
              "true"
            ) ||
            this.anyEventWithAnyOfTheValue(
              referralsDuringQuarter,
              "XWudTD2LTUQ",
              ["Intensive Adherence Counseling (IAC)"]
            )
              ? 1
              : 0,
        };
        child = {
          ...child,
          eMTCT:
            this.anyEventWithDE(homeVisitsDuringQuarter, "SrEP2vZtMHV") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "ffxCn2msT1R") ||
            this.anyEventWithAnyOfTheValue(
              referralsDuringQuarter,
              "XWudTD2LTUQ",
              ["EMTCT"]
            )
              ? 1
              : 0,
        };
        child = {
          ...child,
          hivPrevention: this.anyEventWithDE(
            homeVisitsDuringQuarter,
            "xXqKqvuwA8m"
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          journeysMOH: this.hasCompleted(
            rows,
            participantIndex,
            sessionNameIndex,
            sessionDateIndex,
            child["RDEklSXCD4C_HLKc2AKR9jW"],
            quarterEnd,
            sessions["MOH Journeys curriculum"],
            this.mapping2["MOH Journeys curriculum"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          journeysLARA: this.hasCompleted(
            rows,
            participantIndex,
            sessionNameIndex,
            sessionDateIndex,
            child["RDEklSXCD4C_HLKc2AKR9jW"],
            quarterEnd,
            sessions["MOE Journeys Plus"],
            this.mapping2["MOE Journeys Plus"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          NMNBoys: this.hasCompleted(
            rows,
            participantIndex,
            sessionNameIndex,
            sessionDateIndex,
            child["RDEklSXCD4C_HLKc2AKR9jW"],
            quarterEnd,
            sessions["No means No sessions (Boys)"],
            this.mapping2["No means No sessions (Boys)"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          NMNGirls: this.hasCompleted(
            rows,
            participantIndex,
            sessionNameIndex,
            sessionDateIndex,
            child["RDEklSXCD4C_HLKc2AKR9jW"],
            quarterEnd,
            sessions["No means No sessions (Girls)"],
            this.mapping2["No means No sessions (Girls)"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          TFHealth: this.anyEventWithAnyOfTheValue(
            serviceLinkagesDuringQuarter,
            "NxQ4EZUB0fr",
            ["Transport to Facility"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          PEP: this.anyEventWithAnyOfTheValue(
            serviceProvisionDuringQuarter,
            "XWudTD2LTUQ",
            ["PEP"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          covid19Education: this.anyEventWithDE(
            homeVisitsDuringQuarter,
            "RtQudbqa6XH"
          )
            ? 1
            : 0,
        };

        child = {
          ...child,
          immunization: this.anyEventWithAnyOfTheValue(
            referralsDuringQuarter,
            "XWudTD2LTUQ",
            ["Immunisation"]
          )
            ? 1
            : 0,
        };

        child = {
          ...child,
          wash:
            this.anyEventWithDE(homeVisitsDuringQuarter, "eEZu3v92pJZ") ||
            this.anyEventWithAnyOfTheValue(
              referralsDuringQuarter,
              "XWudTD2LTUQ",
              ["WASH"]
            )
              ? 1
              : 0,
        };
        child = {
          ...child,
          treatedNets: this.anyEventWithAnyOfTheValue(
            referralsDuringQuarter,
            "XWudTD2LTUQ",
            ["Insecticide Treated Nets"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          familyPlanning: this.anyEventWithAnyOfTheValue(
            referralsDuringQuarter,
            "XWudTD2LTUQ",
            ["Family planning services"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          tested4TB: this.anyEventWithAnyOfTheValue(
            referralsDuringQuarter,
            "XWudTD2LTUQ",
            ["Tested for TB"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          initiatedOnTB: this.anyEventWithAnyOfTheValue(
            referralsDuringQuarter,
            "XWudTD2LTUQ",
            ["Initiated on TB Treatment"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          supported2CompleteTBDose: this.anyEventWithAnyOfTheValue(
            referralsDuringQuarter,
            "XWudTD2LTUQ",
            ["Supported to Complete TB Dose"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          viralLoadBleeding:
            this.anyEventWithAnyOfTheValue(
              referralsDuringQuarter,
              "XWudTD2LTUQ",
              ["Viral Load Testing"]
            ) ||
            this.anyEventWithAnyOfTheValue(
              serviceLinkagesDuringQuarter,
              "NxQ4EZUB0fr",
              ["HTS7. Viral load test"]
            )
              ? 1
              : 0,
        };
        child = {
          ...child,
          returnedToCare: this.anyEventWithAnyOfTheValue(
            serviceLinkagesDuringQuarter,
            "NxQ4EZUB0fr",
            ["PLHIV Returned to care"]
          )
            ? 1
            : 0,
        };

        child = {
          ...child,
          otherHealthServices:
            this.anyEventWithDE(homeVisitsDuringQuarter, "eEZu3v92pJZ") ||
            // this.anyEventWithDE(homeVisitsDuringQuarter, "C41UbAJDeqG") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "D7rrGXWwjGn") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "CnfRJ2y4Lg8")
              ? 1
              : 0,
        };
        child = {
          ...child,
          tbScreening:
            (tbScreeningChild === 4 && age < 16) ||
            (tbScreeningAdult === 4 && age > 17) ||
            (tbScreeningChild17 === 4 && age >= 16)
              ? 1
              : 0,
        };

        child = {
          ...child,
          atRiskOfTB:
            (atTBRiskChild >= 5 && age < 16) ||
            (atTBRiskAdult >= 5 && age > 17) ||
            (atTBRiskChild17 >= 5 && age >= 16)
              ? 1
              : 0,
        };

        child = {
          ...child,
          GBVPreventionEducation:
            this.anyEventWithDE(homeVisitsDuringQuarter, "ENMOyjoE2GM") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "ak7SceZTDsF") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "HqbcvvZAc9w") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "H4YhW8kTs2P") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "kpWBIc81VKL") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "pm7k8wuOTLt") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "a0lXaMhHh32")
              ? 1
              : 0,
        };
        child = {
          ...child,
          TFGBV:
            this.anyEventWithDataElement(
              referralsDuringQuarter,
              "XWudTD2LTUQ",
              "Transport GBV"
            ) ||
            this.anyEventWithDataElement(
              serviceLinkagesDuringQuarter,
              "NxQ4EZUB0fr",
              "Transport GBV"
            )
              ? 1
              : 0,
        };
        child = {
          ...child,
          referral4LegalSupport: this.anyEventWithDataElement(
            referralsDuringQuarter,
            "EDa2GQUCbsx",
            "Legal Support"
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          ECD: this.hadASession(
            rows,
            participantIndex,
            sessionNameIndex,
            sessionDateIndex,
            child["RDEklSXCD4C_HLKc2AKR9jW"],
            quarterStart,
            quarterEnd,
            sessions["ECD"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          parenting: this.hasCompletedWithin(
            rows,
            participantIndex,
            sessionNameIndex,
            sessionDateIndex,
            child["RDEklSXCD4C_HLKc2AKR9jW"],
            quarterStart,
            quarterEnd,
            sessions["SINOVUYO"],
            this.mapping2["SINOVUYO"]
          )
            ? 1
            : 0,
        };

        child = {
          ...child,
          parentingAttended: this.hadASession(
            rows,
            participantIndex,
            sessionNameIndex,
            sessionDateIndex,
            child["RDEklSXCD4C_HLKc2AKR9jW"],
            quarterStart,
            quarterEnd,
            sessions["SINOVUYO"]
          )
            ? 1
            : 0,
        };
        child = {
          ...child,
          childProtectionEducation:
            this.anyEventWithDE(homeVisitsDuringQuarter, "cgnfO3xqaYb") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "bJPqgTbbt8g") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "UlQEavBni01") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "v6zHvL8w9ex")
              ? 1
              : 0,
        };

        child = {
          ...child,
          nutritionEducation:
            this.anyEventWithDE(homeVisitsDuringQuarter, "FGs1bkmfoTX") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "BDVZPgVPVww") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "p9EaFSIg3ht") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "Eg1yxmjMfG7")
              ? 1
              : 0,
        };
        child = {
          ...child,
          nutritionalFoodSupplement: this.deHasAnyValue(serviceProvided, [
            "Food supplement",
          ]),
        };
        child = {
          ...child,
          nutritionalAssessment: this.deHasAnyValue(serviceProvided, [
            "Nutritional assessment",
          ]),
        };
        child = {
          ...child,
          voucher4CropsOrKitchenGardens: this.anyEventWithAnyOfTheValue(
            serviceLinkagesDuringQuarter,
            "NxQ4EZUB0fr",
            ["A1. Input Markets through voucher", "M3 Input Vouchers"]
          )
            ? 1
            : 0,
        };

        child = {
          ...child,
          kitchenGarden: this.anyEventWithAnyOfTheValue(
            serviceLinkagesDuringQuarter,
            "NxQ4EZUB0fr",
            ["A2. input such as seeds and poultry"]
          )
            ? 1
            : 0,
        };

        child = {
          ...child,
          psychosocialSupport:
            this.anyEventWithDE(homeVisitsDuringQuarter, "EPchB4Exe2W") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "bl1spy2qZx9") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "VfpDpPPKRN6") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "I8f8EVY5rtY") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "OawjweoGEhr") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "yowPVwuMMqZ") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "f4jgX6ch67t") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "YZH5hmsL7wS") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "KsGYugQ1vmD") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "Mu3g2OAL45z") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "DJuFa605flQ") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "l2dux9dZ80n") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "I14Ps4E6pkc") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "dkUee6TB7kh") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "SBnpTKoIGsP") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "ySVNhEXsMdJ") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "ttrftNW6Hvt") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "fKt9QfYFLcP") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "LLqXFg9LSva") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "RgiLe8wnGCu") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "xe4vjgebIvY") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "Vvhi5UERsGt") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "XPa9UnDjaBm") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "SPwxtuLWvUS") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "OPaSCuEHG6U") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "AirD3FZ9n6i") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "LQSy4undhKw") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "blyJnu6QaTY") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "xSS9QHbuT4S") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "ffxCn2msT1R") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "qr5qx26F2k5") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "WPjGiogQuMg") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "ArdR8f6lg2I") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "LEa6yJQU4FR") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "OQ2O7hzLz4n") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "kgeTLR5iPGl") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "af5jHMW6cPf") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "bdKyx6Eb911") ||
            this.anyEventWithDE(homeVisitsDuringQuarter, "nKjyjWLj88B")
              ? 1
              : 0,
        };

        const coreES =
          child.VSLA === 1 ||
          child.fLiteracy === 1 ||
          child.fHomeBasedLiteracy === 1 ||
          child.bankLinkages === 1 ||
          child.agriBusiness === 1 ||
          child.spmTraining === 1 ||
          child.micro === 1 ||
          child.igaBooster === 1 ||
          child.tempConsumption ||
          child.vlsaOvcFund === 1;
        const coreEducation =
          child.educationSubsidy === 1 ||
          child.homeLearning === 1 ||
          child.nonFormalEducation === 1 ||
          child.educationInformation === 1 ||
          child.educationFund === 1;
        const coreHealth =
          child.HTSReferral === 1 ||
          child.nonDisclosureSupport === 1 ||
          child.artInitiation === 1 ||
          child.artAdherenceEducation === 1 ||
          child.iac === 1 ||
          child.eMTCT === 1 ||
          child.hivPrevention === 1 ||
          child.journeysMOH === 1 ||
          child.journeysLARA === 1 ||
          child.NMNBoys === 1 ||
          child.NMNGirls === 1 ||
          child.TFHealth === 1 ||
          child.PEP === 1 ||
          child.covid19Education === 1 ||
          child.otherHealthServices === 1 ||
          child.homeDrugDelivery === 1 ||
          child.tested4TB ||
          child.initiatedOnTB ||
          child.wash ||
          child.treatedNets ||
          child.familyPlanning ||
          child.healthFund ||
          child.TFHealth ||
          child.supported2CompleteTBDose ||
          child.immunization === 1;

        const coreChildProtection =
          child.GBVPreventionEducation === 1 ||
          child.TFGBV === 1 ||
          child.referral4LegalSupport === 1 ||
          child.ECD === 1 ||
          child.parentingAttended === 1 ||
          child.childProtectionEducation === 1;

        const coreNutrition =
          child.nutritionEducation === 1 ||
          child.voucher4CropsOrKitchenGardens === 1 ||
          child.nutritionalAssessment === 1 ||
          child.kitchenGarden === 1 ||
          child.nutritionalFoodSupplement === 1;
        const corePSS = child.psychosocialSupport === 1;

        child = {
          ...child,
          coreES: coreES ? 1 : 0,
          coreEducation: coreEducation ? 1 : 0,
          coreHealth: coreHealth ? 1 : 0,
          coreChildProtection: coreChildProtection ? 1 : 0,
          coreNutrition: coreNutrition ? 1 : 0,
          corePSS: corePSS ? 1 : 0,
        };

        if (
          child.coreES === 1 ||
          child.coreEducation === 1 ||
          child.coreHealth === 1 ||
          child.coreChildProtection === 1 ||
          child.coreNutrition === 1 ||
          child.corePSS === 1
        ) {
          child = {
            ...child,
            quarter: 1,
          };
        } else {
          child = {
            ...child,
            quarter: 0,
          };
        }

        if (
          previousData[trackedEntityInstance] &&
          previousData[trackedEntityInstance].quarter === 1
        ) {
          child = { ...child, servedInPreviousQuarter: 1 };
        } else {
          child = { ...child, servedInPreviousQuarter: 0 };
        }

        if (child.newlyEnrolled === "Yes" && child.quarter === 1) {
          child = {
            ...child,
            OVC_SERV: 1,
          };
        } else if (child.quarter === 1 && child.servedInPreviousQuarter === 1) {
          child = {
            ...child,
            OVC_SERV: 1,
          };
        } else {
          child = {
            ...child,
            OVC_SERV: 0,
          };
        }

        if (age < 18 && child.ovcVL === 1 && child.OVC_SERV === 1) {
          child = {
            ...child,
            OVC_ENROL: 1,
          };
        } else if (age < 18 && child.hivStatus === "+") {
          child = {
            ...child,
            OVC_ENROL: 0,
          };
        }

        if (age < 18 && child.OVC_SERV === 1) {
          child = {
            ...child,
            OVC_SERV_SUBPOP: risks[child.riskFactor] || child.riskFactor,
          };
        }

        if (
          child.hivStatus === "+" ||
          child.hivStatus === "-" ||
          ([0, 3, 6].indexOf(isNotAtRisk) !== -1 &&
            [0, 3, 6].indexOf(isNotAtRiskAdult) !== -1 &&
            child.hivStatus === "DK")
        ) {
          child = {
            ...child,
            OVC_HIV_STAT: 1,
          };
        } else {
          child = {
            ...child,
            OVC_HIV_STAT: 0,
          };
        }
        if (riskAssessmentsDuringYear.length > 0 && child.hivStatus !== "+") {
          child = { ...child, riskAssessment: 1 };
        } else if (child.hivStatus === "+") {
          child = { ...child, riskAssessment: "" };
          child = { ...child, isAtRisk: "" };
        } else {
          child = { ...child, riskAssessment: 0 };
          child = { ...child, isAtRisk: 0 };
        }
        if (child.riskAssessment === 1) {
          if (age < 18 && [0, 3, 6].indexOf(isNotAtRisk) !== -1) {
            child = { ...child, isAtRisk: 0 };
          } else if (age >= 18 && [0, 3, 6].indexOf(isNotAtRiskAdult) !== -1) {
            child = { ...child, isAtRisk: 0 };
          } else if (
            [0, 3, 6].indexOf(isNotAtRiskAdult) === -1 ||
            [0, 3, 6].indexOf(isNotAtRisk) === -1
          ) {
            child = { ...child, isAtRisk: 1 };
          }
        }

        if (child.hivStatus !== "+") {
          if (
            [0, 3, 6].indexOf(isNotAtRiskAdult) !== -1 ||
            [0, 3, 6].indexOf(isNotAtRisk) !== -1
          ) {
            child = { ...child, isNotAtRisk: 1 };
          } else {
            child = { ...child, isNotAtRisk: 0 };
          }
        }

        if (
          child.hivStatus !== "+" &&
          child.hivStatus !== "-" &&
          child.isNotAtRisk !== 1
        ) {
          if (!!unknownOther) {
            child = {
              ...child,
              unknown: unknownOther,
            };
          } else {
            child = { ...child, unknown: "Other reasons" };
          }
        } else if (
          child.hivStatus === "+" ||
          child.hivStatus === "-" ||
          child.isNotAtRisk === 1
        ) {
          child = { ...child, unknown: "" };
        }

        if (child.newlyEnrolled === "Yes" && child.hivStatus === "+") {
          child = { ...child, newlyPositive: 1 };
        } else if (child.hivStatus === "+") {
          if (
            child["RDEklSXCD4C_HzUL8LTDPga"] === "Negative" &&
            previousViralLoads.length === 0 &&
            this.allValues4DataElement(
              previousReferrals,
              "XTdRWh5MqPw",
              "Negative"
            )
          ) {
            child = { ...child, newlyPositive: 1 };
          } else {
            child = { ...child, newlyPositive: 0 };
          }
        }

        if (
          child.newlyPositive &&
          !!artStartDate &&
          isWithinInterval(parseISO(artStartDate), {
            start: financialQuarterStart,
            end: financialQuarterEnd,
          })
        ) {
          child = { ...child, newlyTestedPositive: 1 };
        } else if (
          child.newlyPositive &&
          this.hasDataElementWithinPeriod(
            referralsDuringYear,
            "XTdRWh5MqPw",
            "Positive"
          )
        ) {
          child = { ...child, newlyTestedPositive: 1 };
        } else if (child.hivStatus === "+") {
          child = { ...child, newlyTestedPositive: 0 };
        }
        const currentArtStartDate = anyViralLoad?.["epmIBD8gh7G"];

        child = {
          ...child,
          artStartDate: currentArtStartDate,
        };

        if (
          child.newlyTestedPositive &&
          currentArtStartDate &&
          child.onArt &&
          isWithinInterval(parseISO(currentArtStartDate), {
            start: financialQuarterStart,
            end: financialQuarterEnd,
          })
        ) {
          child = {
            ...child,
            newlyTestedAndOnArt: 1,
          };
        } else if (serviceProvided === "Started HIV treatment") {
          child = { ...child, newlyTestedAndOnArt: 1 };
        }

        child = { ...child, currentRegimen: regimen, weight };

        if (
          child.memberStatus === "Active" &&
          child.OVC_SERV === 0 &&
          child.servedInPreviousQuarter === 0 &&
          child.quarter === 0 &&
          child.newlyEnrolled === "No"
        ) {
          child = {
            ...child,
            exitedWithGraduation: "Not served in both qtrs",
          };
        } else if (
          child.OVC_SERV === 0 &&
          child.quarter === 0 &&
          child.memberStatus === "Active"
        ) {
          child = {
            ...child,
            exitedWithGraduation: "Not served current qtr",
          };
        } else if (
          child.OVC_SERV === 0 &&
          child.servedInPreviousQuarter === 0 &&
          child.memberStatus === "Active"
        ) {
          child = {
            ...child,
            exitedWithGraduation: "Not served previous qtr",
          };
        } else if (
          child.OVC_SERV === 0 &&
          child.memberStatus === "No Home Visit"
        ) {
          child = {
            ...child,
            exitedWithGraduation: "Not served in both qtrs",
          };
        } else if (child.OVC_SERV === 0) {
          child = { ...child, exitedWithGraduation: child.memberStatus };
        }
        return child;
      }
    );
  });
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

module.exports.generate = async (
  trackedEntityInstances,
  program,
  periods,
  sessions
) => {
  const filteredInstances = trackedEntityInstances.filter(
    (instance) => instance.inactive === false && instance.deleted === false
  );
  const processedUnits = await this.fetchUnits4Instances(filteredInstances);
  const organisationUnits = Object.keys(processedUnits);
  const indexCases = await this.fetchRelationships4Instances(
    filteredInstances,
    organisationUnits.join(";")
  );
  const groupActivities = await this.fetchGroupActivities4Instances(
    filteredInstances
  );

  // const servedPreviousQuarter = this.processInstances(
  //   program,
  //   filteredInstances,
  //   moment(period).subtract(1, "quarter"),
  //   sessions,
  //   indexCases,
  //   processedUnits,
  //   {
  //     rows: [],
  //     sessionNameIndex: 1,
  //     participantIndex: 2,
  //     sessionDateIndex: 3,
  //   },
  //   {}
  // );

  const processed = this.processInstances(
    program,
    filteredInstances,
    periods,
    sessions,
    indexCases,
    processedUnits,
    groupActivities,
    {}
  );

  console.log(processed);
};
module.exports.useTracker = async (
  periods = [moment()],
  program = "RDEklSXCD4C"
) => {
  let params = {
    fields: "*",
    ouMode: "ALL",
    program,
    totalPages: true,
    page: 1,
  };

  const { sessions } = await this.useLoader();

  const {
    data: {
      trackedEntityInstances,
      pager: { pageCount },
    },
  } = await this.instance.get("trackedEntityInstances.json", { params });

  this.generate(trackedEntityInstances, program, periods, sessions);

  // for (let page = 2; page <= pageCount; page++) {
  //   const {
  //     data: { trackedEntityInstances },
  //   } = await this.instance.get("trackedEntityInstances.json", {
  //     params: { ...params, page },
  //   });
  // }
  // console.log(pager);
};

module.exports.api = axios.create({
  baseURL: "http://localhost:3001/api/",
});

module.exports.flattenInstances = async (trackedEntityInstances, program) => {
  const data = trackedEntityInstances.flatMap(
    ({
      trackedEntityInstance,
      trackedEntityType,
      enrollments,
      attributes,
      programOwners,
      relationships,
      ...tei
    }) => {
      const processedAttributes = fromPairs(
        attributes.map(({ attribute, value }) => [attribute, value])
      );
      if (enrollments.length > 0) {
        return enrollments.flatMap(
          ({
            events,
            enrollment,
            program,
            orgUnitName,
            enrollmentDate,
            incidentDate,
            notes,
            relationships,
            attributes,
            ...enrollmentDetails
          }) => {
            if (events.length > 0) {
              return events.flatMap(
                ({
                  dataValues,
                  dueDate,
                  eventDate,
                  event,
                  programStage,
                  attributeCategoryOptions,
                  attributeOptionCombo,
                  completedDate,
                  relationships,
                  attributes,
                  ...eventDetails
                }) => {
                  return {
                    id: `${trackedEntityInstance}${enrollment}${event}`,
                    trackedEntityInstance,
                    trackedEntityType,
                    tei,
                    ...processedAttributes,
                    enrollment,
                    program,
                    orgUnitName,
                    enrollmentDate,
                    incidentDate,
                    enrollmentDetails,
                    dueDate,
                    eventDate,
                    event,
                    programStage,
                    attributeCategoryOptions,
                    attributeCategoryOptions,
                    attributeOptionCombo,
                    completedDate,
                    ...fromPairs(
                      dataValues.map(({ dataElement, value }) => [
                        dataElement,
                        value,
                      ])
                    ),
                    eventDetails,
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
  try {
    const {
      data: { items },
    } = await this.api.post(
      `wal/index?index=${String(program).toLowerCase()}`,
      {
        data,
      }
    );
    console.log(`Inserted ${items.length}`);
  } catch (error) {
    console.log(error.message);
  }
};

module.exports.processTrackedEntityInstances = async (program) => {
  let params = {
    fields: "*",
    ouMode: "ALL",
    program,
    totalPages: true,
    pageSize: 2,
    page: 1,
  };
  console.log(`Working on page 1`);
  const {
    data: {
      trackedEntityInstances,
      pager: { pageCount },
    },
  } = await this.instance.get("trackedEntityInstances.json", { params });

  await this.flattenInstances(trackedEntityInstances, program);
  for (let page = 2; page <= pageCount; page++) {
    console.log(`Working on page ${page} of ${pageCount}`);
    const {
      data: { trackedEntityInstances },
    } = await this.instance.get("trackedEntityInstances.json", {
      params: { ...params, page },
    });
    await this.flattenInstances(trackedEntityInstances, program);
  }
};
