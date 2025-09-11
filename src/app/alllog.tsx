'use client'

import {useEffect, useMemo, useRef, useState} from "react"
import {Nc} from "@/nc"
import {AllLogEvent, AllLogFrom, AllLogLast, Log, Type} from "@/table/alllog"
import {Millisecond} from "ts-xutils"

function timeFormatter(date: Date) {
	function pad2(number: number) { return (number < 10 ? '0' : '') + number }
	function pad3(number: number) {return (number < 10 ? '00' : (number < 100? '0':'')) + number}

	return pad2(date.getHours()) + ':' + pad2(date.getMinutes())
		+ ':' + pad2(date.getSeconds()) + '.' + pad3(date.getMilliseconds());
}

export default function AllLogs() {
	const initData = useMemo(AllLogLast, [])
	const index = useRef({first: initData.lastIndex - initData.logs.length + 1, last: initData.lastIndex})
	const [logs, setLogs] = useState(initData.logs)

	useEffect(()=>{
		const item =Nc.addEvent(AllLogEvent, ()=>{
			const newLogs = AllLogFrom(index.current.last + 1)
			index.current.last += newLogs.length
			setLogs(logs =>{
				let slice: Log[]
				if (logs.length > 100) {
					const dropData = 30
					slice = logs.slice(dropData)
					index.current.first += dropData
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

	const autoScroll = useRef(true)

	const endRef = useRef<HTMLDivElement>(null)
	useEffect(()=>{
		if (autoScroll.current) {
			endRef.current?.scrollIntoView({behavior:"instant"})
		}
	}, [logs])

	return (
		<div className="w-full h-full overflow-y-auto wrap-break-word" ref={(node)=>{
			if (node === null) {
				return
			}

			node.onscroll = ()=>{
				autoScroll.current = node.scrollHeight - node.offsetHeight - node.scrollTop < node.offsetHeight/3
			}
		}}>
			{logs.map((v, i)=> {
				const time = timeFormatter(new Date(v.since1970/Millisecond))
				switch (v.type) {
					case Type.Tips:
						return <p key={index.current.first+i} className='text-gray-400'>
							<span className='text-gray-300'>{time}&nbsp;&nbsp;&nbsp;&nbsp;</span>
							<span className='text-gray-400'>{v.log}</span>
						</p>
					case Type.MicrobitLog:
						return <p key={index.current.first+i}> <span className='text-gray-300'>{time + ' >'}</span> {v.log}</p>
					default:
						return <></>
				}
			})}
			<div ref={endRef}></div>
		</div>
	)
}