const AuraCharts = (function () {
  function svgEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag)
    Object.keys(attrs || {}).forEach((k) => el.setAttribute(k, attrs[k]))
    return el
  }

  function bars(container, data) {
    container.innerHTML = ''
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="empty">Todavia no hay datos</p>'
      return
    }
    const width = container.clientWidth || 400
    const height = 220
    const svg = svgEl('svg', { width: '100%', height, viewBox: `0 0 ${width} ${height}` })
    const max = Math.max(...data.map((d) => Number(d.total)), 1)
    const barWidth = width / data.length - 14

    data.forEach((d, i) => {
      const barHeight = (Number(d.total) / max) * (height - 50)
      const x = i * (width / data.length) + 7
      const y = height - barHeight - 28
      const grad = svgEl('linearGradient', { id: `grad-${i}`, x1: 0, y1: 0, x2: 0, y2: 1 })
      grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#7c5cff' }))
      grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#16d1c4' }))
      const defs = svgEl('defs', {})
      defs.appendChild(grad)
      svg.appendChild(defs)

      const rect = svgEl('rect', { x, y, width: barWidth, height: barHeight, rx: 8, fill: `url(#grad-${i})` })
      svg.appendChild(rect)

      const label = svgEl('text', { x: x + barWidth / 2, y: height - 8, 'text-anchor': 'middle', fill: '#8b93a7', 'font-size': 11 })
      label.textContent = d.day.slice(5)
      svg.appendChild(label)

      const value = svgEl('text', { x: x + barWidth / 2, y: y - 6, 'text-anchor': 'middle', fill: '#eef1f8', 'font-size': 11, 'font-weight': 700 })
      value.textContent = '$' + Math.round(Number(d.total))
      svg.appendChild(value)
    })

    container.appendChild(svg)
  }

  function line(container, data) {
    container.innerHTML = ''
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="empty">Todavia no hay datos</p>'
      return
    }
    const width = container.clientWidth || 400
    const height = 220
    const padding = 30
    const svg = svgEl('svg', { width: '100%', height, viewBox: `0 0 ${width} ${height}` })
    const max = Math.max(...data.map((d) => Number(d.total)), 1)
    const stepX = (width - padding * 2) / Math.max(data.length - 1, 1)

    const points = data.map((d, i) => {
      const x = padding + i * stepX
      const y = height - padding - (Number(d.total) / max) * (height - padding * 2)
      return [x, y]
    })

    const areaPath = ['M', points[0][0], height - padding]
    points.forEach((p) => areaPath.push('L', p[0], p[1]))
    areaPath.push('L', points[points.length - 1][0], height - padding, 'Z')

    const grad = svgEl('linearGradient', { id: 'areaGrad', x1: 0, y1: 0, x2: 0, y2: 1 })
    grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#7c5cff', 'stop-opacity': 0.45 }))
    grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#7c5cff', 'stop-opacity': 0 }))
    const defs = svgEl('defs', {})
    defs.appendChild(grad)
    svg.appendChild(defs)

    svg.appendChild(svgEl('path', { d: areaPath.join(' '), fill: 'url(#areaGrad)' }))

    const linePath = points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ')
    svg.appendChild(svgEl('path', { d: linePath, fill: 'none', stroke: '#16d1c4', 'stroke-width': 2.5 }))

    points.forEach((p) => svg.appendChild(svgEl('circle', { cx: p[0], cy: p[1], r: 3.5, fill: '#eef1f8' })))

    container.appendChild(svg)
  }

  function donut(container, data) {
    container.innerHTML = ''
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="empty">Todavia no hay datos</p>'
      return
    }
    const colors = ['#7c5cff', '#16d1c4', '#ff6ea8', '#ffb454']
    const size = 200
    const radius = 70
    const center = size / 2
    const total = data.reduce((sum, d) => sum + Number(d.total), 0) || 1
    const svg = svgEl('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}` })

    let angle = -90
    data.forEach((d, i) => {
      const fraction = Number(d.total) / total
      const sweep = fraction * 360
      const largeArc = sweep > 180 ? 1 : 0
      const startX = center + radius * Math.cos((angle * Math.PI) / 180)
      const startY = center + radius * Math.sin((angle * Math.PI) / 180)
      const endAngle = angle + sweep
      const endX = center + radius * Math.cos((endAngle * Math.PI) / 180)
      const endY = center + radius * Math.sin((endAngle * Math.PI) / 180)
      const path = svgEl('path', {
        d: `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`,
        fill: colors[i % colors.length]
      })
      svg.appendChild(path)
      angle = endAngle
    })

    svg.appendChild(svgEl('circle', { cx: center, cy: center, r: radius * 0.55, fill: '#0b0e14' }))

    const wrap = document.createElement('div')
    wrap.style.display = 'flex'
    wrap.style.gap = '20px'
    wrap.style.alignItems = 'center'
    wrap.appendChild(svg)

    const legend = document.createElement('div')
    data.forEach((d, i) => {
      const row = document.createElement('div')
      row.style.display = 'flex'
      row.style.alignItems = 'center'
      row.style.gap = '8px'
      row.style.fontSize = '13px'
      row.style.marginBottom = '6px'
      row.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:${colors[i % colors.length]};display:inline-block"></span> ${d.payment_method}: $${Number(d.total).toFixed(2)}`
      legend.appendChild(row)
    })
    wrap.appendChild(legend)
    container.appendChild(wrap)
  }

  return { bars, line, donut }
})()
