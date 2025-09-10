'use client'

import {useEffect, useRef, useState, DragEvent} from "react"
import {Nc} from "@/nc"
import {DataLogAllIds, DataLogEvent} from "@/table/datalog"
import {UniqFlag} from "ts-xutils"
import cn from "classnames"
import {OneChartView} from "@/app/onechartview";


function findPre(v: string): string {
	let index = v.indexOf(".")
	if (index === -1) {
		return ""
	}
	return v.slice(0, index)
}

interface DragData {
	groupId: string
	groupIndex: number
	// undefined: all dataIds in the group
	dataId?: string
}

function isWholeGroup(d: DragData): boolean {
	return d.dataId === undefined
}

export function DataLog() {
	const allIdsRef = useRef<Set<string>>(new Set<string>())
	const groupMapRef = useRef(new Map<string, {ids:string[], prefix:string}>())
	const [groups, setGroups] = useState<string[]>([])

	// 因为 group.ids 被作为 props 传递给子组件，所以需要使用 concat 而不能使用 push 以满足状态"快照"的要求
	function pushGroupIds(group:{ids:string[]}, ids:string[]) {
		group.ids = group.ids.concat(ids)
	}
	function removeGroupIds(group:{ids:string[]}, ids:string[]) {
		group.ids = group.ids.filter(v=>!ids.includes(v))
	}

	function updateGroup(ids: string[]) {
		ids.forEach((v)=> {
			if (allIdsRef.current.has(v)) {
				return
			}
			allIdsRef.current.add(v)
			const prefix = findPre(v)
			if (prefix != "") {
				for (const [_, value] of groupMapRef.current) {
					if (value.prefix == prefix) {
						pushGroupIds(value, [v])
						return
					}
				}
			}

			const flag = UniqFlag()
			groupMapRef.current.set(flag, {ids: [v], prefix: prefix})
			setGroups(groups=>groups.concat(flag))
		})
	}

	useEffect(()=>{
		const item = Nc.addEvent(DataLogEvent, (e)=>{
			updateGroup(e.ids)
		})

		return ()=>{
			item.remove()
		}
	}, [DataLogEvent])

	useEffect(()=>{
		updateGroup(DataLogAllIds())
	},[])

	const currentDragRef = useRef<DragData>({groupId:"", groupIndex: -1})
	const [insertPoint, setInsertPoint] = useState(-1)
	const mergeFlag = 1000

	function mergeGroupToGroup(fromGroupId: string, toGroupId: string) {
		const fromGroup = groupMapRef.current.get(fromGroupId)
		const toGroup = groupMapRef.current.get(toGroupId)
		if (fromGroup === undefined || toGroup === undefined) {
			console.error("mergeGroup or toGroup undefined")
			return
		}

		if (fromGroup.prefix != toGroup.prefix) {
			toGroup.prefix = ""
		}
		pushGroupIds(toGroup, fromGroup.ids)
		groupMapRef.current.delete(fromGroupId)

		setGroups(g=>g.filter(value => value !== fromGroupId))
	}
	function mergeIdToGroup(from: { groupId: string, id: string }, toGroupId: string) {
		const fromGroup = groupMapRef.current.get(from.groupId)
		const toGroup = groupMapRef.current.get(toGroupId)
		if (fromGroup === undefined || toGroup === undefined) {
			console.error("mergeGroup or toGroup undefined")
			return
		}

		if (findPre(from.id) !== toGroup.prefix) {
			toGroup.prefix = ""
		}
		pushGroupIds(toGroup, [from.id])
		removeGroupIds(fromGroup, [from.id])

		let deleteId = ""
		if (fromGroup.ids.length === 0) {
			groupMapRef.current.delete(from.groupId)
			deleteId = from.groupId
		}

		setGroups(g=>g.filter(value => value !== deleteId))
	}

	function dragStartHandle(dragGroupId: string, dragGroupIndex: number) {
		currentDragRef.current = {groupId: dragGroupId, groupIndex: dragGroupIndex}
	}
	function dragOverHandle(e: DragEvent<HTMLDivElement>, overGroupIndex: number){
		e.preventDefault()
		if (currentDragRef.current.groupIndex === overGroupIndex && isWholeGroup(currentDragRef.current)) {
			setInsertPoint(-1)
			return
		}
		const node = e.currentTarget
		const rect = node.getBoundingClientRect()
		const relativeY = e.clientY - rect.y
		if (relativeY < rect.height/3) {
			setInsertPoint(overGroupIndex)
		} else if (relativeY > 2*rect.height/3) {
			setInsertPoint(overGroupIndex+1)
		} else if (currentDragRef.current.groupIndex !== overGroupIndex) {
			setInsertPoint(overGroupIndex + mergeFlag)
		} else {
			setInsertPoint(-1)
		}
	}
	function runDropping() {
		const dragged = currentDragRef.current
		// dragged node is just the insert point && one group merge to another group
		if (dragged.groupIndex === insertPoint && isWholeGroup(dragged)) {
			return
		}

		if (insertPoint >= mergeFlag) {
			const toPoint = insertPoint - mergeFlag
			if (toPoint === dragged.groupIndex) {
				return
			}
			if (isWholeGroup(dragged)) {
				mergeGroupToGroup(dragged.groupId, groups[toPoint])
				return
			}

			mergeIdToGroup({groupId: dragged.groupId, id: dragged.dataId!}, groups[toPoint])
			return
		}

		if (isWholeGroup(dragged)) {
			let newGroups:string[] = []
			groups.forEach((v, i)=>{
				if (i === currentDragRef.current.groupIndex) {
					return
				}
				if (i === insertPoint) {
					newGroups.push(currentDragRef.current.groupId)
				}
				newGroups.push(v)
			})
			if (insertPoint === groups.length) {
				newGroups.push(currentDragRef.current.groupId)
			}
			setGroups(newGroups)

			return
		}

		// id merge to group
		const draggedId = dragged.dataId!
		const draggedGroup = groupMapRef.current.get(dragged.groupId)
		if (draggedGroup === undefined) {
			return
		}
		removeGroupIds(draggedGroup, [draggedId])
		let deleteId = ""
		if (draggedGroup.ids.length === 0) {
			groupMapRef.current.delete(dragged.groupId)
			deleteId = dragged.groupId
		}

		// id escape from group
		const newGroupId = UniqFlag()
		groupMapRef.current.set(newGroupId, {ids:[draggedId], prefix: findPre(draggedId)})
		let newGroups:string[] = []
		groups.forEach((v, i)=>{
			if (v === deleteId) {
				return
			}
			if (i === insertPoint) {
				newGroups.push(newGroupId)
			}
			newGroups.push(v)
		})
		if (insertPoint === groups.length) {
			newGroups.push(newGroupId)
		}
		setGroups(newGroups)
	}
	function dropHandle() {
		if (insertPoint === -1) {
			return;
		}
		runDropping()
		setInsertPoint(-1)
	}

	const lastChart = useRef<HTMLDivElement|null>(null)
	function bgDragOverHandle(e: DragEvent<HTMLDivElement>) {
		e.preventDefault()

		if (lastChart.current === null) {
			return
		}
		const rect = lastChart.current.getBoundingClientRect()
		const bgY = rect.y + rect.height
		if (e.clientY < bgY || e.clientY > bgY + rect.height/2) {
			setInsertPoint(-1)
			return
		}

		setInsertPoint(groups.length)
	}

	return (
		<div className="h-full overflow-auto"
				 onDragOver={e=>{e.stopPropagation(); bgDragOverHandle(e)}}
				 onDragLeave={()=>setInsertPoint(-1)}
				 onDrop={e=>{e.stopPropagation(); dropHandle()}}
		>

			{groups.map((v, i)=>
				<div key={v} draggable={true} ref={node=>{lastChart.current=node}}
						 className= {cn("border-blue-500", {
							 "border-t-2": insertPoint == i,
							 "border-2": insertPoint == i + mergeFlag,
						 })}
						 onDragStart={()=>dragStartHandle(v, i)}
						 onDragOver={e=>{e.stopPropagation(); dragOverHandle(e, i)}}
						 onDragLeave={()=>setInsertPoint(-1)}
						 onDrop={e=>{e.stopPropagation(); dropHandle()}}
				>

					<div className="my-0.5">
						<OneChartView showIds={groupMapRef.current.get(v)?.ids || []} startColor={i}
													onDragLabel={id=>currentDragRef.current = {groupId: v, groupIndex: i, dataId: id}}/>
					</div>
				</div>
				)}
			<div className= {cn("border-blue-500", {"border-t-2":insertPoint == groups.length})}></div>
		</div>
	)
}