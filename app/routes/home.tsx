import { useAccount } from "wagmi";
import type { Route } from "./+types/home";
import { Link } from "react-router";
import { SignInButton } from "@farcaster/auth-kit";
import { useFarcasterProfile } from "~/hooks/useFarcasterProfile";
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Farcaster Attestation Chat" },
    { name: "description", content: "Farcaster Attestation Chat Example" },
  ];
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const { profile, disconnect } = useFarcasterProfile();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-2xl md:text-4xl font-bold mb-8 text-center">
        Farcaster Attestation Chat
      </h1>

      <div className="mb-6">First, connect your wallet and farcaster</div>

      <div className="flex flex-col items-center mb-6">
        <div className="mb-4">
          <appkit-button />
        </div>
        <div className="rounded-lg">
          {profile ? (
            <div
              className="flex items-center gap-2 border-2 border-white rounded-lg p-2 px-5 hover:bg-white hover:text-black transition-colors duration-200 cursor-pointer"
              onClick={disconnect}
            >
              <img
                src={profile.pfpUrl}
                alt="Profile"
                className="rounded-full w-8 h-8"
              />
              <div>{profile.displayName}</div>
            </div>
          ) : (
            <SignInButton />
          )}
        </div>
      </div>

      <div className="mb-6">Then, start chatting</div>

      <Link to="/chat">
        <button
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!address || !isConnected || !profile}
        >
          Start Chat
        </button>
      </Link>
    </main>
  );
}
