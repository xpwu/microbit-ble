import {CreateNCEvent} from "ts-nc";
import {Duration} from "ts-x"
import {EntityTable} from "dexie"
import {Name, Schema} from "@/x/db"
import {db} from "@/table/db"


export const AllLogEvent = CreateNCEvent<number>("AllLogEvent")

export enum Type {
	Tips, MicrobitLog
}

export interface Log {
	id: number
	type: Type
	log: string
	since1970: Duration
}

const schema: Schema = {
	name: new Name("allLog"),
	indexSchema: "++id",
}

export const AllLogSchema = schema

function table() : EntityTable<Log, 'id'> {
	return db().table(schema.name.in(db()))
}

// endIndex: logs 最后一个元素的下一个元素在原数组对应的 index
export async function Last(lastCnt: number = 10): Promise<{ logs: Log[], endIndex: number }> {
	const last = await table().where('id').aboveOrEqual(0).last()
	if (last === undefined) {
		return {logs: [], endIndex: 0}
	}

	const res = await table().where('id').above(last.id - lastCnt).toArray()

	return {logs: res, endIndex: res.at(-1)!.id}
}

export async function LoadFrom(fromIndex: number, length?: number): Promise<Log[]> {
	if (length === undefined) {
		length = Infinity
	}
	if (length <= 0) {
		return []
	}

	return table().where('id').aboveOrEqual(fromIndex).limit(Infinity).toArray()
}

export async function LoadUntil(endIndex: number, length: number): Promise<Log[]> {
	if (length <= 0) {
		return []
	}

	return table().where('id').between(endIndex - length, endIndex, true, false).toArray()
}

let count = -1

export async function PushAllLog(log: string, type: Type, since1970: Duration) {
	if (count === -1) {
		count = await table().count()
	}
	await table().add({log, type, since1970})
	count ++
	if (count > 5000) {
		count = count - await table().where('id').aboveOrEqual(0).limit(1000).delete()
	}
}
