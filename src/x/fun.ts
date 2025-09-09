
export function toFixed(num:number, maxPrecision: number): string {
  if (Number.isInteger(num)) {
    return String(num)
  }
  return num.toFixed(maxPrecision)
}
