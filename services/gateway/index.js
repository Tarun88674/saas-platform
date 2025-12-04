const { ApolloServer } = require("@apollo/server");
const {
    ApolloGateway,
    IntrospectAndCompose,
    RemoteGraphQLDataSource,
} = require("@apollo/gateway");
const { startStandaloneServer } = require("@apollo/server/standalone");

class AuthenticatedDataSource extends RemoteGraphQLDataSource {
    willSendRequest({ request, context }) {
        console.log("➡️ Forwarding tenant to subgraph:", context.tenantId);

        if (context.tenantId) {
            request.http.headers.set("x-tenant-id", context.tenantId);
        }
    }
}

async function start() {
    const gateway = new ApolloGateway({
        supergraphSdl: new IntrospectAndCompose({
            subgraphs: [
                { name: "user", url: "http://localhost:4001" },
                { name: "tenant", url: "http://localhost:4002" }
            ]

        }),

        buildService({ url }) {
            return new AuthenticatedDataSource({ url });
        },
    });

    const server = new ApolloServer({
        gateway,
    });

    const { url } = await startStandaloneServer(server, {
        listen: { port: 4000 },

        context: async ({ req }) => {
            const tenantId = req.headers["x-tenant-id"];
            console.log("✅ Tenant received at Gateway:", tenantId);

            return {
                tenantId: tenantId || null,
            };
        },
    });

    console.log(`🚀 Gateway running at ${url}`);
}

start();
