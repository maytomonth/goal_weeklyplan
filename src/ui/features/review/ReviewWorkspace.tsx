import { useEffect, useMemo, useRef } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { WeekNav } from '@/src/components/WeekNav';
import { useToast } from '@/src/components/toast/ToastProvider';
import { CarryActionType } from '@/src/core/types/domain';
import { getWeekPeriod, isoInstantEquals } from '@/src/core/time/week';
import { applyCarryActionsAndEnsureNextPlan } from '@/src/services/carryService';
import { selectTasksByPlan, selectWeeklyPlansForWeek } from '@/src/state/selectors/planSelectors';
import { selectCarryDraft, selectCarryReady, selectCompletionRate, selectReviewByPlan } from '@/src/state/selectors/reviewSelectors';
import { useAppStore } from '@/src/state/store';
import { Button, Card, EmptyState, GoalDueBadge, Icon, Input, Label, Surface } from '@/src/ui/components';
import { ResponsiveShell } from '@/src/ui/layout/ResponsiveShell';

const DAY_MS = 24 * 60 * 60 * 1000;
const CARRY_LABELS: Record<CarryActionType, string> = {
  carry: '이월',
  split: '쪼개기',
  drop: '중단',
  rescope: '재정의',
};

type MobileView = 'index' | 'detail';

interface ReviewWorkspaceProps {
  routePlanId?: string;
  mobileView: MobileView;
}

export function ReviewWorkspace({ routePlanId, mobileView }: ReviewWorkspaceProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const selectedWeekStartIso = useAppStore((state) => state.selectedWeekStartIso);
  const selectedPlanId = useAppStore((state) => state.selectedPlanId);
  const setSelectedPlanId = useAppStore((state) => state.setSelectedPlanId);
  const setSelectedWeekStart = useAppStore((state) => state.setSelectedWeekStart);
  const ensureReview = useAppStore((state) => state.ensureReview);
  const setReviewNote = useAppStore((state) => state.setReviewNote);
  const bulkCarryUndecided = useAppStore((state) => state.bulkCarryUndecided);
  const setCarryDecision = useAppStore((state) => state.setCarryDecision);

  const goals = useAppStore((state) => state.goals);
  const allTasks = useAppStore((state) => state.tasks);
  const reviews = useAppStore((state) => state.reviews);
  const carryActions = useAppStore((state) => state.carryActions);

  const period = useMemo(() => {
    if (selectedWeekStartIso) {
      const start = new Date(selectedWeekStartIso);
      if (!Number.isNaN(start.getTime())) {
        return { start, end: new Date(start.getTime() + 7 * DAY_MS) };
      }
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
  const carryDraft = useAppStore((state) => (plan ? selectCarryDraft(state, plan.id) : {}));
  const isCarryApplied = useAppStore((state) => (plan ? Boolean(state.appliedCarryByPlanId[plan.id]) : false));
  const review = useAppStore((state) => (plan ? selectReviewByPlan(state, plan.id) : null));

  useEffect(() => {
    if (!plan) return;
    if (selectedWeekStartIso && isoInstantEquals(selectedWeekStartIso, plan.periodStart)) {
      return;
    }
    setSelectedWeekStart(plan.periodStart);
  }, [plan, selectedWeekStartIso, setSelectedWeekStart]);

  const todoTasks = tasks.filter((task) => task.status === 'todo');
  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const pulseByTaskId = useRef<Record<string, Animated.Value>>({});
  const finalizedDecisionByTaskId = useMemo<Record<string, CarryActionType>>(() => {
    if (!review) return {};

    const map: Record<string, CarryActionType> = {};
    Object.values(carryActions)
      .filter((action) => action.reviewId === review.id)
      .forEach((action) => {
        map[action.fromTaskId] = action.action;
      });
    return map;
  }, [carryActions, review]);

  const reviewFeedback =
    completionRate >= 0.8
      ? '집중 성과 주간'
      : completionRate >= 0.5
        ? '안정 진행 주간'
        : completionRate > 0
          ? '회복 주간'
          : '리셋 주간';

  const leftPanel = (
    <ScrollView className="flex-1" contentContainerStyle={{ gap: 12 }}>
      <Surface>
        <WeekNav
          weekStartIso={periodStartIso}
          onSelectWeekStart={(weekStartIso) => {
            setSelectedWeekStart(weekStartIso);
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
              label={goals[item.goalId]?.title ?? '알 수 없는 목표'}
              variant="ghost"
              className="justify-start"
              textClassName="text-base"
              onPress={() => {
                setSelectedPlanId(item.id);
                ensureReview(item.id);
                router.push(`/review/${item.id}`);
              }}
            />
            <GoalDueBadge goal={goals[item.goalId]} style={{ marginTop: 8, marginBottom: 2 }} />
            <View className="mt-2 flex-row items-center gap-2">
              <Icon name="check-circle" size={14} color="#9aa1ae" />
              <Label muted className="text-sm">완료율 {(rate * 100).toFixed(0)}% · 남은 할 일 {todo}</Label>
            </View>
            <View className="mt-1 flex-row gap-2">
              <Label className="rounded-full bg-surface-2 px-2 py-1 text-xs">{hasReview ? '리뷰 있음' : '리뷰 시작'}</Label>
              {todo > 0 ? <Label className="rounded-full bg-surface-2 px-2 py-1 text-xs text-accent">이월 필요</Label> : null}
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );

  const centerPanel = plan ? (
    <ScrollView className="flex-1" contentContainerStyle={{ gap: 12 }}>
      <View className="flex-row items-center justify-between">
        <Label className="text-xl font-semibold">{goals[plan.goalId]?.title ?? '알 수 없는 목표'}</Label>
        <Button
          label="인박스 이월"
          variant="secondary"
          iconLeft={<Icon name="inbox" size={14} color="#9aa1ae" />}
          onPress={() => router.push({ pathname: '/carry-inbox', params: { planId: plan.id } })}
        />
      </View>

      <Surface>
        <Label className="mb-2 text-sm font-semibold">리뷰 카드</Label>
        <View className="rounded-[12px] border border-border bg-surface-2 p-3">
          <Label className="text-lg font-semibold">{Math.round(completionRate * 100)}% 완료</Label>
          <Label className="mt-1 text-sm text-accent">{reviewFeedback}</Label>
          <Label muted className="mt-1 text-sm">완료 {doneCount} · 남은 할 일 {todoTasks.length}</Label>
        </View>
      </Surface>

      <Surface>
        <Label className="text-lg font-semibold">완료율 {(completionRate * 100).toFixed(0)}%</Label>
        <Label muted className="text-sm">완료 {doneCount} / 남음 {todoTasks.length}</Label>
      </Surface>

      <Surface>
        <Label className="mb-2 text-sm font-semibold">리뷰 메모</Label>
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
        <Label className="mb-2 text-sm font-semibold">이월 후보</Label>
        {isCarryApplied ? (
          <Label muted className="mb-2 text-xs">이미 다음 주 반영이 완료되어 결정 수정은 잠겨 있습니다.</Label>
        ) : (
          <Label muted className="mb-2 text-xs">이월/쪼개기/중단을 선택한 뒤 아래 버튼으로 반영하세요.</Label>
        )}
        {todoTasks.length === 0 ? <Label muted className="text-sm">미완료 항목이 없습니다.</Label> : null}
        {todoTasks.slice(0, 8).map((task) => {
          if (!pulseByTaskId.current[task.id]) {
            pulseByTaskId.current[task.id] = new Animated.Value(1);
          }
          const scale = pulseByTaskId.current[task.id];
          const finalized = finalizedDecisionByTaskId[task.id];
          const draft = carryDraft[task.id]?.action;
          const selectedDecision = finalized ?? draft;

          const onCarry = () => {
            if (isCarryApplied) return;
            setCarryDecision(plan.id, task.id, 'carry');
            Animated.sequence([
              Animated.timing(scale, { toValue: 0.9, duration: 110, useNativeDriver: true }),
              Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }),
            ]).start();
          };

          return (
            <Animated.View key={task.id} style={{ transform: [{ scale }] }} className="mb-2 rounded-[10px] border border-border bg-surface-2 p-2">
              <Label className="mb-2 text-sm">• {task.title}</Label>
              <Label muted className="mb-2 text-xs">
                {selectedDecision ? `선택됨: ${CARRY_LABELS[selectedDecision]}` : '미선택'}
              </Label>
              <View className="flex-row gap-2">
                <Button
                  label={selectedDecision === 'carry' ? '이월 ✓' : '이월'}
                  variant={selectedDecision === 'carry' ? 'primary' : 'secondary'}
                  size="sm"
                  iconLeft={<Icon name="corner-up-right" size={13} color={selectedDecision === 'carry' ? '#f2f4f8' : '#9aa1ae'} />}
                  disabled={isCarryApplied}
                  onPress={() => {
                    onCarry();
                  }}
                />
                <Button
                  label={selectedDecision === 'split' ? '쪼개기 ✓' : '쪼개기'}
                  variant="secondary"
                  size="sm"
                  iconLeft={<Icon name="git-branch" size={13} color="#9aa1ae" />}
                  disabled={isCarryApplied}
                  onPress={() => setCarryDecision(plan.id, task.id, 'split')}
                />
                <Button
                  label={selectedDecision === 'drop' ? '중단 ✓' : '중단'}
                  variant="danger"
                  size="sm"
                  iconLeft={<Icon name="x-circle" size={13} color="#ff6b63" />}
                  disabled={isCarryApplied}
                  onPress={() => setCarryDecision(plan.id, task.id, 'drop')}
                />
              </View>
            </Animated.View>
          );
        })}
        {todoTasks.length > 0 && !isCarryApplied ? (
          <Button
            label="미선택 일괄 이월"
            variant="ghost"
            iconLeft={<Icon name="corner-up-right" size={13} color="#9aa1ae" />}
            onPress={() => bulkCarryUndecided(plan.id, todoTasks.map((task) => task.id))}
            className="mt-2"
          />
        ) : null}
      </Surface>

      <Button
        label={isCarryApplied ? '이미 생성된 다음 주 플랜 열기' : '다음 주 이 목표 플랜 열기'}
        variant="primary"
        iconLeft={<Icon name="arrow-right-circle" size={14} color="#f2f4f8" />}
        disabled={!isCarryApplied && !(todoTasks.length === 0 || carryReady)}
        onPress={() => {
          try {
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
          } catch (error) {
            const message = error instanceof Error ? error.message : '이월 반영 중 오류가 발생했습니다.';
            showToast(message, 'error');
          }
        }}
      />
    </ScrollView>
  ) : (
    <EmptyState
      title="선택된 리뷰 플랜이 없습니다"
      description="왼쪽 리스트에서 플랜을 선택하세요."
      ctaLabel="계획 허브 열기"
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
