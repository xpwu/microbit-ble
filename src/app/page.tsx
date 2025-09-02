import Sender from "@/app/sender"
import CmdLog from "@/app/cmdlog"
import {DataLog} from "@/app/datalog"
import AllLogs from "@/app/alllog"

export default function Home() {
  return (
		<div className="h-screen w-screen">
			<div className="w-full h-1/2 overflow-auto p-4 border">
				<DataLog />
			</div>
			<div className="flex w-full h-1/2 pb-2">
				<div className="w-1/2 h-full pb-2 border overflow-auto pl-2">
					<AllLogs />
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
