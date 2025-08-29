'use client'

import {useState} from "react"

function send() {
	console.log("send to micro:bit")
}

export default function Sender() {
	const [endFlag, setEndFlag] = useState("#")
	return (
		<div className = "flex h-12">
			<input type="text"
						 className="flex-1 h-full px-4 border border-gray-300 rounded-l-lg
						 focus:outline-none focus:ring-2 focus:ring-blue-500"/>

			{/* 选择器*/}

			<div className="h-full w-full bg-white border-y border-r border-gray-300 px-4 flex items-center justify-between">
				以
				<select value={endFlag}
								onChange={e => setEndFlag(e.target.value)}>
					<option value="#">#</option>
					<option value=";">;</option>
					<option value="/">/</option>
				</select>
				结束
			</div>

			<button className="h-full bg-blue-600 text-white px-6 rounded-r-lg hover:bg-blue-700 transition-colors flex-shrink-0"
							onClick={send}>
				发送
			</button>

		</div>
	)
}