require("dotenv").config();
const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { gql } = require("graphql-tag");
const { buildSubgraphSchema } = require("@apollo/subgraph");

const connectDB = require("./db");
const Tenant = require("./models/Tenant");

connectDB();

// GraphQL Schema
const typeDefs = gql`
  type Tenant @key(fields: "id") {
    id: ID!
    name: String!
    domain: String
    status: String!
  }

  type Query {
    tenants: [Tenant!]!
  }

  type Mutation {
    createTenant(name: String!, domain: String): Tenant!
  }
`;

const resolvers = {
  Tenant: {
    __resolveReference(ref) {
      return Tenant.findById(ref.id);
    }
  },

  Query: {
    tenants: () => Tenant.find()
  },

  Mutation: {
    createTenant: async (_, { name, domain }) => {
      const tenant = await Tenant.create({ name, domain });
      return tenant;
    }
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers })
});

startStandaloneServer(server, { listen: { port: 4002 } }).then(({ url }) => {
  console.log(`🚀 Tenant Subgraph running at ${url}`);
});
