'use client'

import {useCallback, useEffect, useMemo, useRef, useState} from "react"
import {Nc} from "@/nc"
import {AllLogEvent, Last, LoadFrom, LoadUntil, Log, Type} from "@/table/alllog"
import {Delay, Millisecond} from "ts-xutils"
import {useInView} from "react-intersection-observer"
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome"
import {faAnglesDown, faSpinner} from "@fortawesome/free-solid-svg-icons"
import cn from "classnames"

function timeFormatter(date: Date) {
	function pad2(number: number) { return (number < 10 ? '0' : '') + number }
	function pad3(number: number) {return (number < 10 ? '00' : (number < 100? '0':'')) + number}

	return pad2(date.getHours()) + ':' + pad2(date.getMinutes())
		+ ':' + pad2(date.getSeconds()) + '.' + pad3(date.getMilliseconds());
}

const page = 30

enum ShowState {
	ManualScrolling, AutoScrolling
}

enum MoreState {
	Loading, NoMore, HasMore
}

export default function AllLogs() {
	const initData = useMemo(()=>Last(2*page), [])
	// [first, end) 来表示 logs 与底层数据之间的对应关系
	const indexRef = useRef({first: initData.endIndex - initData.logs.length, end: initData.endIndex})
	const [logs, setLogs] = useState<{key:number, val:Log}[]>(initData.logs.map(
		(v, i)=>{return {key: indexRef.current.first + i, val: v}}))
	const logsLenRef = useRef(logs.length)

	const showStateRef = useRef(ShowState.AutoScrolling)

	const hasMorePageRef = useRef({pre: initData.logs.length === 2*page, next: false})
	const [headerState, setHeaderState] = useState(hasMorePageRef.current.pre? MoreState.HasMore: MoreState.NoMore)
	const [footerState, setFooterState] = useState(hasMorePageRef.current.next? MoreState.HasMore: MoreState.NoMore)

	const containerNodeRef = useRef<HTMLDivElement>(null)

	const {ref: observerPreFlagNode, inView: preFlagInView} = useInView({initialInView: true})
	const {ref: observerNextFlagNode, inView: nextFlagInView} = useInView({initialInView: true})

	logsLenRef.current = logs.length

	const loadPrePage = useCallback(async (ignoreScroll: boolean)=>{
		if (containerNodeRef.current === null) {
			return
		}
		const scrollTop = containerNodeRef.current.scrollTop
		if (!ignoreScroll) {
			await Delay(500*Millisecond)
			if (containerNodeRef.current.scrollTop > scrollTop) {
				return
			}
		}

		const first = indexRef.current.first
		setHeaderState(MoreState.Loading)
		const newLogs = LoadUntil(first, page).map((v, i, thisLogs) => {
			return {key: indexRef.current.first - thisLogs.length + i, val: v}
		})
		setHeaderState(MoreState.HasMore)
		if (first != indexRef.current.first) {
			return
		}
		if (!ignoreScroll) {
			if (containerNodeRef.current.scrollTop > scrollTop) {
				return
			}
		}

		if (newLogs.length < page) {
			setHeaderState(MoreState.NoMore)
		}
		if (newLogs.length === 0) {
			return
		}

		const allLen = newLogs.length + logsLenRef.current
		const sliceStart = 0
		const sliceEnd = 4 * page < allLen ? 4*page : allLen
		indexRef.current.first -= newLogs.length
		indexRef.current.end = indexRef.current.first + sliceEnd

		setLogs(logs => newLogs.concat(logs).slice(sliceStart, sliceEnd))
	}, [])

	const loadNextPage = useCallback(async (ignoreScroll: boolean)=>{
		if (containerNodeRef.current === null) {
			return
		}
		const scrollTop = containerNodeRef.current.scrollTop
		if (!ignoreScroll) {
			await Delay(500*Millisecond)
			if (containerNodeRef.current.scrollTop < scrollTop) {
				return
			}
		}

		const end = indexRef.current.end
		setFooterState(MoreState.Loading)
		const newLogs = LoadFrom(end, page).map((v, i) => {
			return {key: indexRef.current.end + i, val: v}
		})
		setFooterState(MoreState.HasMore)
		if (end != indexRef.current.end) {
			return
		}
		if (!ignoreScroll) {
			if (containerNodeRef.current.scrollTop < scrollTop) {
				return
			}
		}

		if (newLogs.length < page) {
			setFooterState(MoreState.NoMore)
		}
		if (newLogs.length === 0) {
			return
		}

		const allLen = logsLenRef.current + newLogs.length
		const sliceStart = 4 * page > allLen ? 0 : allLen - 4*page
		const sliceEnd = allLen
		indexRef.current.end += newLogs.length
		indexRef.current.first += sliceStart

		setLogs(logs => logs.concat(newLogs).slice(sliceStart, sliceEnd))
	}, [])

	if (preFlagInView && hasMorePageRef.current.pre) {
		loadPrePage(false).then()
	}

	if (hasMorePageRef.current.next && nextFlagInView) {
		loadNextPage(false).then()
	}

	useEffect(()=>{
		const item =Nc.addEvent(AllLogEvent, ()=>{
			if (showStateRef.current === ShowState.ManualScrolling && logsLenRef.current >= 4*page) {
				setFooterState(MoreState.HasMore)
				return
			}

			const end = indexRef.current.end
			const newLogs = LoadFrom(end).map((v, i) => {
				return {key: indexRef.current.end + i, val: v}
			})

			if (newLogs.length === 0) {
				return
			}
			if (end != indexRef.current.end) {
				return
			}
			setFooterState(MoreState.NoMore)

			let sliceStart = 0
			const allLen = logsLenRef.current + newLogs.length
			let sliceEnd = allLen

			if (showStateRef.current === ShowState.AutoScrolling) {
				indexRef.current.end += newLogs.length
				sliceStart = allLen - 2*page
				sliceStart = sliceStart < 0 ? 0 : sliceStart
				indexRef.current.first += sliceStart
			} else {
				indexRef.current.first += 0
				if (allLen > 4*page) {
					setFooterState(MoreState.HasMore)
					sliceEnd = 4*page
				}
				indexRef.current.end = indexRef.current.first + sliceEnd
			}

			setLogs(logs =>logs.concat(newLogs).slice(sliceStart, sliceEnd))
		})
		return ()=>{
			item.remove()
		}
	}, [])

	// state and auto-scroll
	const {ref: observerLastNode, inView: lastNodeInView} = useInView({threshold: 0.1, initialInView:true})
	const lastNodeRef = useRef<HTMLParagraphElement>(null)
	showStateRef.current = lastNodeInView?ShowState.AutoScrolling:ShowState.ManualScrolling

	useEffect(()=>{
		if (showStateRef.current === ShowState.AutoScrolling) {
			lastNodeRef.current?.scrollIntoView({behavior:"instant"})
		}
		observerLastNode(lastNodeRef.current)
	}, [logs])

	const last = useCallback(async() => {
		showStateRef.current = ShowState.AutoScrolling
		const newLogs = Last(2*page)
		setFooterState(MoreState.NoMore)
		setLogs(() => {
			indexRef.current = {first: newLogs.endIndex - newLogs.logs.length, end: newLogs.endIndex}
			return newLogs.logs.map((v, i)=>{return {key: indexRef.current.first + i, val: v}})
		})
	}, [])

	return (
		<div className="relative w-full h-full overflow-y-auto wrap-break-word" ref={containerNodeRef}>
			<button className={cn('my-1 mx-auto w-fit text-gray-600 border '
				, ' rounded-lg hover:border-blue-300 text-[12px] p-0'
				, (headerState != MoreState.HasMore? "hidden": "block"))}
							onClick={()=>loadPrePage(true)}>加载更多</button>
			<div className={cn('my-1 mx-auto w-fit text-gray-400 text-[12px]'
				, (headerState != MoreState.NoMore? "hidden": "block"))}>------到顶了------</div>
			<FontAwesomeIcon icon={faSpinner} spinPulse size="xs"
											 style={{display: headerState != MoreState.Loading? "none": "block"}}
											 className={'mx-auto my-1 text-gray-400'}/>

			{logs.map((v, i)=> {
				const time = timeFormatter(new Date(v.val.since1970/Millisecond))
				const nextMoreIndex = showStateRef.current === ShowState.AutoScrolling ? logs.length : logs.length - page
				const preMoreIndex = page
				return (
					<p key={v.key}
						 ref={node => {
							 lastNodeRef.current = node
							 if (i === nextMoreIndex) {
								 observerNextFlagNode(node)
							 }
							 if (i === preMoreIndex) {
								 observerPreFlagNode(node)
							 }
						 }}>
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

			<button className={cn('my-1 mx-auto w-fit text-gray-600 border '
				, ' rounded-lg hover:border-blue-300 text-[12px] p-0 block'
				, (footerState != MoreState.HasMore? "hidden": "block"))}
							onClick={()=>loadNextPage(true)}>加载更多</button>
			<FontAwesomeIcon icon={faSpinner} spinPulse size="xs"
											 style={{display: footerState != MoreState.Loading? "none": "block"}}
											 className={'mx-auto my-1 text-gray-400'}/>

			<FontAwesomeIcon icon={faAnglesDown} size="xs" onClick={last}
											 style={{display: footerState != MoreState.HasMore? "none": "block"}}
											 className={'absolute right-5 bottom-2 text-blue-300 hover:text-blue-500'}/>
		</div>
	)
}