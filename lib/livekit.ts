import "server-only";
import {
  AccessToken,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
} from "livekit-server-sdk";

const apiKey = () => process.env.LIVEKIT_API_KEY!;
const apiSecret = () => process.env.LIVEKIT_API_SECRET!;
const httpUrl = () => process.env.NEXT_PUBLIC_LIVEKIT_URL!.replace(/^ws/, "http");

export async function createToken(opts: {
  room: string;
  identity: string;
  name: string;
  canPublish: boolean;
}) {
  const at = new AccessToken(apiKey(), apiSecret(), {
    identity: opts.identity,
    name: opts.name,
    ttl: "6h",
  });
  at.addGrant({
    room: opts.room,
    roomJoin: true,
    canSubscribe: true,
    canPublish: opts.canPublish,
    canPublishData: false,
  });
  return at.toJwt();
}

/** Supabase Storage speaks S3 — Settings → Storage → S3 Connection → create access key */
export function recordingConfigured() {
  return Boolean(process.env.RECORDING_S3_ACCESS_KEY && process.env.RECORDING_S3_SECRET);
}

export async function startRecording(room: string, majlisId: string) {
  if (!recordingConfigured()) return null;
  const filepath = `${majlisId}/${Date.now()}.mp4`;
  const output = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath,
    output: {
      case: "s3",
      value: new S3Upload({
        accessKey: process.env.RECORDING_S3_ACCESS_KEY!,
        secret: process.env.RECORDING_S3_SECRET!,
        endpoint: process.env.RECORDING_S3_ENDPOINT ?? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/s3`,
        region: process.env.RECORDING_S3_REGION ?? "ap-northeast-2",
        bucket: "recordings",
        forcePathStyle: true,
      }),
    },
  });
  const egress = new EgressClient(httpUrl(), apiKey(), apiSecret());
  const info = await egress.startRoomCompositeEgress(room, output, { layout: "speaker" });
  return {
    egressId: info.egressId,
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recordings/${filepath}`,
  };
}

export async function stopRecording(egressId: string) {
  const egress = new EgressClient(httpUrl(), apiKey(), apiSecret());
  try {
    await egress.stopEgress(egressId);
  } catch {
    // already stopped (room emptied) — fine
  }
}
