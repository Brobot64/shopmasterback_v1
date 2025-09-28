# ShopMaster Backend API Documentation

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication
All endpoints requiring authentication use **HTTP-only secure cookies** for token storage and verification.

### How Authentication Works:
1. **Login/Registration** → Server sets secure cookies with JWT tokens
2. **Subsequent API calls** → Cookies are automatically included for authentication
3. **No manual token handling** → Browser handles cookie management automatically

### Cookie Details:
- **`accessToken`**: Short-lived token for API authentication (HTTP-only, secure)
- **`refreshToken`**: Long-lived token for token renewal (HTTP-only, secure)
- **Automatic inclusion**: Cookies sent with every request to the same domain
- **Security**: Protected against XSS attacks via HTTP-only flag

---

## Standard Response Format

### Success Response
```json
{
  "status": "success",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "status": "error" | "fail",
  "error": {
    "statusCode": number,
    "status": "error" | "fail",
    "isOperational": boolean
  },
  "message": "Error description",
  "stack": "Stack trace (development only)"
}
```

---

## Authentication Endpoints (`/auth`)

### 1. User Registration
**POST** `/auth/signup`

**Request Body:**
```json
{
  "userData": {
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890"
  },
  "businessData": {
    "name": "My Business",
    "category": "retail",
    "address": "123 Business St",
    "yearOfEstablishment": 2020,
    "contact": "contact@business.com",
    "description": "Business description"
  }
}
```

**Success Response (202):**
```json
{
  "status": "success",
  "message": "Registration initiated. OTP sent to your email/phone for verification.",
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "user@example.com",
      "userType": "OWNER",
      "status": "INACTIVE"
    },
    "business": {
      "id": "uuid",
      "name": "My Business",
      "status": "pending_verification"
    }
  }
}
```

**Error Responses:**
- **400 - Weak Password:**
```json
{
  "status": "error",
  "error": {
    "statusCode": 500,
    "status": "error"
  },
  "message": "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
}
```

- **409 - Duplicate Email:**
```json
{
  "status": "error",
  "error": {
    "statusCode": 409,
    "status": "error"
  },
  "message": "User with this email already exists."
}
```

### 2. Verify Registration
**POST** `/auth/verify-signup`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "user@example.com",
      "userType": "OWNER",
      "status": "ACTIVE"
    },
    "tokens": {
      "accessToken": "jwt_token_here",
      "accessTokenExpiry": "2024-01-01T12:00:00Z"
    }
  }
}
```

**🍪 Cookies Set:**
- `accessToken`: HTTP-only, secure cookie with JWT access token
- `refreshToken`: HTTP-only, secure cookie with JWT refresh token

**Note:** Tokens are automatically stored in secure cookies and included in all subsequent requests.

**Error Response (400):**
```json
{
  "status": "fail",
  "error": {
    "statusCode": 400,
    "isOperational": true,
    "status": "fail"
  },
  "message": "Invalid or expired OTP."
}
```

### 3. User Login
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "user@example.com",
      "userType": "OWNER",
      "status": "ACTIVE",
      "businessId": "uuid",
      "outletId": null
    },
    "tokens": {
      "accessToken": "jwt_token_here",
      "accessTokenExpiry": "2024-01-01T12:00:00Z"
    }
  }
}
```

**🍪 Cookies Set:**
- `accessToken`: HTTP-only, secure cookie with JWT access token
- `refreshToken`: HTTP-only, secure cookie with JWT refresh token

**Note:** Tokens are automatically stored in secure cookies and included in all subsequent requests.

**Error Responses:**
- **400 - Missing Credentials:**
```json
{
  "status": "fail",
  "error": {
    "statusCode": 400,
    "isOperational": true,
    "status": "fail"
  },
  "message": "Please provide email and password!"
}
```

- **401 - Invalid Credentials:**
```json
{
  "status": "fail",
  "error": {
    "statusCode": 401,
    "isOperational": true,
    "status": "fail"
  },
  "message": "Invalid credentials"
}
```

- **403 - Unverified Account:**
```json
{
  "status": "fail",
  "error": {
    "statusCode": 403,
    "isOperational": true,
    "status": "fail"
  },
  "message": "Account not verified. Please verify your email."
}
```

### 4. Get Current User
**GET** `/auth/me`
🔒 **Authentication Required**

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "user@example.com",
      "userType": "OWNER",
      "status": "ACTIVE",
      "businessId": "uuid",
      "outletId": null
    }
  }
}
```

### 5. User Logout
**POST** `/auth/logout`
🔒 **Authentication Required**

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

---

## User Management Endpoints (`/users`)
🔒 **All endpoints require authentication**

### 1. Create User
**POST** `/users`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "phone": "+1234567890",
  "userType": "STORE_EXECUTIVE",
  "businessId": "uuid",
  "outletId": "uuid"
}
```

### 2. Get All Users
**GET** `/users`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE

### 3. Get User by ID
**GET** `/users/:id`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE, SALES_REP

### 4. Update User
**PUT** `/users/:id`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE, SALES_REP

### 5. Delete User
**DELETE** `/users/:id`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE

---

## Business Management Endpoints (`/businesses`)
🔒 **All endpoints require authentication**

### 1. Create Business
**POST** `/businesses`
👥 **Authorization:** ADMIN only

### 2. Get All Businesses
**GET** `/businesses`
👥 **Authorization:** ADMIN only

### 3. Get Business by ID
**GET** `/businesses/:id`
👥 **Authorization:** ADMIN, OWNER

### 4. Update Business
**PUT** `/businesses/:id`
👥 **Authorization:** ADMIN, OWNER

### 5. Delete Business
**DELETE** `/businesses/:id`
👥 **Authorization:** ADMIN, OWNER

### 6. Subscribe Business
**POST** `/businesses/:id/subscribe`
👥 **Authorization:** OWNER

---

## Outlet Management Endpoints (`/outlets`)
🔒 **All endpoints require authentication**

### 1. Create Outlet
**POST** `/businesses/:businessId/outlets`
👥 **Authorization:** ADMIN, OWNER

### 2. Get Outlet by ID
**GET** `/outlets/:id`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE, SALES_REP

### 3. Get Outlets by Business
**GET** `/outlets/businesses/:businessId`
👥 **Authorization:** ADMIN, OWNER

### 4. Update Outlet
**PUT** `/outlets/:id`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE

### 5. Delete Outlet
**DELETE** `/outlets/:id`
👥 **Authorization:** ADMIN, OWNER

---

## Product Management Endpoints (`/products`)
🔒 **All endpoints require authentication**

### 1. Create Product
**POST** `/outlets/:outletId/products`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE

### 2. Get Product by ID
**GET** `/products/:id`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE, SALES_REP

### 3. Get All Products
**GET** `/products`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE, SALES_REP

### 4. Update Product
**PUT** `/products/:id`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE

### 5. Delete Product
**DELETE** `/products/:id`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE

---

## Inventory Management Endpoints (`/inventories`)
🔒 **All endpoints require authentication**

### 1. Record Inventory
**POST** `/outlets/:outletId/inventories`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE, SALES_REP

### 2. Get Inventory by ID
**GET** `/inventories/:id`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE, SALES_REP

### 3. Get All Inventories
**GET** `/inventories`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE, SALES_REP

### 4. Reconcile Inventory
**PUT** `/inventories/:id/reconcile`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE

---

## Sales Management Endpoints (`/sales`)
🔒 **All endpoints require authentication**

### 1. Record Sale
**POST** `/sales`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE, SALES_REP

### 2. Get Sale by ID
**GET** `/sales/:id`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE, SALES_REP

### 3. Get All Sales
**GET** `/sales`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE, SALES_REP

### 4. Update Sale Status
**PUT** `/sales/:id/status`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE

---

## Subscription Management Endpoints (`/subscriptions`)
🔒 **All endpoints require authentication**

### 1. Create Subscription Plan
**POST** `/subscriptions`
👥 **Authorization:** ADMIN only

### 2. Get Subscription by ID
**GET** `/subscriptions/:id`
👥 **Authorization:** ADMIN, OWNER

### 3. Get All Subscriptions
**GET** `/subscriptions`
👥 **Authorization:** ADMIN, OWNER

### 4. Update Subscription
**PUT** `/subscriptions/:id`
👥 **Authorization:** ADMIN only

### 5. Delete Subscription
**DELETE** `/subscriptions/:id`
👥 **Authorization:** ADMIN only

---

## Dashboard Endpoints (`/dashboard`)
🔒 **All endpoints require authentication**

### Owner Dashboard
👥 **Authorization:** OWNER, ADMIN

- **GET** `/dashboard/owner/sales/total` - Total sales for business
- **GET** `/dashboard/owner/amount/total` - Total revenue generated
- **GET** `/dashboard/owner/products/available` - Total available products worth
- **GET** `/dashboard/owner/sales/outlets-over-time` - Sales across outlets over time
- **GET** `/dashboard/owner/products/top-categories` - Top sold product categories
- **GET** `/dashboard/owner/outlets/top-performing` - Top performing outlets
- **GET** `/dashboard/owner/logs/recent` - Recent business logs

### Store Executive Dashboard
👥 **Authorization:** STORE_EXECUTIVE, OWNER, ADMIN

- **GET** `/dashboard/store-executive/sales/total` - Total outlet sales
- **GET** `/dashboard/store-executive/amount/total` - Total outlet revenue
- **GET** `/dashboard/store-executive/products/available` - Available outlet products
- **GET** `/dashboard/store-executive/sales/over-time` - Outlet sales over time
- **GET** `/dashboard/store-executive/products/top-categories` - Top outlet categories
- **GET** `/dashboard/store-executive/sales-reps/top-performing` - Top sales reps
- **GET** `/dashboard/store-executive/logs/recent` - Recent outlet logs

### Sales Rep Dashboard
👥 **Authorization:** SALES_REP, STORE_EXECUTIVE, OWNER, ADMIN

- **GET** `/dashboard/sales-rep/sales/total` - Personal total sales
- **GET** `/dashboard/sales-rep/amount/total` - Personal total revenue
- **GET** `/dashboard/sales-rep/products/available` - Available products for sales
- **GET** `/dashboard/sales-rep/performance/over-time` - Personal performance over time
- **GET** `/dashboard/sales-rep/products/top-categories` - Personal top categories
- **GET** `/dashboard/sales-rep/sales-reps/top-performing` - Peer performance comparison
- **GET** `/dashboard/sales-rep/logs/recent` - Personal activity logs

### Admin Dashboard
👥 **Authorization:** ADMIN only

- **GET** `/dashboard/admin/users/active-owners` - Count of active business owners
- **GET** `/dashboard/admin/revenue/total` - Total platform revenue
- **GET** `/dashboard/admin/users/active-total` - Total active users count
- **GET** `/dashboard/admin/revenue/chart-data` - Platform revenue chart data
- **GET** `/dashboard/admin/businesses/categories-pie-chart` - Business categories distribution
- **GET** `/dashboard/admin/businesses/recent-joined` - Recently joined businesses

---

## Logs Management Endpoints (`/logs`)
🔒 **All endpoints require authentication**

### 1. Get Logs
**GET** `/logs`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE, SALES_REP

---

## File Upload Endpoints (`/uploads`)
🔒 **All endpoints require authentication**

### 1. Upload Image
**POST** `/uploads/image`
👥 **Authorization:** ADMIN, OWNER, STORE_EXECUTIVE, SALES_REP
📎 **Content-Type:** `multipart/form-data`

**Request Body:**
```
Form Data:
- image: File (image file)
```

---

## Common Error Responses

### 401 - Authentication Required
```json
{
  "status": "fail",
  "error": {
    "statusCode": 401,
    "isOperational": true,
    "status": "fail"
  },
  "message": "You are not logged in! Please log in to get access."
}
```

### 403 - Insufficient Permissions
```json
{
  "status": "fail",
  "error": {
    "statusCode": 403,
    "isOperational": true,
    "status": "fail"
  },
  "message": "You don't have permission to access this resource"
}
```

### 404 - Route Not Found
```
Error
Cannot GET /api/v1/nonexistent
```

---

## User Roles & Permissions

### 🔴 ADMIN
- **Full system access**
- Manage all businesses, users, subscriptions
- View all dashboard data and logs
- Platform administration

### 🟠 OWNER
- **Business management**
- Manage own business and outlets
- Create/manage store executives and sales reps
- View business-wide analytics
- Subscribe to plans

### 🟡 STORE_EXECUTIVE
- **Outlet management**
- Manage specific outlet operations
- Handle products, inventory, sales for outlet
- Create/manage sales reps for outlet
- View outlet-specific analytics

### 🟢 SALES_REP
- **Sales operations**
- Record sales and manage inventory
- View products in assigned outlet
- View personal performance data
- Limited outlet data access

---

## Security Features

### 🔐 Authentication & Authorization
- JWT-based authentication with access/refresh tokens
- Role-based access control (RBAC)
- Secure HTTP-only cookies
- Token blacklisting on logout

### 🛡️ Data Protection
- Password complexity requirements
- OTP-based email verification
- Data encryption at rest (AES-256-GCM)
- Request rate limiting (Redis-based)

### 🚀 Performance & Monitoring
- Redis caching for improved response times
- Comprehensive request logging
- Error tracking and monitoring
- Database connection pooling

---

## Testing Results Summary

### ✅ Verified Endpoints
- `POST /auth/signup` - Registration with OTP
- `POST /auth/verify-signup` - OTP verification
- `POST /auth/login` - Authentication with proper error handling
- `GET /auth/me` - Protected endpoint access
- `POST /auth/logout` - Secure logout
- Protected endpoints return proper 401 errors
- Non-existent routes return 404 errors

### 📊 Performance Metrics
- **Authentication endpoints**: 200-400ms response time
- **Registration with OTP**: ~7000ms (includes email sending)
- **Protected endpoints**: ~5ms for auth failure (fast rejection)

### 🔧 Development Features
- Comprehensive error handling with stack traces
- CORS configuration for frontend integration
- Environment-based configuration
- Database migrations and seeding support

---

## API Integration Examples

### Frontend Authentication Flow
```javascript
// 1. Register user
const registerResponse = await fetch('/api/v1/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userData, businessData })
});

// 2. Verify with OTP
const verifyResponse = await fetch('/api/v1/auth/verify-signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, otp })
});

// 3. Login
const loginResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Include cookies
  body: JSON.stringify({ email, password })
});

// 4. Make authenticated requests
const userResponse = await fetch('/api/v1/auth/me', {
  credentials: 'include' // Include cookies
});
```

### Error Handling Pattern
```javascript
try {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (data.status === 'success') {
    // Handle success
    console.log('Login successful:', data.data.user);
  } else {
    // Handle API errors
    console.error('API Error:', data.message);
    switch (data.error.statusCode) {
      case 401:
        // Invalid credentials
        break;
      case 403:
        // Account not verified
        break;
      default:
        // Other errors
    }
  }
} catch (error) {
  // Handle network errors
  console.error('Network Error:', error);
}
```

---

*Last Updated: January 2024*
*ShopMaster Backend API v1.0*
