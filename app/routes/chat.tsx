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

// EAS Contract Configuration
const EAS_CONTRACT_ADDRESS = "0x4200000000000000000000000000000000000021"; // Optimism EAS contract

export default function Chat() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { profile, disconnect } = useFarcasterProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAddingNewMessage, setIsAddingNewMessage] = useState(false);

  const walletClient = useWalletClient();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    fetchChatMessages().then((messages) => {
      setMessages(messages);
      console.log(messages);
    });
  }, []);

  useEffect(() => {
    if (!address || !isConnected || !profile) {
      navigate("/");
    }
  }, [address, isConnected, profile, navigate]);

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

  const loadMoreMessages = async () => {
    if (isLoading) return;

    setIsLoading(true);
    console.log("Loading more messages...");
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const dummyMessages: Message[] = [
      {
        id: Date.now().toString(),
        content: "This is a dummy message from the past",
        sender: "Other User",
        pfpUrl: "/dummy-avatar.jpg",
        attester: "0x1234567890123456789012345678901234567890",
        timestamp: new Date(Date.now() - 1000000),
      },
      {
        id: (Date.now() + 1).toString(),
        content: "Another dummy message",
        sender: "You",
        pfpUrl: "/dummy-avatar.jpg",
        attester: "0x1234567890123456789012345678901234567890",
        timestamp: new Date(Date.now() - 900000),
      },
    ];

    setMessages((prev) => [...dummyMessages, ...prev]);
    setIsLoading(false);
  };

  const handleAttestMessage = async (message: string) => {
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
        sender: "You",
        attester: address as `0x${string}`,
        timestamp: new Date(),
        pfpUrl: profile?.pfpUrl ?? "/dummy-avatar.jpg",
      };

      // const otherUserMessage: Message = {
      //   id: (Date.now() + 1).toString(),
      //   content: `Response to: ${message}`,
      //   sender: "Other User",
      //   timestamp: new Date(),
      // };

      setIsAddingNewMessage(true);
      setMessages((prev) => [...prev, userMessage]);
      setNewMessage("");

      await publicClient?.waitForTransactionReceipt({
        hash,
        pollingInterval: 1000,
      });

      console.log("EAS Attestation created");
    } catch (error) {
      console.error("Error creating attestation:", error);
      // You might want to show an error message to the user here
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

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
        {isLoading && (
          <div className="text-center text-gray-400 mb-4">
            Loading more messages...
          </div>
        )}
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-end gap-2 ${
                message.sender === "You" ? "justify-end" : "justify-start"
              }`}
            >
              {message.sender === "You" && (
                <div className="text-xs text-gray-400">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-lg p-2 px-3 ${
                  message.sender === "You"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-100"
                }`}
              >
                <div className="font-semibold text-sm mb-0.5">
                  {message.sender}
                </div>
                <div className="text-sm">{message.content}</div>
                {message.attestationId && (
                  <div className="text-xs mt-1 opacity-70">Attested ✓</div>
                )}
              </div>
              {message.sender !== "You" && (
                <div className="text-xs text-gray-400">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
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
            className="flex-1 p-2 bg-gray-700 text-gray-100 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Send
          </button>
        </div>
      </form>
    </main>
  );
}
