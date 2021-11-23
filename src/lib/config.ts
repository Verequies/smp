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
import Ajv from "ajv";
import { FSWatcher, watch as watchFile } from "chokidar";
import crypto from "crypto";
import { readFileSync as readFile } from "fs";

// Import local libraries
import config_schema from "./config_schema";

// Import local types
import { Config } from "../types/config";
import { FileSystemError } from "../types/errors";

export default class ConfigHandler {
	
	private ajv = new Ajv();
	private config: Config;
	private config_watcher: FSWatcher;
	private checksum = "";
	private path: string;

	public constructor(path: string) {
		this.path = path;

		console.log("\n    Initialising config '" + this.path + "'...");
		const config = this.read();
		this.config = config.config;
		this.checksum = config.checksum;

		this.config_watcher = watchFile(this.path, { "persistent": true });
		this.config_watcher.on("change", () => this.update());

		console.log("\n    Config initialised.");
	}

	public get(): Config {
		return this.config;
	}

	private file_system_error_message(error: FileSystemError): string {
		switch (error.code) {
			case "ENOENT":
				return <const> "No such file or directory.";
			case "EACCES":
				return <const> "Permission denied.";
			case "EISDIR":
				return <const> "Specified config is a directory.";
			default:
				return error.code;
		}
	}

	private read(): { config: Config, checksum: string } {

		let config: Config | string;
		try {
			config = readFile(this.path, "utf8");
		} catch (error) {
			const reason = this.file_system_error_message(error as FileSystemError);
			throw new Error("\n    An error occurred while reading config '" + this.path + "'!\n        " + reason);
		}

		// Parse config
		try {
			config = JSON.parse(config) as Config;
		} catch (error) {
			throw new Error("\n    An error occurred while parsing config '" + this.path + "'!\n        Could not be parsed as JSON.");
		}

		// Validate config with schema
		const valid = this.ajv.validate(config_schema, config);

		if (!valid) {
			throw new Error("\n    An error occurred while validating config '" + this.path + "'!\n        Invalid properties specified and/or missing required properties.");
		}

		// Generate checksum
		const checksum = crypto.createHash("sha256").update(JSON.stringify(config)).digest("hex");

		return { config: config, checksum: checksum };
	}

	private update() {
		console.log("\n    Config change detected.\n        Checking for updates...");

		try {
			const config = this.read();

			if (config.checksum != this.checksum) {
				this.config = config.config;
				this.checksum = config.checksum;
				console.log("\n    Config updated.");
			} else {
				console.log("\n    Config update not neccessary.");
			}
		} catch (error) {
			console.error((error as Error).message + "\n\n    Config not updated.");
		}
	}
}