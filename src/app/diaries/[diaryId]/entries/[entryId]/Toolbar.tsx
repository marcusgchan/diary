import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { REDO_COMMAND, UNDO_COMMAND } from "lexical";
import { ChevronDown, Image as ImageIcon, Redo, Undo } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "~/app/_components/ui/separator";
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
import { useState } from "react";
import { Input } from "~/app/_components/ui/input";
import { INSERT_IMAGE_COMMAND } from "./ImagePlugin";
import { api } from "~/trpc/client";
import { useParams } from "next/navigation";
import { useToast } from "~/app/_components/ui/use-toast";

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

function UploadImageDialog({ closeDropdown }: { closeDropdown: () => void }) {
  const [uploadedFile, setUploadedFile] = useState<File>();
  const [src, setSrc] = useState<string>();
  const [editor] = useLexicalComposerContext();
  const { toast } = useToast();
  const params = useParams();
  const saveImageMetadata = api.diary.saveImageMetadata.useMutation();
  const queryutils = api.useContext();

  async function handleConfirm() {
    if (!uploadedFile || !src) return;

    const data = await queryutils.diary.getPresignedUrl.fetch({
      diaryId: Number(params.diaryId),
      entryId: Number(params.entryId),
      imageMetadata: {
        name: uploadedFile.name,
        type: uploadedFile.type,
        size: uploadedFile.size,
      },
    });

    if (!uploadedFile) {
      return;
    }

    const formData = new FormData();
    Object.entries(data.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append("file", uploadedFile);

    fetch(data.url, {
      method: "POST",
      body: formData,
    })
      .then(async (res) => {
        if (!res.ok) {
          throw Error("unable to upload file");
        }
        const key = data.fields.key;
        if (!key) {
          throw Error("unable to upload file");
        }
        await saveImageMetadata.mutateAsync({
          key,
          entryId: Number(params.entryId),
        });
        toast({ title: "Successfully uploaded image" });
        const imageKey = `${data.userId}/${params.diaryId}/${params.entryId}/${data.filename}`;
        editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
          src: `/api/image/${imageKey}`,
          imageKey: imageKey,
          altText: "",
        });
      })
      .catch((_) => {
        toast({ title: "Unable to upload image" });
      });
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const file = files.item(0);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result;
      if (!src || typeof src !== "string") return;
      setUploadedFile(file);
      setSrc(src);
    };
    reader.readAsDataURL(file);
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
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
