import { useProfile } from "@farcaster/auth-kit";
import { useState, useEffect, createContext, useContext } from "react";
import type { FarcasterProfile } from "~/types/farcaster";

export const FarcasterProfileContext = createContext<{
  profile: FarcasterProfile | null;
  disconnect: () => void;
}>({
  profile: null,
  disconnect: () => {},
});

export function useFarcasterProfile() {
  return useContext(FarcasterProfileContext);
}

export function FarcasterProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [farcasterProfile, setFarcasterProfile] =
    useState<FarcasterProfile | null>(null);

  const { profile } = useProfile();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const farcasterProfile = window.localStorage.getItem(
        "FarcasterAttestationChat:FarcasterProfile"
      );
      if (farcasterProfile) {
        setFarcasterProfile(JSON.parse(farcasterProfile));
      }
    }
  }, []);

  useEffect(() => {
    if (profile && profile.fid) {
      const farcasterProfile: FarcasterProfile = {
        username: profile.username ?? "",
        fid: profile.fid ?? 0,
        bio: profile.bio ?? "",
        displayName: profile.displayName ?? "",
        pfpUrl: profile.pfpUrl ?? "",
      };
      setFarcasterProfile(farcasterProfile);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "FarcasterAttestationChat:FarcasterProfile",
          JSON.stringify(farcasterProfile)
        );
      }
    }
  }, [profile]);

  return (
    <FarcasterProfileContext.Provider
      value={{
        profile: farcasterProfile,
        disconnect: () => {
          setFarcasterProfile(null);
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(
              "FarcasterAttestationChat:FarcasterProfile"
            );
          }
        },
      }}
    >
      {children}
    </FarcasterProfileContext.Provider>
  );
}
