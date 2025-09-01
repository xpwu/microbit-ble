'use client'

import {useEffect, useRef, useState} from "react"
import {Nc} from "@/nc"
import {CmdLogEvent, CmdLogFrom, CmdLogLast} from "@/table/cmdlog"
import {useOnce} from "@/app/useOnce"

export default function CmdLog() {
	const initData = useOnce(()=>CmdLogLast())
	const index = useRef({first: initData.lastIndex - initData.logs.length + 1, last: initData.lastIndex})
	const [logs, setLogs] = useState(initData.logs)

	useEffect(()=>{
		const item =Nc.addEvent(CmdLogEvent, ()=>{
			const newLogs = CmdLogFrom(index.current.last + 1)
			index.current.last += newLogs.length
			setLogs(logs =>{
				let slice: string[]
				if (logs.length > 50) {
					slice = logs.slice(30)
					index.current.first += 30
				} else {
					slice = logs
				}
				return slice.concat(newLogs)
			})
		})
		return ()=>{
			item.remove()
		}
	}, [])

	return (
		<>
			{/*key = the index of table/cmdlog, not logs*/}
			{logs.map((v, i)=> <p key={index.current.first+i}>v</p>)}
		</>
	)
}