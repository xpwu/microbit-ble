'use client'

import {useEffect, useRef, useState} from "react"
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome"
import {faBluetooth} from "@fortawesome/free-brands-svg-icons"
import {Nc} from "@/nc"
import {
	connectingDevice,
	ConnectionEvent,
	currentMicrobit,
	lastDeviceId,
	microbitState,
	setCurrentMicrobit,
	setLastDeviceId
} from "@/table/microbit"
import {isAvailable, MicroBit, MicrobitState, requestDevice, resumeDevice} from "@/x/microbit"
import {onReceiving} from "@/api/onReceiving"
import {Delay, Millisecond, Second} from "ts-xutils"
import {AllLogEvent, PushAllLog, Type} from "@/table/alllog"

async function creatMicrobit(device: BluetoothDevice): Promise<[MicroBit, Error|null]> {
	const microbit = new MicroBit(device, {max: 10
		, onBeginning: async ()=>{
			await Nc.post(new ConnectionEvent())
		}, onEnd: async()=>{
			await Nc.post(new ConnectionEvent())
		}})
	microbit.onUARTReceiving = onReceiving

	const err = await microbit.connect()

	return [microbit, err]
}

async function connect() {
	connectingDevice(true)
	await Nc.post(new ConnectionEvent())

	const device = await requestDevice()
	if (device == null) {
		connectingDevice(false)
		await Nc.post(new ConnectionEvent())
		return
	}

	if (currentMicrobit()?.device.id == device.id && currentMicrobit()?.state != MicrobitState.NotConnection) {
		console.log(`Microbit(${currentMicrobit()?.logId}) connected --- `
			, "device.id: ", device.id, ", device.name: ", device.name)
		connectingDevice(false)
		await Nc.post(new ConnectionEvent())
		return
	}

	currentMicrobit()?.disConnect()
	await Delay(Second)
	setCurrentMicrobit(null)

	const [microbit, err] = await creatMicrobit(device)
	if (err == null) {
		setCurrentMicrobit(microbit)
		setLastDeviceId(device.id)
	}

	connectingDevice(false)
	await Nc.post(new ConnectionEvent())
}

async function connectLastOne() {
	if (currentMicrobit() !== null) {
		return
	}

	const lastId = lastDeviceId()
	if (lastId === null) {
		return
	}

	connectingDevice(true)
	await Nc.post(new ConnectionEvent())

	const device = await resumeDevice(lastId)
	if (device === null) {
		connectingDevice(false)
		await Nc.post(new ConnectionEvent())
		return
	}

	const [microbit, err] = await creatMicrobit(device)
	if (err == null) {
		setCurrentMicrobit(microbit)
	}

	connectingDevice(false)
	await Nc.post(new ConnectionEvent())
}

async function  disConnect() {
	connectingDevice(false)
	currentMicrobit()?.disConnect()
	setCurrentMicrobit(null)
	await Nc.post(new ConnectionEvent)
}

function notSupport() {
	alert("not support web bluetooth or TextDecoder/TextEncoder")
}


export function BlueControl() {
	const [con, setCon] = useState(microbitState())
	const lastCon = useRef(microbitState())

	useEffect(()=>{
		const item =Nc.addEvent(ConnectionEvent, async ()=>{
			const st = microbitState()
			console.debug("BlueControl -- ConnectionEvent: ", MicrobitState[st])
			setCon(st)

			const oldState = lastCon.current
			lastCon.current = st
			if (oldState != MicrobitState.Connected && st == MicrobitState.Connected) {
				await PushAllLog("---<new connection>---", Type.Tips, Date.now()*Millisecond)
				await Nc.post(new AllLogEvent())
			}
		})
		return ()=>{
			item.remove()
		}
	}, [])
	useEffect(()=>{
		connectLastOne().then()
	}, [])

	if (!isAvailable()) {
		return <FontAwesomeIcon icon={faBluetooth} size={"2xl"} onClick={notSupport}/>
	}

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