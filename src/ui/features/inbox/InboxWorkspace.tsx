import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useToast } from '@/src/components/toast/ToastProvider';
import { getWeekPeriod } from '@/src/core/time/week';
import { isBlank, normalizeTitle } from '@/src/core/validation/form';
import { quickAddInboxTask, softDeleteTask, undoSoftDeleteTask } from '@/src/services/taskService';
import { selectInboxTasks } from '@/src/state/selectors/planSelectors';
import { useAppStore } from '@/src/state/store';
import { Button, Card, EmptyState, Input, Label, Surface } from '@/src/ui/components';
import { ResponsiveShell } from '@/src/ui/layout/ResponsiveShell';

export function InboxWorkspace() {
  const router = useRouter();
  const { showToast } = useToast();
  const [quickTitle, setQuickTitle] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const ensureInboxGoal = useAppStore((state) => state.ensureInboxGoal);
  const plans = useAppStore((state) => state.plans);
  const goals = useAppStore((state) => state.goals);
  const inboxTasks = useAppStore((state) => selectInboxTasks(state));

  useEffect(() => {
    ensureInboxGoal();
  }, [ensureInboxGoal]);

  useEffect(() => {
    if (selectedTaskId && !inboxTasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [inboxTasks, selectedTaskId]);

  const selectedTask = useMemo(
    () => inboxTasks.find((task) => task.id === selectedTaskId) ?? inboxTasks[0] ?? null,
    [inboxTasks, selectedTaskId],
  );

  const onQuickAdd = () => {
    const title = normalizeTitle(quickTitle);
    if (isBlank(title)) {
      showToast('입력값이 비어 있습니다.', 'error');
      return;
    }

    const taskId = quickAddInboxTask(useAppStore.getState(), title, getWeekPeriod(new Date()).start.toISOString());
    setQuickTitle('');
    setSelectedTaskId(taskId);
    showToast('Inbox task를 추가했습니다.', 'success');
  };

  const onDelete = (taskId: string) => {
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

  const leftPanel = (
    <ScrollView className="flex-1" contentContainerStyle={{ gap: 10 }}>
      <Surface>
        <Label className="mb-2 text-base font-semibold">Quick Add</Label>
        <View className="flex-row gap-2">
          <Input className="flex-1" value={quickTitle} onChangeText={setQuickTitle} placeholder="Quick Add" onSubmitEditing={onQuickAdd} />
          <Button label="Add" variant="primary" onPress={onQuickAdd} />
        </View>
      </Surface>
      <View className="flex-row justify-end">
        <Button label="Trash" variant="ghost" onPress={() => router.push('/trash')} />
      </View>

      {inboxTasks.length === 0 ? <EmptyState title="Inbox task가 없습니다" /> : null}
      {inboxTasks.map((task) => {
        const plan = plans[task.planId];
        const active = selectedTask?.id === task.id;

        return (
          <Card key={task.id} className={active ? 'border-accent bg-surface-2' : ''}>
            <Button
              label={task.title}
              variant="ghost"
              className="justify-start px-0"
              textClassName="text-base"
              onPress={() => setSelectedTaskId(task.id)}
            />
            <Label muted className="text-sm">Goal: {goals[task.goalId]?.title ?? 'Inbox'}</Label>
            <Label muted className="mb-2 text-sm">Week: {plan?.periodStart ?? '-'}</Label>
            <View className="flex-row gap-2">
              <Button
                label="Assign"
                variant="secondary"
                onPress={() => router.push({ pathname: '/assign-goal', params: { taskId: task.id } })}
              />
              <Button label="Delete" variant="danger" onPress={() => onDelete(task.id)} />
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );

  const centerPanel = selectedTask ? (
    <ScrollView className="flex-1" contentContainerStyle={{ gap: 10 }}>
      <Surface>
        <Label className="mb-2 text-lg font-semibold">선택된 Inbox Task</Label>
        <Label className="mb-1 text-base">{selectedTask.title}</Label>
        <Label muted className="text-sm">Goal: {goals[selectedTask.goalId]?.title ?? 'Inbox'}</Label>
        <Label muted className="mb-2 text-sm">Plan: {plans[selectedTask.planId]?.periodStart ?? '-'}</Label>
        <View className="flex-row gap-2">
          <Button
            label="Assign to Goal"
            variant="primary"
            onPress={() => router.push({ pathname: '/assign-goal', params: { taskId: selectedTask.id } })}
          />
          <Button label="Delete" variant="danger" onPress={() => onDelete(selectedTask.id)} />
        </View>
      </Surface>
      <Surface>
        <Label muted className="text-sm">
          Inbox는 정리 대기함입니다. Assign으로 목표/주차를 지정하면 해당 Goal WeeklyPlan으로 이동합니다.
        </Label>
      </Surface>
    </ScrollView>
  ) : (
    <EmptyState title="선택된 Task가 없습니다" description="왼쪽 리스트에서 Inbox task를 선택하세요." />
  );

  return (
    <ResponsiveShell
      section="inbox"
      mobile={<ScrollView className="flex-1 bg-bg p-4">{leftPanel}</ScrollView>}
      desktopLeft={leftPanel}
      desktopCenter={centerPanel}
    />
  );
}
