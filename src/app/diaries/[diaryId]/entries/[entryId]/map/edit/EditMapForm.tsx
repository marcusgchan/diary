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
  UseFieldArrayAppend,
} from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChangeEvent, useState } from "react";
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
  | { type: "loading" }
  | { type: "error" }
  | { type: "empty" }
  | { type: "uploaded"; url: string };

type IdToUploadStatus = {
  [key: string]: UploadStatus;
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

  function removePost(index: number, id: number) {
    remove(index);
    setImgUploadStatuses((prev) => {
      const { [id]: _, ...other } = prev;
      return other;
    });
  }

  const utils = api.useUtils();
  async function handleImageUpload(
    index: number,
    id: number,
    file: File | null,
  ) {
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
      return;
    }
    resetField(`posts.${index}`);
    setImgUploadStatuses((prev) => {
      return { ...prev, [id]: { type: "empty" } };
    });
  }

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
              return (
                <SortableItem key={field.id} id={field.id}>
                  <fieldset className="relative grid gap-2 bg-gray-100 [grid-auto-rows:auto_250px_auto]">
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
                      {imgUploadStatuses[field.id]!.type === "empty" && (
                        <ImageUpload
                          id={field.id}
                          onChange={handleImageUpload}
                          index={index}
                        />
                      )}
                      {imgUploadStatuses[field.id]!.type === "loading" && (
                        <div>Loading...</div>
                      )}
                      {imgUploadStatuses[field.id]!.type === "uploaded" && (
                        <img src={imgUploadStatuses[field.id]!.url} />
                      )}
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
                  </fieldset>
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

function ImageUpload({
  onChange,
  index,
  id,
}: {
  onChange: (index: number, id: number, file: File | null) => void;
  index: number;
  id: number;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<FormValues>();

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
  register(`posts.${index}.imageMetadata`);
  const error = errors.posts?.[index]?.imageMetadata;
  const hasError = !!error?.size?.message || !!error?.mimetype?.message;
  return (
    <Label htmlFor={`${id}-image`}>
      <div
        className="grid items-center gap-1.5"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="grid aspect-square w-full max-w-[250px] content-center justify-center gap-2 rounded border-2 border-dashed border-black p-8 text-center [grid-auto-rows:max-content]">
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
          <p className="leading-4">Click to upload image or drag and drop</p>
          <p className="text-sm">Max file size 9mb</p>
          <input
            id={`${id}-image`}
            type="file"
            accept="image/*"
            className={cn(hasError && "border-red-300", "sr-only min-w-0")}
            onChange={handleFileChange}
            multiple={false}
          />
        </div>
        {hasError && (
          <div className="bg-red-300 p-2">
            {error.size?.message && <p>{error.size.message}</p>}
            {error.mimetype?.message && <p>{error.mimetype.message}</p>}
          </div>
        )}
      </div>
    </Label>
  );
}
