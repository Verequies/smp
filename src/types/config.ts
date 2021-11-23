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

export interface ConfigHostMethod {
	[key: string]: {
		"location"?: {
			"json"?: boolean,
			"queryparams"?: boolean
		},
		"rules"?: string[][],
		"variables"?: string[][]
	}
}
export interface ConfigHost {
	"cookies"?: {
		[key: string]: boolean | string[][]
	},
	"drop"?: {
		[key: string]: boolean
	},
	"log"?: {
		"keys"?: boolean
	},
	"url"?: string[],
	"CONNECT"?: ConfigHostMethod,
	"DELETE"?: ConfigHostMethod,
	"GET"?: ConfigHostMethod,
	"HEAD"?: ConfigHostMethod,
	"OPTIONS"?: ConfigHostMethod,
	"PATCH"?: ConfigHostMethod,
	"POST"?: ConfigHostMethod,
	"PUT"?: ConfigHostMethod,
	"TRACE"?: ConfigHostMethod
}

export interface Config {
	domain: string,
	hosts: {
		[key: string]: boolean | ConfigHost
	},
	wildcard_hosts: string[]
}

export interface VariableStore {
	[key: string]: string
}