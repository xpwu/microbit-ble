'use client'

import {useEffect, useRef, useState} from "react"
import {Nc} from "@/nc"
import {DataLogAllIds, DataLogEvent, DataLogFrom, DataLogLast} from "@/table/datalog"
import {useOnce} from "@/app/useOnce"

function OneDataView({id}:{id: string}) {
	const initData = useOnce(()=>DataLogLast(id))
	const [logs, setLogs] = useState(initData.data)
	const index = useRef(initData.lastIndex)

	useEffect(()=>{
		const item =Nc.addEvent(DataLogEvent, (e)=>{
			if (!e.ids.find((v)=>v == id)) {
				return
			}
			const newLogs = DataLogFrom(id, index.current + 1)
			index.current += newLogs.length
			setLogs(logs=>logs.concat(newLogs))
		})
		return ()=>{
			item.remove()
		}
	}, [id])

	return (
		<p>
			{id}: {logs.at(-1)?.v ?? "<no data>"}
		</p>
	)
}

export function DataLog() {
	const [ids, setIds] = useState(DataLogAllIds)
	const allIds = useRef(ids.slice())

	useEffect(()=>{
		const item = Nc.addEvent(DataLogEvent, (e)=>{
			const diff = e.ids.filter(newId => !allIds.current.find(oldId => oldId == newId))
			if (diff.length == 0) {
				return
			}

			allIds.current.push(...diff)
			setIds(ids=>ids.concat(diff))
		})

		return ()=>{
			item.remove()
		}
	}, [])

	return (
		<>
			{ids.map(id=><OneDataView key={id} id={id} />)}
		</>
	)
}