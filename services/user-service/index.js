require("dotenv").config();
const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { gql } = require("graphql-tag");
const { buildSubgraphSchema } = require("@apollo/subgraph");

const connectDB = require("./db");
const User = require("./models/User");

// Connect MongoDB
connectDB();

// GraphQL Schema
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
      createAdminUser(email: String!, name: String!, tenantId: ID!): User!

  }
`;

const resolvers = {
  User: {
    __resolveReference(ref) {
      return User.findById(ref.id);
    }
  },

Query: {
  async users(_, __, context) {
    if (!context.tenantId) {
      throw new Error("Tenant ID required");
    }
    return User.find({ tenantId: context.tenantId });
  },

  async me(_, __, context) {
    if (!context.tenantId) {
      throw new Error("Tenant ID required");
    }
    return User.findOne({ tenantId: context.tenantId });
  }
},

Mutation: {
  async createUser(_, { email, name }, context) {
    if (!context.tenantId) {
      throw new Error("Tenant ID required");
    }

    const user = await User.create({
      email,
      name,
      tenantId: context.tenantId,
    });

    return user;
  },
  createAdminUser: async (_, { email, name, tenantId }) => {
  const admin = await User.create({
    email,
    name,
    tenantId,
    role: "ADMIN"
  });
  return admin;
}

},


};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers })
});

startStandaloneServer(server, {
  listen: { port: 4001 },
context: async ({ req }) => {
  const tenantId = req.headers["x-tenant-id"];

  console.log("✅ Tenant received at User Service:", tenantId);

  if (!tenantId) {
    return { tenantId: null, isIntrospection: true };
  }

  return { tenantId, isIntrospection: false };
}


}).then(({ url }) => {
  console.log(`🚀 User Subgraph running at ${url}`);
});
