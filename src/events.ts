import { z } from "zod";

export type EventMap = {
  [event: string]: {
    input: z.ZodTypeAny | null;
    process: (input: any) => any;
  };
};


export const createEvents = <T extends EventMap>(events: T) => {
  return events;
}
