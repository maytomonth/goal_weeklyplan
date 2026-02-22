import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { WeekNav } from '@/src/components/WeekNav';
import { useToast } from '@/src/components/toast/ToastProvider';
import { Task } from '@/src/core/types/domain';
import { getWeekPeriod, isoInstantEquals } from '@/src/core/time/week';
import { isBlank, normalizeTitle } from '@/src/core/validation/form';
import { deleteWeeklyPlan } from '@/src/services/planService';
import { softDeleteTask, undoSoftDeleteTask } from '@/src/services/taskService';
import { selectTasksByPlan, selectWeeklyPlansForWeek } from '@/src/state/selectors/planSelectors';
import { useAppStore } from '@/src/state/store';
import { Button, Card, EmptyState, GoalDueBadge, Icon, Input, Label, Surface } from '@/src/ui/components';
import { ResponsiveShell } from '@/src/ui/layout/ResponsiveShell';

const DAY_MS = 24 * 60 * 60 * 1000;

type MobileView = 'index' | 'detail';

interface PlanWorkspaceProps {
  routePlanId?: string;
  mobileView: MobileView;
}

export function PlanWorkspace({ routePlanId, mobileView }: PlanWorkspaceProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const selectedWeekStartIso = useAppStore((state) => state.selectedWeekStartIso);
  const selectedPlanId = useAppStore((state) => state.selectedPlanId);
  const setSelectedWeekStart = useAppStore((state) => state.setSelectedWeekStart);
  const setSelectedPlanId = useAppStore((state) => state.setSelectedPlanId);
  const goals = useAppStore((state) => state.goals);
  const tasksById = useAppStore((state) => state.tasks);

  const updatePlanNote = useAppStore((state) => state.updatePlanNote);
  const addTask = useAppStore((state) => state.addTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const toggleTaskDone = useAppStore((state) => state.toggleTaskDone);
  const toggleTop3 = useAppStore((state) => state.toggleTop3);

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
  const currentWeekStart = getWeekPeriod(new Date()).start;
  const isPastWeekPlan = period.start.getTime() < currentWeekStart.getTime();
  const plans = useAppStore((state) => selectWeeklyPlansForWeek(state, periodStartIso));

  useEffect(() => {
    setSelectedWeekStart(periodStartIso);
  }, [periodStartIso, setSelectedWeekStart]);

  useEffect(() => {
    if (!routePlanId) return;
    if (selectedPlanId !== routePlanId) {
      setSelectedPlanId(routePlanId);
    }
  }, [routePlanId, selectedPlanId, setSelectedPlanId]);

  const effectiveSelectedPlanId = routePlanId ?? selectedPlanId;
  const selectedPlan = useAppStore((state) => (effectiveSelectedPlanId ? state.plans[effectiveSelectedPlanId] : null));
  const selectedTasks = useAppStore((state) => (selectedPlan ? selectTasksByPlan(state, selectedPlan.id) : []));

  useEffect(() => {
    if (!selectedPlan) return;
    if (selectedWeekStartIso && isoInstantEquals(selectedWeekStartIso, selectedPlan.periodStart)) {
      return;
    }
    setSelectedWeekStart(selectedPlan.periodStart);
  }, [selectedPlan, selectedWeekStartIso, setSelectedWeekStart]);

  const top3Tasks = useMemo(() => {
    if (!selectedPlan) return [];
    return selectedPlan.top3TaskIds
      .map((taskId) => selectedTasks.find((task) => task.id === taskId))
      .filter((task): task is Task => Boolean(task));
  }, [selectedPlan, selectedTasks]);

  const selectedCompletionRate = useMemo(() => {
    const denominator = selectedTasks.filter((task) => task.status !== 'dropped').length;
    if (denominator === 0) {
      return 0;
    }
    return selectedTasks.filter((task) => task.status === 'done').length / denominator;
  }, [selectedTasks]);

  const selectWeekStart = (weekStartIso: string) => {
    setSelectedWeekStart(weekStartIso);
    setSelectedPlanId(null);
    router.replace('/plan');
  };

  const moveCurrentWeek = () => {
    const current = getWeekPeriod(new Date()).start.toISOString();
    setSelectedWeekStart(current);
    setSelectedPlanId(null);
    router.replace('/plan');
  };

  const selectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    router.push(`/plan/${planId}`);
  };

  const onAddTask = () => {
    if (!selectedPlan) {
      showToast('먼저 플랜을 선택하세요.', 'error');
      return;
    }
    if (isPastWeekPlan) {
      showToast('지난 주차 플랜에는 새 할 일을 추가할 수 없습니다.', 'error');
      return;
    }
    const title = normalizeTitle(newTaskTitle);
    if (isBlank(title)) {
      showToast('할 일 제목을 입력하세요.', 'error');
      return;
    }
    addTask({ planId: selectedPlan.id, goalId: selectedPlan.goalId, title });
    setNewTaskTitle('');
  };

  const onDeleteTask = (taskId: string) => {
    softDeleteTask(useAppStore.getState(), taskId);
    showToast(
      '삭제됨',
      'info',
      {
        label: '되돌리기',
        onPress: () => undoSoftDeleteTask(useAppStore.getState(), taskId),
      },
      10000,
    );
  };

  const onDeletePlan = () => {
    if (!selectedPlan) return;
    const runDelete = () => {
      deleteWeeklyPlan(useAppStore.getState(), selectedPlan.id);
      setSelectedPlanId(null);
      showToast('주간플랜을 삭제했습니다.', 'success');
      router.replace('/plan');
    };

    if (Platform.OS === 'web') {
      if (globalThis.confirm('이 주간플랜을 삭제할까요? 관련 할 일/리뷰/이월 결정도 삭제됩니다.')) {
        runDelete();
      }
      return;
    }

    Alert.alert('이 주간플랜 삭제', '관련 할 일/리뷰/이월 결정도 함께 삭제됩니다.', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: runDelete },
    ]);
  };

  const renderTask = (item: Task) => (
    <Card key={item.id} className="mb-3">
      <View className={item.status === 'done' ? 'mb-2 flex-row items-center gap-2 opacity-40' : 'mb-2 flex-row items-center gap-2'}>
        <Pressable
          className={item.status === 'done' ? 'h-7 w-7 items-center justify-center rounded-full border border-accent bg-accent/20' : 'h-7 w-7 items-center justify-center rounded-full border border-border bg-transparent'}
          onPress={() => toggleTaskDone(item.id)}
          hitSlop={8}
        >
          <Text className={item.status === 'done' ? 'text-[12px] font-bold text-accent' : 'text-[12px] text-text-muted'}>
            {item.status === 'done' ? '✓' : ''}
          </Text>
        </Pressable>
        <Input
          className="flex-1"
          style={item.status === 'done' ? { textDecorationLine: 'line-through' } : undefined}
          value={item.title}
          onChangeText={(text) => updateTask(item.id, { title: text })}
          onBlur={() => {
            const trimmed = normalizeTitle(item.title);
            if (!trimmed) {
              showToast('할 일 제목은 비울 수 없습니다.', 'error');
              return;
            }
            if (trimmed !== item.title) {
              updateTask(item.id, { title: trimmed });
            }
          }}
        />
      </View>
      <View className="flex-row gap-2">
        <Button
          label="삭제"
          variant="ghost"
          size="sm"
          iconLeft={<Icon name="trash-2" size={13} color="#9aa1ae" />}
          onPress={() => onDeleteTask(item.id)}
        />
        <Button
          label="상위 3"
          variant="secondary"
          size="sm"
          iconLeft={<Icon name="star" size={13} color="#9aa1ae" />}
          onPress={() => {
            if (!selectedPlan) return;
            const result = toggleTop3(selectedPlan.id, item.id);
            if (!result.ok) {
              showToast('상위 3은 최대 3개입니다.', 'error');
            }
          }}
        />
      </View>
    </Card>
  );

  const leftListPanel = (
    <ScrollView className="flex-1" contentContainerStyle={{ gap: 12 }}>
      <Surface>
        <WeekNav weekStartIso={periodStartIso} onSelectWeekStart={selectWeekStart} onMoveCurrentWeek={moveCurrentWeek} />
      </Surface>
      <View className="flex-row gap-2">
        <Button
          label="목표 플랜 추가"
          variant="primary"
          iconLeft={<Icon name="plus" size={14} color="#f2f4f8" />}
          onPress={() => router.push({ pathname: '/goal-picker', params: { weekStart: periodStartIso } })}
        />
        <Button
          label="휴지통"
          variant="ghost"
          iconLeft={<Icon name="trash-2" size={14} color="#9aa1ae" />}
          onPress={() => router.push('/trash')}
        />
      </View>
      {plans.length === 0 ? (
        <EmptyState title="플랜이 없습니다" description="목표 플랜을 추가해 이번 주 운영을 시작하세요." />
      ) : null}
      {plans.map((plan) => {
        const planTasks = Object.values(tasksById).filter((task) => task.planId === plan.id && !task.deletedAt);
        const done = planTasks.filter((task) => task.status === 'done').length;
        const todo = planTasks.filter((task) => task.status === 'todo').length;
        const denominator = planTasks.filter((task) => task.status !== 'dropped').length;
        const completion = denominator === 0 ? 0 : done / denominator;
        const active = selectedPlan?.id === plan.id;

        return (
          <Card key={plan.id} className={active ? 'border-accent bg-surface-2' : ''}>
            <Button
              label={goals[plan.goalId]?.title ?? '알 수 없는 목표'}
              variant="ghost"
              className="justify-start"
              textClassName="text-base"
              onPress={() => selectPlan(plan.id)}
            />
            <GoalDueBadge goal={goals[plan.goalId]} style={{ marginTop: 8, marginBottom: 2 }} />
            <View className="mt-2 flex-row items-center gap-2">
              <Icon name="check-circle" size={14} color="#9aa1ae" />
              <Label muted className="text-sm">완료율 {(completion * 100).toFixed(0)}% · 남은 할 일 {todo}</Label>
            </View>
            <View className="mt-2 h-[6px] w-full overflow-hidden rounded-full bg-border">
              <View className="h-[6px] bg-accent" style={{ width: `${Math.max(0, Math.min(100, completion * 100))}%` }} />
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );

  const detailPanel = selectedPlan ? (
    <ScrollView className="flex-1" contentContainerStyle={{ gap: 12 }}>
      <View className="flex-row items-center justify-between">
        <Label className="text-xl font-semibold">{goals[selectedPlan.goalId]?.title ?? '알 수 없는 목표'}</Label>
        <View className="flex-row gap-2">
          <Button
            label="리뷰"
            variant="ghost"
            iconLeft={<Icon name="check-circle" size={14} color="#9aa1ae" />}
            onPress={() => router.push(`/review/${selectedPlan.id}`)}
          />
          <Button
            label="플랜 삭제"
            variant="danger"
            iconLeft={<Icon name="trash-2" size={14} color="#ff6b63" />}
            onPress={onDeletePlan}
          />
        </View>
      </View>

      <Surface>
        <Label className="mb-2 text-sm font-semibold">메모</Label>
        <Input
          multiline
          className="min-h-[110px]"
          value={selectedPlan.note}
          onChangeText={(text) => updatePlanNote(selectedPlan.id, text)}
          placeholder="이번 주 운영 메모"
          textAlignVertical="top"
        />
      </Surface>

      <Surface>
        <View className="mb-3 rounded-[12px] border border-dashed border-border bg-surface-2/40 p-3">
          <Label className="mb-2 text-sm font-semibold text-accent">⭐ 이번 주 상위 3 우선순위</Label>
          {top3Tasks.length === 0 ? <Label muted className="text-sm">이번 주 상위 3이 아직 지정되지 않았습니다.</Label> : null}
          {top3Tasks.map((task) => (
            <Label key={`top3-priority-${task.id}`} className="mb-1 text-sm">• {task.title}</Label>
          ))}
        </View>
        <Label className="mb-2 text-sm font-semibold">할 일</Label>
        <View className="mb-3 flex-row gap-2">
          <Input
            className="flex-1"
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            placeholder={isPastWeekPlan ? '지난 주차는 할 일 추가 불가' : '새 할 일'}
            onSubmitEditing={isPastWeekPlan ? undefined : onAddTask}
            editable={!isPastWeekPlan}
          />
          <Button
            label="할 일 추가"
            variant="primary"
            iconLeft={<Icon name="plus" size={14} color="#f2f4f8" />}
            onPress={onAddTask}
            disabled={isPastWeekPlan}
          />
        </View>
        {isPastWeekPlan ? <Label muted className="mb-3 text-xs">지난 주차 플랜에는 새 할 일을 추가할 수 없습니다.</Label> : null}
        {selectedTasks.map((task) => renderTask(task))}
      </Surface>
    </ScrollView>
  ) : (
    <EmptyState
      title="선택된 플랜이 없습니다"
      description="왼쪽 리스트에서 플랜을 선택하면 상세가 열립니다."
      ctaLabel="목표 플랜 추가"
      onPressCta={() => router.push({ pathname: '/goal-picker', params: { weekStart: periodStartIso } })}
    />
  );

  const rightInfoPanel = selectedPlan ? (
    <ScrollView className="flex-1" contentContainerStyle={{ gap: 12 }}>
      <Surface>
        <Label className="mb-2 text-sm font-semibold">이번 주 완료율</Label>
        <View className="items-center justify-center py-2">
          <CircularProgress progress={selectedCompletionRate} />
          <Label className="mt-3 text-3xl font-semibold">{Math.round(selectedCompletionRate * 100)}%</Label>
          <Label muted className="text-sm">이번 주 진행률</Label>
        </View>
      </Surface>
      <Surface>
        <Label className="mb-2 text-sm font-semibold">지표</Label>
        <Label muted className="text-sm">전체 할 일 {selectedTasks.length}</Label>
        <Label muted className="text-sm">완료 {selectedTasks.filter((task) => task.status === 'done').length}</Label>
        <Label muted className="text-sm">남음 {selectedTasks.filter((task) => task.status === 'todo').length}</Label>
      </Surface>
      <Surface>
        <Label className="mb-2 text-sm font-semibold">빠른 작업</Label>
        <View className="gap-2">
          <Button
            label="목표 추가"
            variant="primary"
            iconLeft={<Icon name="plus" size={14} color="#f2f4f8" />}
            onPress={() => router.push({ pathname: '/goal-picker', params: { weekStart: periodStartIso } })}
            full
          />
          <Button
            label="리뷰로 이동"
            variant="secondary"
            iconLeft={<Icon name="arrow-right-circle" size={14} color="#9aa1ae" />}
            onPress={() => router.push(`/review/${selectedPlan.id}`)}
            full
          />
        </View>
      </Surface>
    </ScrollView>
  ) : (
    <Surface>
      <Label muted className="text-sm">오른쪽 패널은 플랜 선택 후 활성화됩니다.</Label>
    </Surface>
  );

  const mobileIndex = <ScrollView className="flex-1 bg-bg p-4">{leftListPanel}</ScrollView>;
  const mobileDetail = <ScrollView className="flex-1 bg-bg p-4">{detailPanel}</ScrollView>;

  return (
    <ResponsiveShell
      section="plan"
      mobile={mobileView === 'index' ? mobileIndex : mobileDetail}
      desktopLeft={leftListPanel}
      desktopCenter={detailPanel}
      desktopRight={rightInfoPanel}
    />
  );
}

function CircularProgress({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(1, progress));
  const size = 140;
  const strokeWidth = 10;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - clamped);

  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke="#2a2d36" strokeWidth={strokeWidth} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#0a84ff"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={dash}
        strokeLinecap="round"
        rotation={-90}
        originX={size / 2}
        originY={size / 2}
      />
    </Svg>
  );
}
