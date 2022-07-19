const {
  differenceInMonths,
  differenceInYears,
  isBefore,
  isWithinInterval,
  parseISO,
  subQuarters,
  format,
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
  // baseURL: "https://data.icyd.hispuganda.org/api/",
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

module.exports.hadASession = (memberSessions, startDate, endDate, sessions) => {
  if (memberSessions) {
    return !!memberSessions.find((row) => {
      return (
        sessions.indexOf(row.n20LkH4ZBF8) !== -1 &&
        isWithinInterval(parseISO(row.eventDate), {
          start: startDate,
          end: endDate,
        })
      );
    });
  }
  return false;
};

module.exports.hasCompleted = (memberSessions, endDate, sessions, value) => {
  const doneSessions = memberSessions.filter((row) => {
    return (
      sessions.indexOf(row.n20LkH4ZBF8) !== -1 &&
      parseISO(row.eventDate).getTime() <= endDate.getTime()
    );
  });

  return doneSessions.length >= value;
};

module.exports.hasCompletedWithin = (
  memberSessions,
  startDate,
  endDate,
  sessions,
  value
) => {
  const doneSessions = memberSessions.filter((row) => {
    return (
      sessions.indexOf(row.n20LkH4ZBF8) !== -1 &&
      isWithinInterval(parseISO(row.eventDate), {
        start: startDate,
        end: endDate,
      })
    );
  });
  return doneSessions.length >= value;
};

module.exports.hasCompletedAtLeast1 = (memberSessions, endDate, sessions) => {
  const doneSessions = memberSessions.filter((row) => {
    return (
      sessions.indexOf(row.n20LkH4ZBF8) !== -1 &&
      parseISO(row.eventDate).getTime() <= endDate.getTime()
    );
  });
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

module.exports.eventsBeforePeriod = (events, end) => {
  return events.filter((e) => {
    return isBefore(parseISO(e.eventDate), end);
  });
};

module.exports.getEvents = (available, trackedEntityInstance) => {
  return available[trackedEntityInstance] || [];
};
module.exports.eventsWithinPeriod = (events, start, end) => {
  return events.filter((e) => {
    return (
      e.eventDate && isWithinInterval(parseISO(e.eventDate), { start, end })
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
  return "";
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
    return (
      has(event, dataElement) &&
      event[dataElement] !== null &&
      event[dataElement] !== undefined
    );
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

module.exports.syncOrganisations = async () => {
  const {
    data: { organisationUnits },
  } = await this.instance.get("organisationUnits.json", {
    params: {
      fields: "id,path,name,parent[name,parent[name]]",
      paging: "false",
      level: 5,
    },
  });
  const units = organisationUnits.map((unit) => {
    return {
      subCounty: unit.parent?.name,
      id: unit.id,
      district: unit.parent?.parent?.name,
      orgUnitName: unit.name,
      ...fromPairs(
        String(unit.path)
          .split("/")
          .slice(1)
          .map((v, i) => {
            return [`level${i + 1}`, v];
          })
      ),
    };
  });

  const inserted = await Promise.all(
    chunk(units, 1000).map((c) => {
      return this.api.post(`wal/index?index=units`, {
        data: c,
      });
    })
  );
  const total = sum(
    inserted.map(({ data: { items } }) => (!!items ? items.length : 0))
  );
  console.log(total);
};

module.exports.fetchUnits4Instances = async () => {
  const {
    data: { organisationUnits },
  } = await this.instance.get("organisationUnits.json", {
    params: {
      fields: "id,path,name,parent[name,parent[name]]",
      paging: "false",
      level: 5,
    },
  });
  return fromPairs(
    organisationUnits.map((unit) => {
      return [
        unit.id,
        {
          subCounty: unit.parent?.name,
          district: unit.parent?.parent?.name,
          orgUnitName: unit.name,
          ...fromPairs(
            String(unit.path)
              .split("/")
              .slice(1)
              .map((v, i) => {
                return [`level${i + 1}`, v];
              })
          ),
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
  ).filter((x) => x !== null && x !== undefined);
  const data = await this.fetchAll({
    query: `select * from ${String("HEWq6yr4cs5").toLowerCase()}`,
    filter: {
      terms: {
        ["trackedEntityInstance.keyword"]: allInstances,
      },
    },
  });
  return groupBy(data, "trackedEntityInstance");
};

module.exports.previousLayering = async (trackedEntityInstances) => {
  try {
    const data = await this.fetchAll({
      query: `select trackedEntityInstances,qtr,quarter from layering`,
      filter: {
        terms: {
          ["trackedEntityInstance.keyword"]: trackedEntityInstances,
        },
      },
    });
    return fromPairs(
      Object.entries(groupBy(data, "trackedEntityInstance")).map(
        ([instance, data]) => [
          instance,
          fromPairs(data.map((d) => [d["qtr"], d["quarter"]])),
        ]
      )
    );
  } catch (error) {
    return {};
  }
};

module.exports.fetchGroupActivities4Instances = async (
  trackedEntityInstances
) => {
  const memberCodeColumnIndex = trackedEntityInstances.columns.findIndex(
    (c) => c.name === "HLKc2AKR9jW"
  );
  const allMemberCodes = uniq(
    trackedEntityInstances.rows.map((row) => row[memberCodeColumnIndex])
  ).filter((v) => v !== null && v !== undefined && v !== "");
  const data = await this.fetchAll({
    query: `select n20LkH4ZBF8,ypDUCAS6juy,eventDate from ${String(
      "VzkQBBglj3O"
    ).toLowerCase()}`,
    filter: {
      terms: {
        ["ypDUCAS6juy.keyword"]: allMemberCodes,
      },
    },
  });
  return groupBy(data, "ypDUCAS6juy");
};

module.exports.getProgramStageData = async (
  trackedEntityInstances,
  programStage,
  columns = "*"
) => {
  const data = await this.fetchAll({
    query: `select ${columns} from ${String(programStage).toLowerCase()}`,
    filter: {
      terms: {
        ["trackedEntityInstance.keyword"]: trackedEntityInstances,
      },
    },
  });
  return groupBy(data, "trackedEntityInstance");
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

module.exports.getHEIInformation = (age, heiData) => {
  if (age <= 2) {
    const eidEnrollmentDate = this.findAnyEventValue(heiData, "sDMDb4InL5F");
    const motherArtNo = this.findAnyEventValue(heiData, "P6KEPNorRTT");
    const eidNo = this.findAnyEventValue(heiData, "Qyp4adG3KJL");

    const dateFirstPCRDone = this.findAnyEventValue(heiData, "yTSlwP6htQh");
    const firstPCRResults = this.findAnyEventValue(heiData, "fUY7DEjsZin");

    const dateSecondPCRDone = this.findAnyEventValue(heiData, "TJPxuJHRA3P");
    const secondPCRResults = this.findAnyEventValue(heiData, "TX2qmTSj0rM");

    const dateThirdPCRDone = this.findAnyEventValue(heiData, "r0zBP8h3UEl");
    const thirdPCRResults = this.findAnyEventValue(heiData, "G0YhL0M4YjJ");

    const hivTestDueDate = this.findAnyEventValue(heiData, "CWqTgshbDbW");
    const dateHivTestDone = this.findAnyEventValue(heiData, "qitG6coAg3q");
    const hivTestResults = this.findAnyEventValue(heiData, "lznDPbUscke");
    const finalOutcome = this.findAnyEventValue(heiData, "fcAZR5zt9i3");

    const pcr = !!hivTestResults
      ? "4"
      : !!thirdPCRResults
      ? "3"
      : !!secondPCRResults
      ? "2"
      : !!firstPCRResults
      ? "1"
      : "";

    return {
      eidEnrollmentDate,
      motherArtNo,
      eidNo,
      dateFirstPCRDone,
      firstPCRResults:
        firstPCRResults === "1" ? "+" : firstPCRResults === "2" ? "-" : "",
      dateSecondPCRDone,
      secondPCRResults:
        secondPCRResults === "1" ? "+" : secondPCRResults === "2" ? "-" : "",
      dateThirdPCRDone,
      thirdPCRResults:
        thirdPCRResults === "1" ? "+" : thirdPCRResults === "2" ? "-" : "",
      hivTestDueDate,
      dateHivTestDone,
      hivTestResults:
        hivTestResults === "1" ? "+" : hivTestResults === "2" ? "-" : "",
      finalOutcome,
      pcr,
    };
  }
  return {
    eidEnrollmentDate: "",
    motherArtNo: "",
    eidNo: "",
    dateFirstPCRDone: "",
    firstPCRResults: "",
    dateSecondPCRDone: "",
    secondPCRResults: "",
    dateThirdPCRDone: "",
    thirdPCRResults: "",
    hivTestDueDate: "",
    dateHivTestDone: "",
    hivTestResults: "",
    finalOutcome: "",
    pcr: "",
  };
};

module.exports.getHIVStatus = (
  HzUL8LTDPga,
  hivResult,
  hivTestResults,
  viralLoadsBe4Quarter,
  riskFactor
) => {
  // console.log(viralLoadsBe4Quarter);
  if (viralLoadsBe4Quarter && viralLoadsBe4Quarter.length > 0) {
    return "+";
  } else if (hivResult) {
    return hivResult === "Positive" ? "+" : hivResult === "Negative" ? "-" : "";
  } else if (!!hivTestResults) {
    return hivTestResults;
  } else if (riskFactor === "HEI") {
    return "DK";
  } else {
    return HzUL8LTDPga === "Positive"
      ? "+"
      : HzUL8LTDPga === "Negative"
      ? "-"
      : HzUL8LTDPga === "Dont Know (DK)"
      ? "DK"
      : "";
  }
};

module.exports.hivInformation = (
  artStartDate,
  hivStatus,
  quarterEnd,
  lastViralLoadDate,
  viralTestDone,
  viralLoadResultsReceived,
  viralLoadCopies,
  viralLoadStatus
) => {
  let ovcEligible = "";
  let VLTestDone = "";
  let VLStatus = "";
  let ovcVL = "";
  let VLSuppressed;
  if (hivStatus === "+") {
    if (!!artStartDate) {
      const daysOnArt = differenceInMonths(quarterEnd, parseISO(artStartDate));
      if (daysOnArt >= 6) {
        ovcEligible = 1;
      } else if (!!lastViralLoadDate) {
        ovcEligible = 1;
      } else {
        ovcEligible = "NE";
      }
    } else if (!!lastViralLoadDate) {
      ovcEligible = 1;
    } else {
      ovcEligible = "No VL";
    }

    if (!!lastViralLoadDate && ovcEligible === 1) {
      const monthsSinceLastViralLoad = differenceInMonths(
        quarterEnd,
        parseISO(lastViralLoadDate)
      );
      if (monthsSinceLastViralLoad <= 12) {
        VLTestDone =
          viralTestDone === "true" ? 1 : viralTestDone === "false" ? 0 : 0;
        VLStatus = viralLoadStatus;
      } else {
        VLTestDone = 0;
      }
    } else {
      VLTestDone = 0;
    }
    if (!!viralLoadResultsReceived && VLTestDone === 1) {
      ovcVL = viralLoadResultsReceived === "true" ? 1 : 0;
    } else {
      ovcVL = 0;
    }
    if (ovcVL === 1) {
      copies = viralLoadCopies;
      VLSuppressed = viralLoadStatus === "Suppressed" ? 1 : 0;
    } else {
      ovcVL = 0;
      VLSuppressed = 0;
    }
  } else {
    VLTestDone = "";
    ovcEligible = "";
    ovcVL = "";
    VLStatus = "";
  }

  return { VLTestDone, ovcEligible, ovcVL, VLStatus, VLSuppressed };
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
  const instances = rows
    .map((r) => {
      return fromPairs(columns.map((c, i) => [c.name, r[i]]));
    })
    .filter(
      (x) =>
        x.trackedEntityInstance !== null &&
        x.trackedEntityInstance !== undefined &&
        x.trackedEntityInstance !== ""
    );
  const instanceIds = instances.map((i) => i.trackedEntityInstance);

  const previousLayer = await this.previousLayering(instanceIds);
  const [
    // vulnerabilityAssessments,
    homeVisits,
    hivRiskAssessments,
    viralLoads,
    // casePlannings,
    referrals,
    serviceLinkages,
    exposedInfants,
    hVatAssessments,
  ] = await Promise.all([
    // this.getProgramStageData(instanceIds, "TuLJEpHu0um"),
    this.getProgramStageData(instanceIds, "HaaSLv2ur0l"),
    this.getProgramStageData(instanceIds, "B9EI27lmQrZ"),
    this.getProgramStageData(instanceIds, "kKlAyGUnCML"),
    // this.getProgramStageData(instanceIds, "LATgKmbf7Yv"),
    this.getProgramStageData(instanceIds, "yz3zh5IFEZm"),
    this.getProgramStageData(instanceIds, "SxnXrDtSJZp"),
    this.getProgramStageData(instanceIds, "KOFm3jJl7n7"),
    this.getProgramStageData(
      Object.keys(indexCases),
      "sYE3K7fFM4Y",
      "trackedEntityInstance,eventDate,zbAGBW6PsGd,kQCB9F39zWO,iRJUDyUBLQF"
    ),
  ]);

  // console.log(viralLoads);
  for (const instance of instances) {
    const {
      enrollmentDate,
      orgUnit,
      hly709n51z0,
      HLKc2AKR9jW,
      N1nMqKtYKvI,
      nDUbdM2FjyP,
      h4pXErY01YR,
      umqeJCVp4Zq,
      HzUL8LTDPga,
      tHCT4RKXoiU,
      e0zEpTw7IH6,
      huFucxA3e5c,
      CfpoFtRmK1z,
      n7VQaJ8biOJ,
      trackedEntityInstance,
    } = instance;
    const { district, subCounty, orgUnitName, ...ous } =
      processedUnits[orgUnit] || {};
    const hasEnrollment = !!enrollmentDate;

    const hvat = !!hVatAssessments[hly709n51z0]
      ? sortBy(hVatAssessments[hly709n51z0], (e) => e.eventDate)
          .reverse()
          .filter((e) => !!e.eventDate)[0]
      : {};
    const { eventDate, zbAGBW6PsGd, kQCB9F39zWO, iRJUDyUBLQF } = hvat || {};
    const { Xkwy5P2JG24, ExnzeYjgIaT } = !!indexCases[hly709n51z0]
      ? indexCases[hly709n51z0][0]
      : {};
    let houseHoldType = "";

    const score18 = [zbAGBW6PsGd, kQCB9F39zWO, iRJUDyUBLQF].filter(
      (v) => v !== null && v !== undefined && v !== ""
    );
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
    const memberSessions = groupActivities[HLKc2AKR9jW] || [];
    let servedInTheQuarter = previousLayer[trackedEntityInstance] || {};
    for (const period of periods) {
      const quarterStart = period.startOf("quarter").toDate();
      const quarterEnd = period.endOf("quarter").toDate();
      const previousQuarter = moment(subQuarters(quarterStart, 1)).format(
        "YYYY[Q]Q"
      );
      const [financialQuarterStart, financialQuarterEnd] =
        this.calculateQuarter(quarterStart.getFullYear(), period.quarter());
      const qtr = period.format("YYYY[Q]Q");
      const isWithin = isWithinInterval(parseISO(enrollmentDate), {
        start: quarterStart,
        end: quarterEnd,
      });
      const age = differenceInYears(quarterEnd, parseISO(N1nMqKtYKvI));
      const ageGroup = this.findAgeGroup(age);
      const heiData = this.eventsBeforePeriod(
        this.getEvents(exposedInfants, trackedEntityInstance),
        quarterEnd
      );
      const homeVisitsBe4Quarter = this.eventsBeforePeriod(
        this.getEvents(homeVisits, trackedEntityInstance),
        quarterEnd
      );
      const referralsDuringYear = this.eventsWithinPeriod(
        this.getEvents(referrals, trackedEntityInstance),
        financialQuarterStart,
        financialQuarterEnd
      );

      const riskAssessmentsDuringYear = this.eventsWithinPeriod(
        this.getEvents(hivRiskAssessments, trackedEntityInstance),
        financialQuarterStart,
        financialQuarterEnd
      );

      const referralsDuringQuarter = this.eventsWithinPeriod(
        this.getEvents(referrals, trackedEntityInstance),
        quarterStart,
        quarterEnd
      );
      const serviceLinkagesDuringQuarter = this.eventsWithinPeriod(
        this.getEvents(serviceLinkages, trackedEntityInstance),
        quarterStart,
        quarterEnd
      );

      const homeVisitsDuringQuarter = this.eventsWithinPeriod(
        this.getEvents(homeVisits, trackedEntityInstance),
        quarterStart,
        quarterEnd
      );

      const viralLoadsBe4Quarter = this.eventsBeforePeriod(
        this.getEvents(viralLoads, trackedEntityInstance),
        quarterEnd
      );

      const viralLoadDuringQuarter = this.eventsWithinPeriod(
        this.getEvents(viralLoads, trackedEntityInstance),
        quarterStart,
        quarterEnd
      );

      const currentReferral = this.mostCurrentEvent(referralsDuringYear);
      const currentRiskAssessment = this.mostCurrentEvent(
        riskAssessmentsDuringYear
      );
      const serviceProvisionDuringQuarter = this.eventsWithinPeriod(
        this.getEvents(referrals, trackedEntityInstance),
        quarterStart,
        quarterEnd
      );

      const previousViralLoads = this.eventsBeforePeriod(
        this.getEvents(viralLoads, trackedEntityInstance),
        quarterStart
      );

      const previousReferrals = this.eventsBeforePeriod(
        this.getEvents(referrals, trackedEntityInstance),
        quarterStart
      );

      const hivResult = this.specificDataElement(
        currentReferral,
        "XTdRWh5MqPw"
      );

      const tbScreeningChild = this.checkRiskAssessment(currentRiskAssessment, [
        "DgCXKSDPTWn",
        "Rs5qrKay7Gq",
        "QEm2B8LZtzd",
        "X9n17I5Ibdf",
      ]);
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
      const tbScreeningAdult = this.checkRiskAssessment(currentRiskAssessment, [
        "If8hDeux5XE",
        "ha2nnIeFgbu",
        "NMtrXN3NBqY",
        "Oi6CUuucUCP",
      ]);

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

      const notAtRisk = this.checkRiskAssessment(
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

      const notAtRiskAdult = this.checkRiskAssessment(
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

      const serviceProvided = this.specificDataElement(
        currentReferral,
        "XWudTD2LTUQ"
      );
      const unknownOther = this.findAnyEventValue(
        riskAssessmentsDuringYear,
        "cTV8aMqnVbe"
      );
      const linked = this.deHasAnyValue(serviceProvided, [
        "Started HIV treatment",
        "PEP",
        "HCT/ Tested for HIV",
        "Intensive Adherence Counseling (IAC)",
        "Viral Load Testing",
        "Provided with ARVs",
      ]);
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
      const {
        eidEnrollmentDate,
        motherArtNo,
        eidNo,
        dateFirstPCRDone,
        firstPCRResults,
        dateSecondPCRDone,
        secondPCRResults,
        dateThirdPCRDone,
        thirdPCRResults,
        hivTestDueDate,
        dateHivTestDone,
        hivTestResults,
        finalOutcome,
        pcr,
      } = this.getHEIInformation(age, heiData);
      let riskFactor =
        this.findAnyEventValue(homeVisitsBe4Quarter, "rQBaynepqjy") ||
        nDUbdM2FjyP;

      const hivStatus = this.getHIVStatus(
        HzUL8LTDPga,
        hivResult,
        hivTestResults,
        viralLoadsBe4Quarter,
        riskFactor
      );

      // console.log(hivStatus);
      riskFactor = hivStatus === "+" && age < 18 ? "CLHIV" : riskFactor;

      const testedForHIV = serviceProvided === "HCT/ Tested for HIV" ? 1 : 0;
      const primaryCareGiver = nDUbdM2FjyP === "Primary caregiver" ? 1 : 0;
      const OVC_TST_REFER =
        serviceProvided && serviceProvided === "HCT/ Tested for HIV" ? 1 : 0;
      const OVC_TST_REPORT = hivResult && OVC_TST_REFER === 1 ? 1 : 0;
      const memberStatus =
        this.findAnyEventValue(homeVisitsBe4Quarter, "tM67MBdox3O") === "true"
          ? "Active"
          : this.findAnyEventValue(homeVisitsBe4Quarter, "VEw6HHnx8mR")
          ? this.findAnyEventValue(homeVisitsBe4Quarter, "VEw6HHnx8mR")
          : "No Home Visit";
      const householdStatus = !!this.findAnyEventValue(
        homeVisitsBe4Quarter,
        "PpUByWk3p8N"
      )
        ? this.findAnyEventValue(homeVisitsBe4Quarter, "PpUByWk3p8N")
        : hasEnrollment
        ? "Active"
        : "Not Enrolled";

      const enrolledInSchool = this.isAtSchool(age, "", h4pXErY01YR);

      const homeVisitor = this.findAnyEventValue(
        homeVisitsBe4Quarter,
        "i6XGAmzx3Ri"
      );

      const dataEntrant1 = Xkwy5P2JG24;

      const dataEntrant2 = this.findAnyEventValue(
        viralLoadDuringQuarter,
        "YY5zG4Bh898"
      );

      const dataEntrant =
        this.findAnyEventValue(homeVisitsDuringQuarter, "YY5zG4Bh898") ||
        dataEntrant1 ||
        dataEntrant2;

      const homeVisitorContact = this.findAnyEventValue(
        homeVisitsBe4Quarter,
        "BMzryoryhtX"
      );
      const newlyEnrolled = isWithin ? "Yes" : "No";

      const { VLTestDone, ovcEligible, ovcVL, VLStatus, VLSuppressed } =
        this.hivInformation(
          artStartDate,
          hivStatus,
          quarterEnd,
          lastViralLoadDate,
          viralTestDone,
          viralLoadResultsReceived,
          viralLoadCopies,
          viralLoadStatus
        );

      let onArt = "";
      let facility = this.findAnyEventValue(
        viralLoadsBe4Quarter,
        "usRWNcogGX7"
      );
      let artNo = this.findAnyEventValue(viralLoadsBe4Quarter, "aBc9Lr1z25H");
      let On_ART_HVAT = "";
      if (this.findAnyEventValue(viralLoadsBe4Quarter, "xyDBnQTdZqS")) {
        onArt = this.findAnyEventValue(viralLoadsBe4Quarter, "xyDBnQTdZqS")
          ? 1
          : "";
      } else if (hivStatus === "+") {
        onArt = "No VL";
      } else {
        onArt = "";
      }

      if (hivStatus !== "+" && umqeJCVp4Zq === "NA") {
        On_ART_HVAT = "";
      } else if (hivStatus === "+") {
        On_ART_HVAT = umqeJCVp4Zq === "Yes" ? 1 : 0;
      }

      const VSLA = this.hadASession(memberSessions, quarterStart, quarterEnd, [
        ...sessions["VSLA Methodology"],
        ...sessions["VSLA TOT"],
        ...sessions["Saving and Borrowing"],
      ])
        ? 1
        : 0;

      const fLiteracy = this.hadASession(
        memberSessions,
        quarterStart,
        quarterEnd,
        sessions["Financial Literacy"]
      )
        ? 1
        : 0;
      const fHomeBasedLiteracy =
        (this.anyEventWithDE(homeVisitsDuringQuarter, "PBiFAeCVnot") ||
          this.anyEventWithDE(homeVisitsDuringQuarter, "Xlw16qiDxqk") ||
          this.anyEventWithDE(homeVisitsDuringQuarter, "rOTbGzSfKbs")) &&
        age >= 15
          ? 1
          : 0;

      const bankLinkages =
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
          memberSessions,
          quarterStart,
          quarterEnd,
          sessions["Bank Linkages"]
        )
          ? 1
          : 0;

      const agriBusiness = this.anyEventWithAnyOfTheValue(
        serviceLinkagesDuringQuarter,
        "NxQ4EZUB0fr",
        [
          "A1. Input Markets through voucher",
          "A2. input such as seeds and poultry",
          "A3. training in agricultural production",
        ]
      )
        ? 1
        : 0;
      const spmTraining = this.hadASession(
        memberSessions,
        quarterStart,
        quarterEnd,
        sessions["SPM Training"]
      )
        ? 1
        : 0;

      const micro = this.anyEventWithAnyOfTheValue(
        serviceLinkagesDuringQuarter,
        "NxQ4EZUB0fr",
        ["B1. Access to credit services", "B2. Access to saving services"]
      )
        ? 1
        : 0;

      const igaBooster = this.anyEventWithAnyOfTheValue(
        serviceLinkagesDuringQuarter,
        "NxQ4EZUB0fr",
        ["O3. IGA Booster"]
      )
        ? 1
        : 0;

      const tempConsumption =
        this.anyEventWithAnyOfTheValue(
          serviceLinkagesDuringQuarter,
          "NxQ4EZUB0fr",
          ["UF12 Temporary Food Support"]
        ) ||
        this.anyEventWithAnyOfTheValue(referralsDuringQuarter, "XWudTD2LTUQ", [
          "Temporary Food Support",
        ])
          ? 1
          : 0;

      const vlsaOvcFund = this.anyEventWithAnyOfTheValue(
        serviceLinkagesDuringQuarter,
        "NxQ4EZUB0fr",
        ["UF3 VSLA OVC protection Fund"]
      )
        ? 1
        : 0;
      const educationFund = this.anyEventWithAnyOfTheValue(
        serviceLinkagesDuringQuarter,
        "NxQ4EZUB0fr",
        ["UF09 OVC VSLA Education Fund"]
      )
        ? 1
        : 0;
      const educationSubsidy =
        this.anyEventWithAnyOfTheValue(
          serviceLinkagesDuringQuarter,
          "NxQ4EZUB0fr",
          ["O1. Education subsidy"]
        ) ||
        this.anyEventWithAnyOfTheValue(referralsDuringQuarter, "XWudTD2LTUQ", [
          "Educational support",
        ])
          ? 1
          : 0;
      const nonFormalEducation =
        this.anyEventWithAnyOfTheValue(
          serviceLinkagesDuringQuarter,
          "NxQ4EZUB0fr",
          ["O2. None Formal Education"]
        ) ||
        this.anyEventWithAnyOfTheValue(referralsDuringQuarter, "XWudTD2LTUQ", [
          "Vocational/Apprenticeship",
        ])
          ? 1
          : 0;
      const homeLearning = this.anyEventWithAnyOfTheValue(
        serviceLinkagesDuringQuarter,
        "NxQ4EZUB0fr",
        ["Home Learning"]
      )
        ? 1
        : 0;
      const healthFund = this.anyEventWithAnyOfTheValue(
        serviceLinkagesDuringQuarter,
        "NxQ4EZUB0fr",
        ["UF10 OVC VSLA Health Fund"]
      )
        ? 1
        : 0;

      const educationInformation =
        (this.anyEventWithDE(homeVisitsDuringQuarter, "sTyaaJxvR5S") ||
          this.anyEventWithDE(homeVisitsDuringQuarter, "oyQActIi370") ||
          this.anyEventWithDE(homeVisitsDuringQuarter, "P7nd91Mkhol") ||
          this.anyEventWithDE(homeVisitsDuringQuarter, "leNiACgoBcL")) &&
        age >= 6
          ? 1
          : 0;
      const HTSReferral =
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
          ? 1
          : 0;

      const nonDisclosureSupport =
        this.anyEventWithDE(homeVisitsDuringQuarter, "rLc3CF2VeOC") ||
        this.anyEventWithDE(homeVisitsDuringQuarter, "xSS9QHbuT4S")
          ? 1
          : 0;
      const artInitiation = this.anyEventWithAnyOfTheValue(
        referralsDuringQuarter,
        "XWudTD2LTUQ",
        ["Initiated on HIV Treatment"]
      )
        ? 1
        : 0;

      const homeDrugDelivery = this.deHasAnyValue(serviceProvided, [
        "Home drug delivery",
      ]);

      const artAdherenceEducation =
        this.anyEventWithDE(homeVisitsDuringQuarter, "NxhBKqINsZY") ||
        this.anyEventWithDE(homeVisitsDuringQuarter, "svrj6VtHjay") ||
        this.anyEventWithDE(homeVisitsDuringQuarter, "NJZ13SXf8XV")
          ? 1
          : 0;

      const iac =
        this.anyEventWithDataElement(
          viralLoadDuringQuarter,
          "iHdNYfm1qlz",
          "true"
        ) ||
        this.anyEventWithAnyOfTheValue(referralsDuringQuarter, "XWudTD2LTUQ", [
          "Intensive Adherence Counseling (IAC)",
        ])
          ? 1
          : 0;
      const eMTCT =
        this.anyEventWithDE(homeVisitsDuringQuarter, "SrEP2vZtMHV") ||
        this.anyEventWithDE(homeVisitsDuringQuarter, "ffxCn2msT1R") ||
        this.anyEventWithAnyOfTheValue(referralsDuringQuarter, "XWudTD2LTUQ", [
          "EMTCT",
        ])
          ? 1
          : 0;

      const hivPrevention = this.anyEventWithDE(
        homeVisitsDuringQuarter,
        "xXqKqvuwA8m"
      )
        ? 1
        : 0;

      const journeysMOH = this.hasCompleted(
        memberSessions,
        quarterEnd,
        sessions["MOH Journeys curriculum"],
        this.mapping2["MOH Journeys curriculum"]
      )
        ? 1
        : 0;

      const journeysLARA = this.hasCompleted(
        memberSessions,
        quarterEnd,
        sessions["MOE Journeys Plus"],
        this.mapping2["MOE Journeys Plus"]
      )
        ? 1
        : 0;

      const NMNBoys = this.hasCompleted(
        memberSessions,
        quarterEnd,
        sessions["No means No sessions (Boys)"],
        this.mapping2["No means No sessions (Boys)"]
      )
        ? 1
        : 0;

      const NMNGirls = this.hasCompleted(
        memberSessions,
        quarterEnd,
        sessions["No means No sessions (Girls)"],
        this.mapping2["No means No sessions (Girls)"]
      )
        ? 1
        : 0;
      const TFHealth = this.anyEventWithAnyOfTheValue(
        serviceLinkagesDuringQuarter,
        "NxQ4EZUB0fr",
        ["Transport to Facility"]
      )
        ? 1
        : 0;

      const PEP = this.anyEventWithAnyOfTheValue(
        serviceProvisionDuringQuarter,
        "XWudTD2LTUQ",
        ["PEP"]
      )
        ? 1
        : 0;

      const covid19Education = this.anyEventWithDE(
        homeVisitsDuringQuarter,
        "RtQudbqa6XH"
      )
        ? 1
        : 0;

      const immunization = this.anyEventWithAnyOfTheValue(
        referralsDuringQuarter,
        "XWudTD2LTUQ",
        ["Immunisation"]
      )
        ? 1
        : 0;

      const wash =
        this.anyEventWithDE(homeVisitsDuringQuarter, "eEZu3v92pJZ") ||
        this.anyEventWithAnyOfTheValue(referralsDuringQuarter, "XWudTD2LTUQ", [
          "WASH",
        ])
          ? 1
          : 0;

      const treatedNets = this.anyEventWithAnyOfTheValue(
        referralsDuringQuarter,
        "XWudTD2LTUQ",
        ["Insecticide Treated Nets"]
      )
        ? 1
        : 0;

      const familyPlanning = this.anyEventWithAnyOfTheValue(
        referralsDuringQuarter,
        "XWudTD2LTUQ",
        ["Family planning services"]
      )
        ? 1
        : 0;
      const initiatedOnTB = this.anyEventWithAnyOfTheValue(
        referralsDuringQuarter,
        "XWudTD2LTUQ",
        ["Initiated on TB Treatment"]
      )
        ? 1
        : 0;
      const tested4TB = this.anyEventWithAnyOfTheValue(
        referralsDuringQuarter,
        "XWudTD2LTUQ",
        ["Tested for TB"]
      )
        ? 1
        : 0;

      const supported2CompleteTBDose = this.anyEventWithAnyOfTheValue(
        referralsDuringQuarter,
        "XWudTD2LTUQ",
        ["Supported to Complete TB Dose"]
      )
        ? 1
        : 0;

      const viralLoadBleeding =
        this.anyEventWithAnyOfTheValue(referralsDuringQuarter, "XWudTD2LTUQ", [
          "Viral Load Testing",
        ]) ||
        this.anyEventWithAnyOfTheValue(
          serviceLinkagesDuringQuarter,
          "NxQ4EZUB0fr",
          ["HTS7. Viral load test"]
        )
          ? 1
          : 0;

      const returnedToCare = this.anyEventWithAnyOfTheValue(
        serviceLinkagesDuringQuarter,
        "NxQ4EZUB0fr",
        ["PLHIV Returned to care"]
      )
        ? 1
        : 0;

      const otherHealthServices =
        this.anyEventWithDE(homeVisitsDuringQuarter, "eEZu3v92pJZ") ||
        this.anyEventWithDE(homeVisitsDuringQuarter, "D7rrGXWwjGn") ||
        this.anyEventWithDE(homeVisitsDuringQuarter, "CnfRJ2y4Lg8")
          ? 1
          : 0;

      const tbScreening =
        (tbScreeningChild === 4 && age < 16) ||
        (tbScreeningAdult === 4 && age > 17) ||
        (tbScreeningChild17 === 4 && age >= 16)
          ? 1
          : 0;

      const GBVPreventionEducation =
        this.anyEventWithDE(homeVisitsDuringQuarter, "ENMOyjoE2GM") ||
        this.anyEventWithDE(homeVisitsDuringQuarter, "ak7SceZTDsF") ||
        this.anyEventWithDE(homeVisitsDuringQuarter, "HqbcvvZAc9w") ||
        this.anyEventWithDE(homeVisitsDuringQuarter, "H4YhW8kTs2P") ||
        this.anyEventWithDE(homeVisitsDuringQuarter, "kpWBIc81VKL") ||
        this.anyEventWithDE(homeVisitsDuringQuarter, "pm7k8wuOTLt") ||
        this.anyEventWithDE(homeVisitsDuringQuarter, "a0lXaMhHh32") ||
        this.anyEventWithDE(homeVisitsDuringQuarter, "plFdhIhcP8X")
          ? 1
          : 0;

      const atRiskOfTB =
        (atTBRiskChild >= 5 && age < 16) ||
        (atTBRiskAdult >= 5 && age > 17) ||
        (atTBRiskChild17 >= 5 && age >= 16)
          ? 1
          : 0;

      const TFGBV =
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
          : 0;

      const referral4LegalSupport = this.anyEventWithDataElement(
        referralsDuringQuarter,
        "EDa2GQUCbsx",
        "Legal Support"
      )
        ? 1
        : 0;

      const ECD = this.hadASession(
        memberSessions,
        quarterStart,
        quarterEnd,
        sessions["ECD"]
      )
        ? 1
        : 0;

      const parenting = this.hasCompletedWithin(
        memberSessions,
        quarterStart,
        quarterEnd,
        sessions["SINOVUYO"],
        this.mapping2["SINOVUYO"]
      )
        ? 1
        : 0;

      const parentingAttended = this.hadASession(
        memberSessions,
        quarterStart,
        quarterEnd,
        sessions["SINOVUYO"]
      )
        ? 1
        : 0;

      const childProtectionEducation =
        this.anyEventWithDE(homeVisitsDuringQuarter, "cgnfO3xqaYb") ||
        this.anyEventWithDE(homeVisitsDuringQuarter, "bJPqgTbbt8g") ||
        this.anyEventWithDE(homeVisitsDuringQuarter, "UlQEavBni01") ||
        this.anyEventWithDE(homeVisitsDuringQuarter, "v6zHvL8w9ex")
          ? 1
          : 0;

      const nutritionEducation =
        this.anyEventWithDE(homeVisitsDuringQuarter, "FGs1bkmfoTX") ||
        this.anyEventWithDE(homeVisitsDuringQuarter, "BDVZPgVPVww") ||
        this.anyEventWithDE(homeVisitsDuringQuarter, "p9EaFSIg3ht") ||
        this.anyEventWithDE(homeVisitsDuringQuarter, "Eg1yxmjMfG7")
          ? 1
          : 0;

      const nutritionalFoodSupplement = this.deHasAnyValue(serviceProvided, [
        "Food supplement",
      ]);

      const nutritionalAssessment = this.deHasAnyValue(serviceProvided, [
        "Nutritional assessment",
      ]);
      const voucher4CropsOrKitchenGardens = this.anyEventWithAnyOfTheValue(
        serviceLinkagesDuringQuarter,
        "NxQ4EZUB0fr",
        ["A1. Input Markets through voucher", "M3 Input Vouchers"]
      )
        ? 1
        : 0;

      const kitchenGarden = this.anyEventWithAnyOfTheValue(
        serviceLinkagesDuringQuarter,
        "NxQ4EZUB0fr",
        ["A2. input such as seeds and poultry"]
      )
        ? 1
        : 0;

      const psychosocialSupport =
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
          : 0;

      const coreES =
        VSLA === 1 ||
        fLiteracy === 1 ||
        fHomeBasedLiteracy === 1 ||
        bankLinkages === 1 ||
        agriBusiness === 1 ||
        spmTraining === 1 ||
        micro === 1 ||
        igaBooster === 1 ||
        tempConsumption ||
        vlsaOvcFund === 1
          ? 1
          : 0;
      const coreEducation =
        educationSubsidy === 1 ||
        homeLearning === 1 ||
        nonFormalEducation === 1 ||
        educationInformation === 1 ||
        educationFund === 1
          ? 1
          : 0;
      const coreHealth =
        HTSReferral === 1 ||
        nonDisclosureSupport === 1 ||
        artInitiation === 1 ||
        artAdherenceEducation === 1 ||
        iac === 1 ||
        eMTCT === 1 ||
        hivPrevention === 1 ||
        journeysMOH === 1 ||
        journeysLARA === 1 ||
        NMNBoys === 1 ||
        NMNGirls === 1 ||
        TFHealth === 1 ||
        PEP === 1 ||
        covid19Education === 1 ||
        otherHealthServices === 1 ||
        homeDrugDelivery === 1 ||
        tested4TB ||
        initiatedOnTB ||
        wash ||
        treatedNets ||
        familyPlanning ||
        healthFund ||
        TFHealth ||
        supported2CompleteTBDose ||
        immunization === 1
          ? 1
          : 0;

      const coreChildProtection =
        GBVPreventionEducation === 1 ||
        TFGBV === 1 ||
        referral4LegalSupport === 1 ||
        ECD === 1 ||
        parentingAttended === 1 ||
        childProtectionEducation === 1
          ? 1
          : 0;

      const coreNutrition =
        nutritionEducation === 1 ||
        voucher4CropsOrKitchenGardens === 1 ||
        nutritionalAssessment === 1 ||
        kitchenGarden === 1 ||
        nutritionalFoodSupplement === 1
          ? 1
          : 0;

      const corePSS = psychosocialSupport === 1 ? 1 : 0;
      const quarter =
        coreES === 1 ||
        coreEducation === 1 ||
        coreHealth === 1 ||
        coreChildProtection === 1 ||
        coreNutrition === 1 ||
        corePSS === 1
          ? 1
          : 0;
      servedInTheQuarter = { ...servedInTheQuarter, [qtr]: quarter };
      const servedInPreviousQuarter = servedInTheQuarter[previousQuarter] || 0;

      let OVC_SERV = 0;
      let OVC_ENROL = 0;
      if (newlyEnrolled === "Yes" && quarter === 1) {
        OVC_SERV = 1;
      } else if (quarter === 1 && servedInPreviousQuarter === 1) {
        OVC_SERV = 1;
      } else {
        OVC_SERV = 0;
      }

      if (age < 18 && ovcVL === 1 && OVC_SERV === 1) {
        OVC_ENROL = 1;
      } else if (age < 18 && hivStatus === "+") {
        OVC_ENROL = 0;
      }
      let OVC_SERV_SUBPOP = risks[riskFactor] || riskFactor;
      const OVC_HIV_STAT =
        hivStatus === "+" ||
        hivStatus === "-" ||
        ([0, 3, 6].indexOf(notAtRisk) !== -1 &&
          [0, 3, 6].indexOf(notAtRiskAdult) !== -1 &&
          hivStatus === "DK")
          ? 1
          : 0;

      let riskAssessment = 0;
      if (riskAssessmentsDuringYear.length > 0 && hivStatus !== "+") {
        riskAssessment = 1;
      } else if (hivStatus === "+") {
        riskAssessment = "";
        isAtRisk = "";
      } else {
        riskAssessment = 0;
        isAtRisk = 0;
      }

      if (riskAssessment === 1) {
        if (age < 18 && [0, 3, 6].indexOf(notAtRisk) !== -1) {
          isAtRisk = 0;
        } else if (age >= 18 && [0, 3, 6].indexOf(notAtRiskAdult) !== -1) {
          isAtRisk = 0;
        } else if (
          [0, 3, 6].indexOf(notAtRiskAdult) === -1 ||
          [0, 3, 6].indexOf(notAtRisk) === -1
        ) {
          isAtRisk = 1;
        }
      }
      let isNotAtRisk = 0;
      if (hivStatus !== "+") {
        if (
          [0, 3, 6].indexOf(notAtRiskAdult) !== -1 ||
          [0, 3, 6].indexOf(notAtRisk) !== -1
        ) {
          isNotAtRisk = 1;
        } else {
          isNotAtRisk = 0;
        }
      }
      let unknown = "";
      if (hivStatus !== "+" && hivStatus !== "-" && isNotAtRisk !== 1) {
        if (riskFactor === "HEI" && hivStatus === "DK" && age <= 2) {
          unknown = "HEI";
        } else if (!!unknownOther) {
          unknown = unknownOther;
        } else {
          unknown = "Other reasons";
        }
      }
      let newlyPositive = 0;
      if (newlyEnrolled === "Yes" && hivStatus === "+") {
        newlyPositive = 1;
      } else if (hivStatus === "+") {
        if (
          instance.HzUL8LTDPga === "Negative" &&
          previousViralLoads.length === 0 &&
          this.allValues4DataElement(
            previousReferrals,
            "XTdRWh5MqPw",
            "Negative"
          )
        ) {
          newlyPositive = 1;
        } else {
          newlyPositive = 0;
        }
      }
      let newlyTestedPositive = 0;
      if (
        newlyPositive &&
        !!artStartDate &&
        isWithinInterval(parseISO(artStartDate), {
          start: financialQuarterStart,
          end: financialQuarterEnd,
        })
      ) {
        newlyTestedPositive = 0;
      } else if (
        newlyPositive &&
        this.hasDataElementWithinPeriod(
          referralsDuringYear,
          "XTdRWh5MqPw",
          "Positive"
        )
      ) {
        newlyTestedPositive = 1;
      } else if (hivStatus === "+") {
        newlyTestedPositive = 0;
      }

      let newlyTestedAndOnArt = 0;
      if (
        newlyTestedPositive &&
        artStartDate &&
        onArt &&
        isWithinInterval(parseISO(artStartDate), {
          start: financialQuarterStart,
          end: financialQuarterEnd,
        })
      ) {
        newlyTestedAndOnArt = 1;
      } else if (serviceProvided === "Started HIV treatment") {
        newlyTestedAndOnArt = 1;
      }
      let exitedWithGraduation = "";
      if (
        memberStatus === "Active" &&
        OVC_SERV === 0 &&
        servedInPreviousQuarter === 0 &&
        quarter === 0 &&
        newlyEnrolled === "No"
      ) {
        exitedWithGraduation = "Not served in both qtrs";
      } else if (OVC_SERV === 0 && quarter === 0 && memberStatus === "Active") {
        exitedWithGraduation = "Not served current qtr";
      } else if (
        OVC_SERV === 0 &&
        servedInPreviousQuarter === 0 &&
        memberStatus === "Active"
      ) {
        exitedWithGraduation = "Not served previous qtr";
      } else if (OVC_SERV === 0 && memberStatus === "No Home Visit") {
        exitedWithGraduation = "Not served in both qtrs";
      } else if (OVC_SERV === 0) {
        exitedWithGraduation = memberStatus;
      }
      layering.push({
        id: `${trackedEntityInstance}${qtr}`,
        qtr,
        houseHoldType,
        HLKc2AKR9jW,
        e0zEpTw7IH6,
        tHCT4RKXoiU,
        enrollmentDate,
        type: "Comprehensive",
        district: district || "",
        subCounty: subCounty || "",
        orgUnitName,
        Xkwy5P2JG24,
        ExnzeYjgIaT,
        primaryCareGiver,
        eventDate,
        huFucxA3e5c,
        N1nMqKtYKvI,
        age,
        ageGroup,
        CfpoFtRmK1z,
        weight,
        riskFactor,
        houseHoldType,
        householdStatus,
        memberStatus,
        enrolledInSchool,
        newlyEnrolled,
        hivStatus,
        riskAssessment,
        isAtRisk,
        OVC_TST_REFER,
        OVC_TST_REPORT,
        isNotAtRisk,
        unknown,
        linked,
        testedForHIV,
        newlyPositive,
        newlyTestedPositive,
        newlyTestedAndOnArt,
        artStartDate,
        n7VQaJ8biOJ,
        artNo,
        umqeJCVp4Zq,
        facility,
        lastViralLoadDate,
        currentRegimen: regimen,
        onArt,
        ovcEligible,
        VLTestDone,
        ovcVL,
        VLStatus,
        copies: viralLoadCopies,
        VLSuppressed,
        eidNo,
        eidEnrollmentDate,
        motherArtNo,
        dateFirstPCRDone,
        firstPCRResults,
        dateSecondPCRDone,
        secondPCRResults,
        dateThirdPCRDone,
        thirdPCRResults,
        hivTestDueDate,
        dateHivTestDone,
        hivTestResults,
        finalOutcome,
        pcr,
        VSLA,
        fLiteracy,
        fHomeBasedLiteracy,
        bankLinkages,
        agriBusiness,
        spmTraining,
        micro,
        igaBooster,
        tempConsumption,
        vlsaOvcFund,
        coreES,
        educationSubsidy,
        homeLearning,
        nonFormalEducation,
        educationInformation,
        educationFund,
        coreEducation,
        healthFund,
        HTSReferral,
        nonDisclosureSupport,
        artInitiation,
        homeDrugDelivery,
        artAdherenceEducation,
        viralLoadBleeding,
        returnedToCare,
        iac,
        eMTCT,
        hivPrevention,
        journeysMOH,
        journeysLARA,
        NMNBoys,
        NMNGirls,
        TFHealth,
        PEP,
        covid19Education,
        immunization,
        wash,
        treatedNets,
        familyPlanning,
        tbScreening,
        atRiskOfTB,
        tested4TB,
        initiatedOnTB,
        supported2CompleteTBDose,
        otherHealthServices,
        coreHealth,
        GBVPreventionEducation,
        TFGBV,
        referral4LegalSupport,
        ECD,
        parentingAttended,
        parenting,
        childProtectionEducation,
        coreChildProtection,
        nutritionEducation,
        voucher4CropsOrKitchenGardens,
        kitchenGarden,
        nutritionalAssessment,
        nutritionalFoodSupplement,
        coreNutrition,
        psychosocialSupport,
        corePSS,
        quarter,
        servedInPreviousQuarter,
        graduated: "",
        OVC_SERV,
        OVC_ENROL,
        OVC_SERV_SUBPOP,
        OVC_HIV_STAT,
        exitedWithGraduation,
        otherPERFARIP: "",
        otherIP: "",
        On_ART_HVAT,
        homeVisitor,
        homeVisitorContact,
        dataEntrant,
        ...ous,
        generated: new Date().toISOString(),
      });
    }
  }

  const inserted = await Promise.all(
    chunk(layering, 100).map((c) => {
      return this.api.post(`wal/index?index=layering`, {
        data: c,
      });
    })
  );
  const total = sum(
    inserted.map(({ data: { items } }) => (!!items ? items.length : 0))
  );
  console.log(total);
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
  processedUnits,
  periods,
  sessions
) => {
  const indexCases = await this.fetchRelationships4Instances(
    trackedEntityInstances
  );
  const groupActivities = await this.fetchGroupActivities4Instances(
    trackedEntityInstances
  );

  await this.processInstances(
    trackedEntityInstances,
    periods,
    sessions,
    indexCases,
    processedUnits,
    groupActivities
  );
};
module.exports.useTracker = async (
  periods = [
    moment().subtract(3, "quarters"),
    moment().subtract(2, "quarters"),
    moment().subtract(1, "quarters"),
    moment(),
  ],
  instances = []
) => {
  const processedUnits = await this.fetchUnits4Instances();
  let query = {
    query: `select * from "rdeklsxcd4c" order by hly709n51z0`,
    fetch_size: 1000,
  };
  if (instances.length > 0) {
    query = {
      ...query,
      filter: {
        terms: {
          ["trackedEntityInstance.keyword"]: instances,
        },
      },
    };
  }
  const { data } = await this.api.post("wal/sql", query);
  const { sessions } = await this.useLoader();
  let { columns, rows, cursor: currentCursor } = data;
  await this.generate({ rows, columns }, processedUnits, periods, sessions);
  if (currentCursor) {
    do {
      const {
        data: { rows, cursor },
      } = await this.api.post("wal/sql", { cursor: currentCursor });
      await this.generate({ rows, columns }, processedUnits, periods, sessions);
      currentCursor = cursor;
    } while (!!currentCursor);
  }
};

module.exports.flattenInstances = async (
  trackedEntityInstances,
  program,
  chunkSize
) => {
  let instances = [];
  let calculatedEvents = [];
  for (const {
    trackedEntityInstance,
    orgUnit,
    attributes,
    enrollments,
    inactive,
    deleted,
    relationships,
  } of trackedEntityInstances) {
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
      for (const {
        events,
        program,
        orgUnitName,
        enrollmentDate,
        incidentDate,
      } of enrollments) {
        {
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
            for (const {
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
            } of events) {
              calculatedEvents.push({
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
              });
            }
          }
        }
      }
    }
  }
  const foundEvents = groupBy(calculatedEvents, "programStage");
  try {
    const requests = Object.entries(foundEvents).flatMap(([stage, events]) => {
      return chunk(events, chunkSize).map((c) => {
        return this.api.post(`wal/index?index=${stage.toLowerCase()}`, {
          data: c,
        });
      });
    });
    const inserted = await Promise.all([
      ...chunk(instances, chunkSize).map((c) => {
        return this.api.post(`wal/index?index=${program.toLowerCase()}`, {
          data: c,
        });
      }),
      ...requests,
    ]);
    const total = sum(
      inserted.map(
        ({ data: { items } }) =>
          items.filter((i) => i.index.error === undefined).length
      )
    );

    const errors = sum(
      inserted.map(
        ({ data: { items } }) =>
          items.filter((i) => i.index.error !== undefined).length
      )
    );
    console.log(`total:${total}`);
    console.log(`errors:${errors}`);
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
  chunkSize,
  otherParams = {}
) => {
  let processed = [];
  let params = {
    fields: "*",
    ouMode: "ALL",
    program,
    totalPages: true,
    pageSize,
    page: 1,
    ...otherParams,
  };
  const {
    data: {
      trackedEntityInstances,
      pager: { pageCount },
    },
  } = await this.instance.get("trackedEntityInstances.json", { params });

  await this.flattenInstances(trackedEntityInstances, program, chunkSize);
  processed = [
    ...processed,
    trackedEntityInstances.map(
      ({ trackedEntityInstance }) => trackedEntityInstance
    ),
  ];
  for (let page = 2; page <= pageCount; page++) {
    console.log(`Working on page ${page} of ${pageCount}`);
    const {
      data: { trackedEntityInstances },
    } = await this.instance.get("trackedEntityInstances.json", {
      params: { ...params, page },
    });
    await this.flattenInstances(trackedEntityInstances, program, chunkSize);
    processed = [
      ...processed,
      trackedEntityInstances.map(
        ({ trackedEntityInstance }) => trackedEntityInstance
      ),
    ];
  }
  return processed;
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
