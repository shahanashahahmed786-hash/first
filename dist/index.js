var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express3 from "express";

// server/routes.ts
import express from "express";
import { createServer } from "http";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  contacts: () => contacts,
  insertContactSchema: () => insertContactSchema,
  insertLogSchema: () => insertLogSchema,
  insertPropertySchema: () => insertPropertySchema,
  insertUserSchema: () => insertUserSchema,
  logs: () => logs,
  logsRelations: () => logsRelations,
  properties: () => properties,
  propertiesRelations: () => propertiesRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { sql } from "drizzle-orm";
import { pgTable, text, boolean, timestamp, integer, decimal, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  isVerified: boolean("is_verified").default(false),
  role: text("role").default("user"),
  // user or admin
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  lastLogin: timestamp("last_login")
});
var properties = pgTable("properties", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  propertyType: text("property_type").notNull(),
  // house, apartment, condo, commercial
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  sqft: integer("sqft"),
  lotSize: text("lot_size"),
  yearBuilt: integer("year_built"),
  features: text("features").array().default(sql`'{}'::text[]`),
  images: text("images").array().default(sql`'{}'::text[]`),
  status: text("status").default("for_sale"),
  // for_sale, for_rent, sold, rented
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`)
});
var logs = pgTable("logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id"),
  action: text("action").notNull(),
  details: text("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").default(sql`CURRENT_TIMESTAMP`)
});
var contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`)
});
var usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  logs: many(logs)
}));
var propertiesRelations = relations(properties, ({ one }) => ({
  createdBy: one(users, {
    fields: [properties.createdBy],
    references: [users.id]
  })
}));
var logsRelations = relations(logs, ({ one }) => ({
  user: one(users, {
    fields: [logs.userId],
    references: [users.id]
  })
}));
var insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  password: true
});
var insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true
});
var insertLogSchema = createInsertSchema(logs).omit({
  id: true,
  timestamp: true
});
var insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc, and, ilike, or } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
var PostgresSessionStore = connectPg(session);
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async updateUserLastLogin(id) {
    await db.update(users).set({ lastLogin: /* @__PURE__ */ new Date() }).where(eq(users.id, id));
  }
  async verifyUser(id) {
    await db.update(users).set({ isVerified: true }).where(eq(users.id, id));
  }
  async getProperties(filters) {
    let query = db.select().from(properties).where(eq(properties.isActive, true));
    if (filters) {
      const conditions = [eq(properties.isActive, true)];
      if (filters.propertyType) {
        conditions.push(eq(properties.propertyType, filters.propertyType));
      }
      if (filters.status) {
        conditions.push(eq(properties.status, filters.status));
      }
      if (filters.city) {
        conditions.push(ilike(properties.city, `%${filters.city}%`));
      }
      if (filters.search) {
        conditions.push(
          or(
            ilike(properties.title, `%${filters.search}%`),
            ilike(properties.description, `%${filters.search}%`),
            ilike(properties.address, `%${filters.search}%`),
            ilike(properties.city, `%${filters.search}%`)
          )
        );
      }
      query = db.select().from(properties).where(and(...conditions));
    }
    return await query.orderBy(desc(properties.createdAt));
  }
  async getProperty(id) {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property || void 0;
  }
  async createProperty(property) {
    const [newProperty] = await db.insert(properties).values(property).returning();
    return newProperty;
  }
  async updateProperty(id, property) {
    const [updatedProperty] = await db.update(properties).set({ ...property, updatedAt: /* @__PURE__ */ new Date() }).where(eq(properties.id, id)).returning();
    return updatedProperty;
  }
  async deleteProperty(id) {
    await db.update(properties).set({ isActive: false }).where(eq(properties.id, id));
  }
  async createLog(log2) {
    const [newLog] = await db.insert(logs).values(log2).returning();
    return newLog;
  }
  async getUserLogs(userId) {
    return await db.select().from(logs).where(eq(logs.userId, userId)).orderBy(desc(logs.timestamp));
  }
  async getAllLogs() {
    return await db.select().from(logs).orderBy(desc(logs.timestamp));
  }
  async createContact(contact) {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }
  async getContacts() {
    return await db.select().from(contacts).orderBy(desc(contacts.createdAt));
  }
  async getAllUsers() {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }
  async deactivateUser(id) {
    await this.createLog({
      userId: id,
      action: "USER_DEACTIVATED",
      details: "User account deactivated by admin"
    });
  }
};
var storage = new DatabaseStorage();

// server/services/email.ts
import nodemailer from "nodemailer";
var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER || process.env.EMAIL_USER,
    pass: process.env.GMAIL_PASS || process.env.EMAIL_PASS
  }
});
async function sendVerificationEmail(email, userId) {
  try {
    const verificationUrl = `${process.env.REPLIT_DOMAINS?.split(",")[0] || "http://localhost:5000"}/api/verify-email/${userId}`;
    const mailOptions = {
      from: process.env.GMAIL_USER || process.env.EMAIL_USER,
      to: email,
      subject: "Verify Your Email - RealEstate Pro",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Welcome to RealEstate Pro!</h2>
          <p>Thank you for registering with us. Please click the button below to verify your email address:</p>
          <a href="${verificationUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verify Email</a>
          <p>If the button doesn't work, you can copy and paste this link:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>If you didn't create an account, please ignore this email.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">RealEstate Pro Team</p>
        </div>
      `
    };
    await transporter.sendMail(mailOptions);
    console.log("Verification email sent to:", email);
  } catch (error) {
    console.error("Failed to send verification email:", error);
  }
}
async function sendContactEmail(contact) {
  try {
    const mailOptions = {
      from: process.env.GMAIL_USER || process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || process.env.GMAIL_USER || process.env.EMAIL_USER,
      subject: `Contact Form: ${contact.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">New Contact Form Submission</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p><strong>Name:</strong> ${contact.firstName} ${contact.lastName}</p>
            <p><strong>Email:</strong> ${contact.email}</p>
            ${contact.phone ? `<p><strong>Phone:</strong> ${contact.phone}</p>` : ""}
            <p><strong>Subject:</strong> ${contact.subject}</p>
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${contact.message}</p>
          </div>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">RealEstate Pro Contact System</p>
        </div>
      `
    };
    await transporter.sendMail(mailOptions);
    console.log("Contact email sent");
  } catch (error) {
    console.error("Failed to send contact email:", error);
    throw error;
  }
}

// server/auth.ts
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "realestate-pro-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1e3
      // 24 hours
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false);
        }
        await storage.updateUserLastLogin(user.id);
        await storage.createLog({
          userId: user.id,
          action: "USER_LOGIN",
          details: "User logged in successfully"
        });
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        name,
        email,
        password: hashedPassword
      });
      await storage.createLog({
        userId: user.id,
        action: "USER_REGISTER",
        details: "User registered successfully",
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      });
      sendVerificationEmail(email, user.id).catch(console.error);
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({ ...user, password: void 0 });
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      req.login(user, (err2) => {
        if (err2) return next(err2);
        res.status(200).json({ ...user, password: void 0 });
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    if (req.user) {
      storage.createLog({
        userId: req.user.id,
        action: "USER_LOGOUT",
        details: "User logged out"
      }).catch(console.error);
    }
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.sendStatus(401);
    }
    res.json({ ...req.user, password: void 0 });
  });
  app2.get("/api/verify-email/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.verifyUser(userId);
      res.redirect("/?verified=true");
    } catch (error) {
      res.redirect("/?verified=false");
    }
  });
}

// server/middleware/security.ts
import helmet from "helmet";
import rateLimit from "express-rate-limit";
function setupSecurity(app2) {
  app2.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://replit.com"],
        connectSrc: ["'self'"]
      }
    }
  }));
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    // 15 minutes
    max: 100,
    // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later."
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    // 15 minutes
    max: 5,
    // limit each IP to 5 requests per windowMs for auth routes
    message: "Too many authentication attempts, please try again later."
  });
  app2.use(generalLimiter);
  app2.use("/api/register", authLimiter);
  app2.use("/api/login", authLimiter);
}

// server/middleware/upload.ts
import multer from "multer";
import path from "path";
import fs from "fs";
import { promisify as promisify2 } from "util";
var mkdir = promisify2(fs.mkdir);
var uploadsDir = path.join(process.cwd(), "uploads");
mkdir(uploadsDir, { recursive: true }).catch(console.error);
var storage2 = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(uploadsDir, "properties");
    await mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});
var fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};
var upload = multer({
  storage: storage2,
  limits: {
    fileSize: 5 * 1024 * 1024,
    // 5MB limit
    files: 10
    // Maximum 10 files
  },
  fileFilter
});

// server/routes.ts
import compression from "compression";
import path2 from "path";
import { z } from "zod";
function registerRoutes(app2) {
  app2.use(compression());
  setupSecurity(app2);
  setupAuth(app2);
  app2.use("/uploads", (req, res, next) => {
    next();
  });
  app2.use("/uploads", express.static(path2.join(process.cwd(), "uploads")));
  app2.get("/api/properties", async (req, res) => {
    try {
      const filters = {
        propertyType: req.query.propertyType,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : void 0,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : void 0,
        bedrooms: req.query.bedrooms ? Number(req.query.bedrooms) : void 0,
        city: req.query.city,
        status: req.query.status,
        search: req.query.search
      };
      const properties2 = await storage.getProperties(filters);
      res.json(properties2);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });
  app2.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });
  app2.post("/api/properties", requireAuth, requireAdmin, upload.array("images", 10), async (req, res) => {
    try {
      const propertyData = insertPropertySchema.parse({
        ...req.body,
        price: Number(req.body.price),
        bedrooms: req.body.bedrooms ? Number(req.body.bedrooms) : null,
        bathrooms: req.body.bathrooms ? Number(req.body.bathrooms) : null,
        sqft: req.body.sqft ? Number(req.body.sqft) : null,
        yearBuilt: req.body.yearBuilt ? Number(req.body.yearBuilt) : null,
        features: req.body.features ? JSON.parse(req.body.features) : [],
        createdBy: req.user.id
      });
      const images = req.files?.map(
        (file) => `/uploads/properties/${file.filename}`
      ) || [];
      const property = await storage.createProperty({
        ...propertyData,
        images
      });
      await storage.createLog({
        userId: req.user.id,
        action: "PROPERTY_CREATED",
        details: `Created property: ${property.title}`
      });
      res.status(201).json(property);
    } catch (error) {
      console.error("Error creating property:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid property data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create property" });
    }
  });
  app2.put("/api/properties/:id", requireAuth, requireAdmin, upload.array("images", 10), async (req, res) => {
    try {
      const propertyData = {
        ...req.body,
        price: req.body.price ? Number(req.body.price) : void 0,
        bedrooms: req.body.bedrooms ? Number(req.body.bedrooms) : void 0,
        bathrooms: req.body.bathrooms ? Number(req.body.bathrooms) : void 0,
        sqft: req.body.sqft ? Number(req.body.sqft) : void 0,
        yearBuilt: req.body.yearBuilt ? Number(req.body.yearBuilt) : void 0,
        features: req.body.features ? JSON.parse(req.body.features) : void 0
      };
      const newImages = req.files?.map(
        (file) => `/uploads/properties/${file.filename}`
      ) || [];
      if (newImages.length > 0) {
        propertyData.images = newImages;
      }
      const property = await storage.updateProperty(req.params.id, propertyData);
      await storage.createLog({
        userId: req.user.id,
        action: "PROPERTY_UPDATED",
        details: `Updated property: ${property.title}`
      });
      res.json(property);
    } catch (error) {
      console.error("Error updating property:", error);
      res.status(500).json({ message: "Failed to update property" });
    }
  });
  app2.delete("/api/properties/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteProperty(req.params.id);
      await storage.createLog({
        userId: req.user.id,
        action: "PROPERTY_DELETED",
        details: `Deleted property with ID: ${req.params.id}`
      });
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting property:", error);
      res.status(500).json({ message: "Failed to delete property" });
    }
  });
  app2.post("/api/contact", async (req, res) => {
    try {
      const contactData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(contactData);
      await sendContactEmail(contactData);
      res.status(201).json({ message: "Contact form submitted successfully" });
    } catch (error) {
      console.error("Error processing contact form:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid form data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to process contact form" });
    }
  });
  app2.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      res.json(users2.map((user) => ({ ...user, password: void 0 })));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app2.get("/api/admin/logs", requireAuth, requireAdmin, async (req, res) => {
    try {
      const logs2 = await storage.getAllLogs();
      res.json(logs2);
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });
  app2.get("/api/admin/contacts", requireAuth, requireAdmin, async (req, res) => {
    try {
      const contacts2 = await storage.getContacts();
      res.json(contacts2);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });
  app2.post("/api/admin/users/:id/deactivate", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deactivateUser(req.params.id);
      await storage.createLog({
        userId: req.user.id,
        action: "USER_DEACTIVATED",
        details: `Admin deactivated user: ${req.params.id}`
      });
      res.json({ message: "User deactivated successfully" });
    } catch (error) {
      console.error("Error deactivating user:", error);
      res.status(500).json({ message: "Failed to deactivate user" });
    }
  });
  app2.get("/sitemap.xml", (req, res) => {
    res.type("application/xml");
    res.sendFile(path2.join(process.cwd(), "public", "sitemap.xml"));
  });
  app2.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    res.sendFile(path2.join(process.cwd(), "public", "robots.txt"));
  });
  const httpServer = createServer(app2);
  return httpServer;
}
function requireAuth(req, res, next) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}
function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// server/vite.ts
import express2 from "express";
import fs2 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path3 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path3.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
