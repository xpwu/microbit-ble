import {CmdLogEvent, PushCmdLog} from "@/table/cmdlog";
import {Nc} from "@/nc";
import {DataLogEvent, PushData} from "@/table/datalog";
import {Millisecond} from "ts-xutils";


export function onReceiving(log: string) {
  let colonIndex = log.indexOf(":")
  let _;

  do {
    if (colonIndex == -1 || colonIndex == log.length - 1 || colonIndex == 0) {
      break
    }

    let value = +log.slice(colonIndex + 1)
    if (isNaN(value)) {
      break
    }

    let id = log.slice(0, colonIndex)
    PushData(id, {tsSince1970: Date.now() * Millisecond, v: value})

    _ = Nc.post(new DataLogEvent(id))

    return;
  }while (false)

  PushCmdLog(log)
  _ = Nc.post(new CmdLogEvent())
}
