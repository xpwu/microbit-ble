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

function tryDataLog(log: string): boolean {
	let colonIndex = log.indexOf(":")
	if (colonIndex == -1 || colonIndex == log.length - 1 || colonIndex == 0) {
		return false
	}

	let value = +log.slice(colonIndex + 1)
	if (isNaN(value)) {
		return false
	}

	let id = log.slice(0, colonIndex)
	PushData(id, {tsSince1970: Date.now() * Millisecond, v: value})

	Nc.post(new DataLogEvent([id])).then()

	return true;
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

function processOneLine(log: string) {
	PushAllLog(log, Type.MicrobitLog)
	Nc.post(new AllLogEvent).then()

	if (tryDataLog(log)) {
		return
	}

	// try "CmdRes"
	if (log.startsWith(">>") && log.length > 2) {
		PushCmdLog(log.slice(2), CmdLogType.ResLog)
		Nc.post(new CmdLogEvent()).then()
	}
}

