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

export const config_schema = {
	"definitions": {
		"httpMethod": {
			"$id": "httpMethod",
			"type": "object",
			"patternProperties": {
				"^.*$": { "$ref": "configHostMethod" }
			}
		},
		"configHostMethod": {
			"$id": "configHostMethod",
			"type": "object",
			"properties": {
				"location": {
					"type": "object",
					"properties": {
						"json": { "type": "boolean" },
						"queryparams": { "type": "boolean" }
					},
					"additionalProperties": false
				},
				"rules": { "$ref": "regexReplace" },
				"variables": { "$ref": "regexReplace" }
			},
			"additionalProperties": false
		},
		"regexReplace": {
			"$id": "regexReplace",
			"type": "array",
			"items": {
				"type": "array",
				"items":{
					"type": "string"
				},
				"minItems": 2,
				"maxItems": 2
			},
			"uniqueItems": true
		}
	},
	"allOf": [
		{
			"type": "object",
			"properties": {
				"domain": {
					"type": "string"
				},
				"hosts": {
					"type": "object",
					"patternProperties": {
						"^.*$": {
							"oneOf": [
								{ "type": "boolean" },
								{
									"type": "object",
									"properties": {
										"cookies": {
											"type": "object",
											"patternProperties": {
												"^.*$": {
													"oneOf": [
														{ "type": "boolean" },
														{ "$ref": "regexReplace" }
													]
												}
											}
										},
										"drop": {
											"type": "object",
											"patternProperties": {
												"^.*$": {
													"type": "boolean"
												}
											}
										},
										"log": {
											"type": "object",
											"properties": {
												"keys": {
													"type": "boolean"
												}
											},
											"additionalProperties": false
										},
										"url": {
											"type": "array",
											"items": {
												"type": "string"
											},
											"uniqueItems": true
										},
										"CONNECT": { "$ref": "httpMethod" },
										"DELETE": { "$ref": "httpMethod" },
										"GET": { "$ref": "httpMethod" },
										"HEAD": { "$ref": "httpMethod" },
										"OPTIONS": { "$ref": "httpMethod" },
										"PATCH": { "$ref": "httpMethod" },
										"POST": { "$ref": "httpMethod" },
										"PUT": { "$ref": "httpMethod" },
										"TRACE": { "$ref": "httpMethod" }
									},
									"additionalProperties": false
								}
							]
						}
					}
				},
				"wildcard_hosts": {
					"type": "array",
					"items": {
						"type": "string"
					},
					"uniqueItems": true
				}
			},
			"required": [
				"domain",
				"hosts",
				"wildcard_hosts"
			],
			"additionalProperties": false
		}
	]
};

export default config_schema;