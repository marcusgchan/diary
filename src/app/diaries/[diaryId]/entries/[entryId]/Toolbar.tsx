import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { REDO_COMMAND, UNDO_COMMAND } from "lexical";
import { ChevronDown, Image as ImageIcon, Redo, Undo } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "~/app/_lib/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useEffect, useRef, useState } from "react";
import { Input } from "~/app/_lib/ui/input";
import { INSERT_IMAGE_COMMAND } from "./ImagePlugin";
import { api } from "~/trpc/TrpcProvider";
import { useParams } from "next/navigation";
import { useToast } from "~/app/_lib/ui/use-toast";
import * as ExifReader from "exifreader";
import type { RouterOutputs } from "~/server/trpc";

export function Toolbar() {
  const [editor] = useLexicalComposerContext();
  function undo() {
    editor.dispatchCommand(UNDO_COMMAND, undefined);
  }
  function redo() {
    editor.dispatchCommand(REDO_COMMAND, undefined);
  }
  return (
    <ul className="flex gap-1">
      <li>
        <button onClick={undo}>
          <Undo />
        </button>
      </li>
      <li>
        <button onClick={redo}>
          <Redo />
        </button>
      </li>
      <li aria-hidden="true">
        <Separator orientation="vertical" />
      </li>
      <li>
        <InsertDropdownMenu />
      </li>
    </ul>
  );
}

function InsertDropdownMenu() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const openDropdown = () => setIsDropdownOpen(true);
  const closeDropdown = () => setIsDropdownOpen(false);
  return (
    <DropdownMenu
      open={isDropdownOpen}
      modal={false}
      onOpenChange={(e) => setIsDropdownOpen(e)}
    >
      <DropdownMenuTrigger className="flex gap-1" onClick={openDropdown}>
        Insert
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <UploadImageDialog closeDropdown={closeDropdown} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

async function getImgSize(
  src: string,
): Promise<{ height: number; width: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const height = img.height;
      const width = img.width;
      resolve({ height, width });
    };
    img.onerror = (e) => {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      reject(e);
    };
    img.src = src;
  });
}

function UploadImageDialog({ closeDropdown }: { closeDropdown: () => void }) {
  const [editor] = useLexicalComposerContext();
  const { toast } = useToast();
  const params = useParams();
  const diaryId = params.diaryId as string;
  const entryId = params.diaryId as string;
  const [startPolling, setStartPolling] = useState(false);
  const [imageKey, setImageKey] = useState<string>();
  const [disableCancel, setDisableCancel] = useState(false);
  const fileRef = useRef<File>(undefined);
  const { data } = api.diary.getImageUploadStatus.useQuery(
    { key: imageKey },
    {
      enabled: startPolling,
      refetchInterval: 1000,
    },
  );
  const cancelUpload = api.diary.cancelImageUpload.useMutation();
  const confirmUpload = api.diary.confirmImageUpload.useMutation();
  const insertImageMetadata = api.diary.getPresignedUrl.useMutation();

  useEffect(() => {
    if (data) {
      setStartPolling(false);
      setDisableCancel(false);
    }
  }, [data]);

  function handleCancel() {
    if (imageKey === undefined) {
      return;
    }
    cancelUpload.mutate({
      key: imageKey,
    });
    fileRef.current = undefined;
  }
  async function handleConfirm() {
    if (imageKey === undefined || fileRef.current === undefined) {
      console.log("something went wrong with the image upload");
      return;
    }

    let width: number | undefined;
    let height: number | undefined;
    try {
      const dimensions = await getImgSize(`/api/image/${imageKey}`);
      width = dimensions.width;
      height = dimensions.height;
    } catch (_) {}

    if (width !== undefined && height !== undefined) {
      if (width > 200) {
        const aspectRatio = width / height;
        height = 200 * (1 / aspectRatio);
        width = 200;
      }
    }

    confirmUpload.mutate({ key: imageKey });
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
      src: `/api/image/${imageKey}`,
      imageKey: imageKey,
      maxHeight: height,
      height: height,
      width: width,
      maxWidth: width,
      altText: "",
    });
  }
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisableCancel(true);
    const files = e.target.files;
    if (!files) {
      setDisableCancel(false);
      return;
    }
    const file = files.item(0);
    if (!file) {
      setDisableCancel(false);
      return;
    }
    fileRef.current = file;

    let tags: ExifReader.ExpandedTags | undefined;
    try {
      tags = await ExifReader.load(file, { expanded: true });
      console.log("tags");
    } catch (e) {
      console.log(e);
    }

    const gps = {
      lat: tags?.gps?.Latitude,
      lon: tags?.gps?.Longitude,
    };
    const dateTimeTaken = tags?.exif?.DateTimeOriginal?.description;

    let data: RouterOutputs["diary"]["getPresignedUrl"];
    try {
      data = await insertImageMetadata.mutateAsync({
        diaryId: Number(params.diaryId),
        entryId: Number(params.entryId),
        gps,
        dateTimeTaken,
        imageMetadata: {
          name: file.name,
          type: file.type,
          size: file.size,
        },
      });
    } catch (_) {
      toast({ title: "Unable to upload image" });
      setDisableCancel(false);
      return;
    }

    const formData = new FormData();
    Object.entries(data.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append("file", file);

    setImageKey(`${data.userId}/${diaryId}/${entryId}/${data.filename}`);
    setStartPolling(true);

    fetch(data.url, {
      method: "POST",
      body: formData,
    })
      .then((res) => {
        if (!res.ok) {
          throw Error("unable to upload file");
        }
        const key = data.fields.key;
        if (!key) {
          throw Error("unable to upload file");
        }
      })
      .catch((_) => {
        toast({ title: "Unable to upload image" });
        setStartPolling(false);
        setDisableCancel(false);
        setImageKey(undefined);
      });
  };
  return (
    <AlertDialog
      onOpenChange={(e) => {
        if (!e) {
          closeDropdown();
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <DropdownMenuItem
          className="flex w-full items-center gap-1"
          onSelect={(e) => {
            e.preventDefault();
          }}
        >
          <ImageIcon />
          Image
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Upload an Image</AlertDialogTitle>
          <AlertDialogDescription>
            <label className="flex items-center">
              <Input type="file" onChange={handleFileChange} />
            </label>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={disableCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={startPolling || !imageKey || confirmUpload.isPending}
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
