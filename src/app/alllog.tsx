'use client'

import {Dispatch, RefObject, SetStateAction, useCallback, useEffect, useMemo, useRef, useState} from "react"
import {Nc} from "@/nc"
import {AllLogEvent, Last, LoadFrom, LoadUntil, Log, Type} from "@/table/alllog"
import {Delay, Millisecond} from "ts-xutils"
import {useInView} from "react-intersection-observer"
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome"
import {faAnglesDown, faSpinner} from "@fortawesome/free-solid-svg-icons"
import cn from "classnames"
import {MicrobitState} from "@/x/microbit"
import {microbitState} from "@/table/microbit"

function timeFormatter(date: Date) {
	function pad2(number: number) { return (number < 10 ? '0' : '') + number }
	function pad3(number: number) {return (number < 10 ? '00' : (number < 100? '0':'')) + number}

	return pad2(date.getHours()) + ':' + pad2(date.getMinutes())
		+ ':' + pad2(date.getSeconds()) + '.' + pad3(date.getMilliseconds());
}

const page = 30

enum MoreState {
	NoMore, Loading, HasMore
}

// lastNodeRef: 没有渲染最后一条数据，就设置为null
// isLatestRef: 是否为显示最新log的显示模式
type ShowLatestHookRes = [RefObject<HTMLElement|null>, Readonly<RefObject<boolean>>]
	& {lastNodeRef:  RefObject<HTMLElement|null>, isLatestRef: Readonly<RefObject<boolean>>}

function useShowLatest(...postRenderDeps: any[]): ShowLatestHookRes {
	const isLatestRef = useRef(true)
	const lastNodeRef = useRef<HTMLElement|null>(undefined)
	const {ref: observerLastNode, inView: previousLastNodeInView} = useInView({threshold: 0.1, initialInView: true})

	isLatestRef.current = previousLastNodeInView && lastNodeRef.current !== null

	useEffect(()=>{
		if (isLatestRef.current ) {
			lastNodeRef.current?.scrollIntoView({behavior:"instant"})
		}
		observerLastNode(lastNodeRef.current)
	}, [...postRenderDeps])

	const res = [lastNodeRef, isLatestRef] as unknown as ShowLatestHookRes
	res.lastNodeRef = res[0]
	res.isLatestRef = res[1]

	return res
}

type ShowLog = {key:number, val:Log}

type MergeShowLogsHookResponse = [
	readonly ShowLog[],
	Dispatch<SetStateAction<ShowLog[]>>,
	// [first, end) 来表示 logs 与底层数据之间的对应关系; len = end - first = logs.length
	Readonly<RefObject<{readonly first: number, readonly end: number, readonly len: number}>>
] & {
	logs: readonly ShowLog[]
	setLogs: Dispatch<SetStateAction<ShowLog[]>>
	// [first, end) 来表示 logs 与底层数据之间的对应关系; len = end - first = logs.length
	indexRef: Readonly<RefObject<{readonly first: number, readonly end: number }>>
};

function useMergeShowLogs(initialState: ShowLog[] | (() => ShowLog[])): MergeShowLogsHookResponse {
	const [logs, setOriLogs] = useState<ShowLog[]>(initialState)
	const setLogs = useCallback<Dispatch<SetStateAction<ShowLog[]>>>((f: SetStateAction<ShowLog[]>) => {
		if (typeof f === 'object') {
			setOriLogs(f)
			return
		}
		setOriLogs(logs => {
			let res = f(logs)
			if (res.length === 0) {
				return res
			}
			if (res.at(-1)!.key + 1 - res[0].key === res.length) {
				return res
			}

			const set = new Set<number>()
			res = res.filter(v => {
				if (set.has(v.key)) {
					return false
				}
				set.add(v.key)
				return true
			})

			return res
		})
	}, [])
	// [first, end) 来表示 logs 与底层数据之间的对应关系; len = end - first
	const first = logs.at(0)?.key||0
	const end = logs.at(-1) !== undefined? logs.at(-1)!.key + 1 : 0
	console.assert(end-first === logs.length)

	const indexRef = useRef({first: first, end: end, len: logs.length})
	indexRef.current = {first: first, end: end, len: logs.length}

	const res: MergeShowLogsHookResponse = [logs, setLogs, indexRef] as unknown as MergeShowLogsHookResponse
	res.logs = res[0]
	res.setLogs = res[1]
	res.indexRef = res[2]

	return res
}

function usePostRender(...deps: any[]): RefObject<()=>void> {
	const postRender = useRef<()=>void>(()=>{})
	useEffect(()=>{
		postRender.current()
		postRender.current = ()=>{}
	}, [...deps])

	return postRender
}

export default function AllLogs() {
	const initData = useMemo(()=>Last(2*page), [])

	const [logs, setLogs, indexRef] = useMergeShowLogs(initData.logs.map(
		(v, i)=>{return {key: initData.endIndex - initData.logs.length + i, val: v}}))

	const [lastNodeRef, isLatestRef] = useShowLatest(logs)

	const postRender = usePostRender(logs)

	const [headerState, setHeaderState] = useState(
		initData.logs.length === 2*page? MoreState.HasMore: MoreState.NoMore)
	const [footerState, setFooterState] = useState(MoreState.NoMore)

	const containerNodeRef = useRef<HTMLDivElement>(null)

	const {ref: observerPreFlagNode, inView: preFlagInView} = useInView({initialInView: true})
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
			return {key: first - thisLogs.length + i, val: v}
		})
		setHeaderState(MoreState.HasMore)
		// 上面的数据获取后面可能会存在异步获取的情况
		// 所以使用数据前，需要再次确认是否有其他操作已经改变了数据，或者滚动过滚动条
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

		const allLen = newLogs.length + indexRef.current.len
		const sliceStart = 0
		const sliceEnd = 4 * page < allLen ? 4*page : allLen
		if (sliceEnd < allLen) {
			setFooterState(MoreState.HasMore)
		}

		setLogs(logs => newLogs.concat(logs).slice(sliceStart, sliceEnd))
	}, [])
	useEffect(()=>{
		if (!preFlagInView || headerState !== MoreState.HasMore) {
			return
		}
		loadPrePage(false).then()
	}, [preFlagInView])

	const {ref: observerNextFlagNode, inView: nextFlagInView} = useInView({initialInView: true})
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
			return {key: end + i, val: v}
		})
		setFooterState(MoreState.HasMore)
		// 上面的数据获取后面可能会存在异步获取的情况
		// 所以使用数据前，需要再次确认是否有其他操作已经改变了数据，或者滚动过滚动条
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

		const allLen = indexRef.current.len + newLogs.length
		const sliceStart = 4 * page > allLen ? 0 : allLen - 4*page
		const sliceEnd = allLen
		if (sliceStart > 0) {
			setHeaderState(MoreState.HasMore)
		}

		setLogs(logs => logs.concat(newLogs).slice(sliceStart, sliceEnd))
	}, [])
	useEffect(()=>{
		if (footerState !== MoreState.HasMore || !nextFlagInView) {
			return
		}
		loadNextPage(false).then()
	}, [nextFlagInView])

	useEffect(()=>{
		const item =Nc.addEvent(AllLogEvent, ()=>{
			if (!isLatestRef.current && indexRef.current.len >= 4*page) {
				setFooterState(MoreState.HasMore)
				return
			}

			const end = indexRef.current.end
			const newLogs = LoadFrom(end).map((v, i) => {
				return {key: end + i, val: v}
			})

			// 上面的数据获取后面可能会存在异步获取的情况
			// 所以使用数据前，需要再次确认是否有其他操作已经改变了数据
			if (newLogs.length === 0) {
				return
			}
			if (end != indexRef.current.end) {
				return
			}
			setFooterState(MoreState.NoMore)

			let sliceStart = 0
			const allLen = indexRef.current.len + newLogs.length
			let sliceEnd = allLen

			if (isLatestRef.current) {
				sliceStart = allLen - 2*page
				sliceStart = sliceStart < 0 ? 0 : sliceStart
				if (sliceStart > 0) {
					setHeaderState(MoreState.HasMore)
				}
			} else {
				if (allLen > 4*page) {
					setFooterState(MoreState.HasMore)
					sliceEnd = 4*page
				}
			}

			setLogs(logs =>logs.concat(newLogs).slice(sliceStart, sliceEnd))
		})
		return ()=>{
			item.remove()
		}
	}, [])

	const firstNodeRef = useRef<HTMLParagraphElement>(null)

	const last = useCallback(async() => {
		const end = indexRef.current.end
		setFooterState(MoreState.Loading)
		const newLogs = Last(2*page)
		// 上面的数据获取后面可能会存在异步获取的情况
		// 所以使用数据前，需要再次确认是否有其他操作已经改变了数据
		if (end != indexRef.current.end) {
			return
		}
		setFooterState(MoreState.NoMore)
		if (newLogs.logs.length === 2*page) {
			setHeaderState(MoreState.HasMore)
		}

		if (newLogs.logs.length === 0) {
			return
		}

		const first = newLogs.endIndex - newLogs.logs.length
		const res = newLogs.logs.map((v, i)=>{return {key: first + i, val: v}})
		postRender.current = ()=>lastNodeRef.current?.scrollIntoView({behavior:"instant"})
		setLogs(res)
	}, [])

	return (
		<div className="relative w-full h-full">
			<div className="w-full h-full overflow-y-auto wrap-break-word" ref={containerNodeRef}>
				<button className={cn('my-1 mx-auto w-fit text-gray-600 border '
					, ' rounded-lg hover:border-blue-300 text-[12px] p-0'
					, (headerState != MoreState.HasMore? "hidden": "block"))}
								onClick={async ()=>{
									const node = firstNodeRef.current
									const firstY = node?.getBoundingClientRect().y || 0
									postRender.current = ()=>{
										const nowY = node?.getBoundingClientRect().y || 0
										containerNodeRef.current?.scrollTo(0, nowY - firstY)
									}
									await loadPrePage(true)

								}}>加载更多</button>
				<div className={cn('my-1 mx-auto w-fit text-gray-400 text-[12px]'
					, (headerState != MoreState.NoMore? "hidden": "block"))}
				>{logs.length === 0?'------没有Log------':'------到顶了------'}</div>
				<FontAwesomeIcon icon={faSpinner} spinPulse size="xs"
												 style={{display: headerState != MoreState.Loading? "none": "block"}}
												 className={'mx-auto my-1 text-gray-400'}/>

				{logs.map((v, i, thisLogs)=> {
					const time = timeFormatter(new Date(v.val.since1970/Millisecond))
					return (
						<p key={v.key}
							 ref={node => {
								 if (i === 0) {
									 firstNodeRef.current = node
								 }
								 if (i === page - 1) {
									 observerPreFlagNode(node)
								 }
								 if (i === thisLogs.length - page) {
									 observerNextFlagNode(node)
								 }
								 if (i === thisLogs.length - 1) {
									 if (footerState === MoreState.HasMore) {
										 lastNodeRef.current = null
									 } else {
										 lastNodeRef.current = node
									 }
								 }
							 }}
						>
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
				<div className={cn('my-1 mx-auto w-fit text-gray-400 text-[12px]'
					, (footerState != MoreState.NoMore || logs.length === 0
					|| microbitState()===MicrobitState.Connected? "hidden": "block"))}
				>------这是底线------</div>
			</div>
			<FontAwesomeIcon icon={faAnglesDown} size="xs" onClick={last}
											 style={{display: footerState != MoreState.HasMore? "none": "block"}}
											 className={'absolute right-5 bottom-2 z-50 text-blue-300 hover:text-blue-500'}/>
		</div>
	)
}