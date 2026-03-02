# Stripe Payment Integration Setup

## Environment Variables Required

### Backend (.env)
```bash
# Stripe Secret Key (from Stripe Dashboard > Developers > API Keys)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here

# Stripe Webhook Secret (from Stripe Dashboard > Developers > Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Frontend (.env or .env.local)
```bash
# Stripe Publishable Key (from Stripe Dashboard > Developers > API Keys)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

## Stripe Dashboard Setup

### 1. Get API Keys
1. Go to https://dashboard.stripe.com
2. Click "Developers" → "API keys"
3. Copy the **Publishable key** → Add to frontend .env as `REACT_APP_STRIPE_PUBLISHABLE_KEY`
4. Reveal and copy the **Secret key** → Add to backend .env as `STRIPE_SECRET_KEY`

### 2. Setup Webhook (for production)
1. Go to "Developers" → "Webhooks"
2. Click "Add endpoint"
3. Enter your endpoint URL: `https://your-domain.com/payments/webhook`
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click "Add endpoint"
6. Copy the **Signing secret** → Add to backend .env as `STRIPE_WEBHOOK_SECRET`

### 3. Test Mode vs Live Mode
- For development, use **Test mode** keys (start with `sk_test_` and `pk_test_`)
- For production, switch to **Live mode** and use live keys (start with `sk_live_` and `pk_live_`)

## Testing Payments

### Test Card Numbers (Test Mode Only)
- **Success**: `4242 4242 4242 4242`
- **Requires Authentication**: `4000 0025 0000 3155`
- **Declined**: `4000 0000 0000 9995`

Use any future expiration date, any 3-digit CVC, and any zip code.

## Payment Flow

1. **Order Creation**: Buyer creates order → Status: `pending_payment`
2. **Checkout**: Buyer clicks "Place Order" → Redirects to `/payment/:orderId`
3. **Payment Intent**: Frontend requests payment intent from backend
4. **Stripe Elements**: Secure payment form loads
5. **Payment**: Buyer enters card details → Stripe processes payment
6. **Confirmation**: Backend confirms payment → Updates order status to `paid`
7. **Redirect**: Buyer redirected to order workspace
8. **Webhook** (optional): Stripe sends webhook for additional confirmation

## Platform Fee

- **Platform fee**: 10% of order price
- **Creator earnings**: 90% of order price
- Automatically calculated in `calculatePaymentAmounts()` function

## Important Notes

- Never commit API keys to version control
- Use `.env` files and add them to `.gitignore`
- Test webhooks locally using Stripe CLI: `stripe listen --forward-to localhost:3002/payments/webhook`
- In production, ensure webhook endpoint is publicly accessible
- Payments are processed in cents (multiply dollar amount by 100)

## Next Steps

1. Add Stripe keys to environment variables
2. Test payment flow with test card numbers
3. Setup webhook endpoint for production
4. Consider adding:
   - Payment confirmation emails
   - Refund handling
   - Payout system for creators
   - Payment history/receipts
