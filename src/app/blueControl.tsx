'use client'

import {useEffect, useState} from "react"
import {ConnectionEvent, isConnected} from "@/table/connection"
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome"
import {faBluetoothB} from "@fortawesome/free-brands-svg-icons"
import {Nc} from "@/nc"

function disConnect() {

}

function connect() {

}

export function BlueControl() {
	const [con, setCon] = useState(isConnected)
	useEffect(()=>{
		const item =Nc.addEvent(ConnectionEvent, ()=>{
			setCon(isConnected)
		})
		return ()=>{
			item.remove()
		}
	})

	return (con?
		<FontAwesomeIcon icon={faBluetoothB} size="sm" onClick={connect}/> :
		<FontAwesomeIcon icon={faBluetoothB} size="sm" style={{color: "#74C0FC",}} onClick={disConnect}/>
	)
}