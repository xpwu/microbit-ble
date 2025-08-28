import {CreateNCEvent} from "ts-nc"

export const ConnectionEvent = CreateNCEvent()

let connection = false

export function isConnected():boolean {
	return connection
}

export function setConnection(con: boolean) {
	connection = con
}
