// const express = require("express");
// const rawApp = express();

// rawApp.use((req, res, next) => {
//   console.log("🛑 RAW HTTP HEADERS AT USER-SERVICE:", req.headers);
//   res.json({ ok: true, headers: req.headers });
// });

// rawApp.listen(4100, () => {
//   console.log("🧪 RAW HEADER DEBUG SERVER RUNNING ON 4100");
// });

require("dotenv").config();

const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { gql } = require("graphql-tag");
const { buildSubgraphSchema } = require("@apollo/subgraph");

const connectDB = require("./db");
const User = require("./models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ✅ Connect MongoDB
connectDB();

// ✅ GraphQL Schema
const typeDefs = gql`
  type User @key(fields: "id") {
    id: ID!
    email: String!
    name: String
    tenantId: ID!
    role: String!
    status: String!
  }

  type Query {
    users: [User!]!
    me: User
  }

  type Mutation {
    createUser(email: String!, name: String): User!

    createAdminUser(
      email: String!
      name: String!
      tenantId: ID!
    ): User!

    signup(
      email: String!
      password: String!
      name: String!
      tenantId: ID!
    ): String!

    login(
      email: String!
      password: String!
      tenantId: ID!
    ): String!
  }
`;

// ✅ Resolvers
const resolvers = {
  User: {
    __resolveReference(ref) {
      return User.findById(ref.id);
    }
  },

  Query: {
    users: async (_, __, { user }) => {
      console.log("✅ user in users resolver:", user);

      if (!user || !user.tenantId) {
        throw new Error("Unauthorized");
      }

      return User.find({ tenantId: user.tenantId });
    },

    me: async (_, __, { user }) => {
      if (!user || !user.id) {
        throw new Error("Unauthorized");
      }

      return User.findById(user.id);
    }
  },

  Mutation: {
    // ✅ ADMIN → Create Employee
    createUser: async (_, { email, name }, { user }) => {
      if (!user || !user.tenantId) {
        throw new Error("Unauthorized");
      }

      if (user.role !== "ADMIN") {
        throw new Error("Only admin can create users");
      }

      const hashedPassword = await bcrypt.hash("Default@123", 10);

      return User.create({
        email,
        name,
        tenantId: user.tenantId,
        role: "EMPLOYEE",
        password: hashedPassword
      });
    },

    // ✅ SYSTEM → Create Admin
    createAdminUser: async (_, { email, name, tenantId }) => {
      const plainPassword = "Admin@123";
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const admin = await User.create({
        email,
        name,
        tenantId,
        role: "ADMIN",
        password: hashedPassword
      });

      return admin;
    },

    // ✅ SIGNUP
    signup: async (_, { email, password, name, tenantId }) => {
      const existingUser = await User.findOne({ email, tenantId });
      if (existingUser) {
        throw new Error("User already exists in this tenant");
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        email,
        name,
        tenantId,
        password: hashedPassword,
        role: "EMPLOYEE"
      });

      const payload = {
        id: user._id,
        tenantId: user.tenantId,
        role: user.role
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "7d"
      });

      return token;
    },

    // ✅ LOGIN
    login: async (_, { email, password, tenantId }) => {
      const user = await User.findOne({ email, tenantId }).select("+password");

      if (!user) {
        throw new Error("Invalid email or tenant");
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new Error("Invalid password");
      }

      const payload = {
        id: user._id,
        tenantId: user.tenantId,
        role: user.role
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "7d"
      });

      return token;
    }
  }
};

// ✅ ✅ ✅ SINGLE SOURCE OF TRUTH FOR CONTEXT (JWT HEADERS)
// const server = new ApolloServer({
//   schema: buildSubgraphSchema({ typeDefs, resolvers }),
//   context: ({ req }) => {
//     console.log("✅ Headers at user-service:", req.headers);

//     return {
//       user: {
//         id: req.headers["x-user-id"],
//         tenantId: req.headers["x-tenant-id"],
//         role: req.headers["x-role"]
//       }
//     };
//   }
// });
const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers })
});
// ✅ ✅ ✅ NO SECOND CONTEXT — THIS WAS YOUR BUG
startStandaloneServer(server, {
  listen: { port: 4001 },
   context: ({ req }) => {
    console.log("✅ Headers at user-service:", req.headers);

    return {
      user: {
        id: req.headers["x-user-id"],
        tenantId: req.headers["x-tenant-id"],
        role: req.headers["x-role"]
      }
    };
  }
}).then(({ url }) => {
  console.log(`🚀 User Subgraph running at ${url}`);
});
