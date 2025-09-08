import * as Smoothie from "smoothie";
import {Data} from "@/table/datalog";
import {Millisecond} from "ts-xutils";
import {toFixed} from "@/x/fun";


export class Chart {
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
