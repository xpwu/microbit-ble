import {CmdLogEvent, LogType as CmdLogType, PushCmdLog} from "@/table/cmdlog"
import {Nc} from "@/nc"
import {DataLogEvent, PushData} from "@/table/datalog"
import {Millisecond, SerialQueue} from "ts-x"
import {AllLogEvent, PushAllLog, Type} from "@/table/alllog"


const queue = new SerialQueue<string>(async line => {
	await processOneLine(line)
})

export function onReceiving(log: string) {
	const lines = chunkDataIntoLines(log)
	for (const line of lines) {
		queue.dispatch(line)
	}
}

const MaxURATInputDataLength = 255
let buffer = ""

function chunkDataIntoLines(data: string): string[] {
	const lines: string[] = []
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

async function processOneLine(line: string) {
	const since1970 = Date.now() * Millisecond

	await PushAllLog(line, Type.MicrobitLog, since1970)
	await Nc.post(new AllLogEvent)

	// is this a key-value pair, or just a number?
	// id:value  or value
	let regRes = /^\s*(([^:]+):)?\s*(-?\d+(\.\d*)?(e[\+\-]\d+)?)$/i.exec(line);
	if (regRes) {
		const id = regRes[2] || '';
		const value = parseFloat(regRes[3]);
		if (!isNaN(value)) {
			PushData(id, {since1970, value})
			await Nc.post(new DataLogEvent([id]))
			return;
		}
	}

	// try "CmdRes"
	regRes = /^\s*>>\s*(.+)$/.exec(line)
	if (regRes && regRes[1]) {
		PushCmdLog(regRes[1], CmdLogType.ResLog)
		await Nc.post(new CmdLogEvent())
		return;
	}
}

