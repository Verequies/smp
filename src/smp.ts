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

// Import Required Modules
import fastify, { 
	FastifyInstance, 
	FastifyReply, 
	FastifyRequest, 
	RequestPayload } from "fastify";
import cookie from "fastify-cookie";
import formbody from "fastify-formbody";

// Import Proxy
import { proxy } from "./proxy";

// Import local libraries
import ConfigHandler from "./lib/config";
import StaticConfig from "./lib/static_config";

// Import local types
import { VariableStore } from "./types/config";

// Use static config
const STATIC_CONFIG = false;

/*	Site Manipulation Proxy */

// Initialise config 
let config_handler: ConfigHandler | StaticConfig;

if (STATIC_CONFIG)
	config_handler =  new StaticConfig();
else {
	// Get config path from argument
	const config_path = process.argv[2];

	if (!config_path) {
		console.error("\n    No config was specified!\n    SMP will now exit.\n");
		process.exit(1);
	}

	// Initialise config 
	try {
		config_handler = new ConfigHandler(config_path);
	} catch (error) {
		console.error((error as Error).message + "\n\n    SMP will now exit.\n");
		process.exit(1);
	}
}

// Setup Fastify
const smp: FastifyInstance = fastify();

// Enable data parsers
void smp.register(cookie);
void smp.register(formbody);

// Add content type parser for 'application/octet-stream'
// TODO: Add correct type for 'done' to avoid @typescript-eslint/ban-types
smp.addContentTypeParser("application/octet-stream", 
	// eslint-disable-next-line @typescript-eslint/ban-types
	(req: FastifyRequest, payload: RequestPayload, done: Function) => {
		let data = "";
		payload.on("data", (chunk: unknown) => { 
			data += chunk; 
		});
		payload.on("end", () => {
			done(null, data);
		});
	}
);

// Setup dynamic variable storage
const variable_store: VariableStore = {};

// Main
smp.all("*", async (req: FastifyRequest, rep: FastifyReply) => {
	await proxy(req, rep, config_handler, variable_store);
});

// Start SMP
smp.listen(3000, () => {
	console.log("\n    Site Manipulation Proxy Running!");
});