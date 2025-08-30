'use client'

import {FormEvent, useState} from "react"

function send(e: FormEvent<HTMLFormElement>, clear: ()=>void) {
	// 阻止浏览器重新加载页面
	e.preventDefault();

	// 读取表单数据
	const formData = new FormData(e.currentTarget);
	let cmd = formData.get("cmd") as string
	if (cmd === "") {
		console.log("not input cmd")
		return
	}
	cmd = cmd + formData.get("endFlag") as string

	console.log("send to micro:bit --- ", cmd)

	clear()
}

export default function Sender() {
	const [input, setInput] = useState("")

	return (
		<form className = "flex h-12" onSubmit={e => send(e, ()=>setInput(""))}>
			<input name="cmd" type="text" placeholder="input command"
						 value={input} onChange={e => setInput(e.target.value)}
						 className="flex-1 h-full px-4 border border-gray-300 rounded-l-lg
						 focus:outline-none focus:ring-2 focus:ring-blue-500"/>

			<label className="h-full bg-white border-y border-r border-gray-300 px-4 flex items-center justify-between">
				以
				<select name="endFlag" className="border">
					<option value="#">#</option>
					<option value=";">;</option>
					<option value="/">/</option>
				</select>
				结束
			</label>

			<button className="h-full bg-blue-600 text-white px-6 rounded-r-lg hover:bg-blue-700 transition-colors flex-shrink-0"
							type="submit">
				发送
			</button>

		</form>
	)
}