function movingAverageForecast(dailyQuantities, daysAhead = 7) {
  if (dailyQuantities.length === 0) return { dailyAverage: 0, suggested: 0, trend: 'sin datos' }

  const recent = dailyQuantities.slice(-14)
  const dailyAverage = recent.reduce((sum, v) => sum + v, 0) / recent.length

  const half = Math.floor(recent.length / 2)
  const firstHalf = recent.slice(0, half)
  const secondHalf = recent.slice(half)
  const avgFirst = firstHalf.length ? firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length : 0
  const avgSecond = secondHalf.length ? secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length : 0

  let trend = 'estable'
  if (avgSecond > avgFirst * 1.15) trend = 'en alza'
  else if (avgSecond < avgFirst * 0.85) trend = 'en baja'

  const trendFactor = trend === 'en alza' ? 1.15 : trend === 'en baja' ? 0.9 : 1
  const suggested = Math.ceil(dailyAverage * daysAhead * trendFactor)

  return { dailyAverage: Math.round(dailyAverage * 100) / 100, suggested, trend }
}

function daysUntilStockout(currentStock, dailyAverage) {
  if (dailyAverage <= 0) return null
  return Math.floor(currentStock / dailyAverage)
}

module.exports = { movingAverageForecast, daysUntilStockout }
