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

export function DataLog() {
	const allIdsRef = useRef<Set<string>>(new Set<string>())
	const allGroupIdsRef = useRef(new Map<string, {ids:string[], prefix:string}>())
	const [groups, setGroups] = useState<string[]>([])

	function mergeGroupToGroup(fromGroupId: string, toGroupId: string) {
		const fromGroup = allGroupIdsRef.current.get(fromGroupId)
		const toGroup = allGroupIdsRef.current.get(toGroupId)
		if (fromGroup === undefined || toGroup === undefined) {
			console.error("mergeGroup or toGroup undefined")
			return
		}

		if (fromGroup.prefix != toGroup.prefix) {
			toGroup.prefix = ""
		}
		toGroup.ids = toGroup.ids.concat(fromGroup.ids)
		allGroupIdsRef.current.delete(fromGroupId)

		setGroups(g=>g.filter(value => value !== fromGroupId))
	}

	function updateGroup(ids: string[]) {
		ids.forEach((v)=> {
			if (allIdsRef.current.has(v)) {
				return
			}
			allIdsRef.current.add(v)
			const prefix = findPre(v)
			if (prefix != "") {
				for (const [_, value] of allGroupIdsRef.current) {
					if (value.prefix == prefix) {
						// 因为 value.ids 被作为 props 传递给子组件，所以需要使用 concat 而不能使用 push 以满足状态"快照"的要求
						// value.ids.push(v)
						value.ids = value.ids.concat(v)
						return
					}
				}
			}

			const flag = UniqFlag()
			allGroupIdsRef.current.set(flag, {ids: [v], prefix: prefix})
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

	const currentDragRef = useRef({groupId:"", index: -1})
	const [insertPoint, setInsertPoint] = useState(-1)
	const mergeFlag = 1000

	function dragStartHandle(dragGroupId: string, dragGroupIndex: number) {
		currentDragRef.current = {groupId: dragGroupId, index: dragGroupIndex}
	}
	function dragOverHandle(e: DragEvent<HTMLDivElement>, overGroupIndex: number){
		e.preventDefault()
		if (currentDragRef.current.index === overGroupIndex) {
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
		} else {
			setInsertPoint(overGroupIndex + mergeFlag)
		}
	}
	function dropHandle(dropGroupIndex:number) {
		if (insertPoint === -1) {
			return;
		}
		// dragged node is dropped node  or dragged node is just the insert point
		if (currentDragRef.current.index === dropGroupIndex || currentDragRef.current.index === insertPoint) {
			setInsertPoint(-1)
			return
		}

		if (insertPoint >= mergeFlag) {
			const toPoint = insertPoint - mergeFlag
			mergeGroupToGroup(currentDragRef.current.groupId, groups[toPoint])
		} else {
			let newGroups:string[] = []
			groups.forEach((v, i)=>{
				if (i === currentDragRef.current.index) {
					return
				}
				if (i === insertPoint) {
					newGroups.push(currentDragRef.current.groupId)
					newGroups.push(v)
					return
				}
				newGroups.push(v)
			})
			if (insertPoint === groups.length) {
				newGroups.push(currentDragRef.current.groupId)
			}
			setGroups(newGroups)
		}

		setInsertPoint(-1)
	}

	return (
		<>
			{groups.map((v, i)=>
				<div key={v} draggable={true}
						 className= {cn("border-blue-500", {
							 "border-t-2": insertPoint == i,
							 "border-2": insertPoint == i + mergeFlag,
						 })}
						 onDragStart={()=>dragStartHandle(v, i)}
						 onDragOver={e=>dragOverHandle(e, i)}
						 onDragLeave={()=>setInsertPoint(-1)}
						 onDrop={()=>dropHandle(i)}
				>

					<div className="my-0.5">
						<OneChartView showIds={allGroupIdsRef.current.get(v)?.ids || []} startColor={i}/>
					</div>
				</div>
				)}
			<div className= {cn("border-blue-500", {"border-t-2":insertPoint == groups.length})}></div>
		</>
	)
}