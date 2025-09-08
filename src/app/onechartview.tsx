import {RefObject, useEffect, useRef, useState} from "react";
import {Chart} from "@/x/chart";
import {Nc} from "@/nc";
import {DataLogEvent, DataLogFrom, DataLogLast} from "@/table/datalog";
import {ConnectionEvent, microbitState} from "@/table/microbit";
import {MicrobitState} from "@/x/microbit";
import {toFixed} from "@/x/fun";


function LabelView({showIds, chartRef, lastValueRef}:
                     {chartRef: RefObject<Chart>, showIds: string[]
                       , lastValueRef: RefObject<Map<string, number>>}) {

  const [_, setVersion] = useState(0)

  useEffect(()=>{
    const item =Nc.addEvent(DataLogEvent, (e)=>{
      const ids = e.ids.filter(id=>showIds.includes(id))
      if (ids.length == 0) {
        return
      }

      setVersion(v=>v+1)
    })
    return ()=>{
      item.remove()
    }
  }, [DataLogEvent])

  return (
    <>
      {showIds.map((id)=> {
        const color = chartRef.current.smoothie.getTimeSeriesOptions(chartRef.current.getLine(id)).strokeStyle || "#d6d3d1"
        return <p key={id} style={{color: color}} className="text-xs">{id}{": " + (lastValueRef.current.get(id)?toFixed(lastValueRef.current.get(id)!,2):"")}</p>
      })}
    </>
  )
}

const lineColors = ["#e71f1f", "#f59e0b", "#16a34a", "#0891b2"
  , "#a5b4fc", "#f0abfc", "#fda4af"]

export function OneChartView({showIds, startColor}:{showIds: string[], startColor: number}) {
  const indices = useRef<Map<string, number>>(new Map<string, number>())
  const chartRef = useRef(new Chart(lineColors, startColor))
  const lastValueRef = useRef(new Map<string, number>())

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
        <LabelView chartRef={chartRef} showIds={showIds} lastValueRef={lastValueRef}/>
      </div>
    </div>

  )
}
