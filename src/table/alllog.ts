import {CreateNCEvent} from "ts-nc";


export const AllLogEvent = CreateNCEvent<number>("AllLogEvent")

export enum Type {
	Tips, MicrobitLog
}

export interface Log {
	type: Type
	log: string
}

const allLogs:Log[] = []

// lastIndex: logs 最后一个元素在原数组对应的 index
export function AllLogLast(lastCnt: number = 10): {logs: Log[], lastIndex: number} {
  return {logs: allLogs.slice(-1*lastCnt), lastIndex: allLogs.length-1}
}

export function AllLogFrom(fromIndex: number) : Log[] {
  return allLogs.slice(fromIndex)
}

export function PushAllLog(log: string, type: Type) {
	allLogs.push({type: type, log: log})
}
