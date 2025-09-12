import {CreateNCEvent} from "ts-nc";
import {Duration} from "ts-xutils"


export const AllLogEvent = CreateNCEvent<number>("AllLogEvent")

export enum Type {
	Tips, MicrobitLog
}

export interface Log {
	type: Type
	log: string
	since1970: Duration
}

const allLogs:Log[] = []

// endIndex: logs 最后一个元素的下一个元素在原数组对应的 index
export function Last(lastCnt: number = 10): {logs: Log[], endIndex: number} {
  return {logs: allLogs.slice(-1*lastCnt), endIndex: allLogs.length}
}

export function LoadFrom(fromIndex: number, length?: number): Log[] {
	if (length === undefined) {
		length = allLogs.length
	}
	if (length <= 0) {
		return []
	}
  return allLogs.slice(fromIndex, fromIndex+length)
}

export function LoadUntil(endIndex: number, length: number): Log[] {
	if (length <= 0) {
		return []
	}
	let start = endIndex - length
	if (start < 0) {
		start = 0
	}
	return allLogs.slice(start, length)
}

export function PushAllLog(log: string, type: Type, since1970: Duration) {
	allLogs.push({log, type, since1970})
}
