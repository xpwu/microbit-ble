
export function toFixed(num:Number, maxPrecision: number): string {
  if (Number.isInteger(num)) {
    return String(num)
  }
  return num.toFixed(maxPrecision)
}
