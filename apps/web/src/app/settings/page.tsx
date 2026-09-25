"use client";

import { DeleteRecordsCard } from "@/components/DeleteRecordsCard";
import { HiddenFoodsCard } from "@/components/HiddenFoodsCard";
import { Logo } from "@/components/Logo";
import { RoutineCard } from "@/components/RoutineCard";
import { Card, inputClass, Loading } from "@/components/ui";
import { useProfile } from "@/lib/repository";

export default function SettingsPage() {
  const { profile, update } = useProfile();
  if (!profile) return <Loading />;

  return (
    <div className="grid grid-cols-1 gap-4">
      <header className="text-center">
        <Logo className="block text-2xl" />
        <h1 className="font-bold">설정</h1>
      </header>

      <Card title="내 정보">
        <label className="grid gap-1 text-sm font-medium">
          이름
          <input
            className={inputClass}
            value={profile.name}
            placeholder="코치님이 부를 이름"
            onChange={(e) => update({ ...profile, name: e.target.value })}
          />
        </label>
      </Card>

      <RoutineCard routine={profile.routine ?? []} onChange={(routine) => update({ ...profile, routine })} />

      <Card
        title="생리 기록"
        action={
          <label className="flex items-center gap-2 text-sm">
            사용
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--pen)]"
              checked={profile.periodTracking !== false}
              onChange={(e) => update({ ...profile, periodTracking: e.target.checked })}
            />
          </label>
        }
      >
        {profile.periodTracking === false ? (
          <p className="text-xs text-ink-soft">생리 기록을 사용하지 않아요. 기록 화면에서 생리 항목이 보이지 않아요.</p>
        ) : (
          <label className="grid grid-cols-1 gap-1 text-sm">
            <span className="text-xs font-medium">다음 예정일</span>
            <input
              type="date"
              className={inputClass}
              value={profile.periodExpectedDate ?? ""}
              onChange={(e) => update({ ...profile, periodExpectedDate: e.target.value || undefined })}
            />
            <span className="text-xs text-ink-soft">
              예정일 7일 전부터 7일 후까지(D-7 ~ D+7) 기록에 D-day가 자동으로 표시돼요. 다음 예정일이 정해지면 다시
              바꿔 주세요.
            </span>
          </label>
        )}
      </Card>

      <HiddenFoodsCard
        foods={profile.hiddenFoods ?? []}
        onChange={(hiddenFoods) => update({ ...profile, hiddenFoods })}
      />

      <DeleteRecordsCard />

      <p className="rounded-2xl bg-card p-4 text-xs leading-relaxed text-ink-soft">
        지금은 체험판이라 기록이 이 기기의 브라우저에만 저장돼요. 로그인과 서버 저장이 연결되면 코치와 기록이
        공유됩니다.
      </p>
    </div>
  );
}
