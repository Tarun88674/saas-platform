const jwt = require("jsonwebtoken");
require("dotenv").config();

const { ApolloServer } = require("@apollo/server");
const {
  ApolloGateway,
  IntrospectAndCompose,
  RemoteGraphQLDataSource,
} = require("@apollo/gateway");
const { startStandaloneServer } = require("@apollo/server/standalone");


// ✅ AUTHENTICATED DATASOURCE (THIS FORWARDS HEADERS)
// class AuthenticatedDataSource extends RemoteGraphQLDataSource {
//   willSendRequest({ request, context }) {
//     console.log("➡️ Gateway forwarding user:", context.user);

//     // ⚠️ SAFETY: ensure request.http exists
//     if (!request.http) {
//       request.http = { headers: new Map() };
//     }

//     if (context.user) {
//       request.http.headers.set("x-user-id", context.user.id);
//       request.http.headers.set("x-tenant-id", context.user.tenantId);
//       request.http.headers.set("x-role", context.user.role);
//     }

//     console.log("➡️ Final outgoing headers:", {
//       "x-user-id": request.http.headers.get("x-user-id"),
//       "x-tenant-id": request.http.headers.get("x-tenant-id"),
//       "x-role": request.http.headers.get("x-role"),
//     });
//   }
// }
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    // ✅ Ignore introspection / system calls
    if (!context || !context.user) return;

    console.log("➡️ Gateway forwarding user:", context.user);

    // ✅ HARD GUARANTEE: ensure headers object always exists
    if (!request.headers && request.http?.headers) {
      request.headers = request.http.headers;
    }

    if (!request.headers) {
      request.headers = new Map();
    }

    // ✅ SAFE HEADER INJECTION
    request.headers.set("x-user-id", String(context.user.id));
    request.headers.set("x-tenant-id", String(context.user.tenantId));
    request.headers.set("x-role", String(context.user.role));
  }
}

async function start() {
  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        { name: "user", url: "http://localhost:4001" },
        { name: "tenant", url: "http://localhost:4002" },
      ],
    }),

    // ✅ CRITICAL: Attach authenticated datasource ONLY to user service
    buildService({ name, url }) {
      console.log("🟡 Gateway building service:", name);

      if (name === "user") {
        console.log("✅ Using AuthenticatedDataSource for USER service");
        return new AuthenticatedDataSource({ url });
      }

      return new RemoteGraphQLDataSource({ url });
    },
  });

  const server = new ApolloServer({
    gateway,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },

    // ✅ SINGLE SOURCE OF TRUTH FOR AUTH CONTEXT
    context: async ({ req }) => {
      const authHeader = req.headers.authorization;

      console.log("✅ Incoming request headers at Gateway:", req.headers);

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.log("❌ No Authorization header");
        return { user: null };
      }

      const token = authHeader.replace("Bearer ", "");

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("✅ Decoded JWT at Gateway:", decoded);

        return { user: decoded };
      } catch (err) {
        console.log("❌ JWT verification failed:", err.message);
        throw new Error("Invalid or expired token");
      }
    },
  });

  console.log(`🚀 Gateway running at ${url}`);
}

start();
