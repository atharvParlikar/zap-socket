export const createClient = ({ url }) => {
    return new Proxy({}, {
        get(_, prop) {
            return {
                send: (input) => {
                    console.log("sending message: ", input);
                }
            };
        }
    });
};
