'use client'

import {useEffect, useRef, useState} from "react"
import {Nc} from "@/nc"
import {AllLogEvent, AllLogFrom, AllLogLast} from "@/table/alllog"
import {useOnce} from "@/app/useOnce"
import {ConnectionEvent, microbitState} from "@/table/microbit"
import {MicrobitState} from "@/x/microbit"
import {UniqFlag} from "ts-xutils"

interface ShowLog {
	isTxLog: boolean
	key: string | number
	log: string
}

function toShowLog(logs: string[], firstIndex: number): ShowLog[] {
	return logs.map((v, i)=>{
		return {
			isTxLog: true,
			key: firstIndex + i,
			log: v
		}
	})
}

export default function AllLogs() {
	const initData = useOnce<{lastIndex: number, logs: ShowLog[]}>(()=>{
		let last = AllLogLast()
		const firstIndex = last.lastIndex - last.logs.length + 1
		return {
			lastIndex: last.lastIndex,
			logs: toShowLog(last.logs, firstIndex)
		}
	})
	const index = useRef({first: initData.lastIndex - initData.logs.length + 1, last: initData.lastIndex})
	const [logs, setLogs] = useState(initData.logs)
	const lastCon = useRef(MicrobitState.NotConnection)

	useEffect(()=>{
		const item = Nc.addEvent(AllLogEvent, ()=>{
			const newLogs = AllLogFrom(index.current.last + 1)
			const newFirstIndex = index.current.last
			setLogs(logs =>{
				let slice: ShowLog[]
				if (logs.length > 150) {
					slice = logs.slice(50)
				} else {
					slice = logs
				}
				return slice.concat(toShowLog(newLogs, newFirstIndex))
			})
			index.current.last += newLogs.length
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
						isTxLog: false,
						key: UniqFlag(),
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
			{logs.map((v)=> {
				if (v.isTxLog) {
					return <p key={v.key}> <span className='text-gray-300'>{'>'}</span> {v.log}</p>
				}
				return <p key={v.key} className='text-gray-400'> {v.log} </p>
			})}
			<div ref={endRef}></div>
		</>
	)
}