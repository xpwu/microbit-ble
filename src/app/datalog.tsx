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
	const [, setMapVersion] = useState(0)
	const [groups, setGroups] = useState<readonly string[]>([])

	// 因为 group.ids 被作为 props 传递给子组件，所以需要使用 concat 而不能使用 push 以满足状态"快照"的要求
	function pushGroupIds(group:{ids:string[]}, ids:string[]) {
		group.ids = group.ids.concat(ids)
		setMapVersion(v=>v+1)
	}
	function removeGroupIds(group:{ids:string[]}, ids:string[]) {
		group.ids = group.ids.filter(v=>!ids.includes(v))
		setMapVersion(v=>v+1)
	}

	// insert: {at, id} --- insert 'id' at the 'at' pos, at=-1: append
	// insert: string --- append
	function updateGroups({deleteGIds = [], deleteIndices = [], insert = []}
													: {deleteGIds?: string[]|string, deleteIndices?: number[]|number
		, insert?: ({at:number, id:string}|string)[]|{at:number, id:string}|string}) {

		deleteGIds = deleteGIds instanceof Array? deleteGIds : [deleteGIds]
		deleteIndices = deleteIndices instanceof Array? deleteIndices : [deleteIndices]
		insert = insert instanceof Array? insert : [insert]

		let appendData: string[] = []
		let insertSet = new Map<number, string>()
		for (const insertElement of insert) {
			if (typeof insertElement === 'object' && insertElement.at !== -1) {
				insertSet.set(insertElement.at, insertElement.id)
				continue
			}

			// insertElement is string || insertElement.at === -1
			let pushId = insertElement
			if (typeof pushId === 'object') {
				pushId = pushId.id
			}
			appendData.push(pushId)
		}

		setGroups(groups=>{
			let newGroups:string[] = []
			groups.forEach((v, i)=>{
				if (insertSet.has(i)) {
					newGroups.push(insertSet.get(i)!)
				}
				if (insertSet.has(i-(1+groups.length))) {
					newGroups.push(insertSet.get(i)!)
				}

				if (deleteGIds.includes(v)) {
					return
				}
				if (deleteIndices.includes(i)) {
					return
				}

				newGroups.push(v)
			})

			newGroups.push(...appendData)

			return newGroups
		})
	}

	function addIdsIntoDefaultGroup(ids: string[]) {
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

			const newGroupId = UniqFlag()
			groupMapRef.current.set(newGroupId, {ids: [v], prefix: prefix})

			updateGroups({insert:newGroupId})
		})
	}

	useEffect(()=>{
		const item = Nc.addEvent(DataLogEvent, (e)=>{
			addIdsIntoDefaultGroup(e.ids)
		})

		return ()=>{
			item.remove()
		}
	}, [])

	useEffect(()=>{
		addIdsIntoDefaultGroup(DataLogAllIds())
	},[])

	const currentDragRef = useRef<DragData>({groupId:"", groupIndex: -1})
	const [insertPoint, setInsertPoint] = useState(-1)
	const mergeFlag = 1000

	type Deleted = boolean
	function freshGroupForId(groupId: string): Deleted {
		const g = groupMapRef.current.get(groupId)
		if (g === undefined) {
			return true
		}
		if (g.ids.length === 0) {
			groupMapRef.current.delete(groupId)
			return true
		}

		let pre = ""
		for (const id of g.ids) {
			const p = findPre(id)
			if (p === "") {
				break
			}
			if (pre === "") {
				pre = p
				continue
			}
			if (pre !== p) {
				pre = ""
				break
			}
		}
		g.prefix = pre
		return false
	}
	function mergeGroupIntoGroup(fromGroupId: string, toGroupId: string) {
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

		updateGroups({deleteGIds:fromGroupId})
	}
	function mergeIdIntoGroup(from: { groupId: string, id: string }, toGroupId: string) {
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
		let deleteId = freshGroupForId(from.groupId)?from.groupId:""

		updateGroups({deleteGIds:deleteId})
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
				mergeGroupIntoGroup(dragged.groupId, groups[toPoint])
				return
			}

			mergeIdIntoGroup({groupId: dragged.groupId, id: dragged.dataId!}, groups[toPoint])
			return
		}

		if (isWholeGroup(dragged)) {
			updateGroups({deleteIndices: currentDragRef.current.groupIndex
				, insert: {at: insertPoint, id: currentDragRef.current.groupId}})
			return
		}

		// id escape from group
		const draggedId = dragged.dataId!
		const draggedGroup = groupMapRef.current.get(dragged.groupId)
		if (draggedGroup === undefined) {
			return
		}
		removeGroupIds(draggedGroup, [draggedId])
		let deleteId = freshGroupForId(dragged.groupId)?dragged.groupId:""

		const newGroupId = UniqFlag()
		groupMapRef.current.set(newGroupId, {ids:[draggedId], prefix: findPre(draggedId)})

		updateGroups({deleteGIds: deleteId, insert: {at: insertPoint, id: newGroupId}})
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