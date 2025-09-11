'use client'

import {FormEvent, useState} from "react"
import {currentMicrobit} from "@/table/microbit"
import {CmdLogEvent, LogType, PushCmdLog} from "@/table/cmdlog"
import {Nc} from "@/nc"
import cn from "classnames";
import {Delay, Second} from "ts-xutils";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faSpinner} from "@fortawesome/free-solid-svg-icons";

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

async function send(e: FormEvent<HTMLFormElement>) {
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
}

export default function Sender() {
	const [input, setInput] = useState("")
	const [sending, setSending] = useState(true)

	return (
		<form className = "flex h-12" onSubmit={async e => {
			setSending(true)
			await send(e)
			await Delay(3*Second)
			setSending(false)
			setInput("");
		}}>

			<input name="cmd" type="text" placeholder="input command" disabled={sending}
					 value={input} onChange={e => setInput(e.target.value)}
					 className={cn("flex-1 h-full px-4 border rounded-l-lg ",
						 "focus:outline-none focus:ring-1 focus:ring-blue-700",
						 {
							 "border-gray-700": !sending,
							 "border-gray-300": sending,
							 "hover:not-focus:border-blue-700": !sending,
							 "text-gray-800": !sending,
							 "text-gray-300": sending,
						 },
						 "border-r-gray-300")}/>

			<label className={cn("h-full bg-white border-y ",
				"border-gray-300 px-4 flex items-center justify-between",
				{
					"border-gray-700": !sending,
					"border-gray-300": sending,
					"text-gray-800": !sending,
					"text-gray-300": sending,
				})}>
				以
				<select name="endFlag" disabled={sending}
								className={cn("border",
									{
										"border-gray-300": sending,
										"text-gray-300": sending,
										"hover:not-focus:border-blue-700": !sending,
									})}
				>
					<option value="#">#</option>
					<option value=";">;</option>
					<option value="/">/</option>
				</select>
				结束
			</label>

			<button type="submit" disabled={sending}
							className={cn("relative h-full", "border", "px-2"
								, "rounded-r-lg", "transition-colors", "flex-shrink-0",
								{
									"border-gray-700": !sending,
									"border-gray-300": sending,
									"text-blue-500": !sending,
									"text-gray-300": sending,
									"hover:border-blue-700": !sending,
									"hover:text-blue-700": !sending,
								},
								"border-l-gray-300")}
			>
				发送
				<div className={cn("absolute bottom-1/2 right-1/2 z-50 my-auto text-gray-700")} hidden={!sending}>
					<FontAwesomeIcon icon={faSpinner} spinPulse size="lg"/>
				</div>
			</button>

		</form>
	)
}