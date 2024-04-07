"use strict";
const { Client } = require("@elastic/elasticsearch");
const { flatMap, fromPairs } = require("lodash");
const client = new Client({ node: "http://localhost:9200" });
/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

module.exports = {
	name: "es",
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
		createIndex: {
			params: {
				index: "string",
				body: "object|optional",
			},
			async handler(ctx) {
				let body = {
					index: ctx.params.index,
				};
				if (ctx.params.body) {
					body = { ...body, body: ctx.params.body };
				}
				return await client.indices.create(body);
			},
		},
		bulk: {
			async handler(ctx) {
				const { index, dataset } = ctx.params;
				const body = flatMap(dataset, (doc) => [
					{ index: { _index: index, _id: doc["id"] } },
					doc,
				]);
				const response = await client.bulk({
					refresh: true,
					body,
				});
				return response;
			},
		},
		sql: {
			async handler(ctx) {
				return await client.sql.query(ctx.params);
			},
		},
		queryAll: {
			async handler(ctx) {
				try {
					let {
						rows: allRows,
						columns,
						cursor: currentCursor,
					} = await client.sql.query(ctx.params);

					if (currentCursor) {
						do {
							let {
								data: { rows, cursor },
							} = await client.sql.query({ cursor: currentCursor });
							allRows = allRows.concat(rows);
							currentCursor = cursor;
						} while (currentCursor);
					}
					return allRows.map((r) => {
						return fromPairs(columns.map((c, i) => [c.name, r[i]]));
					});
				} catch (error) {
					this.logger.error(error.message);
					return [];
				}
			},
		},
		search: {
			params: {
				index: "string",
				body: "object",
			},
			async handler(ctx) {
				const {
					hits: { hits },
				} = await client.search({
					index: ctx.params.index,
					body: ctx.params.body,
				});
				return hits.map((h) => h._source);
			},
		},
		scroll: {
			params: {
				index: "string",
				body: "object",
			},
			async handler(ctx) {
				const scrollSearch = client.helpers.scrollSearch({
					index: ctx.params.index,
					body: ctx.params.body,
				});
				let documents = [];
				for await (const result of scrollSearch) {
					documents = [...documents, ...result.documents];
				}
				return documents;
			},
		},
		aggregations: {
			params: {
				index: "string",
				body: "object",
			},
			async handler(ctx) {
				const { aggregations } = await client.search({
					index: ctx.params.index,
					body: ctx.params.body,
				});
				return aggregations;
			},
		},
		get: {
			params: {
				index: "string",
				id: "string",
			},
			async handler(ctx) {
				const { index, id } = ctx.params;
				const {
					body: { _source },
				} = await client.get({
					index,
					id,
				});
				return _source;
			},
		},
		reset: {
			params: {
				index: "string",
			},
			async handler(ctx) {
				for (const index of ctx.params.index.split(",")) {
					try {
						await client.indices.delete({ index });
					} catch (error) {
						console.log(error);
					}
					try {
						await client.indices.create({
							index,
							settings: { "index.mapping.total_fields.limit": "10000" },
						});
					} catch (error) {
						console.log(error);
					}
				}
				return { response: "Done" };
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
