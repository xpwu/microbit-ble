'use client'

import {useEffect, useRef, useState} from "react"
import {Nc} from "@/nc"
import {CmdLogEvent, CmdLogFrom, CmdLogLast} from "@/table/log"
import {useOnce} from "@/app/useOnce"

export default function CmdLog() {
	const initData = useOnce(()=>CmdLogLast())
	const index = useRef(initData.lastIndex)
	const [logs, setLogs] = useState(initData.logs)

	useEffect(()=>{
		const item =Nc.addEvent(CmdLogEvent, ()=>{
			const newLogs = CmdLogFrom(index.current + 1)
			index.current += newLogs.length
			setLogs(logs =>logs.concat(newLogs))
		})
		return ()=>{
			item.remove()
		}
	}, [])

	return (
		<>
			{logs.map((v, i)=> <p key={i}>v</p>)}
		</>
	)
}