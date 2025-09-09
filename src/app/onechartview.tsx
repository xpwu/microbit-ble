import {RefObject, useEffect, useRef, useState} from "react";
import {Chart} from "@/x/chart";
import {Nc} from "@/nc";
import {DataLogEvent, DataLogFrom, DataLogLast} from "@/table/datalog";
import {ConnectionEvent, microbitState} from "@/table/microbit";
import {MicrobitState} from "@/x/microbit";
import {toFixed} from "@/x/fun";

function LabelView({showIds, chartRef, lastValueRef, onDragLabel, startColor}:
                     {chartRef: RefObject<Chart>, showIds: string[], startColor: number
                       , lastValueRef: RefObject<Map<string, number>>
											 , onDragLabel: (id:string)=>void}) {

  const [_, setVersion] = useState(0)
	const showIdsRef = useRef(showIds)

  useEffect(()=>{
    const item =Nc.addEvent(DataLogEvent, (e)=>{
      const ids = e.ids.filter(id=>showIdsRef.current.includes(id))
      if (ids.length == 0) {
        return
      }

      setVersion(v=>v+1)
    })
    return ()=>{
      item.remove()
    }
  }, [])
	useEffect(()=>{
		showIdsRef.current = showIds
		setVersion(v=>v+1)
	}, [showIds, startColor])

	function showValue(id: string):string {
		return lastValueRef.current.get(id)!==undefined?toFixed(lastValueRef.current.get(id)!,2):""
	}

  return (
    <>
      {showIds.map((id)=> {
				const timeS = chartRef.current.getLine(id)
        const color = chartRef.current.smoothie.getTimeSeriesOptions(timeS).strokeStyle || "#d6d3d1"

        return <p key={id} draggable={true} style={{color: color}} className="text-xs hover:bg-slate-50"
					onDragStart={e=>{e.stopPropagation(); onDragLabel(id)}}
				>{id}{": " + showValue(id)}</p>
      })}
    </>
  )
}

const lineColors = ["#e71f1f", "#f59e0b", "#16a34a", "#0891b2"
  , "#a5b4fc", "#f0abfc", "#fda4af"]

export function OneChartView({showIds, startColor, onDragLabel}
															 : {showIds: string[], startColor: number, onDragLabel: (id:string)=>void}) {
  const indices = useRef<Map<string, number>>(new Map<string, number>())
  const chartRef: Readonly<RefObject<Chart>> = useRef(new Chart(lineColors, startColor))
  const lastValueRef = useRef(new Map<string, number>())

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

				if (newLogs.length != 0) {
					lastValueRef.current.set(id, newLogs.at(-1)!.value)
				}
			}
    })
    return ()=>{
      item.remove()
    }
  }, [])

  useEffect(()=>{
		indices.current.clear()
		lastValueRef.current.clear()
		chartRef.current.removeAllIds()
		chartRef.current.colorIndex = startColor

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
			}
		}

  }, [showIds, startColor])

  useEffect(()=>{
    const item = Nc.addEvent(ConnectionEvent, ()=>{
			// 没有连接，就不按照实时时间来绘制
      chartRef.current.smoothie.options.nonRealtimeData = microbitState() != MicrobitState.Connected;
    })
    return ()=>{
      item.remove()
    }
  }, [])

  return (
    <div className="relative">
      <canvas className="w-full h-30 m-0 rounded-sm" ref={(node)=>{
        if (node == null) {
					chartRef.current.smoothie.stop()
					chartRef.current.closeToolTip()
          return
        }

				if (microbitState() != MicrobitState.Connected) {
					chartRef.current.smoothie.options.nonRealtimeData = true
				}
        chartRef.current.smoothie.streamTo(node)

        return ()=>{
          chartRef.current.smoothie.stop()
					chartRef.current.closeToolTip()
        }
      }}></canvas>
      <div className="absolute bottom-1 left-2 z-50 bg-neutral-300 p-1 rounded-sm border-1 border-neutral-500">
        <LabelView chartRef={chartRef} showIds={showIds} startColor={startColor}
									 lastValueRef={lastValueRef} onDragLabel={onDragLabel}/>
      </div>
    </div>

  )
}
