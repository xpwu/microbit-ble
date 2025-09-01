import {CreateNCEvent} from "ts-nc";


export const CmdLogEvent = CreateNCEvent<number>()

const cmdLogs:string[] = []

// lastIndex: logs 最后一个元素在原数组对应的 index
export function CmdLogLast(lastCnt: number = 10): {logs: string[], lastIndex: number} {
  return {logs: cmdLogs.slice(-1*lastCnt), lastIndex: cmdLogs.length-1}
}

export function CmdLogFrom(fromIndex: number) : string[] {
  return cmdLogs.slice(fromIndex)
}

export function PushCmdLog(log: string) {
  cmdLogs.push(log)
}
