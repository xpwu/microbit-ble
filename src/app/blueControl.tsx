'use client'

import {useEffect, useState} from "react"
import {ConnectionEvent, isConnected, setConnection} from "@/table/connection"
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome"
import {faBluetoothB} from "@fortawesome/free-brands-svg-icons"
import {Nc} from "@/nc"

function disConnect() {
	setConnection(false)
	Nc.post(new ConnectionEvent())
	console.log("disConnect")
}

function connect() {
	setConnection(true)
	Nc.post(new ConnectionEvent())
	console.log("connect")
}

export function BlueControl() {
	const [con, setCon] = useState(isConnected())
	useEffect(()=>{
		const item =Nc.addEvent(ConnectionEvent, ()=>{
			setCon(isConnected())
		})
		return ()=>{
			item.remove()
		}
	}, [])

	return (con?
		<FontAwesomeIcon icon={faBluetoothB} size={"2xl"} style={{color: "#74C0FC",}} onClick={disConnect}/>:
		<FontAwesomeIcon icon={faBluetoothB} size={"2xl"} onClick={connect}/>
	)
}