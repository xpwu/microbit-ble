import {CreateNCEvent} from "ts-nc"
import {MicrobitState, MicroBit} from "@/x/microbit"

let microbit: MicroBit|null = null

export const ConnectionEvent = CreateNCEvent()

let isConnectingDevice = false

export function microbitState(): MicrobitState {
	if (isConnectingDevice) {
		return MicrobitState.Connecting
	}
	if (microbit != null) {
		return microbit.state
	}
	return MicrobitState.NotConnection
}

export function connectingDevice(doing: boolean) {
	isConnectingDevice = doing
}

export function setCurrentMicrobit(m: MicroBit | null) {
	microbit = m
}

export function currentMicrobit(): MicroBit| null {
	return microbit
}