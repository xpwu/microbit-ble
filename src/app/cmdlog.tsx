'use client'

import {useEffect, useMemo, useRef, useState} from "react"
import {Nc} from "@/nc"
import {CmdLog as Log, CmdLogEvent, CmdLogFrom, CmdLogLast, LogType} from "@/table/cmdlog"

export default function CmdLog() {
	const initData = useMemo(CmdLogLast, [])

	const index = useRef({first: initData.lastIndex - initData.logs.length + 1, last: initData.lastIndex})
	const [logs, setLogs] = useState(initData.logs)

	useEffect(()=>{
		const item =Nc.addEvent(CmdLogEvent, ()=>{
			const newLogs = CmdLogFrom(index.current.last + 1)
			index.current.last += newLogs.length
			setLogs(logs =>{
				let slice: Log[]
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

	const endRef = useRef<HTMLDivElement>(null)
	useEffect(()=>{
		endRef.current?.scrollIntoView({behavior:"instant"})
	}, [logs])

	return (
		<>
			{/*key = the index of table/cmdlog, not logs*/}
			{logs.map((v, i)=> {
				switch (v.type) {
					case LogType.ErrorLog:
						return <p key={index.current.first+i} className="text-red-400">错误：{v.log}</p>
					case LogType.ResLog:
						return <p key={index.current.first+i}><span className='text-gray-300'>{'>>'}</span> {v.log}</p>
					case LogType.Input:
						return <p key={index.current.first+i}><span className='text-gray-300'>{'%'}</span> {v.log}</p>
					default:
						return <></>
				}
			})}
			<div ref={endRef}></div>
		</>
	)
}