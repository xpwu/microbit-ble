import Sender from "@/app/sender"
import CmdLog from "@/app/cmdlog"
import {DataLog} from "@/app/datalog"
import AllLogs from "@/app/alllog"
import {BlueControl} from "@/app/blueControl"

export default function Home() {
  return (
		<div className="h-screen w-screen">
			<div className="w-full h-1/2 overflow-auto p-4 border">
				<DataLog />
			</div>
			<div className="flex w-full h-1/2 pb-2">
				<div className="relative w-1/2 h-full pb-2 border pl-2">
					<div className="absolute top-2 right-2 z-50 rounded-3xl py-2 hover:border-blue-700 border-gray-300 border shadow-lg">
						<BlueControl />
					</div>
					<div className="w-full h-full overflow-auto">
						<AllLogs />
					</div>
				</div>

				<div className="flex flex-col w-1/2 h-full">
					<div className="w-full flex-1 overflow-auto p-4 border">
						<CmdLog />
					</div>
					<Sender />
				</div>
			</div>
		</div>
  );
}
