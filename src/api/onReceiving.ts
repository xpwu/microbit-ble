import {CmdLogEvent, LogType as CmdLogType, PushCmdLog} from "@/table/cmdlog"
import {Nc} from "@/nc"
import {DataLogEvent, PushData} from "@/table/datalog"
import {Millisecond} from "ts-xutils"
import {AllLogEvent, PushAllLog, Type} from "@/table/alllog"

export function onReceiving(log: string) {
	let lines = chunkDataIntoLines(log)
	for (const line of lines) {
		processOneLine(line)
	}
}

const MaxURATInputDataLength = 255

function chunkDataIntoLines(data: string): string[] {
	let lines: string[] = []
	let buffer = ""
	for (let i = 0; i < data.length; ++i) {
		const ch = data[i]
		buffer += ch
		if (ch !== "\n" && buffer.length < MaxURATInputDataLength) {
			continue
		}
		if (ch === "\n") {
			// remove trailing white space
			buffer = buffer.replace(/\s+$/, '');
			// if anything remaining...
			if (buffer.length) {
				lines.push(buffer)
			}
		} else {
			lines.push(buffer)
		}
		buffer = ""
	}
	return lines
}

function processOneLine(line: string) {
	PushAllLog(line, Type.MicrobitLog)
	Nc.post(new AllLogEvent).then()

	// is this a key-value pair, or just a number?
	// id:value  or value
	let regRes = /^\s*(([^:]+):)?\s*(-?\d+(\.\d*)?(e[\+\-]\d+)?)/i.exec(line);
	if (regRes) {
		const id = regRes[2] || '';
		const value = parseFloat(regRes[3]);
		if (!isNaN(value)) {
			PushData(id, {since1970: Date.now() * Millisecond, value: value})
			Nc.post(new DataLogEvent([id])).then()
			return;
		}
	}

	// try "CmdRes"
	regRes = /^\s*>>\s*(.+)$/.exec(line)
	if (regRes && regRes[1]) {
		PushCmdLog(regRes[1], CmdLogType.ResLog)
		Nc.post(new CmdLogEvent()).then()
		return;
	}
}

