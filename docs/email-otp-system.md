# Email OTP System Documentation

## Overview

The application now includes a comprehensive email OTP (One-Time Password) system for user registration, email verification, and password reset functionality. The system uses Gmail SMTP with the provided credentials.

## SMTP Configuration

- **Email**: phyo.aiofficial@gmail.com
- **Password**: antn hqqq pqzw ittq
- **SMTP Host**: smtp.gmail.com
- **SMTP Port**: 587
- **Security**: TLS (not SSL)

## API Endpoints

### 1. User Registration with OTP

**Endpoint**: `POST /auth/signup`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "type": "BRAND",
  "companyName": "Example Company",
  "industry": "Technology"
}
```

**Response**:
```json
{
  "message": "Registration initiated. Please check your email for verification code.",
  "email": "user@example.com"
}
```

**Notes**:
- User is created but marked as unverified
- OTP is sent to the provided email
- OTP is valid for 10 minutes
- User cannot login until email is verified

### 2. Email Verification

**Endpoint**: `POST /auth/verify-otp`

**Request Body**:
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response**:
```json
{
  "message": "Email verified successfully",
  "token": "jwt_token_here",
  "user": {
    "email": "user@example.com",
    "type": "BRAND",
    "isEmailVerified": true,
    // ... other user data
  }
}
```

### 3. Resend OTP

**Endpoint**: `POST /auth/resend-otp`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "message": "New verification code sent to your email",
  "email": "user@example.com"
}
```

### 4. Login (Updated)

**Endpoint**: `POST /auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (if email not verified):
```json
{
  "message": "Please verify your email before logging in. Check your email for verification code.",
  "email": "user@example.com"
}
```

**Response** (if email verified):
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    // ... user data
  }
}
```

### 5. Forgot Password (Updated)

**Endpoint**: `POST /auth/forgot-password`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "message": "Verification code sent to your email",
  "email": "user@example.com"
}
```

### 6. Verify Reset Code

**Endpoint**: `POST /auth/verify-code`

**Request Body**:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response**:
```json
{
  "message": "Code verified successfully"
}
```

### 7. Reset Password

**Endpoint**: `POST /auth/reset-password`

**Request Body**:
```json
{
  "email": "user@example.com",
  "newPassword": "newpassword123"
}
```

**Response**:
```json
{
  "message": "Password reset successfully"
}
```

## Email Templates

The system uses beautiful HTML email templates with:
- Professional styling
- Clear OTP display
- Expiry information
- Responsive design

## Database Schema Updates

New fields added to user models:
- `emailVerificationOTP`: String - stores the OTP
- `emailVerificationExpires`: Number - OTP expiry timestamp
- `isEmailVerified`: Boolean - email verification status

## Testing

### Test Email Configuration

Run the email test script:
```bash
npm run test:email
```

**Note**: Update the recipient email in `scripts/test-email.js` before running.

### Complete Flow Testing

1. **Registration Flow**:
   ```bash
   # 1. Register user
   curl -X POST http://localhost:3000/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123","type":"BRAND","companyName":"Test Company","industry":"Technology"}'
   
   # 2. Check email for OTP
   # 3. Verify OTP
   curl -X POST http://localhost:3000/auth/verify-otp \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","otp":"123456"}'
   ```

2. **Forgot Password Flow**:
   ```bash
   # 1. Request password reset
   curl -X POST http://localhost:3000/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   
   # 2. Check email for reset code
   # 3. Verify reset code
   curl -X POST http://localhost:3000/auth/verify-code \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","code":"123456"}'
   
   # 4. Reset password
   curl -X POST http://localhost:3000/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","newPassword":"newpassword123"}'
   ```

## Security Features

1. **OTP Expiry**: All OTPs expire after 10 minutes
2. **Email Verification Required**: Users must verify email before login
3. **Secure Password Reset**: Multi-step verification process
4. **Rate Limiting**: Consider implementing rate limiting for OTP requests
5. **Audit Trail**: All verification attempts are logged

## Error Handling

Common error responses:
- `400`: Invalid input data
- `401`: Invalid credentials or unverified email
- `404`: User not found
- `500`: Server error

## Environment Variables

The system uses these environment variables (with defaults):
- `EMAIL_USER`: phyo.aiofficial@gmail.com
- `EMAIL_PASS`: antn hqqq pqzw ittq
- `EMAIL_HOST`: smtp.gmail.com
- `EMAIL_PORT`: 587

## Notes

1. **Google OAuth Users**: OAuth users are automatically marked as verified
2. **OTP Storage**: OTPs are stored in the database (consider Redis for production)
3. **Email Delivery**: Uses Gmail SMTP (ensure 2FA is enabled on the Gmail account)
4. **Production Considerations**: 
   - Use environment variables for sensitive data
   - Implement rate limiting
   - Use Redis for OTP storage
   - Add email delivery monitoring 