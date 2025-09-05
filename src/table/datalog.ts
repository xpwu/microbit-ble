import {CreateNCEvent} from "ts-nc";
import {Duration} from "ts-xutils";


export const DataLogEvent = CreateNCEvent("DataLogEvent")

type DataId = string
export type Value = number
export interface Data {
  since1970: Duration
  value: Value
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
