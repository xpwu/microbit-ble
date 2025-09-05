'use client'

import {useEffect, useRef, useState} from "react"
import {Nc} from "@/nc"
import {Data, DataLogAllIds, DataLogEvent, DataLogFrom, DataLogLast} from "@/table/datalog"
import * as Smoothie from "smoothie"
import {Millisecond, UniqFlag} from "ts-xutils"
import {ConnectionEvent, microbitState} from "@/table/microbit"
import {MicrobitState} from "@/x/microbit"


declare module "smoothie" {
	interface TimeSeries {
		name:string
	}
}

class Chart {
	lines: Map<string, Smoothie.TimeSeries> = new Map
	public smoothie: Smoothie.SmoothieChart

	constructor(private lineColors: string[], private colorIndex: number) {
		const chartConfig: Smoothie.IChartOptions = {
			interpolation: 'linear',
			labels: {
				disabled: false,
				fillStyle: '#333333',
				fontSize: 14
			},
			responsive: true,
			millisPerPixel: 20,
			grid: {
				verticalSections: 0,
				borderVisible: false,
				millisPerLine: 5000,
				fillStyle: '#d9d9d9',
				strokeStyle: "#000",
				lineWidth:1
			},
			tooltip: true,
			tooltipFormatter: (ts, data) => this.tooltip(ts, data)
		}

		this.smoothie = new Smoothie.SmoothieChart(chartConfig)
	}

	tooltip(_: number, data: { series: Smoothie.TimeSeries, index: number, value: number }[]): string {
		return data.map(n => {
			const name = n.series.name
			return `<span>${name ? name + ': ' : ''}${n.value}</span>`;
		}).join('<br/>');
	}

	private getLine(id: string): Smoothie.TimeSeries {
		let line = this.lines.get(id)
		if (!line) {
			const color = this.lineColors[this.colorIndex++ % this.lineColors.length]
			line = new Smoothie.TimeSeries()
			line.name = id
			this.lines.set(id, line)
			this.smoothie.addTimeSeries(line, {
				strokeStyle: color,
				lineWidth: 2
			})
		}
		return line
	}

	addPoint(id: string, data: Data) {
		const line = this.getLine(id)
		line.append(data.since1970/Millisecond, data.value)
	}

	remove(id: string) {
		const s = this.lines.get(id)
		if (s) {
			this.smoothie.removeTimeSeries(s)
		}
	}
}

const lineColors = ["#e71f1f", "#f59e0b", "#86efac", "#67e8f9"
	, "#a5b4fc", "#f0abfc", "#fda4af"]

function OneChartView({initObserveVars, startColor}:{initObserveVars: string[], startColor: number}) {
	const indices = useRef<Map<string, number>>(new Map<string, number>())
	const chartRef = useRef(new Chart(lineColors, startColor))

	useEffect(()=>{
		for (const id of initObserveVars) {
			if (indices.current.has(id)) {
				continue
			}
			let last = DataLogLast(id)
			indices.current.set(id, last.lastIndex)
		}

		return ()=>{}
	}, [initObserveVars])

	useEffect(()=>{
		const item =Nc.addEvent(DataLogEvent, (e)=>{
			for (const id of e.ids) {
				let lastIndex = indices.current.get(id)
				if (lastIndex === undefined) {
					continue
				}

				const newLogs = DataLogFrom(id, lastIndex + 1)
				indices.current.set(id, lastIndex + newLogs.length)
				newLogs.forEach((v)=>{
					chartRef.current.addPoint(id, v)
				})
			}
		})
		return ()=>{
			item.remove()
		}
	}, [DataLogEvent])

	useEffect(()=>{
		const item = Nc.addEvent(ConnectionEvent, ()=>{
			if (microbitState() != MicrobitState.Connected) {
				chartRef.current.smoothie.stop()
			} else {
				chartRef.current.smoothie.start()
			}
		})
		return ()=>{
			item.remove()
		}
	}, [ConnectionEvent])

	return (
		<canvas className="w-full h-30 m-0 rounded-sm" ref={(node)=>{
			if (node == null) {
				return
			}
			chartRef.current.smoothie.streamTo(node)
			return ()=>{
				chartRef.current.smoothie.stop()
			}
		}}></canvas>
	)
}

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
						value.ids.push(v)
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

	return (
		<>
			{groups.map((v, i)=>
				<div className="mb-2" key={v}>
					<OneChartView initObserveVars={allGroupIdsRef.current.get(v)?.ids || []} startColor={i}/>
				</div>
				)}
		</>
	)
}