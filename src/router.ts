import { z } from "zod";
import { createZapEvent } from "./events";
import { createZapClient } from "./client";

const events = {
  message: createZapEvent({
    input: z.string(),
    process: (input) => input.toUpperCase()
  }),
  ping: createZapEvent({
    process: () => 12,
  })
}

const zap = createZapClient<typeof events>({ url: "" });
