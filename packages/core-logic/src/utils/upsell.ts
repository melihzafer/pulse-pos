import { Product, CartItem } from '../types';

export const getUpsellProducts = (cartItems: CartItem[], allProducts: Product[]): Product[] => {
  if (cartItems.length === 0) return [];

  const cartProductIds = new Set(cartItems.map(item => item.product.id));
  const suggestions: Product[] = [];

  // Helper to find product by keyword
  const findByKeyword = (keyword: string) => 
    allProducts.find(p => 
      p.name.toLowerCase().includes(keyword.toLowerCase()) && 
      !cartProductIds.has(p.id)
    );

  // Rule 1: If buying Coffee, suggest Bakery/Chocolate
  const hasCoffee = cartItems.some(item => item.product.name.toLowerCase().includes('coffee'));
  if (hasCoffee) {
    const snack = findByKeyword('muffin') || findByKeyword('croissant') || findByKeyword('chocolate') || findByKeyword('cookie');
    if (snack) suggestions.push(snack);
  }

  // Rule 2: If buying Sandwich/Burger, suggest Drink
  const hasFood = cartItems.some(item => 
    item.product.name.toLowerCase().includes('sandwich') || 
    item.product.name.toLowerCase().includes('burger') ||
    item.product.name.toLowerCase().includes('pizza')
  );
  if (hasFood) {
    const drink = findByKeyword('coke') || findByKeyword('water') || findByKeyword('juice') || findByKeyword('soda');
    if (drink) suggestions.push(drink);
  }

  // Rule 3: Impulse buys (Gum, Candy) if not already in cart
  if (suggestions.length < 2) {
    const impulse = findByKeyword('gum') || findByKeyword('mint') || findByKeyword('candy');
    if (impulse) suggestions.push(impulse);
  }

  // Deduplicate and limit
  return Array.from(new Set(suggestions)).slice(0, 2);
};
