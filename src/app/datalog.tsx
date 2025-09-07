'use client'

import {useEffect, useRef, useState} from "react"
import {Nc} from "@/nc"
import {Data, DataLogAllIds, DataLogEvent, DataLogFrom, DataLogLast} from "@/table/datalog"
import * as Smoothie from "smoothie"
import {Millisecond, UniqFlag} from "ts-xutils"
import {ConnectionEvent, microbitState} from "@/table/microbit"
import {MicrobitState} from "@/x/microbit"

function toFixed(num:Number, maxPrecision: number): string {
	if (Number.isInteger(num)) {
		return String(num)
	}
	return num.toFixed(maxPrecision)
}

class Chart {
	lines: Map<string, Smoothie.TimeSeries> = new Map
	public smoothie: Smoothie.SmoothieChart

	private originYRange = {min:0, max:0}

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
			tooltipFormatter: (ts, data) => this.tooltip(ts, data),

			yRangeFunction: (range) => {
				this.originYRange = range
				return {min: range.min-(range.max-range.min)*0.025, max: range.max+(range.max-range.min)*0.025}
			},
			yMinFormatter: (_: number, precision: number) => {
				return toFixed(this.originYRange.min, precision)
			},
			yMaxFormatter: (_: number, precision: number) => {
				return toFixed(this.originYRange.max, precision)
			},
		}

		this.smoothie = new Smoothie.SmoothieChart(chartConfig)
	}

	tooltip(_: number, data: { series: Smoothie.TimeSeries, index: number, value: number }[]): string {
		const content = data.map(n => {
			// smoothie.d.ts type error
			const series = n.series as unknown as {options: {strokeStyle:string}; timeSeries: Smoothie.TimeSeries}

			let color = series.options.strokeStyle || "#d6d3d1"
			return `<div class="text-xs" style="color: ${color}">${n.value}</div>`;
		}).join('');

		return `<div class="mt-3 p-1"> ${content} </div>`
	}

	public getLine(id: string): Smoothie.TimeSeries {
		let line = this.lines.get(id)
		if (!line) {
			const color = this.lineColors[this.colorIndex++ % this.lineColors.length]
			line = new Smoothie.TimeSeries()
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

const lineColors = ["#e71f1f", "#f59e0b", "#16a34a", "#67e8f9"
	, "#a5b4fc", "#f0abfc", "#fda4af"]

function OneChartView({showIds, startColor}:{showIds: string[], startColor: number}) {
	const indices = useRef<Map<string, number>>(new Map<string, number>())
	const chartRef = useRef(new Chart(lineColors, startColor))
	const lastValueRef = useRef(new Map<string, number>())
	const [_, setVersion] = useState(0)

	function updateData(ids: string[]) {
		for (const id of ids) {
			let lastIndex = indices.current.get(id)
			if (lastIndex === undefined) {
				continue
			}

			const newLogs = DataLogFrom(id, lastIndex + 1)
			indices.current.set(id, lastIndex + newLogs.length)
			newLogs.forEach((v)=>{
				chartRef.current.addPoint(id, v)
			})

			if (newLogs.length != 0) {
				lastValueRef.current.set(id, newLogs.at(-1)!.value)
				setVersion(v=>v+1)
			}
		}
	}

	useEffect(()=>{
		const item =Nc.addEvent(DataLogEvent, (e)=>{
			updateData(e.ids)
		})
		return ()=>{
			item.remove()
		}
	}, [DataLogEvent])

	useEffect(()=>{
		for (const id of showIds) {
			if (indices.current.has(id)) {
				continue
			}
			let last = DataLogLast(id)
			indices.current.set(id, last.lastIndex)

			last.data.forEach(v=>{
				chartRef.current.addPoint(id, v)
			})
			if (last.data.length != 0) {
				lastValueRef.current.set(id, last.data.at(-1)!.value)
				setVersion(v=>v+1)
			}
		}
	}, [showIds])

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
		<div className="relative">
			<canvas className="w-full h-30 m-0 rounded-sm" ref={(node)=>{
				if (node == null) {
					return
				}
				chartRef.current.smoothie.streamTo(node)
				if (microbitState() != MicrobitState.Connected) {
					chartRef.current.smoothie.stop()
				}

				return ()=>{
					chartRef.current.smoothie.stop()
				}
			}}></canvas>
			<div className="absolute bottom-1 left-2 z-50 bg-neutral-300 p-1 rounded-sm border-1 border-neutral-500">
				{showIds.map((id)=> {
					const color = chartRef.current.smoothie.getTimeSeriesOptions(chartRef.current.getLine(id)).strokeStyle || "#d6d3d1"
					return <p key={id} style={{color: color}} className="text-xs">{id}{": " + (lastValueRef.current.get(id)?toFixed(lastValueRef.current.get(id)!,2):"")}</p>
				})}
			</div>
		</div>

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

	return (
		<>
			{groups.map((v, i)=>
				<div className="mb-1" key={v}>
					<OneChartView showIds={allGroupIdsRef.current.get(v)?.ids || []} startColor={i}/>
				</div>
				)}
		</>
	)
}