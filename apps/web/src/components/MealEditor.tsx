"use client";

import { useRef, useState } from "react";
import {
  MEAL_TIME_PRESETS,
  mealTimeFromPhoto,
  nowHHMM,
  shiftTime,
  similarTimeMeal,
  type DailyLog,
  toHHMM,
  type HHMM,
  type ISODate,
  type Meal,
} from "@diet/core";
import { importPhoto, photoErrorMessage } from "@/lib/image";
import { useRepository } from "@/lib/repository";
import { Photo } from "./Photo";
import { inputClass } from "./ui";

export interface MealEditorProps {
  date: ISODate;
  isToday: boolean;
  /** 고치는 식사. 없으면 새 식사 */
  meal?: Meal;
  /** 새 식사의 시작 값: 사진부터 시작했으면 저장된 사진과 촬영 시각 */
  seed?: MealSeed;
  /** 오늘 이전 기록 (예시를 찾을 때) */
  pastLogs: DailyLog[];
  frequentFoods: string[];
  recentMeals: Meal[];
  onSave: (meal: Meal) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export interface MealSeed {
  photoIds?: string[];
  time?: HHMM;
  /** photo: 사진 촬영 시각, missing: 사진에 시각이 없음 */
  timeSource?: "photo" | "missing";
}


export function MealEditor({
  date,
  isToday,
  meal,
  seed,
  pastLogs,
  frequentFoods,
  recentMeals,
  onSave,
  onDelete,
  onClose,
}: MealEditorProps) {
  const repo = useRepository();
  const [draft, setDraft] = useState<Meal>(() => {
    if (meal) return meal;
    const time = seed?.time ?? (isToday && seed?.timeSource !== "missing" ? nowHHMM() : "");
    return {
      id: crypto.randomUUID(),
      time,
      description: (time && similarTimeMeal(pastLogs, time)?.description) || "",
      photoIds: seed?.photoIds ?? [],
    };
  });
  const [timeSource, setTimeSource] = useState(meal ? undefined : seed?.timeSource);
  // 새 식사는 지난번 비슷한 시각에 먹은 것을 예시로 채워 둔다. 고객이 설명을 직접 고치면 더 바꾸지 않는다.
  const [exampleActive, setExampleActive] = useState(!meal && draft.description !== "");
  // 이번 편집에서 새로 올린 사진 / 지운 기존 사진. 취소하면 되돌리고, 저장하면 확정한다.
  const [addedPhotos, setAddedPhotos] = useState<string[]>(seed?.photoIds ?? []);
  const [removedPhotos, setRemovedPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const canSave = draft.time && (draft.description.trim() || draft.photoIds.length > 0);
  const set = (patch: Partial<Meal>) => setDraft((d) => ({ ...d, ...patch }));

  function setTime(time: HHMM, source?: MealSeed["timeSource"]) {
    setTimeSource(source);
    if (!meal && (exampleActive || !draft.description)) {
      const example = time ? similarTimeMeal(pastLogs, time) : null;
      set({ time, description: example?.description ?? "" });
      setExampleActive(!!example);
    } else {
      set({ time });
    }
  }

  function setDescription(description: string) {
    setExampleActive(false);
    set({ description });
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setPhotoError(null);
    try {
      const imported = await Promise.all(Array.from(files).map((f) => importPhoto(repo, f)));
      const ids = imported.map((p) => p.id);
      const photoTime = imported
        .map((p) => (p.takenAt ? mealTimeFromPhoto(p.takenAt, date) : null))
        .find(Boolean);
      const firstPhotos = draft.photoIds.length === 0;
      setAddedPhotos((prev) => [...prev, ...ids]);
      setDraft((d) => ({ ...d, photoIds: [...d.photoIds, ...ids] }));
      // 첫 사진이면 촬영 시각을 먹은 시각으로
      if (firstPhotos && photoTime) setTime(photoTime, "photo");
    } catch (error) {
      setPhotoError(photoErrorMessage(error));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function removePhoto(id: string) {
    set({ photoIds: draft.photoIds.filter((p) => p !== id) });
    if (addedPhotos.includes(id)) {
      setAddedPhotos((prev) => prev.filter((p) => p !== id));
      void repo.deletePhoto(id);
    } else {
      setRemovedPhotos((prev) => [...prev, id]);
    }
  }

  function addFood(food: string) {
    const current = exampleActive ? "" : draft.description.trimEnd();
    setDescription(current ? `${current}\n${food}` : food);
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

  const minutesAgo = (m: number) => {
    const now = new Date();
    return toHHMM(now.getHours() * 60 + now.getMinutes() - m);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 sm:items-center" onClick={cancel}>
      <div
        role="dialog"
        aria-label={meal ? "식사 수정" : "식사 추가"}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold">{meal ? "식사 수정" : "무엇을 먹었나요?"}</h2>

        <div className="grid gap-5">
          <div>
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
                {uploading ? "올리는 중…" : draft.photoIds.length ? "+ 사진" : "📷 사진"}
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
            {photoError && (
              <p role="alert" className="mt-1.5 text-xs text-pen">
                {photoError}
              </p>
            )}
            {draft.photoIds.length === 0 && !photoError && (
              <p className="mt-1.5 text-xs text-ink-soft">사진이 없어도 괜찮아요. 나중에 추가할 수도 있어요.</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            <label htmlFor="meal-time" className="text-sm font-medium">
              먹은 시각
            </label>
            <div className="flex min-w-0 gap-1.5">
              <input
                id="meal-time"
                type="time"
                className={`${inputClass} flex-1 ${timeSource === "missing" && !draft.time ? "border-pen" : ""}`}
                value={draft.time}
                onChange={(e) => setTime(e.target.value)}
              />
              {draft.time && (
                <>
                  <button
                    type="button"
                    onClick={() => setTime(shiftTime(draft.time, -10), timeSource)}
                    className="shrink-0 rounded-lg border border-line px-2.5 text-xs"
                  >
                    −10분
                  </button>
                  <button
                    type="button"
                    onClick={() => setTime(shiftTime(draft.time, 10), timeSource)}
                    className="shrink-0 rounded-lg border border-line px-2.5 text-xs"
                  >
                    +10분
                  </button>
                </>
              )}
            </div>
            {timeSource === "photo" && <p className="text-xs text-ink-soft">📷 사진을 찍은 시각이에요.</p>}
            {timeSource === "missing" && !draft.time && (
              <p className="text-xs text-pen">사진에 찍은 시각 정보가 없어요. 아래 버튼이나 시계로 골라주세요.</p>
            )}
            <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1">
              {isToday &&
                [
                  ["방금", 0],
                  ["30분 전", 30],
                  ["1시간 전", 60],
                ].map(([label, m]) => (
                  <Chip key={label} onClick={() => setTime(minutesAgo(m as number))}>
                    {label}
                  </Chip>
                ))}
              {isToday && <span className="mx-0.5 w-px shrink-0 bg-line" aria-hidden />}
              {MEAL_TIME_PRESETS.map((preset) => (
                <Chip key={preset.label} active={draft.time === preset.time} onClick={() => setTime(preset.time)}>
                  {preset.label} {preset.time}
                </Chip>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            <label htmlFor="meal-description" className="text-sm font-medium">
              먹은 것
            </label>
            {recentMeals.length > 0 && !meal && !draft.description && (
              <div className="grid gap-1">
                <span className="text-xs text-ink-soft">최근 식사 그대로</span>
                <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
                  {recentMeals.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDescription(m.description)}
                      className="max-w-40 shrink-0 truncate rounded-lg border border-line bg-paper px-3 py-2 text-left text-xs text-pen"
                    >
                      {m.description.replace(/\n/g, ", ")}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {exampleActive && (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-highlight/40 px-3 py-2 text-xs">
                <span>지난번 이 시간쯤 먹은 걸 넣어뒀어요. 다르면 고쳐주세요.</span>
                <button
                  type="button"
                  onClick={() => setDescription("")}
                  className="shrink-0 rounded-full border border-ink/20 bg-card px-2.5 py-1 font-bold"
                >
                  지우기
                </button>
              </div>
            )}
            <textarea
              id="meal-description"
              rows={3}
              className={`${inputClass} ${exampleActive ? "text-pen/70" : ""}`}
              placeholder="예) 돌솥비빔밥, 과채스무디"
              value={draft.description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {frequentFoods.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {frequentFoods.map((food) => (
                  <Chip key={food} onClick={() => addFood(food)}>
                    + {food}
                  </Chip>
                ))}
              </div>
            )}
          </div>

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
                  onClick={() => set({ fullness: draft.fullness === n ? undefined : n })}
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

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${
        active ? "border-pen bg-pen text-white" : "border-line bg-card text-ink"
      }`}
    >
      {children}
    </button>
  );
}
