# Users Module - Complete Documentation

## Overview
The Users Module provides comprehensive user management functionality for the StitchHub application. It implements full CRUD operations with role-based access control, password management, and statistics tracking.

## Features

### Backend Features (NestJS)
- ✅ **List all users** (OWNER only)
- ✅ **Get user by ID** (OWNER or self)
- ✅ **Get current user profile** (any authenticated user)
- ✅ **Create new user** (OWNER only)
- ✅ **Update user details** (OWNER or self, excluding role change for non-OWNER)
- ✅ **Change password** (OWNER or self)
- ✅ **Delete user** (OWNER only)
- ✅ **Get user statistics** (OWNER only)

### Frontend Features (React)
- ✅ **Admin Dashboard** - Users Management page with CRUD operations
- ✅ **Worker Profile** - View and edit own profile, change password
- ✅ **User Statistics** - Display total users and breakdown by role
- ✅ **Responsive Design** - Mobile-friendly interface

## Backend API Endpoints

### Base URL: `http://localhost:3000/api/users`

#### 1. Get All Users
```
GET /api/users
Authorization: Bearer <token>
Role Required: OWNER
```

**Response:**
```json
[
  {
    "id": 1,
    "email": "admin@stitchhub.com",
    "name": "Admin User",
    "role": "OWNER",
    "createdAt": "2025-12-30T10:00:00Z"
  }
]
```

#### 2. Get User Statistics
```
GET /api/users/stats
Authorization: Bearer <token>
Role Required: OWNER
```

**Response:**
```json
{
  "totalUsers": 10,
  "byRole": [
    { "role": "OWNER", "count": 1 },
    { "role": "WORKER", "count": 9 }
  ]
}
```

#### 3. Get Current User Profile
```
GET /api/users/me
Authorization: Bearer <token>
Role Required: Any authenticated user
```

**Response:** Same as individual user object above

#### 4. Get User by ID
```
GET /api/users/:id
Authorization: Bearer <token>
Role Required: OWNER or self
```

#### 5. Create New User
```
POST /api/users
Authorization: Bearer <token>
Role Required: OWNER
Content-Type: application/json

{
  "email": "worker@stitchhub.com",
  "name": "John Worker",
  "password": "securePassword123",
  "role": "WORKER"
}
```

**Response:** (201 Created)
```json
{
  "id": 11,
  "email": "worker@stitchhub.com",
  "name": "John Worker",
  "role": "WORKER",
  "createdAt": "2025-12-30T10:00:00Z"
}
```

#### 6. Update User Details
```
PUT /api/users/:id
Authorization: Bearer <token>
Role Required: OWNER or self
Content-Type: application/json

{
  "email": "newemail@stitchhub.com",
  "name": "Updated Name",
  "role": "OWNER"  // Only OWNER can change this
}
```

#### 7. Change Password
```
POST /api/users/:id/change-password
Authorization: Bearer <token>
Role Required: OWNER or self
Content-Type: application/json

{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```

**Response:**
```json
{
  "message": "Password changed successfully"
}
```

#### 8. Delete User
```
DELETE /api/users/:id
Authorization: Bearer <token>
Role Required: OWNER
```

**Response:**
```json
{
  "message": "User with ID 11 has been deleted"
}
```

## Frontend API Service

Located in: `src/api/usersAPI.js`

```javascript
import { usersAPI } from './api/usersAPI';

// Get all users
usersAPI.getAllUsers()

// Get current user
usersAPI.getCurrentUser()

// Get user by ID
usersAPI.getUserById(1)

// Create user
usersAPI.createUser({ email, name, password, role })

// Update user
usersAPI.updateUser(userId, { email, name, role })

// Change password
usersAPI.changePassword(userId, { currentPassword, newPassword })

// Delete user
usersAPI.deleteUser(userId)

// Get statistics
usersAPI.getStatistics()
```

## Frontend Pages

### 1. Admin Users Management (`src/pages/Admin/Workers.jsx`)
- View all users in a table format
- Create new users with modal form
- Edit existing users
- Delete users with confirmation
- Display user statistics (total users, by role count)
- Full CRUD operations

### 2. Worker Profile (`src/pages/Worker/MyProfile.jsx`)
- View own profile information
- Edit name and email
- Change password
- Display membership date
- Real-time profile sync from server

## Data Models

### User DTO (Backend)
```typescript
// CreateUserDto
{
  email: string (valid email format)
  name: string (2-100 characters)
  password: string (min 6 characters)
  role: 'OWNER' | 'WORKER'
}

// UpdateUserDto
{
  email?: string
  name?: string
  role?: 'OWNER' | 'WORKER'
}

// ChangePasswordDto
{
  currentPassword: string
  newPassword: string (min 6 characters)
}

// UserResponseDto
{
  id: number
  email: string
  name: string
  role: 'OWNER' | 'WORKER'
  createdAt: Date
}
```

## Database Schema (Prisma)

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  name      String
  role      Role     @default(WORKER)
  works     Work[]
  createdAt DateTime @default(now())
}

enum Role {
  OWNER
  WORKER
}
```

## Security Features

1. **Password Hashing** - Uses bcrypt (10 rounds) for secure password storage
2. **JWT Authentication** - Token-based authentication for all protected endpoints
3. **Role-Based Access Control** - Granular permissions based on user role
4. **Authorization Checks** - Users can only access/modify their own data unless they're OWNER
5. **Input Validation** - Class-validator DTOs validate all inputs
6. **Password Requirements** - Minimum 6 characters enforced

## Error Handling

All endpoints return appropriate HTTP status codes and error messages:

- **400 Bad Request** - Validation errors
- **401 Unauthorized** - Missing or invalid token
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - User not found
- **409 Conflict** - Email already exists
- **500 Internal Server Error** - Server error

## Testing the Users Module

### Setup Instructions

1. **Install dependencies:**
```bash
cd d:/server/stitchhub-server
npm install
```

2. **Set up environment variables:**
Create `.env` file in `stitchhub-server/`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/stitchhub"
JWT_SECRET="your-secret-key-here"
```

3. **Run Prisma migrations:**
```bash
npx prisma migrate dev --name init
```

4. **Start the backend:**
```bash
npm run start:dev
```

5. **Start the frontend:**
```bash
cd d:/server/stitchhub
npm install
npm run dev
```

### Manual Testing (with cURL)

1. **Login first to get token:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@stitchhub.com","password":"password123"}'
```

2. **Use token in subsequent requests:**
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer <your-token>"
```

3. **Create a new user:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "email":"newworker@stitchhub.com",
    "name":"New Worker",
    "password":"secure123",
    "role":"WORKER"
  }'
```

## File Structure

### Backend
```
src/users/
├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   ├── change-password.dto.ts
│   └── user-response.dto.ts
├── users.controller.ts
├── users.service.ts
└── users.module.ts
```

### Frontend
```
src/
├── api/
│   └── usersAPI.js
└── pages/
    ├── Admin/
    │   └── Workers.jsx (Users Management)
    └── Worker/
        └── MyProfile.jsx
```

## Best Practices Implemented

1. **Separation of Concerns** - Service, Controller, DTO layers
2. **Input Validation** - Comprehensive DTOs with decorators
3. **Error Handling** - Proper exception throwing and HTTP status codes
4. **Security** - Role-based access control and authorization checks
5. **Type Safety** - Full TypeScript implementation
6. **RESTful Design** - Standard HTTP methods and status codes
7. **Documentation** - Inline comments and docstrings
8. **Responsive UI** - Mobile-first CSS design with Tailwind

## Future Enhancements

- [ ] User search and filtering
- [ ] Pagination for user list
- [ ] User deactivation (soft delete)
- [ ] Two-factor authentication
- [ ] User activity logs
- [ ] Bulk user import (CSV)
- [ ] Email notifications for new accounts
- [ ] User roles customization

## Troubleshooting

### Issue: 401 Unauthorized
- Ensure token is included in Authorization header
- Token may have expired, login again

### Issue: 403 Forbidden
- User doesn't have required role
- Check if OWNER role is assigned to the user

### Issue: Email already exists
- Email must be unique
- Use a different email or delete the existing user first

### Issue: Validation errors
- Check all required fields are provided
- Verify data types match the DTOs
- Email must be in valid format

## Contact & Support
For questions about the users module, refer to the inline code documentation or check the test files.
