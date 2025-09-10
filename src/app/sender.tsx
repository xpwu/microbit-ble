'use client'

import {FormEvent, useState} from "react"
import {currentMicrobit} from "@/table/microbit"
import {CmdLogEvent, LogType, PushCmdLog} from "@/table/cmdlog"
import {Nc} from "@/nc"

async function sendToMicrobit(cmd: string): Promise<Error|null> {
	let res = await currentMicrobit()?.send(cmd)
	if (res === undefined) {
		res = new Error("蓝牙未连接")
	}
	if (res !== null) {
		console.warn(res.message)
	}

	return res
}

async function send(e: FormEvent<HTMLFormElement>, clear: ()=>void) {
	// 阻止浏览器重新加载页面
	e.preventDefault();

	// 读取表单数据
	const formData = new FormData(e.currentTarget);
	let cmd = formData.get("cmd") as string
	if (cmd === "") {
		console.debug("not input cmd")
		return
	}
	cmd = cmd + formData.get("endFlag") as string

	console.debug("send to micro:bit --- ", cmd)

	PushCmdLog(cmd, LogType.Input)
	const res = await sendToMicrobit(cmd)
	if (res != null) {
		PushCmdLog(res.message, LogType.ErrorLog)
	}
	await Nc.post(new CmdLogEvent)

	clear()
}

export default function Sender() {
	const [input, setInput] = useState("")

	return (
		<form className = "flex h-12" onSubmit={e => send(e, ()=>setInput(""))}>
			<input name="cmd" type="text" placeholder="input command"
						 value={input} onChange={e => setInput(e.target.value)}
						 className="flex-1 h-full px-4 border border-gray-300 rounded-l-lg
						 focus:outline-none focus:ring-1 focus:ring-blue-700"/>

			<label className="h-full bg-white border-y border-r border-gray-300 px-4 flex items-center justify-between text-gray-800">
				以
				<select name="endFlag" className="border">
					<option value="#">#</option>
					<option value=";">;</option>
					<option value="/">/</option>
				</select>
				结束
			</label>

			<button className="h-full border border-blue-300 text-blue-500 px-2 rounded-r-lg hover:border-blue-700 hover:text-blue-700 transition-colors flex-shrink-0"
							type="submit">
				发送
			</button>

		</form>
	)
}