import {CreateNCEvent} from "ts-nc"


export const CmdLogEvent = CreateNCEvent<number>()

export const DataLogEvent = CreateNCEvent()

const cmdLogs:string[] = []

export function CmdLogLast(lastCnt: number = 10): {logs: string[], lastIndex: number} {
	return {logs: cmdLogs.slice(-1*lastCnt), lastIndex: cmdLogs.length-1}
}

export function CmdLogFrom(fromIndex: number) : string[] {
	return cmdLogs.slice(fromIndex)
}

export function PushCmdLog(log: string) {
	cmdLogs.push(log)
}

type DataId = string
export type TimeStamp = number
export type Value = number
export interface Data {
	ts: TimeStamp
	v: Value
}

// Data[]  必须按照 timestamp 的顺序放入数组中
const dataLogs = new Map<DataId, Data[]>()

export function PushData(id: DataId, data: Data) {
	let values = dataLogs.get(id)
	if (values === undefined) {
		values = []
		dataLogs.set(id, values)
	}
	values.push(data)
}

export function DataLogFrom(id: DataId, fromIndex: number): Data[] {
	const values = dataLogs.get(id)
	if (values === undefined) {
		return []
	}

	return values.slice(fromIndex)
}

export function DataLogLast(id: DataId, lastCnt: number = 10): {data: Data[], lastIndex: number} {
	const values = dataLogs.get(id)
	if (values === undefined) {
		return {data:[], lastIndex: -1}
	}

	return {
		data: values.slice(-1*lastCnt),
		lastIndex: values.length - 1
	}

}

export function DataLogAllIds(): string[] {
	return dataLogs.keys().toArray()
}

