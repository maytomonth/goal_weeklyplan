import { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { formatWeekLabel } from '@/src/core/time/week';
import { isBlank, isValidIsoDateInput, normalizeTitle } from '@/src/core/validation/form';
import { useToast } from '@/src/components/toast/ToastProvider';
import { archiveGoal, hardDeleteGoal } from '@/src/services/goalService';
import { useAppStore } from '@/src/state/store';
import { Button, Card, EmptyState, Input, Label, Surface } from '@/src/ui/components';
import { ResponsiveShell } from '@/src/ui/layout/ResponsiveShell';

type MobileView = 'index' | 'detail';

interface GoalsWorkspaceProps {
  routeGoalId?: string;
  mobileView: MobileView;
}

export function GoalsWorkspace({ routeGoalId, mobileView }: GoalsWorkspaceProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const goals = useAppStore((state) => state.goals);
  const plans = useAppStore((state) => state.plans);
  const tasks = useAppStore((state) => state.tasks);
  const reviews = useAppStore((state) => state.reviews);

  const createGoal = useAppStore((state) => state.createGoal);
  const editGoal = useAppStore((state) => state.editGoal);
  const setSelectedPlanId = useAppStore((state) => state.setSelectedPlanId);
  const setSelectedWeekStart = useAppStore((state) => state.setSelectedWeekStart);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueType, setDueType] = useState<'none' | 'date'>('none');
  const [dueDate, setDueDate] = useState('');

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [hardDeleteOpen, setHardDeleteOpen] = useState(false);
  const [hardDeleteChecked, setHardDeleteChecked] = useState(false);

  const activeGoals = useMemo(
    () => Object.values(goals).filter((goal) => goal.status === 'active' && goal.systemType !== 'inbox'),
    [goals],
  );

  const selectedGoal = routeGoalId ? goals[routeGoalId] : null;

  useEffect(() => {
    if (!selectedGoal) return;
    setEditTitle(selectedGoal.title);
    setEditDescription(selectedGoal.description ?? '');
  }, [selectedGoal]);

  const weeklyPlanHistory = useMemo(() => {
    if (!selectedGoal) return [];
    return Object.values(plans)
      .filter((plan) => plan.goalId === selectedGoal.id)
      .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
      .slice(0, 8)
      .map((plan) => {
        const planTasks = Object.values(tasks).filter((task) => task.planId === plan.id && !task.deletedAt);
        const done = planTasks.filter((task) => task.status === 'done').length;
        const denominator = planTasks.filter((task) => task.status !== 'dropped').length;
        const completionRate = denominator === 0 ? 0 : done / denominator;
        const review = Object.values(reviews).find((entry) => entry.planId === plan.id);

        return { plan, completionRate, reviewSummary: review?.summaryNote?.split('\n')[0] ?? '' };
      });
  }, [plans, reviews, selectedGoal, tasks]);

  const createGoalSubmit = () => {
    const normalizedTitle = normalizeTitle(title);
    if (isBlank(normalizedTitle)) {
      showToast('목표 제목은 필수입니다.', 'error');
      return;
    }
    if (dueType === 'date' && !isValidIsoDateInput(dueDate)) {
      showToast('기한은 YYYY-MM-DD 형식이어야 합니다.', 'error');
      return;
    }
    createGoal({
      title: normalizedTitle,
      description,
      dueType,
      dueDate: dueType === 'date' ? dueDate : undefined,
    });
    setTitle('');
    setDescription('');
    setDueType('none');
    setDueDate('');
    showToast('목표를 생성했습니다.', 'success');
  };

  const leftPanel = (
    <ScrollView className="flex-1" contentContainerStyle={{ gap: 10 }}>
      <Surface>
        <Label className="mb-2 text-base font-semibold">새 목표</Label>
        <Input placeholder="목표 제목" value={title} onChangeText={setTitle} className="mb-2" />
        <Input multiline className="mb-2 min-h-[88px]" placeholder="설명" value={description} onChangeText={setDescription} textAlignVertical="top" />
        <View className="mb-2 flex-row gap-2">
          <Button label="기한 없음" variant={dueType === 'none' ? 'primary' : 'ghost'} size="sm" onPress={() => setDueType('none')} />
          <Button label="날짜 기한" variant={dueType === 'date' ? 'primary' : 'ghost'} size="sm" onPress={() => setDueType('date')} />
        </View>
        {dueType === 'date' ? <Input placeholder="YYYY-MM-DD" value={dueDate} onChangeText={setDueDate} className="mb-2" /> : null}
        <Button label="+ Goal" variant="primary" onPress={createGoalSubmit} full />
      </Surface>

      {activeGoals.length === 0 ? <EmptyState title="활성 목표가 없습니다" /> : null}
      {activeGoals.map((goal) => (
        <Card key={goal.id} className={selectedGoal?.id === goal.id ? 'border-accent bg-surface-2' : ''}>
          <Button
            label={goal.title}
            variant="ghost"
            className="justify-start px-0"
            textClassName="text-base"
            onPress={() => router.push(`/goals/${goal.id}`)}
          />
          <Label muted className="text-sm">{goal.description || '-'}</Label>
        </Card>
      ))}
    </ScrollView>
  );

  const centerPanel = selectedGoal && selectedGoal.systemType !== 'inbox' ? (
    <ScrollView className="flex-1" contentContainerStyle={{ gap: 10 }}>
      <View className="flex-row items-center justify-between">
        <Label className="text-xl font-semibold">{selectedGoal.title}</Label>
        <View className="flex-row gap-2">
          <Button
            label="Archive"
            variant="ghost"
            onPress={() => {
              archiveGoal(useAppStore.getState(), selectedGoal.id);
              showToast('목표를 아카이브했습니다.', 'info');
              router.replace('/goals');
            }}
          />
          <Button label="Delete" variant="danger" onPress={() => setHardDeleteOpen(true)} />
        </View>
      </View>

      <Surface>
        <Label className="mb-2 text-sm font-semibold">Goal 정보</Label>
        <Input className="mb-2" value={editTitle} onChangeText={setEditTitle} placeholder="제목" />
        <Input
          multiline
          className="mb-2 min-h-[88px]"
          value={editDescription}
          onChangeText={setEditDescription}
          placeholder="설명"
          textAlignVertical="top"
        />
        <Button
          label="저장"
          variant="primary"
          onPress={() => {
            if (!editTitle.trim()) {
              showToast('목표 제목을 입력하세요.', 'error');
              return;
            }
            editGoal(selectedGoal.id, { title: editTitle.trim(), description: editDescription });
            showToast('목표를 저장했습니다.', 'success');
          }}
        />
      </Surface>

      <Surface>
        <Label className="mb-2 text-sm font-semibold">최근 플랜 (8주)</Label>
        {weeklyPlanHistory.length === 0 ? <Label muted className="text-sm">히스토리 없음</Label> : null}
        {weeklyPlanHistory.map(({ plan, completionRate, reviewSummary }) => (
          <Card key={plan.id}>
            <Label className="text-sm font-semibold">{formatWeekLabel(new Date(plan.periodStart))}</Label>
            <Label muted className="text-sm">완료율 {(completionRate * 100).toFixed(0)}%</Label>
            <Label muted className="mb-2 text-sm">{reviewSummary || '리뷰 노트 없음'}</Label>
            <Button
              label="열기"
              variant="ghost"
              onPress={() => {
                setSelectedPlanId(plan.id);
                setSelectedWeekStart(plan.periodStart);
                router.push(`/plan/${plan.id}`);
              }}
            />
          </Card>
        ))}
      </Surface>

      <Modal visible={hardDeleteOpen} transparent animationType="fade" onRequestClose={() => setHardDeleteOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/55 px-4">
          <Surface className="w-full max-w-[520px] gap-3 p-4">
            <Label className="text-base font-semibold">영구 삭제 확인</Label>
            <Label muted className="text-sm">연결된 주간플랜/Task/Review/CarryAction이 모두 삭제됩니다.</Label>
            <Button
              label={hardDeleteChecked ? '확인 체크됨' : '삭제 내용을 이해했습니다'}
              variant={hardDeleteChecked ? 'primary' : 'ghost'}
              onPress={() => setHardDeleteChecked((prev) => !prev)}
            />
            <View className="flex-row gap-2">
              <Button label="취소" variant="ghost" onPress={() => { setHardDeleteOpen(false); setHardDeleteChecked(false); }} />
              <Button
                label="영구 삭제"
                variant="danger"
                disabled={!hardDeleteChecked}
                onPress={() => {
                  hardDeleteGoal(useAppStore.getState(), selectedGoal.id);
                  setHardDeleteOpen(false);
                  setHardDeleteChecked(false);
                  showToast('목표를 영구 삭제했습니다.', 'success');
                  router.replace('/goals');
                }}
              />
            </View>
          </Surface>
        </View>
      </Modal>
    </ScrollView>
  ) : (
    <EmptyState title="선택된 Goal이 없습니다" description="왼쪽 리스트에서 목표를 선택하세요." />
  );

  return (
    <ResponsiveShell
      section="goals"
      mobile={<ScrollView className="flex-1 bg-bg p-4">{mobileView === 'index' ? leftPanel : centerPanel}</ScrollView>}
      desktopLeft={leftPanel}
      desktopCenter={centerPanel}
    />
  );
}
