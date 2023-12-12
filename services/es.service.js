"use strict";
const { Client } = require("@elastic/elasticsearch");
const { flatMap } = require("lodash");
const client = new Client({ node: "http://localhost:9200" });
// const client = new Client({node: "http://192.168.64.3:9200"});

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
