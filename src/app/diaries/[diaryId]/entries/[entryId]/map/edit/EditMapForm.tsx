"use client";

import { Button } from "~/app/_components/ui/button";
import { Input } from "~/app/_components/ui/input";
import { Label } from "~/app/_components/ui/label";
import { Textarea } from "~/app/_components/ui/textarea";
import {
  SubmitHandler,
  useFieldArray,
  useForm,
  FormProvider,
  useFormContext,
} from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { cn } from "~/app/_utils/cx";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "./SortableItem";
import { api } from "~/trpc/TrpcProvider";

const formSchema = z.object({
  posts: z
    .object({
      id: z.number(),
      title: z.string(),
      imageMetadata: z.object({
        name: z.string(),
        size: z.number().max(8920, { message: "Max image size is 8.9MB" }),
        mimetype: z.string().min(1, { message: "Image Required" }),
      }),
      description: z.string(),
    })
    .array(),
});

type FormValues = z.infer<typeof formSchema>;

let formId = 0;

function getId(): number {
  console.log("incrementing", formId);
  return formId++;
}

type UploadStatus =
  | { type: "loading"; key: string }
  | { type: "error"; key: string }
  | { type: "empty" }
  | { type: "uploaded"; url: string; key: string };

type IdToUploadStatus = {
  [id: string]: UploadStatus;
};

const posts = [
  {
    id: getId(),
    title: "",
    imageMetadata: {
      name: "",
      size: 0,
      mimetype: "",
    },
    description: "",
  },
];

type HandleImageUploadCallabck = (
  index: number,
  id: number,
  file: File | null,
) => void;

export function EditMapForm({
  diaryId,
  entryId,
}: {
  diaryId: number;
  entryId: number;
}) {
  const formMethods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      posts: posts,
    },
  });
  const { control, register, setValue, resetField, handleSubmit } = formMethods;
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "posts",
    keyName: "_id",
  });

  const e = Object.fromEntries(
    fields.map((field) => [field.id, { type: "empty" as const }]),
  );

  const [imgUploadStatuses, setImgUploadStatuses] =
    useState<IdToUploadStatus>(e);

  // Store id to key mapping for uploaded images
  const imageKeyToIdRef = useRef<Map<string, number>>(new Map());

  const { data: imageUploadStatuses } =
    api.diary.getMultipleImageUploadStatus.useQuery(
      {
        keyToIdMap: imageKeyToIdRef.current,
        entryId: entryId,
        diaryId: diaryId,
        keys: Array.from(imageKeyToIdRef.current.keys()),
      },
      {
        retryDelay: 3,
        enabled: !!Object.keys(imgUploadStatuses).length,
      },
    );

  useEffect(() => {
    if (imageUploadStatuses === undefined) {
      return;
    }

    setImgUploadStatuses((statuses) => {
      const newStatuses = Array.from(Object.entries(statuses)).map(
        ([id, value]) => {
          if (
            value.type === "empty" ||
            value.type === "uploaded" ||
            value.type === "error"
          ) {
            return [id, value] as const;
          }

          const newStatus = imageUploadStatuses.get(Number(id));
          if (newStatus === undefined) {
            return [id, value] as const;
          }

          return [id, { ...value, type: "uploaded" }] as const;
        },
      );
      return new Map(newStatuses);
    });
  }, [imageUploadStatuses]);

  console.log(imgUploadStatuses);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function addPost() {
    const id = getId();
    append({
      id: id,
      title: "",
      description: "",
      imageMetadata: {
        mimetype: "",
        size: 0,
        name: "",
      },
    });
    setImgUploadStatuses((prev) => ({ ...prev, [id]: { type: "empty" } }));
  }

  async function removePost(index: number, id: number) {
    remove(index);
    setImgUploadStatuses((prev) => {
      const { [id]: _, ...other } = prev;
      return other;
    });
    imageKeyToIdRef.current.delete(
      (imgUploadStatuses[id] as { key: string }).key,
    );
    // delete from s3
  }

  const utils = api.useUtils();
  const handleImageUpload: HandleImageUploadCallabck = async (
    index: number,
    id: number,
    file: File | null,
  ) => {
    if (file) {
      const metadata = {
        name: file.name,
        size: file.size,
        mimetype: file.type,
      };
      const data = await utils.diary.createPresignedPostUrl.fetch({
        diaryId,
        entryId,
        imageMetadata: metadata,
      });

      const formData = new FormData();
      for (const [key, value] of Object.entries(data.fields)) {
        formData.set(key, value);
      }
      formData.set("file", file);

      setValue(`posts.${index}.imageMetadata`, metadata, {
        shouldValidate: true,
      });
      setImgUploadStatuses((prev) => {
        return { ...prev, [id]: { type: "loading" } };
      });
      imageKeyToIdRef.current.set(data.key, id);

      try {
        const res = await fetch(data.url);
        if (!res.ok) {
          throw new Error("Unable to upload image");
        }
        // increment ref which will start poll
      } catch (e) {
        // unable to upload
        setImgUploadStatuses((prev) => {
          return { ...prev, [id]: { type: "error" } };
        });
      }
      return;
    }
    resetField(`posts.${index}`);
    setImgUploadStatuses((prev) => {
      return { ...prev, [id]: { type: "empty" } };
    });
    imageKeyToIdRef.current.delete(
      (imgUploadStatuses[id] as { key: string }).key,
    );
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((field) => field.id == active.id);
      const newIndex = fields.findIndex((field) => field.id == over.id);
      move(oldIndex, newIndex);
    }
  }

  const createPostMutation = api.diary.createPost.useMutation();
  const onSubmit: SubmitHandler<FormValues> = (data) => {
    createPostMutation.mutate(data.posts);
  };

  return (
    <FormProvider {...formMethods}>
      <form
        className="grid max-w-lg grid-cols-[1fr_auto] gap-y-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields}
            strategy={verticalListSortingStrategy}
          >
            {fields.map((field, index) => {
              // Invariant: field must exist in upload status if it exists in form
              const uploadStatus = imgUploadStatuses[field.id]!;
              return (
                <SortableItem key={field.id} id={field.id}>
                  <FieldSet>
                    <button
                      onClick={() => removePost(index, field.id)}
                      className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2"
                    >
                      X
                    </button>
                    <div>
                      <Label htmlFor={`${field.id}-title`}>Title</Label>
                      <Input
                        {...register(`posts.${index}.title`)}
                        id={`${field.id}-title`}
                        type="text"
                        placeholder="Whistler at Night"
                      />
                    </div>
                    <div>
                      <ImageField
                        imageUploadStatus={uploadStatus}
                        fieldId={field.id}
                        fieldIndex={index}
                        handleImageUpload={handleImageUpload}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`${field.id}-description`}>
                        Description
                      </Label>
                      <Textarea
                        {...register(`posts.${index}.description`)}
                        id={`${field.id}-description`}
                      />
                    </div>
                  </FieldSet>
                </SortableItem>
              );
            })}
          </SortableContext>
        </DndContext>
        <button
          onClick={addPost}
          type="button"
          className="col-start-1 col-end-2 rounded border-2 border-muted"
        >
          +
        </button>
        <Button className="col-start-1 col-end-2">Save</Button>
      </form>
    </FormProvider>
  );
}

function ImageField({
  fieldId,
  fieldIndex,
  imageUploadStatus,
  handleImageUpload,
}: {
  fieldId: number;
  fieldIndex: number;
  imageUploadStatus: UploadStatus;
  handleImageUpload: HandleImageUploadCallabck;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<FormValues>();
  if (imageUploadStatus.type === "empty") {
    return (
      <ImageUpload id={fieldId} onChange={handleImageUpload} index={fieldIndex}>
        {({ handleDragOver, handleDrop, handleFileChange }) => {
          register(`posts.${fieldIndex}.imageMetadata`);
          const error = errors.posts?.[fieldIndex]?.imageMetadata;
          const hasError = !!error?.size?.message || !!error?.mimetype?.message;
          return (
            <Label htmlFor={`${fieldId}-image`}>
              <Dropzone handleDragOver={handleDragOver} handleDrop={handleDrop}>
                <DropzoneContent>
                  <ImgLogo />
                  <p className="leading-4">
                    Click to upload image or drag and drop
                  </p>
                  <p className="text-sm">Max file size 9mb</p>
                  <input
                    id={`${fieldId}-image`}
                    type="file"
                    accept="image/*"
                    className={cn(
                      hasError && "border-red-300",
                      "sr-only min-w-0",
                    )}
                    onChange={handleFileChange}
                    multiple={false}
                  />
                </DropzoneContent>
                {hasError && (
                  <div className="bg-red-300 p-2">
                    {error.size?.message && <p>{error.size.message}</p>}
                    {error.mimetype?.message && <p>{error.mimetype.message}</p>}
                  </div>
                )}
              </Dropzone>
            </Label>
          );
        }}
      </ImageUpload>
    );
  }

  if (imageUploadStatus.type === "loading") {
    return <div>Loading...</div>;
  }

  if (imageUploadStatus.type === "error") {
    return <div>something went wrong</div>;
  }

  return <img src={imageUploadStatus.url} alt="" />;
}

function FieldSet({ children }: { children: React.ReactNode }) {
  return (
    <fieldset className="relative grid gap-2 bg-gray-100 [grid-auto-rows:auto_250px_auto]">
      {children}
    </fieldset>
  );
}

function Dropzone({
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
      className="grid items-center gap-1.5"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {children}
    </div>
  );
}

function DropzoneContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid aspect-square w-full max-w-[250px] content-center justify-center gap-2 rounded border-2 border-dashed border-black p-8 text-center [grid-auto-rows:max-content]">
      {children}
    </div>
  );
}

function ImageUpload({
  onChange,
  index,
  id,
  children,
}: {
  onChange: (index: number, id: number, file: File | null) => void;
  index: number;
  id: number;
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
    if (files === null) {
      onChange(index, id, null);
      return;
    }

    const file = files[0];
    if (file === undefined) {
      onChange(index, id, null);
      return;
    }

    onChange(index, id, file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();

    const files = e.dataTransfer.items;
    if (!files) {
      return;
    }

    const file = files[0]?.getAsFile();
    if (!file || !file.type.includes("image/")) {
      return;
    }

    onChange(index, id, file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  return children({ handleDragOver, handleDrop, handleFileChange });
}

function ImgLogo() {
  return (
    <svg
      className="mx-auto h-12 w-12 text-gray-400"
      stroke="currentColor"
      fill="none"
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <path
        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
