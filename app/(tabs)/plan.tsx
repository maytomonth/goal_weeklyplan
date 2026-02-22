import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { getWeekPeriod } from '@/src/core/time/week';
import { isBlank, normalizeTitle } from '@/src/core/validation/form';
import { Task } from '@/src/core/types/domain';
import { WeekNav } from '@/src/components/WeekNav';
import { useToast } from '@/src/components/toast/ToastProvider';
import { deleteWeeklyPlan } from '@/src/services/planService';
import { softDeleteTask, undoSoftDeleteTask } from '@/src/services/taskService';
import {
  selectTasksByPlan,
  selectWeeklyPlansForWeek,
} from '@/src/state/selectors/planSelectors';
import { useAppStore } from '@/src/state/store';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function PlanScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [goalSearch, setGoalSearch] = useState('');

  const selectedWeekStartIso = useAppStore((state) => state.selectedWeekStartIso);
  const selectedPlanId = useAppStore((state) => state.selectedPlanId);
  const setSelectedWeekStart = useAppStore((state) => state.setSelectedWeekStart);
  const setSelectedPlanId = useAppStore((state) => state.setSelectedPlanId);
  const ensureGoalWeeklyPlan = useAppStore((state) => state.ensureGoalWeeklyPlan);
  const updatePlanNote = useAppStore((state) => state.updatePlanNote);
  const toggleTop3 = useAppStore((state) => state.toggleTop3);
  const addTask = useAppStore((state) => state.addTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const toggleTaskDone = useAppStore((state) => state.toggleTaskDone);
  const reorderTask = useAppStore((state) => state.reorderTask);
  const pushRecentGoal = useAppStore((state) => state.pushRecentGoal);

  const goals = useAppStore((state) => state.goals);
  const plansById = useAppStore((state) => state.plans);
  const reviewsById = useAppStore((state) => state.reviews);
  const allTasks = useAppStore((state) => state.tasks);
  const recentGoalIds = useAppStore((state) => state.recentGoalIds);

  const period = useMemo(() => {
    if (selectedWeekStartIso) {
      const start = new Date(selectedWeekStartIso);
      const end = new Date(start.getTime() + 7 * DAY_MS);
      return { start, end };
    }
    return getWeekPeriod(new Date());
  }, [selectedWeekStartIso]);

  const periodStartIso = period.start.toISOString();
  const periodEndIso = period.end.toISOString();

  useEffect(() => {
    setSelectedWeekStart(periodStartIso);
  }, [periodStartIso, setSelectedWeekStart]);

  const plans = useAppStore((state) => selectWeeklyPlansForWeek(state, periodStartIso));

  useEffect(() => {
    if (selectedPlanId !== null && !plans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(null);
    }
  }, [plans, selectedPlanId, setSelectedPlanId]);

  const selectedPlan = selectedPlanId ? plansById[selectedPlanId] : null;
  const tasks = useAppStore((state) => (selectedPlan ? selectTasksByPlan(state, selectedPlan.id) : []));

  const activeGoals = useMemo(
    () => Object.values(goals).filter((goal) => goal.status === 'active'),
    [goals],
  );

  const filteredGoals = useMemo(() => {
    const q = goalSearch.trim().toLowerCase();
    if (!q) {
      return activeGoals;
    }
    return activeGoals.filter((goal) => goal.title.toLowerCase().includes(q));
  }, [activeGoals, goalSearch]);

  const recentGoals = useMemo(() => {
    return recentGoalIds
      .map((goalId) => goals[goalId])
      .filter((goal): goal is NonNullable<typeof goal> => Boolean(goal) && goal.status === 'active')
      .slice(0, 5)
      .filter((goal) => goalSearch.trim().length === 0 || goal.title.toLowerCase().includes(goalSearch.trim().toLowerCase()));
  }, [goalSearch, goals, recentGoalIds]);

  const allGoalsWithoutRecent = useMemo(() => {
    const recentSet = new Set(recentGoals.map((goal) => goal.id));
    return filteredGoals.filter((goal) => !recentSet.has(goal.id));
  }, [filteredGoals, recentGoals]);

  const moveWeek = (direction: -1 | 1) => {
    const nextStart = new Date(period.start.getTime() + direction * 7 * DAY_MS);
    setSelectedWeekStart(nextStart.toISOString());
    setSelectedPlanId(null);
  };

  const moveCurrentWeek = () => {
    const current = getWeekPeriod(new Date()).start.toISOString();
    setSelectedWeekStart(current);
    setSelectedPlanId(null);
  };

  const openOrCreateGoalPlan = (goalId: string) => {
    const planId = ensureGoalWeeklyPlan(periodStartIso, periodEndIso, goalId);
    setSelectedPlanId(planId);
    pushRecentGoal(goalId);
    setPickerVisible(false);
    setGoalSearch('');
    showToast('목표 플랜을 열었습니다.', 'success');
  };

  const submitTask = () => {
    if (!selectedPlan) {
      showToast('먼저 목표 플랜을 선택하세요.', 'error');
      return;
    }

    const title = normalizeTitle(newTaskTitle);
    if (isBlank(title)) {
      showToast('Task 제목을 입력하세요.', 'error');
      return;
    }

    addTask({
      planId: selectedPlan.id,
      title,
      goalId: selectedPlan.goalId,
    });
    pushRecentGoal(selectedPlan.goalId);
    setNewTaskTitle('');
    showToast('Task를 추가했습니다.', 'success');
  };

  const onToggleTop3 = (taskId: string) => {
    if (!selectedPlan) {
      return;
    }

    const result = toggleTop3(selectedPlan.id, taskId);
    if (!result.ok) {
      showToast('Top 3는 최대 3개까지 가능합니다.', 'error');
    }
  };

  const onTaskTitleBlur = (taskId: string, currentTitle: string) => {
    const trimmed = normalizeTitle(currentTitle);
    if (!trimmed) {
      showToast('Task 제목은 비울 수 없습니다.', 'error');
      const original = tasks.find((task) => task.id === taskId)?.title ?? 'Untitled';
      updateTask(taskId, { title: original });
      return;
    }
    if (trimmed !== currentTitle) {
      updateTask(taskId, { title: trimmed });
    }
  };

  const handleDeleteTask = (taskId: string) => {
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

  const handleDeleteSelectedPlan = () => {
    if (!selectedPlan) {
      return;
    }

    const runDelete = () => {
      deleteWeeklyPlan(useAppStore.getState(), selectedPlan.id);
      setSelectedPlanId(null);
      showToast('주간플랜을 삭제했습니다.', 'success');
    };

    if (Platform.OS === 'web') {
      if (globalThis.confirm('이 주간플랜을 영구 삭제할까요? 관련 Task/Review/CarryAction도 함께 삭제됩니다.')) {
        runDelete();
      }
      return;
    }

    Alert.alert(
      '이 주간플랜 삭제',
      '관련 Task/Review/CarryAction도 함께 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: runDelete },
      ],
    );
  };

  const renderTaskItem = ({ item, drag, isActive }: RenderItemParams<Task>) => (
    <ScaleDecorator>
      <View style={[styles.taskCard, isActive ? styles.taskCardActive : undefined]}>
        <View style={styles.taskRow}>
          <Pressable style={styles.checkbox} onPress={() => toggleTaskDone(item.id)}>
            <Text style={styles.checkboxText}>{item.status === 'done' ? '✓' : ''}</Text>
          </Pressable>
          <TextInput
            style={styles.taskInput}
            value={item.title}
            onChangeText={(text) => updateTask(item.id, { title: text })}
            onBlur={() => onTaskTitleBlur(item.id, item.title)}
          />
          <Pressable style={styles.dragHandle} onLongPress={drag} delayLongPress={120}>
            <Text style={styles.dragHandleText}>≡</Text>
          </Pressable>
        </View>

        <View style={styles.taskActions}>
          <Pressable style={styles.ghostButton} onPress={() => handleDeleteTask(item.id)}>
            <Text style={styles.ghostButtonText}>삭제</Text>
          </Pressable>
          <Pressable style={styles.ghostButton} onPress={() => onToggleTop3(item.id)}>
            <Text style={styles.ghostButtonText}>☆ Top3</Text>
          </Pressable>
        </View>
      </View>
    </ScaleDecorator>
  );

  const renderPlanCard = (planId: string) => {
    const plan = plansById[planId];
    if (!plan) return null;

    const goal = goals[plan.goalId];
    const planTasks = Object.values(allTasks).filter((task) => task.planId === plan.id && !task.deletedAt);
    const doneCount = planTasks.filter((task) => task.status === 'done').length;
    const todoCount = planTasks.filter((task) => task.status === 'todo').length;
    const denominator = planTasks.filter((task) => task.status !== 'dropped').length;
    const completion = denominator === 0 ? 0 : doneCount / denominator;
    const review = Object.values(reviewsById).find((entry) => entry.planId === plan.id);

    let reviewBadge = '리뷰 필요';
    if (review) reviewBadge = '리뷰 있음';
    if (todoCount > 0) reviewBadge = `${reviewBadge} · Carry 필요`;

    const top3Preview = (plan.top3TaskIds ?? [])
      .slice(0, 3)
      .map((taskId) => allTasks[taskId]?.title)
      .filter((title): title is string => Boolean(title));

    return (
      <View
        key={plan.id}
        style={[styles.planCard, selectedPlan?.id === plan.id ? styles.planCardActive : undefined]}
      >
        <Pressable
          onPress={() => {
            setSelectedPlanId(plan.id);
            pushRecentGoal(plan.goalId);
          }}
        >
          <Text style={styles.planCardTitle}>{goal?.title ?? 'Unknown Goal'}</Text>
          <Text style={styles.muted}>완료율 {(completion * 100).toFixed(0)}% · 완료 {doneCount} · 남은 {todoCount}</Text>
          <Text style={styles.badgeText}>{reviewBadge}</Text>
          {top3Preview.map((title, index) => (
            <Text key={`${plan.id}-top3-${index}`} style={styles.previewText} numberOfLines={1}>
              • {title}
            </Text>
          ))}
        </Pressable>
        <View style={styles.cardActionRow}>
          <Pressable
            style={styles.inlineActionBtn}
            onPress={() => {
              setSelectedPlanId(plan.id);
              pushRecentGoal(plan.goalId);
            }}
          >
            <Text style={styles.inlineActionText}>열기</Text>
          </Pressable>
          <Pressable
            style={styles.inlineActionBtn}
            onPress={() => {
              setSelectedPlanId(plan.id);
              pushRecentGoal(plan.goalId);
              router.push('/review');
            }}
          >
            <Text style={styles.inlineActionText}>리뷰</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderPlanHub = (
    <View style={styles.headerBlock}>
      <View style={styles.headerRow}>
        <WeekNav weekStartIso={periodStartIso} onMoveWeek={moveWeek} onMoveCurrentWeek={moveCurrentWeek} />
        <Pressable style={styles.primaryCreateBtn} onPress={() => setPickerVisible(true)}>
          <Text style={styles.primaryCreateBtnText}>+ 목표 플랜 추가</Text>
        </Pressable>
        <Pressable style={styles.inlineActionBtn} onPress={() => router.push('/trash')}>
          <Text style={styles.inlineActionText}>휴지통</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>이번 주 목표 플랜</Text>

      {plans.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>이번 주에 운영할 목표를 추가해보세요</Text>
          <Text style={styles.muted}>목표별로 주간 플랜을 만들고, 노트와 할 일을 관리합니다.</Text>
          <Pressable style={styles.primaryCreateBtn} onPress={() => setPickerVisible(true)}>
            <Text style={styles.primaryCreateBtnText}>+ 목표 플랜 추가</Text>
          </Pressable>
        </View>
      ) : (
        plans.map((plan) => renderPlanCard(plan.id))
      )}

      {selectedPlan ? (
        <>
          <View style={styles.detailHeaderRow}>
            <View style={styles.detailHeaderActions}>
              <Pressable style={styles.inlineActionBtn} onPress={() => setSelectedPlanId(null)}>
                <Text style={styles.inlineActionText}>목록으로</Text>
              </Pressable>
              <Pressable style={styles.reviewButton} onPress={() => router.push('/review')}>
                <Text style={styles.reviewButtonText}>리뷰</Text>
              </Pressable>
              <Pressable style={styles.dangerButton} onPress={handleDeleteSelectedPlan}>
                <Text style={styles.dangerButtonText}>이 주간플랜 삭제</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Plan Detail · {goals[selectedPlan.goalId]?.title ?? 'Unknown'}</Text>

          <Text style={styles.sectionTitle}>Note</Text>
          <TextInput
            multiline
            placeholder="이번 주 이 목표를 어떻게 운영할까?"
            value={selectedPlan.note ?? ''}
            onChangeText={(text) => updatePlanNote(selectedPlan.id, text)}
            style={styles.noteInput}
          />

          <Text style={styles.sectionTitle}>Top 3</Text>
          <View style={styles.top3Wrap}>
            {(selectedPlan.top3TaskIds ?? []).map((taskId) => {
              const topTask = tasks.find((task) => task.id === taskId);
              if (!topTask) return null;
              return (
                <View key={taskId} style={styles.top3Badge}>
                  <Text style={styles.top3Text}>{topTask.title}</Text>
                </View>
              );
            })}
            {(selectedPlan.top3TaskIds ?? []).length === 0 ? <Text style={styles.muted}>아직 없음</Text> : null}
          </View>

          <Text style={styles.sectionTitle}>할 일</Text>
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder="새 Task"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              onSubmitEditing={submitTask}
            />
            <Pressable style={styles.primaryButton} onPress={submitTask}>
              <Text style={styles.primaryButtonText}>Add</Text>
            </Pressable>
          </View>

          {tasks.length === 0 ? <Text style={styles.muted}>이번 주 이 목표의 할 일을 추가해보세요</Text> : null}
          <Text style={styles.hint}>
            {Platform.OS === 'web' ? '웹에서는 Up/Down 버튼으로 정렬하세요.' : 'Task 우측 핸들을 길게 눌러 드래그 정렬하세요.'}
          </Text>
        </>
      ) : null}
    </View>
  );

  const goalPickerBody = (
    <View style={styles.modalCard}>
      <Text style={styles.modalTitle}>목표 선택</Text>
      <TextInput
        style={styles.modalSearch}
        placeholder="목표 검색"
        value={goalSearch}
        onChangeText={setGoalSearch}
      />

      {activeGoals.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>먼저 목표를 만들어주세요</Text>
          <Pressable
            style={styles.primaryCreateBtn}
            onPress={() => {
              setPickerVisible(false);
              router.push('/goals');
            }}
          >
            <Text style={styles.primaryCreateBtnText}>목표 만들기</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {recentGoals.length > 0 ? <Text style={styles.modalSection}>최근 사용한 목표</Text> : null}
          {recentGoals.map((goal) => (
            <Pressable key={`recent-${goal.id}`} style={styles.goalItem} onPress={() => openOrCreateGoalPlan(goal.id)}>
              <Text style={styles.goalItemTitle}>{goal.title}</Text>
              <Text style={styles.muted}>{goal.dueType === 'date' ? goal.dueDate : '기한 없음'}</Text>
            </Pressable>
          ))}

          <Text style={styles.modalSection}>전체 목표</Text>
          {allGoalsWithoutRecent.map((goal) => (
            <Pressable key={goal.id} style={styles.goalItem} onPress={() => openOrCreateGoalPlan(goal.id)}>
              <Text style={styles.goalItemTitle}>{goal.title}</Text>
              <Text style={styles.muted}>{goal.dueType === 'date' ? goal.dueDate : '기한 없음'}</Text>
            </Pressable>
          ))}
        </>
      )}

      <Pressable style={styles.modalCloseBtn} onPress={() => setPickerVisible(false)}>
        <Text style={styles.modalCloseText}>닫기</Text>
      </Pressable>
    </View>
  );

  const useFlat = !selectedPlan || Platform.OS === 'web';

  return (
    <>
      {useFlat ? (
        <FlatList
          style={styles.container}
          contentContainerStyle={styles.content}
          data={selectedPlan ? tasks : []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderPlanHub}
          renderItem={({ item, index }) => (
            <View style={styles.taskCard}>
              <View style={styles.taskRow}>
                <Pressable style={styles.checkbox} onPress={() => toggleTaskDone(item.id)}>
                  <Text style={styles.checkboxText}>{item.status === 'done' ? '✓' : ''}</Text>
                </Pressable>
                <TextInput
                  style={styles.taskInput}
                  value={item.title}
                  onChangeText={(text) => updateTask(item.id, { title: text })}
                  onBlur={() => onTaskTitleBlur(item.id, item.title)}
                />
              </View>
              <View style={styles.taskActions}>
                <Pressable
                  style={styles.ghostButton}
                  onPress={() => {
                    if (!selectedPlan) return;
                    const ordered = tasks.map((task) => task.id);
                    const next = index - 1;
                    if (next < 0) return;
                    const [picked] = ordered.splice(index, 1);
                    ordered.splice(next, 0, picked);
                    reorderTask(selectedPlan.id, ordered);
                  }}
                >
                  <Text style={styles.ghostButtonText}>Up</Text>
                </Pressable>
                <Pressable
                  style={styles.ghostButton}
                  onPress={() => {
                    if (!selectedPlan) return;
                    const ordered = tasks.map((task) => task.id);
                    const next = index + 1;
                    if (next >= ordered.length) return;
                    const [picked] = ordered.splice(index, 1);
                    ordered.splice(next, 0, picked);
                    reorderTask(selectedPlan.id, ordered);
                  }}
                >
                  <Text style={styles.ghostButtonText}>Down</Text>
                </Pressable>
                <Pressable style={styles.ghostButton} onPress={() => onToggleTop3(item.id)}>
                  <Text style={styles.ghostButtonText}>☆ Top3</Text>
                </Pressable>
                <Pressable style={styles.ghostButton} onPress={() => handleDeleteTask(item.id)}>
                  <Text style={styles.ghostButtonText}>삭제</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListFooterComponent={<View style={{ height: 12 }} />}
        />
      ) : (
        <DraggableFlatList
          style={styles.container}
          contentContainerStyle={styles.content}
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTaskItem}
          onDragEnd={({ data }) => {
            reorderTask(selectedPlan.id, data.map((task) => task.id));
            showToast('Task 순서를 변경했습니다.', 'success');
          }}
          activationDistance={8}
          ListHeaderComponent={renderPlanHub}
          ListFooterComponent={<View style={{ height: 12 }} />}
        />
      )}

      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalOverlay}>{goalPickerBody}</View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f5' },
  content: { padding: 16, gap: 12 },
  headerBlock: { gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  sectionTitle: { fontWeight: '700', fontSize: 16, marginTop: 4 },
  primaryCreateBtn: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryCreateBtnText: { color: '#fff', fontWeight: '700' },
  planCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 10,
    backgroundColor: '#fff',
    gap: 6,
  },
  planCardActive: { borderColor: '#0f766e', backgroundColor: '#f0fdfa' },
  planCardTitle: { fontWeight: '700', fontSize: 15 },
  badgeText: { color: '#0f766e', fontWeight: '700', fontSize: 12 },
  previewText: { color: '#334155', fontSize: 12 },
  cardActionRow: { flexDirection: 'row', gap: 8 },
  inlineActionBtn: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  inlineActionText: { color: '#334155', fontWeight: '600' },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    padding: 12,
    gap: 8,
  },
  emptyTitle: { fontWeight: '700', color: '#111827' },
  detailHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailHeaderActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  reviewButton: {
    borderRadius: 8,
    backgroundColor: '#1f2937',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reviewButtonText: { color: '#fff', fontWeight: '700' },
  dangerButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: '#fff1f2',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dangerButtonText: { color: '#b91c1c', fontWeight: '700' },
  noteInput: {
    minHeight: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    padding: 10,
    textAlignVertical: 'top',
  },
  top3Wrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    padding: 10,
    gap: 8,
  },
  top3Badge: { backgroundColor: '#dbeafe', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  top3Text: { color: '#1e40af', fontWeight: '600' },
  addRow: { flexDirection: 'row', gap: 8 },
  addInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  primaryButton: { backgroundColor: '#0f766e', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  primaryButtonText: { color: 'white', fontWeight: '700' },
  muted: { color: '#6b7280' },
  hint: { color: '#64748b', fontSize: 12 },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 10,
    gap: 8,
    marginTop: 8,
  },
  taskCardActive: { borderColor: '#0f766e', shadowColor: '#0f172a', shadowOpacity: 0.14, shadowRadius: 10 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4b5563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxText: { fontWeight: '700' },
  taskInput: { flex: 1, borderBottomWidth: 1, borderColor: '#d1d5db', paddingVertical: 4 },
  dragHandle: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dragHandleText: { fontSize: 16, color: '#334155', fontWeight: '700' },
  taskActions: { flexDirection: 'row', gap: 8 },
  ghostButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ghostButtonText: { color: '#334155', fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 14,
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalSearch: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modalSection: { fontWeight: '700', color: '#334155', marginTop: 4 },
  goalItem: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  goalItemTitle: { fontWeight: '700', color: '#0f172a' },
  modalCloseBtn: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#94a3b8',
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCloseText: { color: '#334155', fontWeight: '700' },
});
