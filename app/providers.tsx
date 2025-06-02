import { AuthKitProvider, useProfile } from "@farcaster/auth-kit";
import { createAppKit } from "@reown/appkit/react";

import { WagmiProvider } from "wagmi";
import { optimism } from "@reown/appkit/networks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { FarcasterProfile } from "./types/farcaster";
import { createContext, useEffect, useState } from "react";
import { FarcasterProfileProvider } from "./hooks/useFarcasterProfile";

const queryClient = new QueryClient();

const projectId = "84ae9c084581a3b379c0e705b920dc26";

const metadata = {
  name: "Dev",
  description: "AppKit Example",
  url: "https://reown.com/appkit", // origin must match your domain & subdomain
  icons: ["https://assets.reown.com/reown-profile-pic.png"],
};

const networks = [optimism] as any;

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
});

// 5. Create modal
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
  },
});

const farcasterConfig = {
  rpcUrl: "https://mainnet.optimism.io",
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AuthKitProvider config={farcasterConfig}>
          <FarcasterProfileProvider>{children}</FarcasterProfileProvider>
        </AuthKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
