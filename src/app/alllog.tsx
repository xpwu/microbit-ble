'use client'

import {useEffect, useRef, useState} from "react"
import {Nc} from "@/nc"
import {AllLogEvent, AllLogFrom, AllLogLast, Type} from "@/table/alllog"
import {useOnce} from "@/app/useOnce"
import {ConnectionEvent, microbitState} from "@/table/microbit"
import {MicrobitState} from "@/x/microbit"

export default function AllLogs() {
	const initData = useOnce(AllLogLast)
	const index = useRef({first: initData.lastIndex - initData.logs.length + 1, last: initData.lastIndex})
	const [logs, setLogs] = useState(initData.logs)
	const lastCon = useRef(MicrobitState.NotConnection)

	useEffect(()=>{
		const item =Nc.addEvent(AllLogEvent, ()=>{
			const newLogs = AllLogFrom(index.current.last + 1)
			index.current.last += newLogs.length
			setLogs(logs =>{
				// let slice: Log[]
				// if (logs.length > 10000) {
				// 	slice = logs.slice(50)
				// 	index.current.first += 50
				// } else {
				// 	slice = logs
				// }
				return logs.concat(newLogs)
			})
		})
		return ()=>{
			item.remove()
		}
	}, [AllLogEvent])

	useEffect(()=>{
		const item = Nc.addEvent(ConnectionEvent, ()=>{
			let st = microbitState()
			const oldState = lastCon.current
			lastCon.current = st
			if (oldState != MicrobitState.Connected && st == MicrobitState.Connected) {
				setLogs(logs => {
					return logs.concat({
						type: Type.Tips,
						log: "---<new connection>---"
					})
				})
			}
		})
		return ()=>{
			item.remove()
		}
	}, [ConnectionEvent])

	const endRef = useRef<HTMLDivElement>(null)
	useEffect(()=>{
		endRef.current?.scrollIntoView({behavior:"instant"})
	}, [logs])

	return (
		<>
			{logs.map((v, i)=> {
				switch (v.type) {
					case Type.Tips:
						return <p key={index.current.first+i} className='text-gray-400'> {v.log} </p>
					case Type.MicrobitLog:
						return <p key={index.current.first+i}> <span className='text-gray-300'>{'>'}</span> {v.log}</p>
					default:
						return <></>
				}
			})}
			<div ref={endRef}></div>
		</>
	)
}