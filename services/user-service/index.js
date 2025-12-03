// services/user-service/index.js

const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { gql } = require('graphql-tag');
const { buildSubgraphSchema } = require('@apollo/subgraph');

// 1) Schema
const typeDefs = gql`
  type User @key(fields: "id") {
    id: ID!
    email: String!
    name: String
    tenantId: ID!
  }

  type Query {
    users(tenantId: ID!): [User!]!
    me: User
  }

  type Mutation {
    createUser(email: String!, name: String, tenantId: ID!): User!
  }
`;

const users = [
  { id: "u1", email: "a@x.com", name: "Alpha", tenantId: "t1" },
  { id: "u2", email: "b@x.com", name: "Beta", tenantId: "t1" },
];

const resolvers = {
  User: {
    __resolveReference(ref) {
      return users.find((u) => u.id === ref.id);
    },
  },

  Query: {
    users(_, { tenantId }) {
      return users.filter((u) => u.tenantId === tenantId);
    },
    me() {
      return users[0];
    },
  },

  Mutation: {
    createUser(_, { email, name, tenantId }) {
      const user = {
        id: `u${users.length + 1}`,
        email,
        name,
        tenantId,
      };
      users.push(user);
      return user;
    },
  },
};

// 2) Create subgraph schema
const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

// 3) Standalone server
startStandaloneServer(server, {
  listen: { port: 4001 },
}).then(({ url }) => {
  console.log(`🚀 User Subgraph running at ${url}`);
});
