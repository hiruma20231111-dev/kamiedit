"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { downloadFile } from "@/lib/google/drive";
import { ImageIcon } from "lucide-react";

/** Drive 上の画像(fileId)を取得して表示する。drive.file はトークン必須。 */
export function DriveImage({
  fileId,
  alt,
  className,
}: {
  fileId: string;
  alt?: string;
  className?: string;
}) {
  const token = useStore((s) => s.token);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;
    setError(false);
    setUrl(null);
    if (!token) return;
    downloadFile(token, fileId)
      .then((blob) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => !revoked && setError(true));
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, fileId]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className ?? ""}`}>
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }
  if (!url) {
    return <div className={`animate-pulse bg-muted ${className ?? ""}`} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt ?? ""} className={className} />;
}
