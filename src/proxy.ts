/*
	Site Manipulation Proxy (SMP)
	Copyright (C) 2021  Hamish Claxton

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// Import required modules
import { FastifyReply, FastifyRequest } from "fastify";
import fetch from "node-fetch";
import { URLSearchParams } from "url";

// Import local libraries
import ConfigHandler from "./lib/config";
import { get_key, get_mani_data, mod_data } from "./lib/data";
import StaticConfig from "./lib/static_config";

// Import local types
import { Config, ConfigHost, VariableStore } from "./types/config";
import { HttpRequestMethod } from "./types/http";

export async function proxy(req: FastifyRequest, rep: FastifyReply, config_handler: ConfigHandler | StaticConfig, variable_store: VariableStore): Promise<void> {

	// Get config from ConfigHandler
	const config: Config = config_handler.get();

	// Get request url, removing the preceding /
	let url: string | URL = req.url.slice(1);

	// If no domain is specified, append default domain
	if (url.substr(0, 4) != "http")
		if (config.domain.substr(-1, 1) == "/") 
			url = config.domain + url;
		else
			url = config.domain + "/" + url;	

	// Fix up some weird URL protocol mishap that might occur after site modification
	if (url.substr(0, 7) != "http://" && url.substr(0, 6) == "http:/")
		url = url.replace("http:/", "http://");

	else if (url.substr(0, 8) != "https://" && url.substr(0, 7) == "https:/")
		url = url.replace("https:/", "https://");

	// Parse URL to validate
	url = new URL(url);
	
	// Wildcard Host
	const wildcard_host = url.host.replace(url.host.split(".", 1)[0] + ".", "");
	const wildcard_host_allowed = 
		config.wildcard_hosts.includes(wildcard_host) 
		&& config.hosts[wildcard_host];

	// Allow request to pass if allowed in the config or globally
	if (config.hosts[url.hostname] || wildcard_host_allowed) {

		// Get host from request url
		const host: string = url.hostname;
		
		// Get host config for the current host if it exists
		const config_host = wildcard_host_allowed 
			? config.hosts[wildcard_host] as ConfigHost
			: config.hosts[host] as ConfigHost;

		// Drop request url if specified in the config
		try {
			if (config_host.drop?.[url.pathname.slice(1)])
				await rep.code(200).send();
		} catch (error) { console.log(error); }

		// Get "Content-Type" from request headers
		let content_type: string | undefined | null = req.headers["content-type"];
		if (content_type)
			content_type = content_type.replace("; charset=UTF-8", "").replace(";charset=UTF-8", "").replace("; charset=utf-8", "");

		// Get data from request
		let data: unknown = req.body;

		// Convert request data to string if required
		switch (content_type) {
			case "application/x-www-form-urlencoded":
				data = new URLSearchParams(data as string).toString();
				break;
			case "application/json":
				data = JSON.stringify(data as JSON);
				break;
		}

		// Get request method for config indexing
		const method = req.method as HttpRequestMethod;

		// Get key from URL path
		const key: string = Object.entries(variable_store).filter(obj => obj[1].includes((url as URL).pathname.slice(1))).length > 0
			? Object.entries(variable_store).filter(obj => obj[1].includes((url as URL).pathname.slice(1)))[0][0]
			: get_key(config_host, url.pathname.slice(1) + url.search);

		// Get manipulation data based on url
		const mani_data_ref: boolean | string[][] = method == req.method ? 
			get_mani_data(config_host, method, key) : false;

		let mani_data: boolean | string[][] = false;

		if (mani_data_ref)
			mani_data = [];

		// Set SMP Info
		const smp_info = {
			"protocol": req.protocol,
			...(req.headers["host"]? { 
				"host": String(req.headers["host"].split(":")[0]),
				"port": ":" + String(req.headers["host"].split(":")[1]) || ""
			} : {
				"host": "",
				"port": ""
			}),
			"url": ""
		};
		smp_info.url = smp_info.protocol + "://" + String(smp_info.host) + String(smp_info.port);

		// Create SMP Update Array
		const smp_update_data = [
			["{SMP_PROTOCOL}", smp_info.protocol],
			["{SMP_HOST}", smp_info.host],
			["{SMP_PORT}", smp_info.port],
			["{SMP_URL}", smp_info.url]
		];

		// Update manipulation data with SMP info
		if (mani_data && config_host?.[method]) {
			for (const mani of mani_data_ref as string[][]) {
				let newMani = mani[1];

				for (const update of smp_update_data)
					newMani = newMani.replace(new RegExp(update[0]), update[1]);

				mani_data.push([mani[0], newMani]);
			}
		}

		// Modify request data if required
		if (mani_data && content_type && config_host?.[method])
			data = mod_data(data as string, mani_data);

		// Generate request "Cookie" header
		let cookie_string = "";
		const request_cookies = req.cookies as {[key: string]: string};

		if (config_host?.["cookies"]) {
			for (const cookie in config_host?.["cookies"])
				if (config_host?.["cookies"][cookie] && request_cookies[cookie])
					cookie_string += cookie + "=" + request_cookies[cookie] + "; ";
			cookie_string = cookie_string.slice(0, -2);
		}

		// Generate options for node-fetch
		const fetch_options = {
			compress: false, // Don't accept compressed files so they can be modified
			headers: {
				...req.headers["authorization"] && { "authorization": req.headers["authorization"] },
				...content_type && { "content-type": content_type },
				...cookie_string && { "cookie": cookie_string },
				"host": host,
				...req.headers["user-agent"] && { "user-agent": req.headers["user-agent"] }
			},
			method: req.method,
			...(method == "PATCH" || method == "POST" || method == "PUT") && { body: data as string},
			redirect: "manual" as const // Manually handle redirection
		};

		// Contact requested url
		const response = await fetch(url.href, fetch_options);

		// Modify "Location" header in order to redirect through proxy
		let redirect_location = response.headers.get("location");

		if (redirect_location) 
			redirect_location = redirect_location.replace("https://", smp_info.url + "/https://");

		// Generate response "Set-Cookie" header if needed
		const set_cookie: string[] = [];
		
		if (config_host?.["cookies"]) {
			if (response.headers.has("set-cookie")) {
				response.headers.raw()["set-cookie"].forEach(cookie => {
					const cookie_name: string = cookie.replace(new RegExp("(?<==).+"), "").slice(0, -1);
					if (config_host?.["cookies"]?.[cookie_name]) {
						if (config_host?.["cookies"][cookie_name] == true)
							set_cookie.push(cookie);
						else {
							const mani_cookie: string[][] = [];
							for (const mani of config_host?.["cookies"][cookie_name] as string[][]) {
								let new_mani = mani[1];
								for (const update of smp_update_data)
									new_mani = new_mani.replace(new RegExp(update[0]), update[1]);	
								mani_cookie.push([mani[0], new_mani]);
							}
							const mod_cookie = mod_data(cookie, mani_cookie);
							if (mod_cookie)
								set_cookie.push(mod_cookie);
						}
					}
				});
			}
		}

		// Set response status
		let status = response.status;

		// Set OPTIONS response status to 200 OK
		if (method == "OPTIONS")
			status = 200;

		// Signal that the response is of string type
		let is_string = false;

		// Check if the location header can be extracted
		const location_json = config_host?.[method]?.[key]?.location?.json;

		// Extract location header if needed and return it as a JSON response
		if (redirect_location && location_json) {
			const searchParams = new URLSearchParams(new URL(redirect_location).search);
			content_type = "application/json";
			const paramJSON: { [key: string]: string } = {
				"url": redirect_location,
			};
			
			for (const param of searchParams.entries())
				paramJSON[param[0]] = param[1];

			data = JSON.stringify(paramJSON);
			is_string = true;

			// Set response status to 200 OK
			status = 200;
		}

		if (!redirect_location) {
			// Get "Content-Type" from response headers
			content_type = response.headers.get("content-type");

			if (content_type) 
				content_type = content_type.replace("; charset=UTF-8", "").replace(";charset=UTF-8", "").replace("; charset=utf-8", "");

			// Convert response data to string if applicable
			switch (content_type) {
				case "text/css":
				case "text/html":
				case "text/plain":
				case "application/javascript":
				case "application/x-javascript":
				case "application/json":
					data = await response.text();
					is_string = true;
					break;
			}

			// Scan for dynamic variables
			if (config_host?.[method]?.[key]?.variables) {
				for (const dvar of config_host?.[method]?.[key]?.variables as string[][]) {
					const regex_matches = (new RegExp(dvar[1])).exec(data as string);

					// If there was a match, create a dynamic variable for it
					if (regex_matches) 
						variable_store["{" + dvar[0] + "}"] = regex_matches[1];
				}
			}

			// Modify data if required
			if (mani_data && data) {
				// Replace dynamic variables with data
				for (const dvar in variable_store) {
					for (let mani = 0; mani < mani_data.length; mani++) {
						mani_data[mani][0] = mani_data[mani][0].replace(dvar, variable_store[dvar]);
						mani_data[mani][1] = mani_data[mani][1].replace(dvar, variable_store[dvar]);
					}
				}
				data = mod_data(data as string, mani_data);
			}
		}

		// Setup response headers
		const headers = {
			...req.headers["origin"] && { "access-control-allow-origin": req.headers["origin"] },
			"access-control-allow-credentials": "true",
			"access-control-allow-headers": "authorization, content-type",
			"access-control-allow-methods": "DELETE,GET,PATCH,POST,PUT",
			...content_type && { "content-type": content_type },
			...(redirect_location && !location_json) && { "location": redirect_location },
			...set_cookie && { "set-cookie": set_cookie }
		};

		// Write string data and/or modified data to client
		if (is_string || mani_data) {
			if (content_type)
				await rep
					.code(status)
					.headers(headers)
					.type(content_type)
					.send(data);
			else
				await rep
					.code(status)
					.headers(headers)
					.send(data);
		}
		
		// Pipe unmodified data to client
		else {
			if (content_type)
				await rep
					.code(status)
					.headers(headers)
					.type(String(content_type))
					.send(await response.buffer());
			else 
				await rep
					.code(status)
					.headers(headers)
					.send(await response.buffer());
		}
	}

	// Drop clients if the request was denied
	else await rep.code(200).send();
}