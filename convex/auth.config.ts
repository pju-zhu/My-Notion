import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: "https://popular-werewolf-65.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
