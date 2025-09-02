import {Delay, formatDuration, Second, UniqFlag} from "ts-xutils"
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

	public logId = UniqFlag()
	public onUARTReceiving:(v:string)=>void = ()=>{}

	private rxChar: BluetoothRemoteGATTCharacteristic| null = null
	public state: MicrobitState = MicrobitState.NotConnection

	constructor(public device: BluetoothDevice, protected reConOption: ReConnectOption) {
		console.log(`MicroBit(${this.logId}) --- device.name: `, device.name, "; device.id: ", device.id)
		device.ongattserverdisconnected = ()=>{
			this.handleDisConnected().then()
		}
	}

	async connect() : Promise<Error | null> {
		if (this.state != MicrobitState.NotConnection) {
			return null
		}

		this.state = MicrobitState.Connecting
		let res = await this.runConnecting()
		if (res == null) {
			console.log(`MicroBit(${this.logId}) --- connected: `, this.device.name)
			this.state = MicrobitState.Connected
			return null
		}

		console.warn(res.message)
		this.state = MicrobitState.NotConnection
		return res
	}

	private async runConnecting() : Promise<Error | null> {
		return await withTimeout(10*Second, async (canceled)=>{
			try {
				const server = await this.device.gatt!.connect()
				console.debug("got server")
				if (canceled()) {
					console.debug("runConnecting --- withTimeout: canceled()")
					return null
				}
				const service = await server.getPrimaryService(UART_SERVICE_UUID)
				console.debug("got service")
				if (canceled()) {
					console.debug("runConnecting --- withTimeout: canceled()")
					return null
				}
				this.rxChar = await service.getCharacteristic(UART_RX_CHARACTERISTIC_UUID)
				console.debug("got rxChar")
				if (canceled()) {
					console.debug("runConnecting --- withTimeout: canceled()")
					return null
				}

				const txChar = await service.getCharacteristic(UART_TX_CHARACTERISTIC_UUID)
				console.debug("got txChar")
				if (canceled()) {
					console.debug("runConnecting --- withTimeout: canceled()")
					return null
				}

				txChar.oncharacteristicvaluechanged = ()=>{
					let v = new TextDecoder().decode(txChar.value)
					console.debug(v)
					this.onUARTReceiving(v)
				}
				await txChar.startNotifications()

				return null
			} catch (e) {
				// 出现错误，清理现场
				this.device.gatt?.disconnect()
				console.warn(e)
				return new Error((e as {message: string}).message)
			}
		})
	}

	private async handleDisConnected() {
		console.debug(`MicroBit(${this.logId}) ---handleDisConnected`)
		this.rxChar = null
		if (this.state != MicrobitState.Connected) {
			console.debug("handleDisConnected --- this.state != MicrobitState.Connected")
			return
		}
		this.state = MicrobitState.Connecting
		await this.reConOption.onBeginning()
		await this.reConnect(this.reConOption.max)
	}

	async disConnect() {
		this.state = MicrobitState.NotConnection
		if (this.device.gatt?.connected) {
			try {
				await this.rxChar?.stopNotifications()
			}catch (e) {
				console.debug(e)
			}

			this.device.gatt.disconnect()
		}
		this.rxChar = null
		this.onUARTReceiving = (log)=>{
			console.debug("received: ", log, ", but no receiving handle")
		}

		console.log(`MicroBit(${this.logId}) ---disConnected: `, this.device.name)
	}

	private async reConnect(max: number) {
		const delay = 2*Second

		if (this.state == MicrobitState.NotConnection) {
			console.debug("want to reconnecct, but be disconnected")
			await this.reConOption.onEnd()
			return
		}

		if (max == 0) {
			console.warn(`give up, max tries: `, this.device.name)
			this.state = MicrobitState.NotConnection
			await this.reConOption.onEnd()
			return
		}

		console.log(`MicroBit(${this.logId}) --- retry connect after ${formatDuration(delay)}... (${max} tries left): `, this.device.name)

		await Delay(delay)
		console.log(`MicroBit(${this.logId}) --- reconnect.runConnecting...`, this.device.name)

		let res = await this.runConnecting()

		// connected
		if (res == null) {
			// @ts-ignore
			if (this.state == MicrobitState.NotConnection) {
				await this.rxChar?.stopNotifications()
				this.device.gatt?.disconnect()
				console.debug("reconnect & disconnect")
				await this.reConOption.onEnd()
				return
			}

			this.state = MicrobitState.Connected
			console.log(`MicroBit(${this.logId}) --- connected: `, this.device.name)
			await this.reConOption.onEnd()
			return
		}

		console.warn(res.message)

		if (res.message == "Bluetooth Device is no longer in range") {
			console.debug("reconnect failed")
			this.state = MicrobitState.NotConnection
			await this.reConOption.onEnd()
			return
		}

		this.reConnect(--max).then()
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

