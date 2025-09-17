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
const dataLogs = new Map<DataId, {data: Data[], offset: number}>()

export function PushData(id: DataId, data: Data) {
  let values = dataLogs.get(id)
  if (values === undefined) {
    values = {data: [], offset: 0}
    dataLogs.set(id, values)
  }
  values.data.push(data)
	if (values.data.length > 50) {
		const oldLen = values.data.length
		values.data = values.data.slice(-30)
		values.offset += oldLen - values.data.length
	}
}

export function DataLogFrom(id: DataId, fromIndex: number): Data[] {
  const values = dataLogs.get(id)
  if (values === undefined) {
    return []
  }

	const start = fromIndex - values.offset
	if (start >= 0) {
		return values.data.slice(start)
	}

	const res:Data[] = new Array<Data>(-1*start)
	for (const i in res) {
		res[i] = {since1970: 0, value: 0}
	}

	return res.concat(values.data)
}

export function DataLogLast(id: DataId, lastCnt: number = 10): {data: Data[], lastIndex: number} {
  const values = dataLogs.get(id)
  if (values === undefined) {
    return {data:[], lastIndex: -1}
  }

  return {
    data: values.data.slice(-1*lastCnt),
    lastIndex: values.data.length - 1 + values.offset
  }
}

export function DataLogAllIds(): string[] {
  return dataLogs.keys().toArray()
}
