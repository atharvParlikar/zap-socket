export const createZapClient = ({ url }) => {
    const client = {};
    // Create methods for each event
    for (const eventName in {}) {
        client[eventName] = {
            send: ((input) => {
                console.log(`sending ${eventName} message:`, input);
                // Here you would handle the actual API call
                return Promise.resolve(undefined); // Placeholder return
            })
        };
    }
    return client;
};
