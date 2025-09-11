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

// lastIndex: logs 最后一个元素在原数组对应的 index
export function AllLogLast(lastCnt: number = 10): {logs: Log[], lastIndex: number} {
  return {logs: allLogs.slice(-1*lastCnt), lastIndex: allLogs.length-1}
}

export function AllLogFrom(fromIndex: number) : Log[] {
  return allLogs.slice(fromIndex)
}

export function PushAllLog(log: string, type: Type, since1970: Duration) {
	allLogs.push({log, type, since1970})
}
