// Custom event system for cross-component communication

export const CART_UPDATED = 'cart:updated';

export const emitCartUpdate = () => {
  window.dispatchEvent(new CustomEvent(CART_UPDATED));
};

export const onCartUpdate = (callback) => {
  window.addEventListener(CART_UPDATED, callback);
  return () => window.removeEventListener(CART_UPDATED, callback);
};
