const AuraUI = (function () {
  function openModal(id) {
    const modal = document.getElementById(id)
    if (modal) modal.classList.add('open')
  }

  function closeModal(id) {
    const modal = document.getElementById(id)
    if (modal) modal.classList.remove('open')
  }

  function openEditProduct(product) {
    document.getElementById('editName').value = product.name || ''
    document.getElementById('editBarcode').value = product.barcode || ''
    document.getElementById('editCategory').value = product.category_id || ''
    document.getElementById('editPrice').value = product.price || 0
    document.getElementById('editCost').value = product.cost || 0
    document.getElementById('editStock').value = product.stock || 0
    document.getElementById('editMinStock').value = product.min_stock || 0
    document.getElementById('editUnit').value = product.unit || 'unidad'
    document.getElementById('editProductForm').action = `/productos/${product.id}/editar`
    openModal('editProductModal')
  }

  document.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('modal')) {
      e.target.classList.remove('open')
    }
  })

  return { openModal, closeModal, openEditProduct }
})()
