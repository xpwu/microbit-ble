'use client'

import {useEffect, useState} from "react"
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome"
import {faBluetooth} from "@fortawesome/free-brands-svg-icons"
import {Nc} from "@/nc"
import {connectingDevice, ConnectionEvent, currentMicrobit, microbitState, setCurrentMicrobit} from "@/table/microbit"
import {MicroBit, MicrobitState, requestDevice} from "@/x/microbit"

async function connect() {
	connectingDevice(true)
	await Nc.post(new ConnectionEvent())

	let res = await requestDevice()
	if (res == null) {
		connectingDevice(false)
		await Nc.post(new ConnectionEvent())
		return
	}

	let microbit = new MicroBit(res, {max: 10
		, onBeginning: async ()=>{
			await Nc.post(new ConnectionEvent())
		}, onEnd: async()=>{
			await Nc.post(new ConnectionEvent())
		}})
	setCurrentMicrobit(microbit)

	await microbit.connect()
	connectingDevice(false)
	await Nc.post(new ConnectionEvent())
}

async function  disConnect() {
	connectingDevice(false)
	currentMicrobit()?.disConnect()
	setCurrentMicrobit(null)
	await Nc.post(new ConnectionEvent)
}


export function BlueControl() {
	const [con, setCon] = useState(microbitState())
	useEffect(()=>{
		const item =Nc.addEvent(ConnectionEvent, ()=>{
			setCon(microbitState())
		})
		return ()=>{
			item.remove()
		}
	}, [])

	let jsx = <FontAwesomeIcon icon={faBluetooth} size={"2xl"} onClick={connect}/>

	if (con == MicrobitState.Connecting) {
		jsx = <FontAwesomeIcon icon={faBluetooth} size={"2xl"} beatFade style={{color: "#3564c4"}} onClick={disConnect} />
	} else if (con == MicrobitState.Connected) {
		jsx = <FontAwesomeIcon icon={faBluetooth} size={"2xl"} style={{color: "#3564C4"}} onClick={disConnect}/>
	}

	return (
		<>
			{jsx}
		</>
	)
}