import { type ChangeEvent } from "react";

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

