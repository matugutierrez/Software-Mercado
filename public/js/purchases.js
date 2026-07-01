document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('purchaseItems')
  const addBtn = document.getElementById('addPurchaseItem')
  const form = document.getElementById('purchaseForm')
  const hiddenInput = document.getElementById('purchaseItemsInput')
  const products = window.AURA_PRODUCTS || []

  if (!addBtn) return

  function addRow() {
    const row = document.createElement('div')
    row.className = 'purchase-item-row'

    const select = document.createElement('select')
    select.innerHTML = products.map((p) => `<option value="${p.id}" data-cost="${p.cost}">${p.name}</option>`).join('')

    const qty = document.createElement('input')
    qty.type = 'number'
    qty.step = '0.01'
    qty.placeholder = 'Cantidad'

    const cost = document.createElement('input')
    cost.type = 'number'
    cost.step = '0.01'
    cost.placeholder = 'Costo unitario'
    cost.value = select.options.length ? select.options[0].dataset.cost : ''

    select.addEventListener('change', () => {
      cost.value = select.options[select.selectedIndex].dataset.cost
    })

    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'
    removeBtn.textContent = '\u00d7'
    removeBtn.className = 'chip-remove'
    removeBtn.addEventListener('click', () => row.remove())

    row.appendChild(select)
    row.appendChild(qty)
    row.appendChild(cost)
    row.appendChild(removeBtn)
    container.appendChild(row)
  }

  addBtn.addEventListener('click', addRow)
  addRow()

  form.addEventListener('submit', (e) => {
    const rows = container.querySelectorAll('.purchase-item-row')
    const items = []
    rows.forEach((row) => {
      const select = row.querySelector('select')
      const qty = row.querySelector('input[type="number"]')
      const cost = row.querySelectorAll('input[type="number"]')[1]
      if (select && qty.value && cost.value) {
        items.push({ productId: Number(select.value), quantity: Number(qty.value), cost: Number(cost.value) })
      }
    })
    hiddenInput.value = JSON.stringify(items)
  })
})
