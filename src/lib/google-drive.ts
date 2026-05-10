export const DRIVE_FILE_NAME = "OpenArchFlow_Sync.json";
const DRIVE_MIME_TYPE = "application/json";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

export interface DriveFileMetadata {
  id: string;
  name: string;
  modifiedTime: string;
  size: string;
}

export class DriveApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "DriveApiError";
  }
}

async function assertOk(res: Response): Promise<void> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.error?.message ?? detail;
    } catch {
      // ignore parse errors
    }
    throw new DriveApiError(detail, res.status);
  }
}

export async function findSyncFile(
  accessToken: string,
): Promise<DriveFileMetadata | null> {
  const q = encodeURIComponent(
    `name='${DRIVE_FILE_NAME}' and trashed=false`,
  );
  const fields = encodeURIComponent("files(id,name,modifiedTime,size)");
  const res = await fetch(
    `${DRIVE_API}/files?q=${q}&fields=${fields}&spaces=drive`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  await assertOk(res);
  const body = await res.json();
  const files: DriveFileMetadata[] = body.files ?? [];
  return files[0] ?? null;
}

export async function getSyncFileMetadata(
  accessToken: string,
  fileId: string,
): Promise<DriveFileMetadata> {
  const fields = encodeURIComponent("id,name,modifiedTime,size");
  const res = await fetch(`${DRIVE_API}/files/${fileId}?fields=${fields}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  await assertOk(res);
  return res.json();
}

export async function downloadSyncFile(
  accessToken: string,
  fileId: string,
): Promise<string> {
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  await assertOk(res);
  return res.text();
}

export async function uploadSyncFile(
  accessToken: string,
  content: string,
  existingFileId: string | null,
): Promise<string> {
  const metadata = { name: DRIVE_FILE_NAME, mimeType: DRIVE_MIME_TYPE };
  const boundary = "openarchflow_boundary";
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${DRIVE_MIME_TYPE}`,
    "",
    content,
    `--${boundary}--`,
  ].join("\r\n");

  const url = existingFileId
    ? `${DRIVE_UPLOAD_API}/files/${existingFileId}?uploadType=multipart`
    : `${DRIVE_UPLOAD_API}/files?uploadType=multipart`;

  const res = await fetch(url, {
    method: existingFileId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  await assertOk(res);
  const result = await res.json();
  return result.id as string;
}
