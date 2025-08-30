import Sender from "@/app/sender"
import CmdLog from "@/app/cmdlog"
import {DataLog} from "@/app/datalog"

export default function Home() {
  return (
		<div className="h-screen w-screen">
			<div className="w-full h-1/2 overflow-auto p-4 border">
				<DataLog />
			</div>
			<div className="flex flex-col w-full h-1/2 pb-2">
				<div className="w-full flex-1 overflow-auto p-4 border">
					<CmdLog />
				</div>
				<Sender />
			</div>
		</div>
  );
}
