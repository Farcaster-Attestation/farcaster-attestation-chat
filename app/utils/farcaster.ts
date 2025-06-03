import axios from "axios";
import type { FarcasterProfile } from "~/types/farcaster";

export async function getFarcasterProfile(
  fid: number
): Promise<FarcasterProfile> {
  const response = await axios.get(
    `https://hub.pinata.cloud/v1/userDataByFid?fid=${fid}`
  );

  const pfpUrl =
    response.data.messages.find(
      (message: any) => message.data.userDataBody.type == "USER_DATA_TYPE_PFP"
    )?.data.userDataBody.value ?? "/dummy-avatar.jpg";

  const username =
    response.data.messages.find(
      (message: any) =>
        message.data.userDataBody.type == "USER_DATA_TYPE_USERNAME"
    )?.data.userDataBody.value ?? "";

  const displayName =
    response.data.messages.find(
      (message: any) =>
        message.data.userDataBody.type == "USER_DATA_TYPE_DISPLAY"
    )?.data.userDataBody.value ?? username;

  return {
    fid,
    pfpUrl,
    username,
    displayName,
    bio: "",
  };
}
