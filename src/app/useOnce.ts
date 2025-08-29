import {useState} from "react"

export function useOnce<T>(fn: ()=>T): T {
	const [value] = useState(fn)
	return value
}
