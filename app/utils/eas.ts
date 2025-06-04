import axios from "axios";
import type { Message } from "~/types/chat";
import { getFarcasterProfile } from "./farcaster";
import type { FarcasterProfile } from "~/types/farcaster";

export const CHAT_SCHEMA =
  "0x6641ef80bc4b45de061916e2df89b67fbd7cef462b7b9430825740c89721268f";

const GET_CHAT_ATTESTATIONS = `
  query GetChatAttestations($schemaId: String!) {
    attestations(
      where: {
        schemaId:  {
          equals: $schemaId
        } 
      }
      orderBy: {
        time: asc
      }
    ) {
      id
      recipient
      attester
      time
      expirationTime
      revocationTime
      data
      decodedDataJson
    }
  }
`;

const profiles: Record<number, FarcasterProfile> = {};

export async function fetchChatMessages() {
  const endpoint = "https://optimism.easscan.org/graphql";

  try {
    const response = await axios.post(
      endpoint,
      {
        query: GET_CHAT_ATTESTATIONS,
        variables: { schemaId: CHAT_SCHEMA },
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (response.data.errors && response.data.errors.length) {
      console.error("GraphQL errors:", response.data.errors);
      throw new Error("Error fetching attestations");
    }

    const messages: Message[] = [];

    for (const attestation of response.data.data.attestations) {
      const decodedData = JSON.parse(attestation.decodedDataJson);

      const fid = parseInt(
        decodedData.find((x: any) => x.name === "fid").value.value.hex,
        16
      );
      const message = decodedData.find((x: any) => x.name === "message").value
        .value;

      const profile = profiles[fid] ?? (await getFarcasterProfile(fid));
      profiles[fid] = profile;

      messages.push({
        id: attestation.id,
        content: message,
        sender: profile.displayName,
        pfpUrl: profile.pfpUrl,
        timestamp: new Date(attestation.time * 1000),
        attester: attestation.attester,
        attestationId: attestation.id,
      });
    }

    return messages;
  } catch (err) {
    console.error("Request failed:", err);
    throw err;
  }
}
