# Razorpay Payment Integration Guide - Phyo

## Overview

Phyo uses Razorpay for handling subscription payments. This guide covers the complete payment flow from creating an order to verifying payment and activating subscriptions.

---

## Table of Contents

1. [Available Plans](#available-plans)
2. [Payment Flow](#payment-flow)
3. [API Endpoints](#api-endpoints)
4. [Frontend Integration](#frontend-integration)
5. [Webhook Setup](#webhook-setup)
6. [Testing](#testing)
7. [Error Handling](#error-handling)

---

## Available Plans

### Subscription Plans

| Plan | Price (INR) | Credits | Interval | Features |
|------|-------------|---------|----------|----------|
| **Bronze** | Free | 10 | Monthly | Basic features |
| **Silver** | ₹1,900 | 50 | Monthly | Advanced filters, insights |
| **Gold** | ₹4,500 | 150 | Monthly | All Silver + Reports |
| **Platinum** | ₹9,000 | 350 | Monthly | All Gold + Premium support |
| **Diamond** | ₹19,000 | Unlimited | Monthly | All features + Priority support |

---

## Payment Flow

### Step-by-Step Process

```
1. User selects a plan
   ↓
2. Frontend calls CREATE ORDER API
   ↓
3. Backend creates Razorpay order and returns order details
   ↓
4. Frontend opens Razorpay checkout modal
   ↓
5. User completes payment on Razorpay
   ↓
6. Razorpay returns payment details to frontend
   ↓
7. Frontend calls VERIFY PAYMENT API with payment details
   ↓
8. Backend verifies signature and activates subscription
   ↓
9. User's plan is upgraded with credits
```

---

## API Endpoints

### Base URL
```
http://localhost:4000/api/payment
```

---

### 1. Get All Available Plans

**Endpoint:** `GET /api/payment/plans`

**Authentication:** Required (JWT Token)

**Request:**
```bash
curl -X GET http://localhost:4000/api/payment/plans \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "bronze-monthly",
      "name": "BRONZE",
      "displayName": "Bronze Plan",
      "price": 0,
      "currency": "INR",
      "interval": "MONTHLY",
      "features": {
        "creatorSearch": true,
        "creatorInsights": null,
        "advancedFilters": false,
        "audienceBasedSearch": false,
        "historicalCost": false,
        "preCuratedList": false,
        "brandAnalysis": false,
        "costingInsights": false,
        "openAccessInfluencerDatabase": true,
        "campaignReports": false,
        "roleBasedAccess": false,
        "volumeBasedDiscount": false,
        "platformTraining": false,
        "dedicatedCustomerSuccess": false,
        "credits": 10
      },
      "isActive": true
    },
    {
      "id": "silver-monthly",
      "name": "SILVER",
      "displayName": "Silver Plan",
      "price": 1900,
      "currency": "INR",
      "interval": "MONTHLY",
      "features": {
        "creatorSearch": true,
        "creatorInsights": null,
        "advancedFilters": true,
        "audienceBasedSearch": true,
        "historicalCost": true,
        "preCuratedList": true,
        "brandAnalysis": true,
        "costingInsights": true,
        "openAccessInfluencerDatabase": true,
        "campaignReports": true,
        "roleBasedAccess": false,
        "volumeBasedDiscount": false,
        "platformTraining": false,
        "dedicatedCustomerSuccess": false,
        "credits": 50
      },
      "isActive": true
    }
    // ... other plans
  ]
}
```

---

### 2. Get User's Current Plan

**Endpoint:** `GET /api/payment/user-plan`

**Authentication:** Required (JWT Token)

**Request:**
```bash
curl -X GET http://localhost:4000/api/payment/user-plan \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currentPlan": "SILVER",
    "subscription": {
      "_id": "64f5e7b9c2d4e1a2b3c4d5e6",
      "userId": "64f5e7b9c2d4e1a2b3c4d5e5",
      "planId": "silver-monthly",
      "status": "ACTIVE",
      "startDate": "2024-12-01T00:00:00.000Z",
      "endDate": "2025-01-01T00:00:00.000Z",
      "nextBillingDate": "2025-01-01T00:00:00.000Z",
      "creditsRemaining": 45,
      "creditsUsedThisMonth": 5,
      "autoRenew": true
    },
    "creditsRemaining": 45,
    "features": {
      "creatorSearch": true,
      "advancedFilters": true,
      "audienceBasedSearch": true,
      "credits": 50
    },
    "isActive": true
  }
}
```

---

### 3. Create Payment Order

**Endpoint:** `POST /api/payment/create-order`

**Authentication:** Required (JWT Token)

**Request Body:**
```json
{
  "planId": "silver-monthly",
  "interval": "MONTHLY"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:4000/api/payment/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "planId": "silver-monthly",
    "interval": "MONTHLY"
  }'
```

**Success Response (Paid Plan):**
```json
{
  "success": true,
  "data": {
    "orderId": "order_RnRWpxhZ9dH7W0",
    "amount": 1900,
    "currency": "INR",
    "plan": {
      "id": "silver-monthly",
      "name": "SILVER",
      "displayName": "Silver Plan",
      "price": 1900,
      "currency": "INR",
      "interval": "MONTHLY",
      "features": {
        "creatorSearch": true,
        "advancedFilters": true,
        "credits": 50
      },
      "isActive": true
    },
    "razorpayKey": "rzp_test_RbXvyl4Znqufal"
  }
}
```

**Success Response (Free Plan):**
```json
{
  "success": true,
  "data": {
    "orderId": null,
    "amount": 0,
    "currency": "INR",
    "plan": {
      "id": "bronze-monthly",
      "name": "BRONZE",
      "displayName": "Bronze Plan",
      "price": 0,
      "features": {
        "credits": 10
      }
    },
    "razorpayKey": null,
    "message": "Free plan activated successfully"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Plan not found"
}
```

---

### 4. Verify Payment

**Endpoint:** `POST /api/payment/verify-payment`

**Authentication:** Required (JWT Token)

**Request Body:**
```json
{
  "razorpayOrderId": "order_RnRWpxhZ9dH7W0",
  "razorpayPaymentId": "pay_RnRXR8dHQ7W0AB",
  "razorpaySignature": "9c0e8a8e8f7d6c5b4a3b2c1d0e1f2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2",
  "planId": "silver-monthly"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:4000/api/payment/verify-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "razorpayOrderId": "order_RnRWpxhZ9dH7W0",
    "razorpayPaymentId": "pay_RnRXR8dHQ7W0AB",
    "razorpaySignature": "9c0e8a8e8f7d6c5b4a3b2c1d0e1f2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2",
    "planId": "silver-monthly"
  }'
```

**Success Response:**
```json
{
  "success": true,
  "message": "Payment verified and subscription activated",
  "data": {
    "plan": "SILVER",
    "subscriptionId": "64f5e7b9c2d4e1a2b3c4d5e6",
    "creditsRemaining": 50
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Payment verification failed"
}
```

---

### 5. Get Payment History

**Endpoint:** `GET /api/payment/history`

**Authentication:** Required (JWT Token)

**Request:**
```bash
curl -X GET http://localhost:4000/api/payment/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f5e7b9c2d4e1a2b3c4d5e7",
      "userId": "64f5e7b9c2d4e1a2b3c4d5e5",
      "amount": 1900,
      "currency": "INR",
      "status": "COMPLETED",
      "paymentMethod": "RAZORPAY",
      "razorpayOrderId": "order_RnRWpxhZ9dH7W0",
      "razorpayPaymentId": "pay_RnRXR8dHQ7W0AB",
      "description": "Payment for Silver Plan",
      "metadata": {
        "planId": "silver-monthly",
        "interval": "MONTHLY",
        "planName": "SILVER"
      },
      "createdAt": "2024-12-01T10:30:00.000Z",
      "updatedAt": "2024-12-01T10:32:00.000Z"
    }
  ]
}
```

---

### 6. Get User Credits

**Endpoint:** `GET /api/payment/credits`

**Authentication:** Required (JWT Token)

**Request:**
```bash
curl -X GET http://localhost:4000/api/payment/credits \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "creditsRemaining": 45,
    "creditsUsedThisMonth": 5,
    "totalCredits": 50,
    "lastCreditReset": "2024-12-01T00:00:00.000Z",
    "nextCreditReset": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 7. Cancel Subscription

**Endpoint:** `POST /api/payment/cancel-subscription`

**Authentication:** Required (JWT Token)

**Request:**
```bash
curl -X POST http://localhost:4000/api/payment/cancel-subscription \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription cancelled successfully"
}
```

---

## Frontend Integration

### React/Next.js Example

#### 1. Install Razorpay Checkout Script

Add to your `_document.tsx` or `_app.tsx`:

```tsx
// _document.tsx (Next.js)
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
```

#### 2. Create Payment Hook

```typescript
// hooks/usePayment.ts
import { useState } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentOptions {
  planId: string;
  onSuccess?: () => void;
  onFailure?: (error: string) => void;
}

export const usePayment = () => {
  const [loading, setLoading] = useState(false);

  const initiatePayment = async ({ 
    planId, 
    onSuccess, 
    onFailure 
  }: PaymentOptions) => {
    try {
      setLoading(true);

      // Step 1: Create Order
      const orderResponse = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ planId, interval: 'MONTHLY' })
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      // Handle free plan
      if (orderData.data.amount === 0) {
        onSuccess?.();
        setLoading(false);
        return;
      }

      // Step 2: Open Razorpay Checkout
      const options = {
        key: orderData.data.razorpayKey,
        amount: orderData.data.amount * 100, // Amount in paise
        currency: orderData.data.currency,
        name: 'Phyo',
        description: `Subscribe to ${orderData.data.plan.displayName}`,
        order_id: orderData.data.orderId,
        handler: async (response: any) => {
          try {
            // Step 3: Verify Payment
            const verifyResponse = await fetch('/api/payment/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                planId: planId
              })
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              onSuccess?.();
            } else {
              throw new Error(verifyData.error || 'Payment verification failed');
            }
          } catch (error: any) {
            onFailure?.(error.message);
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: '', // User's name
          email: '', // User's email
          contact: '' // User's phone
        },
        theme: {
          color: '#3399cc'
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            onFailure?.('Payment cancelled by user');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      setLoading(false);
      onFailure?.(error.message);
    }
  };

  return { initiatePayment, loading };
};
```

#### 3. Use in Component

```tsx
// components/PricingCard.tsx
import { usePayment } from '@/hooks/usePayment';
import { toast } from 'react-hot-toast';

export default function PricingCard({ plan }: { plan: any }) {
  const { initiatePayment, loading } = usePayment();

  const handleSubscribe = () => {
    initiatePayment({
      planId: plan.id,
      onSuccess: () => {
        toast.success('Subscription activated successfully!');
        // Redirect or update UI
        window.location.href = '/dashboard';
      },
      onFailure: (error) => {
        toast.error(`Payment failed: ${error}`);
      }
    });
  };

  return (
    <div className="pricing-card">
      <h3>{plan.displayName}</h3>
      <p>₹{plan.price} / month</p>
      <button 
        onClick={handleSubscribe} 
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Subscribe Now'}
      </button>
    </div>
  );
}
```

---

## Webhook Setup

### Configure Razorpay Webhook

1. **Go to Razorpay Dashboard**
   - Login to https://dashboard.razorpay.com
   - Navigate to Settings → Webhooks

2. **Add Webhook URL**
   ```
   https://yourdomain.com/api/payment/webhook
   ```

3. **Select Events to Listen**
   - ✅ `payment.captured`
   - ✅ `payment.failed`
   - ✅ `order.paid`

4. **Set Webhook Secret**
   - Copy the webhook secret
   - Add to your `.env`:
     ```
     RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
     ```

### Webhook Events Handled

#### 1. `payment.captured`
- Triggered when payment is successfully captured
- Updates payment status to COMPLETED
- Activates user subscription
- Credits are added to user account

#### 2. `payment.failed`
- Triggered when payment fails
- Updates payment status to FAILED
- User is notified (if email configured)

#### 3. `order.paid`
- Triggered when order is marked as paid
- Ensures payment record is completed

---

## Testing

### Test Mode Setup

1. **Use Test Credentials**
   ```env
   RAZORPAY_KEY_ID=rzp_test_RbXvyl4Znqufal
   RAZORPAY_KEY_SECRET=hsTZJbshniUgz81eOBU3lAIS
   ```

2. **Test Card Numbers** (Razorpay Test Mode)

| Card Number | Result |
|-------------|--------|
| 4111 1111 1111 1111 | Success |
| 4000 0000 0000 0002 | Failure |
| 5555 5555 5555 4444 | Success (Mastercard) |

**Test Card Details:**
- CVV: Any 3 digits (e.g., 123)
- Expiry: Any future date (e.g., 12/25)
- Name: Any name

### Testing Flow

#### Test 1: Successful Payment

```bash
# Step 1: Create Order
curl -X POST http://localhost:4000/api/payment/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"planId": "silver-monthly"}'

# Step 2: Use Razorpay Checkout (on frontend)
# - Enter test card: 4111 1111 1111 1111
# - CVV: 123
# - Expiry: 12/25

# Step 3: Verify Payment
curl -X POST http://localhost:4000/api/payment/verify-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "razorpayOrderId": "order_xxx",
    "razorpayPaymentId": "pay_xxx",
    "razorpaySignature": "signature_xxx",
    "planId": "silver-monthly"
  }'
```

#### Test 2: Free Plan Upgrade

```bash
curl -X POST http://localhost:4000/api/payment/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"planId": "bronze-monthly"}'

# Expected: Immediate activation, no payment required
```

#### Test 3: Check Subscription Status

```bash
curl -X GET http://localhost:4000/api/payment/user-plan \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Error Handling

### Common Error Codes

| Error Code | Message | Solution |
|------------|---------|----------|
| 400 | Plan ID is required | Provide valid planId in request |
| 400 | Payment verification failed | Check signature calculation |
| 401 | User not authenticated | Provide valid JWT token |
| 404 | Plan not found | Use correct planId from /plans API |
| 404 | Payment record not found | Ensure order was created first |
| 500 | Internal server error | Check server logs |

### Frontend Error Handling

```typescript
const handlePaymentError = (error: any) => {
  switch (error.code) {
    case 'BAD_REQUEST_ERROR':
      toast.error('Invalid payment details');
      break;
    case 'GATEWAY_ERROR':
      toast.error('Payment gateway error. Please try again.');
      break;
    case 'NETWORK_ERROR':
      toast.error('Network error. Check your connection.');
      break;
    default:
      toast.error('Payment failed. Please try again.');
  }
};
```

---

## Security Best Practices

### Backend

✅ **Signature Verification**
- Always verify Razorpay signature before activating subscription
- Use HMAC SHA256 with secret key

✅ **Webhook Validation**
- Verify webhook signature
- Check webhook source IP (optional)

✅ **Environment Variables**
- Store keys in `.env` file
- Never commit secrets to Git

### Frontend

✅ **Token Management**
- Store JWT token securely (HttpOnly cookies preferred)
- Include token in all authenticated requests

✅ **Amount Validation**
- Display exact amount to user before payment
- Verify amount on backend

---

## Production Checklist

- [ ] Switch to Razorpay Live Mode keys
- [ ] Update webhook URL to production domain
- [ ] Configure webhook secret
- [ ] Test payment flow end-to-end
- [ ] Set up payment failure notifications
- [ ] Monitor webhook delivery
- [ ] Set up logging for payment events
- [ ] Configure SSL certificate for webhook endpoint
- [ ] Test subscription renewal flow
- [ ] Set up backup payment method (if needed)

---

## API Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/plans` | GET | ✅ | Get all plans |
| `/user-plan` | GET | ✅ | Get current plan |
| `/create-order` | POST | ✅ | Create payment order |
| `/verify-payment` | POST | ✅ | Verify payment |
| `/history` | GET | ✅ | Payment history |
| `/credits` | GET | ✅ | Get user credits |
| `/cancel-subscription` | POST | ✅ | Cancel subscription |
| `/webhook` | POST | ❌ | Razorpay webhook |

---

## Support

### Documentation
- Razorpay Docs: https://razorpay.com/docs/
- Razorpay Test Cards: https://razorpay.com/docs/payments/payments/test-card-details/

### Contact
- For payment issues: Check `/api/payment/history`
- For technical support: Review server logs
- For Razorpay issues: https://dashboard.razorpay.com/support

---

## Environment Variables Reference

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_RbXvyl4Znqufal
RAZORPAY_KEY_SECRET=hsTZJbshniUgz81eOBU3lAIS
RAZORPAY_WEBHOOK_SECRET=phyo_webhook_secret_2024

# Server Configuration
PORT=4000
MONGO_URI=mongodb://...
JWT_SECRET=your_jwt_secret
```

---

## Troubleshooting

### Issue: Payment succeeds but subscription not activated

**Solution:**
1. Check webhook logs
2. Verify signature calculation
3. Check MongoDB connection
4. Review payment status in database

### Issue: Razorpay checkout not opening

**Solution:**
1. Verify Razorpay script is loaded
2. Check console for errors
3. Ensure valid order ID
4. Verify Razorpay key

### Issue: Signature verification fails

**Solution:**
1. Verify RAZORPAY_KEY_SECRET is correct
2. Check order_id|payment_id format
3. Ensure no extra spaces in signature
4. Use Buffer.compare for comparison

---

**Last Updated:** December 2024  
**Version:** 1.0.0
