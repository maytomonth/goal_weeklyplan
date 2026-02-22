import { useEffect, useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { WeekNav } from '@/src/components/WeekNav';
import { getWeekPeriod } from '@/src/core/time/week';
import { applyCarryActionsAndEnsureNextPlan } from '@/src/services/carryService';
import { selectTasksByPlan, selectWeeklyPlansForWeek } from '@/src/state/selectors/planSelectors';
import { selectCarryReady, selectCompletionRate, selectReviewByPlan } from '@/src/state/selectors/reviewSelectors';
import { useAppStore } from '@/src/state/store';
import { Button, Card, EmptyState, Input, Label, Surface } from '@/src/ui/components';
import { ResponsiveShell } from '@/src/ui/layout/ResponsiveShell';

const DAY_MS = 24 * 60 * 60 * 1000;

type MobileView = 'index' | 'detail';

interface ReviewWorkspaceProps {
  routePlanId?: string;
  mobileView: MobileView;
}

export function ReviewWorkspace({ routePlanId, mobileView }: ReviewWorkspaceProps) {
  const router = useRouter();

  const selectedWeekStartIso = useAppStore((state) => state.selectedWeekStartIso);
  const selectedPlanId = useAppStore((state) => state.selectedPlanId);
  const setSelectedPlanId = useAppStore((state) => state.setSelectedPlanId);
  const setSelectedWeekStart = useAppStore((state) => state.setSelectedWeekStart);
  const ensureReview = useAppStore((state) => state.ensureReview);
  const setReviewNote = useAppStore((state) => state.setReviewNote);
  const bulkCarryUndecided = useAppStore((state) => state.bulkCarryUndecided);

  const goals = useAppStore((state) => state.goals);
  const allTasks = useAppStore((state) => state.tasks);
  const reviews = useAppStore((state) => state.reviews);

  const period = useMemo(() => {
    if (selectedWeekStartIso) {
      const start = new Date(selectedWeekStartIso);
      return { start, end: new Date(start.getTime() + 7 * DAY_MS) };
    }
    return getWeekPeriod(new Date());
  }, [selectedWeekStartIso]);

  const periodStartIso = period.start.toISOString();
  const plans = useAppStore((state) => selectWeeklyPlansForWeek(state, periodStartIso));

  useEffect(() => {
    setSelectedWeekStart(periodStartIso);
  }, [periodStartIso, setSelectedWeekStart]);

  useEffect(() => {
    if (!routePlanId) return;
    setSelectedPlanId(routePlanId);
    ensureReview(routePlanId);
  }, [ensureReview, routePlanId, setSelectedPlanId]);

  const effectivePlanId = routePlanId ?? selectedPlanId;
  const plan = useAppStore((state) => (effectivePlanId ? state.plans[effectivePlanId] : null));
  const tasks = useAppStore((state) => (plan ? selectTasksByPlan(state, plan.id) : []));
  const completionRate = useAppStore((state) => (plan ? selectCompletionRate(state, plan.id) : 0));
  const carryReady = useAppStore((state) => (plan ? selectCarryReady(state, plan.id) : false));
  const review = useAppStore((state) => (plan ? selectReviewByPlan(state, plan.id) : null));

  const todoTasks = tasks.filter((task) => task.status === 'todo');
  const doneCount = tasks.filter((task) => task.status === 'done').length;

  const leftPanel = (
    <ScrollView className="flex-1" contentContainerStyle={{ gap: 10 }}>
      <Surface>
        <WeekNav
          weekStartIso={periodStartIso}
          onMoveWeek={(direction) => {
            const nextStart = new Date(period.start.getTime() + direction * 7 * DAY_MS);
            setSelectedWeekStart(nextStart.toISOString());
            setSelectedPlanId(null);
            router.replace('/review');
          }}
          onMoveCurrentWeek={() => {
            setSelectedWeekStart(getWeekPeriod(new Date()).start.toISOString());
            setSelectedPlanId(null);
            router.replace('/review');
          }}
        />
      </Surface>

      {plans.length === 0 ? <EmptyState title="리뷰할 플랜이 없습니다" /> : null}
      {plans.map((item) => {
        const itemTasks = Object.values(allTasks).filter((task) => task.planId === item.id && !task.deletedAt);
        const done = itemTasks.filter((task) => task.status === 'done').length;
        const todo = itemTasks.filter((task) => task.status === 'todo').length;
        const denominator = itemTasks.filter((task) => task.status !== 'dropped').length;
        const rate = denominator === 0 ? 0 : done / denominator;
        const hasReview = Boolean(Object.values(reviews).find((entry) => entry.planId === item.id));
        const active = plan?.id === item.id;

        return (
          <Card key={item.id} className={active ? 'border-accent bg-surface-2' : ''}>
            <Button
              label={goals[item.goalId]?.title ?? 'Unknown Goal'}
              variant="ghost"
              className="justify-start px-0"
              textClassName="text-base"
              onPress={() => {
                setSelectedPlanId(item.id);
                ensureReview(item.id);
                router.push(`/review/${item.id}`);
              }}
            />
            <Label muted className="text-sm">완료율 {(rate * 100).toFixed(0)}% · 남은 todo {todo}</Label>
            <View className="mt-1 flex-row gap-2">
              <Label className="rounded-full bg-surface-2 px-2 py-1 text-xs">{hasReview ? '리뷰 있음' : '리뷰 시작'}</Label>
              {todo > 0 ? <Label className="rounded-full bg-surface-2 px-2 py-1 text-xs text-accent">Carry 필요</Label> : null}
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );

  const centerPanel = plan ? (
    <ScrollView className="flex-1" contentContainerStyle={{ gap: 10 }}>
      <View className="flex-row items-center justify-between">
        <Label className="text-xl font-semibold">{goals[plan.goalId]?.title ?? 'Unknown Goal'}</Label>
        <Button
          label="Carry Inbox"
          variant="secondary"
          onPress={() => router.push({ pathname: '/carry-inbox', params: { planId: plan.id } })}
        />
      </View>

      <Surface>
        <Label className="text-lg font-semibold">완료율 {(completionRate * 100).toFixed(0)}%</Label>
        <Label muted className="text-sm">완료 {doneCount} / 남음 {todoTasks.length}</Label>
      </Surface>

      <Surface>
        <Label className="mb-2 text-sm font-semibold">Review Note</Label>
        <Input
          multiline
          className="min-h-[110px]"
          placeholder="잘된 점 / 문제 / 다음 개선"
          value={review?.summaryNote ?? ''}
          onChangeText={(text) => setReviewNote(plan.id, text)}
          textAlignVertical="top"
        />
      </Surface>

      <Surface>
        <Label className="mb-2 text-sm font-semibold">Carry 후보</Label>
        {todoTasks.length === 0 ? <Label muted className="text-sm">미완료 항목이 없습니다.</Label> : null}
        {todoTasks.slice(0, 8).map((task) => (
          <Label key={task.id} className="mb-1 text-sm">• {task.title}</Label>
        ))}
        {todoTasks.length > 0 ? (
          <Button
            label="일괄 Carry(미선택)"
            variant="ghost"
            onPress={() => bulkCarryUndecided(plan.id, todoTasks.map((task) => task.id))}
            className="mt-2"
          />
        ) : null}
      </Surface>

      <Button
        label="다음 주 이 목표 플랜 열기"
        variant="primary"
        disabled={!(todoTasks.length === 0 || carryReady)}
        onPress={() => {
          const nextPlanId = applyCarryActionsAndEnsureNextPlan(useAppStore.getState(), plan.id, {
            defaultUndecidedToCarry: true,
          });
          const latest = useAppStore.getState();
          const nextPlan = latest.plans[nextPlanId];
          if (nextPlan) {
            latest.setSelectedWeekStart(nextPlan.periodStart);
            latest.setSelectedPlanId(nextPlanId);
            router.replace(`/plan/${nextPlanId}`);
            return;
          }
          router.replace('/plan');
        }}
      />
    </ScrollView>
  ) : (
    <EmptyState
      title="선택된 리뷰 플랜이 없습니다"
      description="왼쪽 리스트에서 플랜을 선택하세요."
      ctaLabel="Plan 허브 열기"
      onPressCta={() => router.push('/plan')}
    />
  );

  return (
    <ResponsiveShell
      section="review"
      mobile={
        <ScrollView className="flex-1 bg-bg p-4">{mobileView === 'index' ? leftPanel : centerPanel}</ScrollView>
      }
      desktopLeft={leftPanel}
      desktopCenter={centerPanel}
    />
  );
}
