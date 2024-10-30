"use strict";
const BullMqMixin = require("moleculer-bullmq");
const { groupBy, chunk, uniq, sum } = require("lodash");
const moment = require("moment");
const {
	flattenInstances,
	processOrganisations,
	processPreviousLayering,
	generateLayering,
	processBulkInserts,
} = require("../process");
/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

module.exports = {
	name: "wal",
	mixins: [BullMqMixin],

	/**
	 * Settings
	 */
	settings: {
		bullmq: {
			worker: { concurrency: 50 },
			client: "redis://127.0.0.1:6379",
		},
	},

	/**
	 * Dependencies
	 */
	dependencies: ["es", "dhis2"],

	/**
	 * Actions
	 */
	actions: {
		queryDHIS2: {
			queue: true,
			async handler(ctx) {
				let { page = 1, generate = false, program } = ctx.params;
				let pageCount = 1;
				try {
					this.logger.info("Querying organisation units");

					const { organisationUnits } = await ctx.call("dhis2.get", {
						url: "organisationUnits.json",
						fields: "id,path,name,parent[name,parent[name]]",
						paging: "false",
						level: 5,
					});
					const processedUnits = processOrganisations(organisationUnits);
					do {
						this.logger.info(
							`Querying data for program ${program} for page ${page} of ${pageCount}`
						);
						let params = {
							url: "trackedEntityInstances.json",
							...ctx.params,
							page,
						};
						if (pageCount === 1) {
							params = { ...params, totalPages: true };
						}
						const { trackedEntityInstances, ...rest } = await ctx.call(
							"dhis2.get",
							params
						);

						if (pageCount === 1 && rest.pager && rest.pager.pageCount) {
							pageCount = rest.pager.pageCount;
						}
						if (trackedEntityInstances.length > 0) {
							const { instances, calculatedEvents } = flattenInstances(
								trackedEntityInstances,
								processedUnits
							);
							this.localQueue(ctx, "indexData", {
								instances,
								calculatedEvents,
								generate,
								program,
								page,
								pageCount,
								processedUnits,
							});
						}
						page = page + 1;
					} while (page <= pageCount);
				} catch (error) {
					this.logger.error(error.message);
				}
			},
		},
		indexData: {
			queue: true,
			async handler(ctx) {
				const {
					instances,
					calculatedEvents,
					generate,
					program,
					page,
					pageCount,
					processedUnits,
				} = ctx.params;
				const foundEvents = groupBy(calculatedEvents, "programStage");
				const requests = Object.entries(foundEvents).flatMap(
					([stage, events]) => {
						return chunk(events, 250).map((c) =>
							ctx.call("es.bulk", {
								index: stage.toLowerCase(),
								dataset: c,
							})
						);
					}
				);

				this.logger.info(
					`Indexing data for program ${program} for page ${page} of ${pageCount}`
				);
				const inserted = await Promise.all([
					...chunk(instances, 250).map((c) =>
						ctx.call("es.bulk", {
							index: program.toLowerCase(),
							dataset: c,
						})
					),
					...requests,
				]);
				const { totalSuccess, totalErrors, errors } =
					processBulkInserts(inserted);

				this.logger.info(totalSuccess);
				this.logger.info(totalErrors);
				this.logger.info(errors);

				if (generate) {
					this.localQueue(ctx, "generateLayering", {
						instances,
						processedUnits,
					});
				}
			},
		},
		generateLayering: {
			queue: true,
			async handler(ctx) {
				this.logger.info("========= Generating Layering =======");
				const { instances, processedUnits } = ctx.params;
				const entities = instances.map(
					({ trackedEntityInstance }) => trackedEntityInstance
				);
				const allInstances = uniq(
					instances.map(({ hly709n51z0 }) => hly709n51z0)
				).filter((v) => !!v);
				const previousLayeringData = await ctx.call("es.queryAll", {
					query:
						"select trackedEntityInstance,qtr,quarter,fullyGraduated,preGraduated from layering",
					filter: {
						terms: {
							"trackedEntityInstance.keyword": entities,
						},
					},
				});
				const indexCaseSearches = await ctx.call("es.queryAll", {
					query: `select * from ${"HEWq6yr4cs5".toLowerCase()}`,
					filter: {
						terms: {
							["trackedEntityInstance.keyword"]: allInstances,
						},
					},
				});
				const indexCases = groupBy(indexCaseSearches, "trackedEntityInstance");
				const previousLayering = processPreviousLayering(previousLayeringData);
				const [
					homeVisitsSearch,
					riskAssessmentsSearch,
					viralLoadsSearch,
					referralsSearch,
					linkagesSearch,
					missedAppointmentsSearch,
					HVATSearch,
					graduationsSearch,
				] = await Promise.all(
					[
						"HaaSLv2ur0l",
						"B9EI27lmQrZ",
						"kKlAyGUnCML",
						"yz3zh5IFEZm",
						"SxnXrDtSJZp",
						"qNxRoC1wIYA",
					]
						.map((index) =>
							ctx.call("es.queryAll", {
								query: `select * from ${index.toLowerCase()}`,
								filter: {
									terms: {
										"trackedEntityInstance.keyword": entities,
									},
								},
							})
						)
						.concat([
							ctx.call("es.queryAll", {
								query: `select * from ${"sYE3K7fFM4Y".toLowerCase()}`,
								filter: {
									terms: {
										"trackedEntityInstance.keyword": Object.keys(indexCases),
									},
								},
							}),
							ctx.call("es.queryAll", {
								query: `select * from ${"Cx35Elpu330".toLowerCase()}`,
								filter: {
									terms: {
										"trackedEntityInstance.keyword": Object.keys(indexCases),
									},
								},
							}),
						])
				);
				const allHomeVisits = groupBy(
					homeVisitsSearch,
					"trackedEntityInstance"
				);
				const allHivRiskAssessments = groupBy(
					riskAssessmentsSearch,
					"trackedEntityInstance"
				);
				const allViralLoads = groupBy(
					viralLoadsSearch,
					"trackedEntityInstance"
				);
				const allReferrals = groupBy(referralsSearch, "trackedEntityInstance");
				const allServiceLinkages = groupBy(
					linkagesSearch,
					"trackedEntityInstance"
				);
				const allHVATAssessments = groupBy(HVATSearch, "trackedEntityInstance");
				const allMissedAppointments = groupBy(
					missedAppointmentsSearch,
					"trackedEntityInstance"
				);
				const allGraduationAssessments = groupBy(
					graduationsSearch,
					"trackedEntityInstance"
				);
				const layering = generateLayering({
					allGraduationAssessments,
					allMissedAppointments,
					allHVATAssessments,
					allServiceLinkages,
					allReferrals,
					allViralLoads,
					allHivRiskAssessments,
					allHomeVisits,
					trackedEntityInstances: instances,
					indexCases,
					previousLayering,
					processedUnits,
					periods: [
						moment().subtract(12, "quarters"),
						moment().subtract(11, "quarters"),
						moment().subtract(10, "quarters"),
						moment().subtract(9, "quarters"),
						moment().subtract(8, "quarters"),
						moment().subtract(7, "quarters"),
						moment().subtract(6, "quarters"),
						moment().subtract(5, "quarters"),
						moment().subtract(4, "quarters"),
						moment().subtract(3, "quarters"),
						moment().subtract(2, "quarters"),
						moment().subtract(1, "quarters"),
						moment(),
					],
				});

				this.logger.info("========= Indexing Layering =======");

				const inserted = await Promise.all(
					chunk(layering, 250).map((dataset) =>
						ctx.call("es.bulk", {
							index: "layering",
							dataset,
						})
					)
				);

				const { totalSuccess, totalErrors, errors } =
					processBulkInserts(inserted);

				this.logger.info(`Total Index:${totalSuccess}`);
				this.logger.info(`Indexes errored:${totalErrors}`);
				this.logger.info(errors);
			},
		},
		add: {
			rest: {
				method: "POST",
				path: "/add",
			},
			async handler(ctx) {
				return this.localQueue(ctx, "queryDHIS2", ctx.params);
			},
		},
		search: {
			rest: {
				method: "POST",
				path: "/search",
			},
			async handler(ctx) {
				const { index, ...body } = ctx.params;
				return await ctx.call("es.search", {
					index,
					body,
				});
			},
		},
		sql: {
			rest: {
				method: "POST",
				path: "/sql",
			},
			async handler(ctx) {
				return await ctx.call("es.sql", ctx.params);
			},
		},
		scroll: {
			rest: {
				method: "POST",
				path: "/scroll",
			},
			async handler(ctx) {
				const { index, ...body } = ctx.params;
				return await ctx.call("es.scroll", {
					index,
					body,
				});
			},
		},
		receive: {
			rest: {
				method: "POST",
				path: "/receive",
			},
			async handler(ctx) {
				console.log(ctx.params);
				return ctx.params;
			},
		},
		aggregate: {
			rest: {
				method: "POST",
				path: "/",
			},
			async handler(ctx) {
				const { index, ...body } = ctx.params;
				return await ctx.call("es.aggregations", {
					index,
					body,
				});
			},
		},
		index: {
			rest: {
				method: "POST",
				path: "/index",
			},
			async handler(ctx) {
				const { index, data } = ctx.params;
				try {
					return await ctx.call("es.bulk", {
						index,
						dataset: data,
					});
				} catch (error) {
					console.log(error);
					return error;
				}
			},
		},
		reset: {
			rest: {
				method: "GET",
				path: "/reset",
			},
			async handler(ctx) {
				const { programs } = await ctx.call("dhis2.get", {
					url: "programs.json",
					fields: "id",
					paging: false,
				});
				const { programStages } = await ctx.call("dhis2.get", {
					url: "programStages.json",
					fields: "id",
					paging: false,
				});

				const all = programs
					.concat(programStages)
					.map(({ id }) => String(id).toLowerCase());

				try {
					return ctx.call("es.reset", {
						index: [...all, "layering", "layering2"].join(","),
					});
				} catch (error) {
					return error;
				}
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
	methods: {
		sendMail() {
			console.log(this.ctx);
		},
	},

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
