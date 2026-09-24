"use client";

import { useRef, useState } from "react";
import { toHHMM, type Meal } from "@diet/core";
import { compressImage } from "@/lib/image";
import { useRepository } from "@/lib/repository";
import { Photo } from "./Photo";
import { inputClass } from "./ui";

interface Props {
  meal?: Meal;
  onSave: (meal: Meal) => void;
  onDelete?: () => void;
  onClose: () => void;
}

function nowHHMM(): string {
  const now = new Date();
  return toHHMM(now.getHours() * 60 + Math.floor(now.getMinutes() / 5) * 5);
}

export function MealEditor({ meal, onSave, onDelete, onClose }: Props) {
  const repo = useRepository();
  const [draft, setDraft] = useState<Meal>(
    () => meal ?? { id: crypto.randomUUID(), time: nowHHMM(), description: "", photoIds: [] },
  );
  // 이번 편집에서 새로 올린 사진 / 지운 기존 사진. 취소하면 되돌리고, 저장하면 확정한다.
  const [addedPhotos, setAddedPhotos] = useState<string[]>([]);
  const [removedPhotos, setRemovedPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const canSave = draft.time && (draft.description.trim() || draft.photoIds.length > 0);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const ids = await Promise.all(Array.from(files).map(async (f) => repo.savePhoto(await compressImage(f))));
      setAddedPhotos((prev) => [...prev, ...ids]);
      setDraft((d) => ({ ...d, photoIds: [...d.photoIds, ...ids] }));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function removePhoto(id: string) {
    setDraft((d) => ({ ...d, photoIds: d.photoIds.filter((p) => p !== id) }));
    if (addedPhotos.includes(id)) {
      setAddedPhotos((prev) => prev.filter((p) => p !== id));
      void repo.deletePhoto(id);
    } else {
      setRemovedPhotos((prev) => [...prev, id]);
    }
  }

  function cancel() {
    addedPhotos.forEach((id) => void repo.deletePhoto(id));
    onClose();
  }

  function save() {
    removedPhotos.forEach((id) => void repo.deletePhoto(id));
    onSave({ ...draft, description: draft.description.trim() });
    onClose();
  }

  function remove() {
    [...draft.photoIds, ...removedPhotos].forEach((id) => void repo.deletePhoto(id));
    onDelete?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 sm:items-center" onClick={cancel}>
      <div
        role="dialog"
        aria-label={meal ? "식사 수정" : "식사 추가"}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold">{meal ? "식사 수정" : "무엇을 먹었나요?"}</h2>

        <div className="grid gap-4">
          <label className="grid gap-1 text-sm font-medium">
            먹은 시각
            <input
              type="time"
              className={inputClass}
              value={draft.time}
              onChange={(e) => setDraft({ ...draft, time: e.target.value })}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium">
            먹은 것과 양
            <textarea
              rows={3}
              className={inputClass}
              placeholder={"예) 밥 200g\n채소 100g\n제육볶음 100g"}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">
              포만감 <span className="font-bold text-pen-blue">{draft.fullness ?? "–"}</span>
              <span className="ml-1 text-xs font-normal text-ink-soft">(1 배고픔 ~ 10 너무 배부름)</span>
            </legend>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={draft.fullness === n}
                  onClick={() => setDraft({ ...draft, fullness: draft.fullness === n ? undefined : n })}
                  className={`aspect-square rounded-lg border text-sm ${
                    draft.fullness === n
                      ? "border-pen-blue bg-pen-blue font-bold text-white"
                      : "border-line text-pen-blue"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <p className="mb-1.5 text-sm font-medium">사진</p>
            <div className="flex flex-wrap gap-2">
              {draft.photoIds.map((id) => (
                <div key={id} className="relative">
                  <Photo id={id} className="h-20 w-20 rounded-lg" />
                  <button
                    type="button"
                    aria-label="사진 삭제"
                    onClick={() => removePhoto(id)}
                    className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink text-xs text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="grid h-20 w-20 place-items-center rounded-lg border border-dashed border-line text-xs text-ink-soft"
              >
                {uploading ? "올리는 중…" : "+ 사진"}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => addPhotos(e.target.files)}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          {meal && onDelete && (
            <button type="button" onClick={remove} className="rounded-xl px-4 py-3 text-sm text-ink-soft">
              삭제
            </button>
          )}
          <button type="button" onClick={cancel} className="ml-auto rounded-xl border border-line px-5 py-3 text-sm">
            취소
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave || uploading}
            className="rounded-xl bg-pen px-6 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
