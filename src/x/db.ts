import Dexie from "dexie"

export class Name {
	private dbMap = new Map<string,string>()

	constructor(private defaultName: string) {
	}

	public changeFor(db: Dexie, realName: string) {
		this.dbMap.set(db.name, realName)
	}

	public in(db: Dexie): string {
		return this.dbMap.get(db.name) || this.defaultName
	}
}

export interface Schema {
	name: Name
	indexSchema: string
}

export function aliasNameFor(table: Schema, aliasName: string): Schema&{aliasName: string} {
	const res = table as unknown as Schema&{aliasName: string}
	res.aliasName = aliasName
	return res
}

export function createDexie(dbName: string
														, tables: (Schema&{aliasName?: string})[]): Dexie {
	const db = new Dexie(dbName)
	const nameSet = new Set<string>()
	const schemas: {[p: string]: string | null} = {}

	tables.forEach(v=>{
		const name = v.aliasName || v.name.in(db)
		if (nameSet.has(name)) {
			throw new Error(`duplicate table name('${name}') in db('${db.name}')`)
		}
		nameSet.add(name)

		if (v.aliasName) {
			v.name.changeFor(db, v.aliasName)
		}

		schemas[v.name.in(db)] = v.indexSchema
	})

	db.version(1).stores(schemas)

	return db
}

