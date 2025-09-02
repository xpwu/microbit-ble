import {CreateNCEvent} from "ts-nc";


export const AllLogEvent = CreateNCEvent<number>("AllLogEvent")

const allLogs:string[] = []

// lastIndex: logs 最后一个元素在原数组对应的 index
export function AllLogLast(lastCnt: number = 10): {logs: string[], lastIndex: number} {
  return {logs: allLogs.slice(-1*lastCnt), lastIndex: allLogs.length-1}
}

export function AllLogFrom(fromIndex: number) : string[] {
  return allLogs.slice(fromIndex)
}

export function PushAllLog(log: string) {
	allLogs.push(log)
}
