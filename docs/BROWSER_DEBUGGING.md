# Browser Console Debugging Guide

## Check Product Data

### 1. Check if Products are Loaded
```javascript
// Check if PRODUCTS object exists
window.PRODUCTS

// Check a specific product (should have weight)
window.PRODUCTS['oscar-bahia-ceremonial-cacao-200g']

// Check all products
Object.keys(window.PRODUCTS)

// Check if a product has weight
window.PRODUCTS['oscar-bahia-ceremonial-cacao-200g'].weight
// Should return: 7.05
```

### 2. Check Cart Contents
```javascript
// Get current cart
window.Cart.getCart()

// Check cart items
window.Cart.getCart().items

// Check if items have weights
window.Cart.getCart().items.forEach(item => {
  console.log(item.name, 'weight:', item.weight)
})

// Check specific item weight
window.Cart.getCart().items.find(item => item.productId === 'oscar-bahia-ceremonial-cacao-200g')?.weight
```

### 3. Manually Update Cart Weights
```javascript
// Force update cart weights
if (window.Cart && window.Cart.updateWeights) {
  window.Cart.updateWeights()
  // Check again
  window.Cart.getCart().items.forEach(item => {
    console.log(item.name, 'weight:', item.weight)
  })
}
```

### 4. Check Product Helper Functions
```javascript
// Get product by ID
window.getProduct('oscar-bahia-ceremonial-cacao-200g')

// Get all products
window.getAllProducts()

// Get products by category
window.getProductsByCategory('retail')
```

## Quick Debug Checklist

Run these in the browser console on the checkout page:

```javascript
// 1. Check if products.js loaded
console.log('PRODUCTS loaded:', !!window.PRODUCTS)

// 2. Check if cart.js loaded
console.log('Cart loaded:', !!window.Cart)

// 3. Check cart items and weights
console.table(
  window.Cart.getCart().items.map(item => ({
    name: item.name,
    productId: item.productId,
    weight: item.weight,
    quantity: item.quantity
  }))
)

// 4. Check if weights match PRODUCTS
window.Cart.getCart().items.forEach(item => {
  const product = window.PRODUCTS[item.productId]
  const productWeight = product ? product.weight : 'N/A'
  console.log(
    item.name,
    '\n  Cart weight:', item.weight,
    '\n  Product weight:', productWeight,
    '\n  Match:', item.weight === productWeight
  )
})

// 5. Force update and check again
if (window.Cart.updateWeights) {
  window.Cart.updateWeights()
  console.log('Weights updated!')
  console.table(
    window.Cart.getCart().items.map(item => ({
      name: item.name,
      weight: item.weight
    }))
  )
}
```

## Expected Results

### Products Should Have:
- `weight: 7.05` for 200g products
- `weight: 8.0` for 8 oz products
- `weight: 0` for wholesale products (if not configured)

### Cart Items Should Have:
- Same weight as corresponding product in `window.PRODUCTS`
- Weight should be a number (not 0 for retail products)

## Common Issues

### Issue: `window.PRODUCTS` is undefined
**Solution:** Make sure `products.js` is loaded before `cart.js` on the checkout page.

### Issue: Cart items have `weight: 0`
**Solution:** 
1. Run `window.Cart.updateWeights()` in console
2. Or clear cart and re-add items
3. Or refresh the page (weights should auto-update)

### Issue: Product not found in `window.PRODUCTS`
**Solution:** Check the `productId` matches exactly (case-sensitive, no typos).

## Test Adding a Product

```javascript
// Test adding a product (should include weight)
window.Cart.add({
  productId: 'oscar-bahia-ceremonial-cacao-200g',
  name: "Test Product",
  price: 25.00,
  quantity: 1
})

// Check if weight was included
const cart = window.Cart.getCart()
const addedItem = cart.items.find(item => item.productId === 'oscar-bahia-ceremonial-cacao-200g')
console.log('Added item weight:', addedItem?.weight)
// Should be: 7.05
```

