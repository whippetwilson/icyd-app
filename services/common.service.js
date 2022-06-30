"use strict";

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

module.exports = {
  name: "common",

  /**
   * Settings
   */
  settings: {},

  /**
   * Dependencies
   */
  dependencies: [],

  /**
   * Actions
   */
  actions: {
    findAgeGroup: {
      async handler(ctx) {
        const { age } = ctx.params;

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
      },
    },
    mapping: {
      async handler() {
        return {
          "MOE Journeys Plus": "Completed MOE Journeys Plus",
          "MOH Journeys curriculum": "Completed MOH Journeys",
          "No means No sessions (Boys)": "Completed NMN Boys",
          "No means No sessions (Girls)": "Completed NMN Girls",
          "No means No sessions (Boys) New Curriculum":
            "Completed NMN Boys New Curriculum",
        };
      },
    },
    mapping2: {
      async handler() {
        return {
          "MOE Journeys Plus": 18,
          "MOH Journeys curriculum": 22,
          "No means No sessions (Boys)": 4,
          "No means No sessions (Girls)": 5,
          "No means No sessions (Boys) New Curriculum": 8,
          SINOVUYO: 10,
        };
      },
    },

    hadASession: {
      async handler(ctx) {
        const {
          allSessions,
          participantIndex,
          sessionNameIndex,
          sessionDateIndex,
          participant,
          startDate,
          endDate,
          sessions,
        } = ctx.params;
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
      },
    },
    hasCompleted: {
      async handler(ctx) {
        const {
          allSessions,
          participantIndex,
          sessionNameIndex,
          sessionDateIndex,
          participant,
          endDate,
          sessions,
          value,
        } = ctx.params;
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
      },
    },
    hasCompletedWithin: {
      async handler(ctx) {
        const {
          allSessions,
          participantIndex,
          sessionNameIndex,
          sessionDateIndex,
          participant,
          startDate,
          endDate,
          sessions,
          value,
        } = ctx.params;
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
      },
    },
    hasCompletedAtLeast1: {
      async handler(ctx) {
        const {
          allSessions,
          participantIndex,
          sessionNameIndex,
          sessionDateIndex,
          participant,
          endDate,
          sessions,
        } = ctx.params;
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
      },
    },
    isAtSchool: {
      async handler(ctx) {
        const { age, homeVisitValue, enrollmentValue } = ctx.params;
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
      },
    },
    mostCurrentEvent: {
      async handler(ctx) {
        const { events } = ctx.params;
        return maxBy(events, "eventDate");
      },
    },
    eventsBeforePeriod: {
      async handler(ctx) {
        const { events, programStage, end } = ctx.params;
        return events.filter((e) => {
          return (
            e.programStage === programStage &&
            isBefore(parseISO(e.eventDate), end)
          );
        });
      },
    },
    eventsWithinPeriod: {
      async handler(ctx) {
        const { events, programStage, start, end } = ctx.params;
        return events.filter((e) => {
          return (
            e.eventDate &&
            e.programStage === programStage &&
            isWithinInterval(parseISO(e.eventDate), { start, end })
          );
        });
      },
    },
    findAnyEventValue: {
      async handler(ctx) {
        const { events, dataElement } = ctx.params;
        const sortedEvents = sortBy(events, (e) => e.eventDate).reverse();
        const event = sortedEvents.find(
          ({ [dataElement]: de }) => de !== null && de !== undefined
        );
        if (event) {
          return event[dataElement];
        }
        return null;
      },
    },
    allValues4DataElement: {
      async handler(ctx) {
        const { events, dataElement, value } = ctx.params;
        if (events.length > 0) {
          return events.every((e) => e[dataElement] === value);
        }
        return true;
      },
    },
    anyEventWithDataElement: {
      async handler(ctx) {
        const { events, dataElement, value } = ctx.params;
        if (events.length === 0) {
          return false;
        }
        const processed = events.find((event) => {
          return event[dataElement] === value;
        });
        return !!processed;
      },
    },
    anyEventWithDE: {
      async handler(ctx) {
        const { events, dataElement } = ctx.params;

        if (events.length === 0) {
          return false;
        }
        const processed = events.find((event) => {
          return has(event, dataElement);
        });
        return !!processed;
      },
    },
    anyEventWithAnyOfTheValue: {
      async handler(ctx) {
        const { events, dataElement, values } = ctx.params;
        const processed = events.find((event) => {
          return values.indexOf(event[dataElement]) !== -1;
        });
        if (processed) {
          return true;
        }
        return false;
      },
    },
    specificDataElement: {
      async handler(ctx) {
        const { event, dataElement } = ctx.params;
        if (event) {
          return event[dataElement];
        }
        return null;
      },
    },
    hasAYes: {
      async handler(ctx) {
        const { event, dataElements } = ctx.params;
        if (event) {
          const de = dataElements.map((de) => !!event[de]);
          return de.includes(true);
        }
        return false;
      },
    },
    allHaveValue: {
      async handler(ctx) {
        const { event, dataElements, value } = ctx.params;

        if (event) {
          const de = dataElements
            .map((de) => event[de])
            .filter((v) => v !== undefined);
          const result =
            every(de, (v) => v === value) && de.length === dataElements.length;
          return result;
        }
        return false;
      },
    },
    checkRiskAssessment: {
      async handler(ctx) {
        const { event, dataElements, value } = ctx.params;
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
      },
    },
    hasDataElementWithinPeriod: {
      async handler(ctx) {
        const { events, dataElement, value } = ctx.params;
        return !!events.find((e) => e[dataElement] === value);
      },
    },
    deHasAnyValue: {
      async handler(ctx) {
        const { de, values } = ctx.params;
        if (de && values.indexOf(de) !== -1) {
          return 1;
        }
        return 0;
      },
    },
  },

  /**
   * Events
   */
  events: {},

  /**
   * Methods
   */
  methods: {},

  /**
   * Service created lifecycle event handler
   */
  created() {},

  /**
   * Service started lifecycle event handler
   */
  async started() {},

  /**
   * Service stopped lifecycle event handler
   */
  async stopped() {},
};
