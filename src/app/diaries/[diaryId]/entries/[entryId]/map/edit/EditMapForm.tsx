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
import { ChangeEvent } from "react";
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
  return formId++;
}

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
      posts: [
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
      ],
    },
  });
  const { control, register, setValue, resetField, handleSubmit } = formMethods;
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "posts",
    keyName: "_id",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function addPost() {
    append({
      id: getId(),
      title: "",
      description: "",
      imageMetadata: {
        mimetype: "",
        size: 0,
        name: "",
      },
    });
  }

  const utils = api.useUtils();
  async function handleImageUpload(index: number, file: File | null) {
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
      return;
    }
    resetField(`posts.${index}`);
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
                  <fieldset className="relative grid gap-2 bg-gray-100">
                    <button
                      onClick={() => remove(index)}
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
                    <ImageUpload
                      id={field.id}
                      onChange={handleImageUpload}
                      index={index}
                    />
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
  onChange: (index: number, file: File | null) => void;
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
      onChange(index, null);
      return;
    }

    const file = files[0];
    if (file === undefined) {
      onChange(index, null);
      return;
    }

    onChange(index, file);
  }
  register(`posts.${index}.imageMetadata`);
  const error = errors.posts?.[index]?.imageMetadata;
  const hasError = !!error?.size?.message || !!error?.mimetype?.message;
  return (
    <div className="grid w-full items-center gap-1.5">
      <Label htmlFor={`${id}-image`}>Image</Label>
      <Input
        id={`${id}-image`}
        type="file"
        accept="image/*"
        className={cn(hasError && "border-red-300")}
        onChange={handleFileChange}
      />
      {hasError && (
        <div className="bg-red-300 p-2">
          {error.size?.message && <p>{error.size.message}</p>}
          {error.mimetype?.message && <p>{error.mimetype.message}</p>}
        </div>
      )}
    </div>
  );
}
