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
		const newLogs = LoadUntil(first, page)
		if (newLogs.length === 0) {
			setHeaderState(MoreState.NoMore)
			return
		}
		setHeaderState(MoreState.HasMore)
		setLogs(logs => {
			if (first != indexRef.current.first) {
				return logs
			}
			if (!ignoreScroll) {
				if (containerNodeRef.current === null || containerNodeRef.current.scrollTop > scrollTop) {
					return logs
				}
			}

			if (newLogs.length < page) {
				setHeaderState(MoreState.NoMore)
			}
			const added = newLogs.map((v, i) => {
				return {key: indexRef.current.first - newLogs.length + i, val: v}
			})

			indexRef.current.first -= newLogs.length
			const res = added.concat(logs.slice(0, 4 * page - newLogs.length))
			indexRef.current.end = res.at(-1)!.key + 1

			return res
		})
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
		const newLogs = LoadFrom(end, page)
		if (newLogs.length === 0) {
			setFooterState(MoreState.NoMore)
			return
		}
		setFooterState(MoreState.HasMore)
		setLogs(logs => {
			if (end != indexRef.current.end) {
				return logs
			}
			if (!ignoreScroll) {
				if (containerNodeRef.current === null || containerNodeRef.current.scrollTop < scrollTop) {
					return logs
				}
			}

			if (newLogs.length < page) {
				setFooterState(MoreState.NoMore)
			}
			const added = newLogs.map((v, i) => {
				return {key: indexRef.current.end + i, val: v}
			})

			indexRef.current.end += newLogs.length
			let sliceStart = logs.length - (4*page - newLogs.length)
			sliceStart = sliceStart < 0 ? 0 : sliceStart
			const res = logs.slice(sliceStart).concat(added)
			indexRef.current.first = res[0].key

			return res
		})
	}, [])

	useEffect(()=>{
		logsLenRef.current = logs.length
	}, [logs])

	useEffect(()=>{
		if (!hasMorePageRef.current.pre  || !preFlagInView) {
			return
		}
		loadPrePage(false).then()
	}, [preFlagInView, loadPrePage])

	useEffect(()=>{
		if (!hasMorePageRef.current.next || !nextFlagInView) {
			return
		}
		loadNextPage(false).then()
	}, [nextFlagInView, loadNextPage])

	useEffect(()=>{
		const item =Nc.addEvent(AllLogEvent, ()=>{
			if (showStateRef.current === ShowState.ManualScrolling && logsLenRef.current >= 4*page) {
				setFooterState(MoreState.HasMore)
				return
			}

			const end = indexRef.current.end
			const newLogs = LoadFrom(end)
			if (newLogs.length === 0) {
				return
			}

			setLogs(logs =>{
				setFooterState(MoreState.NoMore)

				if (end != indexRef.current.end) {
					return logs
				}

				const added = newLogs.map((v, i) => {
					return {key: indexRef.current.end + i, val: v}
				})

				let res = logs.concat(added)

				if (showStateRef.current === ShowState.AutoScrolling) {
					indexRef.current.end += newLogs.length
					let sliceStart = res.length - 2*page
					sliceStart = sliceStart < 0 ? 0 : sliceStart
					res = res.slice(sliceStart)
					indexRef.current.first = res[0].key

					return res
				}

				if (res.length > 4*page) {
					setFooterState(MoreState.HasMore)
				}
				res = res.slice(0, 4*page)
				indexRef.current.first = res[0].key
				indexRef.current.end = res.at(-1)!.key + 1

				return res
			})
		})
		return ()=>{
			item.remove()
		}
	}, [])

	// state and auto-scroll
	const {ref: observerLastNode, inView: lastNodeInView} = useInView({threshold: 0.1, initialInView:true})
	const lastNodeRef = useRef<HTMLParagraphElement>(null)
	useEffect(()=>{
		if (showStateRef.current === ShowState.AutoScrolling) {
			lastNodeRef.current?.scrollIntoView({behavior:"instant"})
		}
		observerLastNode(lastNodeRef.current)
	}, [logs])
	useEffect(()=>{
		showStateRef.current = lastNodeInView?ShowState.AutoScrolling:ShowState.ManualScrolling
	}, [lastNodeInView])

	const last = useCallback(async() => {
		showStateRef.current = ShowState.AutoScrolling
		const newLogs = Last(2*page)
		setLogs(() => {
			indexRef.current = {first: newLogs.endIndex - newLogs.logs.length, end: newLogs.endIndex}
			setFooterState(MoreState.NoMore)
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