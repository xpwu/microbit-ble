'use client'

import {useEffect, useMemo, useRef, useState} from "react"
import {Nc} from "@/nc"
import {AllLogEvent, AllLogFrom, AllLogLast, Log, Type} from "@/table/alllog"
import {Millisecond} from "ts-xutils"
import {useInView} from "react-intersection-observer"

function timeFormatter(date: Date) {
	function pad2(number: number) { return (number < 10 ? '0' : '') + number }
	function pad3(number: number) {return (number < 10 ? '00' : (number < 100? '0':'')) + number}

	return pad2(date.getHours()) + ':' + pad2(date.getMinutes())
		+ ':' + pad2(date.getSeconds()) + '.' + pad3(date.getMilliseconds());
}

const page = 30

enum ShowState {
	Selection, Continuous
}

export default function AllLogs() {
	const initData = useMemo(()=>AllLogLast(2*page), [])
	const indexRef = useRef({first: initData.lastIndex+1 - initData.logs.length, end: initData.lastIndex+1})
	const [logs, setLogs] = useState<{key:number, val:Log}[]>(initData.logs.map(
		(v, i)=>{return {key: indexRef.current.first + i, val: v}}))
	const showStateRef = useRef(ShowState.Continuous)

	useEffect(()=>{
		const item =Nc.addEvent(AllLogEvent, ()=>{
			// if (showStateRef.current === ShowState.Selection) {
			// 	return
			// }

			const newLogs = AllLogFrom(indexRef.current.end).map(
				(v,i)=>{return {key: indexRef.current.end+i, val: v}})
			indexRef.current.end += newLogs.length
			setLogs(logs =>{
				let slice: {key:number, val:Log}[]
				if (logs.length > 100) {
					const dropData = 30
					slice = logs.slice(dropData)
					indexRef.current.first += dropData
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

	// state and auto-scroll
	const {ref: observerLastNode, inView: lastNodeInView} = useInView({threshold: 0.1})
	const lastNodeRef = useRef<HTMLParagraphElement>(null)
	useEffect(()=>{
		if (showStateRef.current === ShowState.Continuous) {
			lastNodeRef.current?.scrollIntoView({behavior:"instant"})
		}
		observerLastNode(lastNodeRef.current)
	}, [logs])
	useEffect(()=>{
		showStateRef.current = lastNodeInView?ShowState.Continuous:ShowState.Selection
	}, [lastNodeInView])

	return (
		<div className="w-full h-full overflow-y-auto wrap-break-word">
			{logs.map(v=> {
				const time = timeFormatter(new Date(v.val.since1970/Millisecond))
				return (
					<p key={v.key} ref={lastNodeRef}>
						{v.val.type === Type.MicrobitLog ?
							<>
								<span className='text-gray-300'>{time}&nbsp;{'>'}&nbsp;</span>
								<span className='text-gray-700'>{v.val.log}</span>
							</> : <>
								<span className='text-gray-300'>{time}&nbsp;&nbsp;&nbsp;&nbsp;</span>
								<span className='text-gray-400'>{v.val.log}</span>
							</>
						}
				</p>)
			})}
		</div>
	)
}