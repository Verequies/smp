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

// Import local types
import { ConfigHost } from "../types/config";
import { HttpRequestMethod } from "../types/http";

/*	get_key 

	Inputs:
		host: string
			Extracted from request url

		path: string
			Extracted from request url
	
	Outputs:
		On success:
			Returns key
		
		On error or unsuccessful:
			Returns original path
*/
export function get_key(host: ConfigHost, path: string): string {

	try {
		if (host.url) {
			// Iteratively shorten the url based on Regular Expressions
			// until an index key is generated
			let key: string = path;
			for (const mani of host.url) {
				key = key.replace(new RegExp(mani), "");
			}

			// Log generated key if logging enabled
			try {
				if (host?.log?.keys)
					console.log(key);
			} catch (error) { console.log(error); }

			// Return the key
			return key;
		}
	}
	catch (error) { console.log(error); }

	// Return path if host URL reduction information doesn't exist
	return path;
}

/*	get_mani_data 

	Inputs:
		host: string
			Extracted from request url
		
		method: string
			Extracted from request data
	
		key: string
			Extracted from request url

	Outputs:
		On success:
			Returns manipulation data if exists
			Otherwise returns false
		
		On error or unsuccessful:
			Returns false
*/ 
export function get_mani_data(host: ConfigHost, method: HttpRequestMethod, key: string): boolean | string[][] {

	try {
		// Return manipulation data if it exists
		if (host?.[method]?.[key]?.rules)
			return host?.[method]?.[key]?.rules as string[][];
	}
	catch (error) { console.log(error); }

	// Return false if manipulation data does not exist or an error occurred
	return false;
}

/*	mod_data 

	Inputs:
		data: string
			Can be HTML, CSS, JS, stringified JSON

		mani_data: any (JSON)
			Extracted from config host based on url
	
	Outputs:
		On success:
			Returns modified data
		
		On error:
			Returns input data
*/
export function mod_data(data: string, mani_data: string[][]): string {

	// Copy input data
	let new_data: string = data;

	try {
		// Iterate through manipulation data
		for (const mani of mani_data) {
			// Replace string that matches input Regular Expression
			new_data = new_data.replaceAll(new RegExp(mani[0], "g"), mani[1]);
		}

		// Return modified data
		return new_data;
	}
	catch (error) {
		// Return input data
		return data;
	}
}