import {CreateNCEvent} from "ts-nc";


export const CmdLogEvent = CreateNCEvent<number>("CmdLogEvent")

export enum LogType {
	ErrorLog, ResLog, Input
}

export interface CmdLog {
	type: LogType
	log: string
}

const cmdLogs:CmdLog[] = []

// lastIndex: logs 最后一个元素在原数组对应的 index
export function CmdLogLast(lastCnt: number = 10): {logs: CmdLog[], lastIndex: number} {
  return {logs: cmdLogs.slice(-1*lastCnt), lastIndex: cmdLogs.length-1}
}

export function CmdLogFrom(fromIndex: number) : CmdLog[] {
  return cmdLogs.slice(fromIndex)
}

export function PushCmdLog(log: string, type: LogType) {
  cmdLogs.push({type:type, log:log})
}
