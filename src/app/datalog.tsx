'use client'

import {useEffect, useRef, useState} from "react"
import {Nc} from "@/nc"
import {DataLogAllIds, DataLogEvent, DataLogFrom, DataLogLast} from "@/table/log"
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
	const [ids, setIds] = useState(()=>DataLogAllIds())

	useEffect(()=>{
		const item = Nc.addEvent(DataLogEvent, (e)=>{
			const diff = e.ids.filter(newId => !ids.find(oldId => oldId == newId))
			if (diff.length == 0) {
				return
			}

			setIds(ids=>ids.concat(diff))
		})

		return ()=>{
			item.remove()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	return (
		<>
			{ids.map(id=><OneDataView key={id} id={id} />)}
		</>
	)
}