import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Warning: STRIPE_SECRET_KEY not set. Payment processing will not work.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

// Platform fee percentage (10%)
export const PLATFORM_FEE_PERCENTAGE = 0.10;

// Calculate platform fee and creator earnings
export function calculatePaymentAmounts(price: number) {
  const totalAmount = Math.round(price * 100); // Convert to cents
  const platformFee = Math.round(totalAmount * PLATFORM_FEE_PERCENTAGE);
  const creatorEarnings = totalAmount - platformFee;

  return {
    totalAmount, // Total in cents
    platformFee, // Platform fee in cents
    creatorEarnings, // Creator earnings in cents
    totalDollars: price,
    platformFeeDollars: platformFee / 100,
    creatorEarningsDollars: creatorEarnings / 100,
  };
}
