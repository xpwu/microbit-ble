import Dexie from "dexie"

let dbInstance: Dexie|null = null

export function setDBInstance(db: Dexie) {
	if (dbInstance === null) {
		dbInstance = db
	}
}

export function db(): Dexie {
	if (!dbInstance) {
		throw new Error("db is not open")
	}

	return dbInstance
}
