import { useState, useEffect, useRef } from "react";
import {
  useAccount,
  useWalletClient,
  usePublicClient,
  useWriteContract,
} from "wagmi";
import { Link, useNavigate } from "react-router";
import { SignInButton } from "@farcaster/auth-kit";
import { useFarcasterProfile } from "~/hooks/useFarcasterProfile";
import { farcasterAttest } from "@farcaster-attestation/sdk";
import EASABI from "~/abi/EASABI";
import { encodeAbiParameters, parseAbiParameters } from "viem";
import { CHAT_SCHEMA, fetchChatMessages } from "~/utils/eas";
import type { Message } from "~/types/chat";
import { useInterval } from "usehooks-ts";

// EAS Contract Configuration
const EAS_CONTRACT_ADDRESS = "0x4200000000000000000000000000000000000021"; // Optimism EAS contract

export default function Chat() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { profile, disconnect } = useFarcasterProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAddingNewMessage, setIsAddingNewMessage] = useState(false);
  const [isWaitingForMessage, setIsWaitingForMessage] = useState(false);

  const walletClient = useWalletClient();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    if (!address || !isConnected || !profile) {
      navigate("/");
    }
  }, [address, isConnected, profile, navigate]);

  useInterval(() => {
    const loadMessages = async () => {
      try {
        const newMessages = await fetchChatMessages();
        if (isWaitingForMessage) {
          const currLen = messages.filter(
            (m) => m.attester === address && Boolean(m.attestationId)
          ).length;
          const newLen = newMessages.filter(
            (m) => m.attester === address && Boolean(m.attestationId)
          ).length;
          if (newLen > currLen) {
            setIsWaitingForMessage(false);
            setMessages(newMessages);
          }
        } else {
          setMessages(newMessages);
        }

        console.log(newMessages);
      } catch (error) {
        console.error("Error loading messages:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, 2000);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isAddingNewMessage) {
      scrollToBottom();
      setIsAddingNewMessage(false);
    }
  }, [messages, isAddingNewMessage]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const { scrollTop } = messagesContainerRef.current;
    if (scrollTop === 0) {
      // Disable for now
      // loadMoreMessages();
    }
  };

  const handleAttestMessage = async (message: string) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // First, attest with Farcaster
      await farcasterAttest({
        fid: BigInt(profile?.fid ?? 0),
        walletAddress: address,
        walletClient: walletClient as any,
        publicClient: publicClient as any,
        onVerificationAttesting: () => {
          console.log("Attestation verification on Optimism...");
        },
      });

      // Then, create EAS attestation
      const encodedData = encodeAbiParameters(
        parseAbiParameters("uint256 fid,string message"),
        [BigInt(profile?.fid ?? 0), message]
      );

      const attestationData = {
        recipient: address as `0x${string}`,
        expirationTime: 0n,
        revocable: true,
        refUID:
          "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        data: encodedData,
        value: 0n,
      };

      const hash = await writeContractAsync({
        address: EAS_CONTRACT_ADDRESS as `0x${string}`,
        abi: EASABI,
        functionName: "attest",
        args: [
          {
            schema: CHAT_SCHEMA,
            data: attestationData,
          },
        ],
      });

      const userMessage: Message = {
        id: Date.now().toString(),
        content: message,
        sender: profile?.displayName ?? "You",
        attester: address as `0x${string}`,
        timestamp: new Date(),
        pfpUrl: profile?.pfpUrl ?? "/dummy-avatar.jpg",
      };

      setIsAddingNewMessage(true);
      setMessages((prev) => [...prev, userMessage]);
      setNewMessage("");

      setIsWaitingForMessage(true);

      await publicClient?.waitForTransactionReceipt({
        hash,
        pollingInterval: 1000,
      });

      console.log("EAS Attestation created");
    } catch (error) {
      console.error("Error creating attestation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSubmitting) return;

    // Attest the message
    handleAttestMessage(newMessage);
  };

  return (
    <main className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-white hover:text-gray-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold text-white">Chat</h1>
          <div className="relative">
            <button
              onClick={() => setIsProfileModalOpen(!isProfileModalOpen)}
              className="flex items-center gap-2"
            >
              {profile && (
                <img
                  src={profile.pfpUrl}
                  alt="Profile"
                  className="rounded-full w-8 h-8 hover:cursor-pointer"
                />
              )}
            </button>

            {/* Profile Modal */}
            {isProfileModalOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <div className="">
                      <appkit-button balance="hide" />
                    </div>
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
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 p-4 overflow-y-auto"
        onScroll={handleScroll}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${
                  message.attester === address ? "justify-end" : "justify-start"
                } ${!message.attestationId ? "opacity-50" : ""}`}
              >
                {message.attester === address && (
                  <div className="text-xs text-gray-400 flex flex-col items-end">
                    {message.attestationId && (
                      <a
                        href={`https://optimism.easscan.org/attestation/view/${message.attestationId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 mt-1 flex items-center gap-1"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                        <span>View on EAS</span>
                      </a>
                    )}
                    <div>{message.timestamp.toLocaleDateString()}</div>
                    <div>{message.timestamp.toLocaleTimeString()}</div>
                  </div>
                )}
                {message.attester !== address && (
                  <img
                    src={message.pfpUrl}
                    alt="Profile"
                    className="rounded-full w-8 h-8"
                  />
                )}
                <div
                  className={`max-w-[70%] rounded-lg p-2 px-3 ${
                    message.attester === address
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-100"
                  }`}
                >
                  <div className="font-semibold text-sm mb-0.5">
                    {message.sender}
                  </div>
                  <div className="text-sm">{message.content}</div>
                </div>
                {message.attester === address && (
                  <img
                    src={message.pfpUrl}
                    alt="Profile"
                    className="rounded-full w-8 h-8"
                  />
                )}
                {message.attester !== address && (
                  <div className="text-xs text-gray-400 flex flex-col">
                    <div>{message.timestamp.toLocaleDateString()}</div>
                    <div>{message.timestamp.toLocaleTimeString()}</div>
                    {message.attestationId && (
                      <a
                        href={`https://optimism.easscan.org/attestation/view/${message.attestationId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 mt-1 flex items-center gap-1"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                        <span>View on EAS</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={handleSendMessage}
        className="p-4 bg-gray-800 border-t border-gray-700"
      >
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 bg-gray-700 text-gray-100 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 disabled:opacity-50"
            disabled={isSubmitting || isLoading}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isSubmitting || isLoading || !newMessage.trim()}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Sending...</span>
              </>
            ) : (
              "Send"
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
