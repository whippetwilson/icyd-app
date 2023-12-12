"use strict";

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

const axios = require("axios");
const instance = axios.create({
	baseURL: process.env.ICYD_BASE_URL,
	auth: {
		username: process.env.ICYD_USERNAME,
		password: process.env.ICYD_PASSWORD,
	},
});

module.exports = {
	name: "dhis2",

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
		/**
		 * Say a 'Hello' action.
		 *
		 * @returns
		 */
		get: {
			rest: {
				method: "GET",
				path: "/",
			},
			async handler(ctx) {
				const { url, ...params } = ctx.params;
				const { data } = await instance.get(url, {
					params,
				});
				return data;
			},
		},
		/**
		 * Say a 'Hello' action.
		 *
		 * @returns
		 */
		trackedEntityInstances: {
			rest: {
				method: "GET",
				path: "/trackedEntityInstances",
			},
			async handler(ctx) {
				const { data } = await instance.get("trackedEntityInstances.json", {
					params: ctx.params,
				});
				return data;
			},
		},
		/**
		 * Say a 'Hello' action.
		 *
		 * @returns
		 */
		events: {
			rest: {
				method: "GET",
				path: "/events",
			},
			async handler(ctx) {
				const { data } = await instance.get("events.json", {
					params: ctx.params,
				});
				return data;
			},
		},
		/**
		 * Welcome, a username
		 *
		 * @param {String} name - User name
		 */
		post: {
			rest: {
				method: "POST",
				path: "/",
			},
			async handler(ctx) {
				const { url, ...body } = ctx.params;
				const { data } = await instance.post(url, body);
				return data;
			},
		},
		put: {
			rest: {
				method: "PUT",
				path: "/",
			},
			async handler(ctx) {
				const { url, ...body } = ctx.params;
				const { data } = await instance.put(url, body);
				return data;
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
