import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { WeekNav } from '@/src/components/WeekNav';
import { useToast } from '@/src/components/toast/ToastProvider';
import { Task } from '@/src/core/types/domain';
import { getWeekPeriod } from '@/src/core/time/week';
import { isBlank, normalizeTitle } from '@/src/core/validation/form';
import { deleteWeeklyPlan } from '@/src/services/planService';
import { softDeleteTask, undoSoftDeleteTask } from '@/src/services/taskService';
import { selectTasksByPlan, selectWeeklyPlansForWeek } from '@/src/state/selectors/planSelectors';
import { useAppStore } from '@/src/state/store';
import { Button, Card, EmptyState, Input, Label, Surface } from '@/src/ui/components';
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
  const reorderTask = useAppStore((state) => state.reorderTask);
  const toggleTop3 = useAppStore((state) => state.toggleTop3);

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
    if (selectedPlanId !== routePlanId) {
      setSelectedPlanId(routePlanId);
    }
  }, [routePlanId, selectedPlanId, setSelectedPlanId]);

  const effectiveSelectedPlanId = routePlanId ?? selectedPlanId;
  const selectedPlan = useAppStore((state) => (effectiveSelectedPlanId ? state.plans[effectiveSelectedPlanId] : null));
  const selectedTasks = useAppStore((state) => (selectedPlan ? selectTasksByPlan(state, selectedPlan.id) : []));

  const top3Tasks = useMemo(() => {
    if (!selectedPlan) return [];
    return selectedPlan.top3TaskIds
      .map((taskId) => selectedTasks.find((task) => task.id === taskId))
      .filter((task): task is Task => Boolean(task));
  }, [selectedPlan, selectedTasks]);

  const moveWeek = (direction: -1 | 1) => {
    const nextStart = new Date(period.start.getTime() + direction * 7 * DAY_MS);
    setSelectedWeekStart(nextStart.toISOString());
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
    const title = normalizeTitle(newTaskTitle);
    if (isBlank(title)) {
      showToast('Task 제목을 입력하세요.', 'error');
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
        label: 'Undo',
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
      if (globalThis.confirm('이 주간플랜을 삭제할까요? 관련 Task/Review/CarryAction도 삭제됩니다.')) {
        runDelete();
      }
      return;
    }

    Alert.alert('이 주간플랜 삭제', '관련 Task/Review/CarryAction도 함께 삭제됩니다.', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: runDelete },
    ]);
  };

  const renderTask = ({ item, drag, isActive }: RenderItemParams<Task>) => (
    <ScaleDecorator>
      <Card className={isActive ? 'border-accent bg-surface-2' : ''}>
        <View className="mb-2 flex-row items-center gap-2">
          <Button
            label={item.status === 'done' ? '✓' : ''}
            variant="ghost"
            size="sm"
            className="h-7 w-7 rounded-full px-0"
            onPress={() => toggleTaskDone(item.id)}
          />
          <Input
            className="flex-1"
            value={item.title}
            onChangeText={(text) => updateTask(item.id, { title: text })}
            onBlur={() => {
              const trimmed = normalizeTitle(item.title);
              if (!trimmed) {
                showToast('Task 제목은 비울 수 없습니다.', 'error');
                return;
              }
              if (trimmed !== item.title) {
                updateTask(item.id, { title: trimmed });
              }
            }}
          />
          <Button label="≡" variant="ghost" size="sm" onLongPress={drag} delayLongPress={120} />
        </View>
        <View className="flex-row gap-2">
          <Button label="Delete" variant="ghost" size="sm" onPress={() => onDeleteTask(item.id)} />
          <Button
            label="Top3"
            variant="secondary"
            size="sm"
            onPress={() => {
              if (!selectedPlan) return;
              const result = toggleTop3(selectedPlan.id, item.id);
              if (!result.ok) {
                showToast('Top3는 최대 3개입니다.', 'error');
              }
            }}
          />
        </View>
      </Card>
    </ScaleDecorator>
  );

  const leftListPanel = (
    <ScrollView className="flex-1" contentContainerStyle={{ gap: 10 }}>
      <Surface>
        <WeekNav weekStartIso={periodStartIso} onMoveWeek={moveWeek} onMoveCurrentWeek={moveCurrentWeek} />
      </Surface>
      <View className="flex-row gap-2">
        <Button
          label="+ Goal Plan"
          variant="primary"
          onPress={() => router.push({ pathname: '/goal-picker', params: { weekStart: periodStartIso } })}
        />
        <Button label="Trash" variant="ghost" onPress={() => router.push('/trash')} />
      </View>
      {plans.length === 0 ? (
        <EmptyState title="플랜이 없습니다" description="Goal Plan을 추가해 이번 주 운영을 시작하세요." />
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
              label={goals[plan.goalId]?.title ?? 'Unknown Goal'}
              variant="ghost"
              className="justify-start px-0"
              textClassName="text-base"
              onPress={() => selectPlan(plan.id)}
            />
            <Label muted className="text-sm">완료율 {(completion * 100).toFixed(0)}% · 남은 todo {todo}</Label>
          </Card>
        );
      })}
    </ScrollView>
  );

  const detailPanel = selectedPlan ? (
    <ScrollView className="flex-1" contentContainerStyle={{ gap: 10 }}>
      <View className="flex-row items-center justify-between">
        <Label className="text-xl font-semibold">{goals[selectedPlan.goalId]?.title ?? 'Unknown Goal'}</Label>
        <View className="flex-row gap-2">
          <Button label="Review" variant="ghost" onPress={() => router.push(`/review/${selectedPlan.id}`)} />
          <Button label="Delete Plan" variant="danger" onPress={onDeletePlan} />
        </View>
      </View>

      <Surface>
        <Label className="mb-2 text-sm font-semibold">Note</Label>
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
        <Label className="mb-2 text-sm font-semibold">Tasks</Label>
        <View className="mb-3 flex-row gap-2">
          <Input
            className="flex-1"
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            placeholder="새 task"
            onSubmitEditing={onAddTask}
          />
          <Button label="Add" variant="primary" onPress={onAddTask} />
        </View>
        <DraggableFlatList
          data={selectedTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          scrollEnabled={false}
          onDragEnd={({ data }) => reorderTask(selectedPlan.id, data.map((task) => task.id))}
        />
      </Surface>
    </ScrollView>
  ) : (
    <EmptyState
      title="선택된 플랜이 없습니다"
      description="왼쪽 리스트에서 플랜을 선택하면 상세가 열립니다."
      ctaLabel="Goal Plan 추가"
      onPressCta={() => router.push({ pathname: '/goal-picker', params: { weekStart: periodStartIso } })}
    />
  );

  const rightInfoPanel = selectedPlan ? (
    <ScrollView className="flex-1" contentContainerStyle={{ gap: 10 }}>
      <Surface>
        <Label className="mb-2 text-sm font-semibold">Top3</Label>
        {top3Tasks.length === 0 ? <Label muted className="text-sm">선택된 Top3 없음</Label> : null}
        {top3Tasks.map((task) => (
          <Label key={task.id} className="mb-1 text-sm">• {task.title}</Label>
        ))}
      </Surface>
      <Surface>
        <Label className="mb-2 text-sm font-semibold">Metrics</Label>
        <Label muted className="text-sm">전체 Task {selectedTasks.length}</Label>
        <Label muted className="text-sm">완료 {selectedTasks.filter((task) => task.status === 'done').length}</Label>
        <Label muted className="text-sm">남음 {selectedTasks.filter((task) => task.status === 'todo').length}</Label>
      </Surface>
      <Surface>
        <Label className="mb-2 text-sm font-semibold">Quick Actions</Label>
        <View className="gap-2">
          <Button label="Carry Review" variant="secondary" onPress={() => router.push(`/review/${selectedPlan.id}`)} full />
          <Button label="휴지통 열기" variant="ghost" onPress={() => router.push('/trash')} full />
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
