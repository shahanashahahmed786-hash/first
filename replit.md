# RealEstate Pro

## Overview

RealEstate Pro is a full-stack real estate application built with React, Express.js, and PostgreSQL. The platform allows users to browse, search, and manage property listings while providing administrative capabilities for property and user management. The application features a modern UI with comprehensive authentication, role-based access control, and real-time data management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and responsive design
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Framework**: Express.js with TypeScript for RESTful API endpoints
- **Authentication**: Passport.js with local strategy using session-based authentication
- **Security**: Helmet for security headers, rate limiting, and CORS protection
- **File Upload**: Multer middleware for property image uploads with validation
- **Session Storage**: PostgreSQL-backed session store using connect-pg-simple

### Database Design
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL with Neon serverless hosting
- **Schema**: Users, properties, logs, and contacts tables with UUID primary keys
- **Features**: Role-based access (user/admin), property status tracking, audit logging

### Authentication & Authorization
- **Strategy**: Session-based authentication with secure password hashing using scrypt
- **Roles**: User and admin roles with protected routes and middleware
- **Email Verification**: Nodemailer integration for user email verification
- **Security**: CSRF protection, secure sessions, and input validation

### API Structure
- **Pattern**: RESTful endpoints with consistent error handling
- **Validation**: Zod schemas for request/response validation
- **Filtering**: Advanced property search with multiple filter criteria
- **File Handling**: Image upload endpoints with size and type restrictions
- **Admin APIs**: Separate endpoints for user management and system logs

## External Dependencies

### Core Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Email Service**: Gmail SMTP for transactional emails (verification, contact forms)
- **File Storage**: Local file system for property images with Express static serving

### UI Component Libraries
- **Radix UI**: Accessible component primitives for complex UI elements
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component system with Tailwind integration

### Development Tools
- **Replit Integration**: Custom vite plugins for Replit development environment
- **TypeScript**: Full type safety across frontend and backend with shared schemas
- **ESBuild**: Fast bundling for production builds
- **Drizzle Kit**: Database migration and schema management tools