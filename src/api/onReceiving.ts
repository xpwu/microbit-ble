import {CmdLogEvent, LogType as CmdLogType, PushCmdLog} from "@/table/cmdlog"
import {Nc} from "@/nc"
import {DataLogEvent, PushData} from "@/table/datalog"
import {Millisecond} from "ts-xutils"
import {AllLogEvent, PushAllLog} from "@/table/alllog"

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

export function onReceiving(log: string) {
	PushAllLog(log)
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
