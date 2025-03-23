import { z } from "zod";
export const createZapEvent = (eventObj) => {
    if ("input" in eventObj) {
        return eventObj;
    }
    return {
        input: z.void(),
        process: eventObj.process
    };
};
