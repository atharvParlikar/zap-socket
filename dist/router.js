import { z } from 'zod';
const router = {
    getUser: {
        input: z.object({ id: z.number() }),
        resolve: (input) => {
            return { id: input.id, name: "Atharv" };
        },
    },
};
function createClient() {
    return new Proxy({}, {
        get(_, prop) {
            return {
                query: (input) => {
                    console.log("Fake call with", input);
                },
            };
        },
    });
}
// Pass only the type, NOT the actual router
const client = createClient();
client.getUser.query({
    id: 12
});
