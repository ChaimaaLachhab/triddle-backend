# Triddle Form Builder - Backend

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21.2-blue)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22.0-lightgrey)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-Private-red)](#)

## Overview

Triddle Form Builder is a powerful form creation and management platform built with modern web technologies. This repository contains the backend codebase for the Triddle application, providing API endpoints for form creation, response collection, analytics, and user management.

## Features

- **Authentication & Authorization**: Complete JWT-based authentication system
- **Form Management**: Create, customize, publish and archive forms
- **Form Responses**: Collect and manage form submissions
- **File Uploads**: Cloudinary integration for file storage
- **Analytics**: Track form performance and user engagement
- **Data Export**: Export form responses in CSV/JSON formats
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Logging**: Comprehensive logging with Winston

## Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express](https://expressjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: [JWT](https://jwt.io/)
- **Documentation**: [Swagger/OpenAPI](https://swagger.io/)
- **File Storage**: [Cloudinary](https://cloudinary.com/)
- **Logging**: [Winston](https://github.com/winstonjs/winston)
- **Email**: [Nodemailer](https://nodemailer.com/)
- **Security**: [Helmet](https://helmetjs.github.io/), [XSS-Clean](https://github.com/jsonmaur/xss-clean), [HPP](https://github.com/analog-nico/hpp)

## Project Structure

```
triddle-backend/
├── prisma/                # Prisma schema and migrations
│   ├── migrations/        # Database migrations
│   ├── schema.prisma      # Prisma schema definition
│   └── seed.js            # Database seeding script
├── src/
│   ├── config/            # Configuration files
│   │   ├── cloudinary.js  # Cloudinary configuration
│   │   ├── db.js          # Database configuration
│   │   ├── index.js       # Config exports
│   │   └── logger.js      # Winston logger setup
│   ├── controllers/       # Request handlers
│   │   ├── analytics.controller.js   # Analytics endpoints
│   │   ├── auth.controller.js        # Authentication endpoints
│   │   ├── forms.controller.js       # Form management endpoints
│   │   ├── responses.controller.js   # Form responses endpoints
│   │   └── users.controller.js       # User management endpoints
│   ├── middleware/        # Express middleware
│   │   ├── auth.js        # Authentication middleware
│   │   └── error.js       # Error handling middleware
│   ├── routes/            # API routes
│   │   ├── auth.routes.js # Authentication routes
│   │   ├── forms.routes.js # Form management routes
│   │   ├── responses.routes.js # Response management routes
│   │   └── users.routes.js # User management routes
│   ├── utils/             # Utility functions
│   │   ├── asyncHandler.js # Async error handling
│   │   ├── email.js       # Email sending utilities
│   │   ├── errorResponse.js # Error response formatter
│   │   └── fileUpload.js  # File upload utilities
│   └── index.js           # Entry point
├── logs/                  # Application logs
└── configuration files...
```

## Getting Started

### Prerequisites

- Node.js (v18.x or higher recommended)
- PostgreSQL (v12 or higher)
- Cloudinary account (for file storage)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd triddle-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the project root with the following variables:
   ```env
   # Server configuration
   NODE_ENV=development
   PORT=5000

   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/triddle

   # JWT
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRE=1d
   JWT_COOKIE_EXPIRE=1

   # File upload
   FILE_UPLOAD_PATH=./public/uploads
   MAX_FILE_SIZE=5000000

   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # SMTP
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_EMAIL=your_email@example.com
   SMTP_PASSWORD=your_email_password
   FROM_EMAIL=noreply@triddle.com
   FROM_NAME=Triddle Form Builder

   # CORS
   CORS_ORIGINS=http://localhost:3000
   ```

4. Initialize the database:
   ```bash
   npx prisma migrate dev --name init
   ```

5. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

6. Seed the database (optional):
   ```bash
   npm run seed
   ```

### Development

Run the development server:
```bash
npm run dev
```

The server will start on port 5000 (or the port specified in your .env file).
API documentation will be available at http://localhost:5000/api-docs

### Building for Production

```bash
npm run build
```

### Starting Production Server

```bash
npm start
```

## Available Scripts

- `npm run dev` - Start development server with auto-reload
- `npm start` - Start production server
- `npm run build` - Build for production (generate Prisma client and deploy migrations)
- `npm run migrate` - Run Prisma migrations
- `npm run generate` - Generate Prisma client
- `npm run studio` - Open Prisma Studio to view/edit data
- `npm run seed` - Seed the database with initial data

## API Documentation

The API is documented using Swagger/OpenAPI. Once the server is running, you can access the interactive documentation at:

```
http://localhost:5000/api-docs
```

### API Routes Overview

- **Authentication**
  - `POST /auth/register` - Register a new user
  - `POST /auth/login` - Login a user
  - `GET /auth/logout` - Logout a user
  - `GET /auth/me` - Get current user profile
  - `PUT /auth/updatedetails` - Update user details
  - `PUT /auth/updatepassword` - Update user password
  - `POST /auth/forgotpassword` - Request password reset
  - `PUT /auth/resetpassword/:resettoken` - Reset password

- **Forms**
  - `GET /forms` - Get all forms
  - `POST /forms` - Create a new form
  - `GET /forms/:id` - Get a specific form
  - `PUT /forms/:id` - Update a form
  - `DELETE /forms/:id` - Delete a form
  - `PUT /forms/:id/publish` - Publish a form
  - `PUT /forms/:id/archive` - Archive a form
  - `POST /forms/:id/upload` - Upload a file for a form
  - `GET /forms/:formId/responses` - Get all responses for a form
  - `POST /forms/:formId/responses` - Submit a form response

- **Analytics**
  - `GET /forms/:formId/analytics` - Get form analytics
  - `GET /forms/:formId/analytics/fields` - Get field analytics
  - `GET /forms/:formId/analytics/visits` - Get visit analytics
  - `GET /forms/:formId/export` - Export form responses

- **Responses**
  - `GET /responses/:id` - Get a specific response
  - `DELETE /responses/:id` - Delete a response

- **Users** (Admin only)
  - `GET /users` - Get all users
  - `POST /users` - Create a user
  - `GET /users/:id` - Get a specific user
  - `PUT /users/:id` - Update a user
  - `DELETE /users/:id` - Delete a user

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment (development, production) | development |
| PORT | Server port | 5000 |
| DATABASE_URL | PostgreSQL connection URL | - |
| JWT_SECRET | Secret for JWT signing | - |
| JWT_EXPIRE | JWT token expiration | 1d |
| JWT_COOKIE_EXPIRE | JWT cookie expiration (days) | 1 |
| FILE_UPLOAD_PATH | Path for temporary file storage | ./public/uploads |
| MAX_FILE_SIZE | Maximum file upload size (bytes) | 5000000 |
| CLOUDINARY_* | Cloudinary configuration | - |
| SMTP_* | SMTP server configuration | - |
| FROM_EMAIL | Email sender address | - |
| FROM_NAME | Email sender name | - |
| CORS_ORIGINS | Allowed CORS origins | - |

## Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- XSS protection
- HTTP Parameter Pollution protection
- Security headers with Helmet
- CORS configuration

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Submit a pull request

© 2025 Triddle. All rights reserved.
