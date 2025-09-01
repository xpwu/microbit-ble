import {Delay, formatDuration, Second} from "ts-xutils"
import {withTimeout} from "ts-concurrency"

const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'; // must be lowercase!
const UART_TX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const UART_RX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

export function isValidUUID(id: string): boolean {
	// https://webbluetoothcg.github.io/web-bluetooth/#uuids
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);
}

export function isAvailable(): boolean {
	return !!navigator && !!navigator.bluetooth
		&& ('TextDecoder' in window) // needed for reading data
		&& ('TextEncoder' in window) // needed for reading data
}

export enum MicrobitState {
	NotConnection, Connecting, Connected
}

interface ReConnectOption {
	max: number
	onBeginning: ()=>Promise<void>
	onEnd: ()=>Promise<void>
}

export class MicroBit {

	public onUARTReceiving:(v:string)=>void = ()=>{}

	private rxChar: BluetoothRemoteGATTCharacteristic| null = null
	public state: MicrobitState = MicrobitState.NotConnection

	constructor(public device: BluetoothDevice, protected reConOption: ReConnectOption) {
		console.log("MicroBit --- device.name:", device.name, "; device.id:", device.id)
		device.ongattserverdisconnected = ()=>{
			let _ = this.handleDisConnected()
		}
	}

	async connect() : Promise<Error | null> {
		if (this.state != MicrobitState.NotConnection) {
			return null
		}

		this.state = MicrobitState.Connecting
		let res = await this.runConnecting()
		if (res == null) {
			console.log("connected: ", this.device.name)
			this.state = MicrobitState.Connected
			return null
		}

		console.warn(res.message)
		this.state = MicrobitState.NotConnection
		return res
	}

	private async runConnecting() : Promise<Error | null> {
		return await withTimeout(10*Second, async ()=>{
			try {
				const server = await this.device.gatt!.connect()
				const service = await server.getPrimaryService(UART_SERVICE_UUID)
				this.rxChar = await service.getCharacteristic(UART_RX_CHARACTERISTIC_UUID)

				const txChar = await service.getCharacteristic(UART_TX_CHARACTERISTIC_UUID)
				txChar.oncharacteristicvaluechanged = ()=>{
					let v = new TextDecoder().decode(txChar.value)
					console.log(v)
					this.onUARTReceiving(v)
				}
				await txChar.startNotifications()

				return null
			} catch (e) {
				return new Error((e as {message: string}).message)
			}
		})
	}

	private async handleDisConnected() {
		if (this.state != MicrobitState.Connected) {
			return
		}
		this.state = MicrobitState.Connecting
		await this.reConOption.onBeginning()
		await this.reConnect(this.reConOption.max)
	}

	async disConnect() {
		this.state = MicrobitState.NotConnection
		await this.rxChar?.stopNotifications()
		this.device.gatt?.disconnect()
		console.log("disConnected: ", this.device.name)
	}

	private async reConnect(max: number) {
		const delay = 2*Second

		if (this.state == MicrobitState.NotConnection) {
			return
		}

		if (max == 0) {
			console.warn(`give up, max tries: `, this.device.name)
			this.state = MicrobitState.NotConnection
			await this.reConOption.onEnd()
			return
		}

		console.log(`retry connect ${formatDuration(delay)}... (${max} tries left): `, this.device.name)

		await Delay(delay)
		let res = await this.runConnecting()

		// connected
		if (res == null) {
			this.state = MicrobitState.Connected
			console.log("connected: ", this.device.name)
			await this.reConOption.onEnd()
			return
		}

		console.warn(res.message)

		let _ = this.reConnect(--max)
	}

	async send(cmd: string): Promise<Error|null> {
		if (this.state != MicrobitState.Connected || this.rxChar == null) {
			return new Error("not connected")
		}

		await this.rxChar.writeValue(new TextEncoder().encode(cmd))

		return null
	}
}

export async function requestDevice(): Promise<BluetoothDevice|null> {
	try {
		return await navigator.bluetooth.requestDevice({
			filters:[{namePrefix: "BBC micro:bit"}],
			optionalServices:[UART_SERVICE_UUID]
		})
	} catch (e) {
		console.warn(e)
		return null
	}
}

