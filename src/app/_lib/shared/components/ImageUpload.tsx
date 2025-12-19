import { type ChangeEvent } from "react";
import { Label } from "../../ui/label";

export function ImageUpload({
  onChange,
  children,
}: {
  onChange: (files: FileList) => void;
  children: ({
    handleDrop,
    handleDragOver,
    handleFileChange,
  }: {
    handleDrop: (e: React.DragEvent) => void;
    handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  }) => React.ReactNode;
}) {
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files === null || files.length === 0) {
      return;
    }
    onChange(files);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) {
      return;
    }

    // Filter for image files only
    const imageFiles = Array.from(files).filter((file) =>
      file.type.includes("image/"),
    );

    if (imageFiles.length === 0) {
      return;
    }

    // Create a new FileList-like object
    const dt = new DataTransfer();
    imageFiles.forEach((file) => dt.items.add(file));
    onChange(dt.files);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  return children({ handleDragOver, handleDrop, handleFileChange });
}

export function Dropzone({
  handleDrop,
  handleDragOver,
  children,
}: {
  handleDrop: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="grid h-full place-items-center"
    >
      {children}
    </div>
  );
}

export function DropzoneContent({
  children,
  id,
}: {
  children: React.ReactNode;
  id: string;
}) {
  return (
    <Label
      htmlFor={id}
      className="grid h-full w-full cursor-pointer content-center justify-center gap-1 rounded border-2 border-dashed p-4 text-center text-accent-foreground backdrop-blur-sm  [grid-auto-rows:max-content]"
    >
      {children}
    </Label>
  );
}
