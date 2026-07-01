const AuraPOS = (function () {
  let cart = []
  let selectedMethod = 'efectivo'
  let selectedCustomerId = null

  function showToast(message) {
    const toast = document.getElementById('toast')
    if (!toast) return
    toast.textContent = message
    toast.classList.add('show')
    setTimeout(() => toast.classList.remove('show'), 2200)
  }

  function addToCart(id, name, price, stock) {
    const existing = cart.find((it) => it.productId === id)
    if (existing) {
      if (existing.quantity + 1 > stock) return showToast('No hay mas stock disponible')
      existing.quantity += 1
    } else {
      if (stock <= 0) return showToast('Sin stock')
      cart.push({ productId: id, name, unitPrice: price, quantity: 1, stock })
    }
    renderCart()
  }

  function changeQty(index, delta) {
    const item = cart[index]
    if (!item) return
    const next = item.quantity + delta
    if (next <= 0) {
      cart.splice(index, 1)
    } else if (next > item.stock) {
      showToast('No hay mas stock disponible')
      return
    } else {
      item.quantity = next
    }
    renderCart()
  }

  function removeItem(index) {
    cart.splice(index, 1)
    renderCart()
  }

  function renderCart() {
    const container = document.getElementById('cartItems')
    const empty = document.getElementById('cartEmpty')
    if (!container) return

    if (cart.length === 0) {
      container.innerHTML = '<p class="empty" id="cartEmpty">Todavia no agregaste productos</p>'
    } else {
      container.innerHTML = cart
        .map(
          (item, index) => `
        <div class="cart-item">
          <span class="cart-item-name">${item.name}</span>
          <div class="cart-item-controls">
            <button class="qty-btn" onclick="AuraPOS.changeQty(${index}, -1)">-</button>
            <span>${item.quantity}</span>
            <button class="qty-btn" onclick="AuraPOS.changeQty(${index}, 1)">+</button>
          </div>
          <span class="cart-item-price">$${(item.quantity * item.unitPrice).toFixed(2)}</span>
          <button class="remove-item" onclick="AuraPOS.removeItem(${index})">&times;</button>
        </div>`
        )
        .join('')
    }

    updateTotals()
  }

  function updateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const discountInput = document.getElementById('cartDiscount')
    const discount = discountInput ? Number(discountInput.value) || 0 : 0
    const total = Math.max(subtotal - discount, 0)

    const subtotalEl = document.getElementById('cartSubtotal')
    const totalEl = document.getElementById('cartTotal')
    if (subtotalEl) subtotalEl.textContent = '$' + subtotal.toFixed(2)
    if (totalEl) totalEl.textContent = '$' + total.toFixed(2)

    updateChange(total)
  }

  function updateChange(total) {
    const amountPaidInput = document.getElementById('amountPaid')
    const changeDisplay = document.getElementById('changeDisplay')
    if (!amountPaidInput || !changeDisplay) return
    const paid = Number(amountPaidInput.value) || 0
    const change = Math.max(paid - total, 0)
    changeDisplay.textContent = 'Vuelto: $' + change.toFixed(2)
  }

  function currentTotal() {
    const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const discountInput = document.getElementById('cartDiscount')
    const discount = discountInput ? Number(discountInput.value) || 0 : 0
    return Math.max(subtotal - discount, 0)
  }

  async function charge() {
    if (cart.length === 0) return showToast('El carrito esta vacio')

    const discountInput = document.getElementById('cartDiscount')
    const amountPaidInput = document.getElementById('amountPaid')
    const total = currentTotal()

    const payload = {
      items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })),
      discount: discountInput ? Number(discountInput.value) || 0 : 0,
      payment_method: selectedMethod,
      amount_paid: amountPaidInput && amountPaidInput.value ? Number(amountPaidInput.value) : total,
      customer_id: selectedCustomerId
    }

    const response = await fetch('/pos/cobrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await response.json()

    if (!response.ok) {
      showToast(data.error || 'No se pudo cobrar')
      return
    }

    showToast('Venta registrada')
    cart = []
    selectedCustomerId = null
    if (amountPaidInput) amountPaidInput.value = ''
    const customerSearch = document.getElementById('customerSearch')
    if (customerSearch) customerSearch.value = ''
    renderCart()
    window.open(`/pos/recibo/${data.saleId}`, '_blank')
    setTimeout(() => window.location.reload(), 800)
  }

  function init() {
    const grid = document.getElementById('productGrid')
    const search = document.getElementById('posSearch')
    const chips = document.getElementById('categoryChips')
    const discountInput = document.getElementById('cartDiscount')
    const amountPaidInput = document.getElementById('amountPaid')
    const chargeBtn = document.getElementById('chargeBtn')
    const clearBtn = document.getElementById('clearCartBtn')
    const customerSearch = document.getElementById('customerSearch')
    const customerResults = document.getElementById('customerResults')
    let activeCategory = 'todas'

    function filterTiles() {
      const term = (search.value || '').toLowerCase()
      const tiles = grid.querySelectorAll('.product-tile')
      tiles.forEach((tile) => {
        const matchesCategory = activeCategory === 'todas' || tile.dataset.category === activeCategory
        const matchesTerm = !term || tile.dataset.name.includes(term) || tile.dataset.barcode === term
        tile.style.display = matchesCategory && matchesTerm ? '' : 'none'
      })
    }

    if (search) {
      search.addEventListener('input', filterTiles)
      search.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return
        const term = search.value.trim()
        const match = Array.from(grid.querySelectorAll('.product-tile')).find((t) => t.dataset.barcode === term)
        if (match) {
          match.click()
          search.value = ''
          filterTiles()
        }
      })
    }

    if (chips) {
      chips.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip')
        if (!btn) return
        chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('chip-active'))
        btn.classList.add('chip-active')
        activeCategory = btn.dataset.category
        filterTiles()
      })
    }

    if (discountInput) discountInput.addEventListener('input', updateTotals)
    if (amountPaidInput) amountPaidInput.addEventListener('input', () => updateChange(currentTotal()))

    const paymentMethods = document.getElementById('paymentMethods')
    const cashRow = document.getElementById('cashRow')
    if (paymentMethods) {
      paymentMethods.addEventListener('click', (e) => {
        const btn = e.target.closest('.payment-chip')
        if (!btn) return
        paymentMethods.querySelectorAll('.payment-chip').forEach((c) => c.classList.remove('payment-active'))
        btn.classList.add('payment-active')
        selectedMethod = btn.dataset.method
        if (cashRow) cashRow.style.display = selectedMethod === 'efectivo' ? 'flex' : 'none'
      })
    }

    if (chargeBtn) chargeBtn.addEventListener('click', charge)
    if (clearBtn) clearBtn.addEventListener('click', () => { cart = []; renderCart() })

    if (customerSearch) {
      let debounceTimer
      customerSearch.addEventListener('input', () => {
        clearTimeout(debounceTimer)
        const term = customerSearch.value.trim()
        if (!term) { customerResults.innerHTML = ''; selectedCustomerId = null; return }
        debounceTimer = setTimeout(async () => {
          const res = await fetch('/clientes/api/buscar?q=' + encodeURIComponent(term))
          const results = await res.json()
          customerResults.innerHTML = results
            .map((c) => `<div data-id="${c.id}" data-name="${c.name}">${c.name}</div>`)
            .join('')
        }, 220)
      })

      customerResults.addEventListener('click', (e) => {
        const row = e.target.closest('div')
        if (!row) return
        selectedCustomerId = Number(row.dataset.id)
        customerSearch.value = row.dataset.name
        customerResults.innerHTML = ''
      })
    }
  }

  document.addEventListener('DOMContentLoaded', init)

  return { addToCart, changeQty, removeItem }
})()
