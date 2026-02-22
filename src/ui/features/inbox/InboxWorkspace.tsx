import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth/useAuth';
import { useToast } from '@/src/components/toast/ToastProvider';
import { getWeekPeriod } from '@/src/core/time/week';
import { isBlank, normalizeTitle } from '@/src/core/validation/form';
import {
  assignTaskToGoalWeek,
  quickAddInboxTask,
  softDeleteTask,
  undoSoftDeleteTask,
} from '@/src/services/taskService';
import { selectInboxTasks } from '@/src/state/selectors/planSelectors';
import { useAppStore } from '@/src/state/store';
import { Button, Card, EmptyState, GoalDueBadge, Icon, Input, Label, Surface } from '@/src/ui/components';
import { ResponsiveShell } from '@/src/ui/layout/ResponsiveShell';
import { useBreakpoint } from '@/src/ui/layout/useBreakpoint';

type Rect = { x: number; y: number; width: number; height: number };

export function InboxWorkspace() {
  const router = useRouter();
  const { showToast } = useToast();
  const { signOut } = useAuth();
  const { isDesktop } = useBreakpoint();

  const [quickTitle, setQuickTitle] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sheetTaskId, setSheetTaskId] = useState<string | null>(null);
  const [draggingTask, setDraggingTask] = useState<{ id: string; title: string } | null>(null);
  const [hoverGoalId, setHoverGoalId] = useState<string | null>(null);
  const draggingTaskRef = useRef<{ id: string; title: string } | null>(null);
  const hoverGoalIdRef = useRef<string | null>(null);

  const goalRefs = useRef<Record<string, any>>({});
  const goalRects = useRef<Record<string, Rect>>({});
  const pulse = useRef(new Animated.Value(0)).current;

  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const dragOpacity = useRef(new Animated.Value(0)).current;

  const ensureInboxGoal = useAppStore((state) => state.ensureInboxGoal);
  const plans = useAppStore((state) => state.plans);
  const goals = useAppStore((state) => state.goals);
  const inboxTasks = useAppStore((state) => selectInboxTasks(state));

  const assignableGoals = useMemo(
    () =>
      Object.values(goals)
        .filter((goal) => goal.status === 'active' && goal.systemType !== 'inbox')
        .sort((a, b) => a.title.localeCompare(b.title)),
    [goals],
  );

  useEffect(() => {
    ensureInboxGoal();
  }, [ensureInboxGoal]);

  useEffect(() => {
    if (selectedTaskId && !inboxTasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [inboxTasks, selectedTaskId]);

  useEffect(() => {
    if (!hoverGoalId || !draggingTask) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 380, useNativeDriver: true }),
      ]),
    );
    loop.start();

    return () => {
      loop.stop();
    };
  }, [draggingTask, hoverGoalId, pulse]);

  const selectedTask = useMemo(
    () => inboxTasks.find((task) => task.id === selectedTaskId) ?? inboxTasks[0] ?? null,
    [inboxTasks, selectedTaskId],
  );

  const setDraggingState = (task: { id: string; title: string } | null) => {
    draggingTaskRef.current = task;
    setDraggingTask(task);
  };

  const setHoverState = (goalId: string | null) => {
    hoverGoalIdRef.current = goalId;
    setHoverGoalId(goalId);
  };

  const refreshGoalRects = () => {
    const entries = Object.entries(goalRefs.current);
    entries.forEach(([goalId, ref]) => {
      if (!ref?.measureInWindow) {
        return;
      }

      ref.measureInWindow((x: number, y: number, width: number, height: number) => {
        goalRects.current[goalId] = { x, y, width, height };
      });
    });
  };

  const detectHoveredGoal = (x: number, y: number) => {
    const match = Object.entries(goalRects.current).find(([, rect]) => {
      const inX = x >= rect.x && x <= rect.x + rect.width;
      const inY = y >= rect.y && y <= rect.y + rect.height;
      return inX && inY;
    });
    setHoverState(match?.[0] ?? null);
  };

  const assignTaskAndNavigate = (taskId: string, goalId: string) => {
    const weekStart = getWeekPeriod(new Date()).start.toISOString();
    const planId = assignTaskToGoalWeek(useAppStore.getState(), taskId, goalId, weekStart);
    setSelectedTaskId(null);
    showToast('할 일을 목표로 분류했습니다.', 'success');

    if (!isDesktop) {
      router.replace(`/plan/${planId}`);
    }
  };

  const onQuickAdd = () => {
    const title = normalizeTitle(quickTitle);
    if (isBlank(title)) {
      showToast('입력값이 비어 있습니다.', 'error');
      return;
    }

    const taskId = quickAddInboxTask(useAppStore.getState(), title, getWeekPeriod(new Date()).start.toISOString());
    setQuickTitle('');
    setSelectedTaskId(taskId);
    showToast('인박스 할 일을 추가했습니다.', 'success');
  };

  const onDelete = (taskId: string) => {
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

  const createDragResponder = (taskId: string, title: string) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_event, gestureState) =>
        isDesktop && (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3),
      onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
        isDesktop && (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        if (!isDesktop) return;
        refreshGoalRects();
        setDraggingState({ id: taskId, title });
        setHoverState(null);
        dragScale.setValue(1);
        dragOpacity.setValue(1);
        dragX.setValue(event.nativeEvent.pageX);
        dragY.setValue(event.nativeEvent.pageY);
      },
      onPanResponderMove: (_event, gesture) => {
        if (!isDesktop) return;
        dragX.setValue(gesture.moveX);
        dragY.setValue(gesture.moveY);
        detectHoveredGoal(gesture.moveX, gesture.moveY);
      },
      onPanResponderRelease: (_event, gesture) => {
        if (!isDesktop) return;
        const currentDraggingTask = draggingTaskRef.current;
        const targetGoalId = hoverGoalIdRef.current;
        if (!currentDraggingTask) return;

        if (targetGoalId) {
          Animated.parallel([
            Animated.timing(dragScale, { toValue: 0.2, duration: 170, useNativeDriver: true }),
            Animated.timing(dragOpacity, { toValue: 0, duration: 170, useNativeDriver: true }),
          ]).start(() => {
            assignTaskAndNavigate(currentDraggingTask.id, targetGoalId);
            setDraggingState(null);
            setHoverState(null);
          });
        } else {
          Animated.timing(dragOpacity, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
            setDraggingState(null);
            setHoverState(null);
          });
        }

        detectHoveredGoal(gesture.moveX, gesture.moveY);
      },
      onPanResponderTerminate: () => {
        setDraggingState(null);
        setHoverState(null);
      },
    });

  const leftPanel = (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ gap: 12 }}
      scrollEnabled={!isDesktop || !draggingTask}
      keyboardShouldPersistTaps="handled"
    >
      <Surface>
        <Label className="mb-2 text-base font-semibold">빠른 추가</Label>
        <View className="flex-row gap-2">
          <Input className="flex-1" value={quickTitle} onChangeText={setQuickTitle} placeholder="할 일 입력" onSubmitEditing={onQuickAdd} />
          <Button
            label="할 일 추가"
            variant="primary"
            iconLeft={<Icon name="plus" size={14} color="#f2f4f8" />}
            onPress={onQuickAdd}
          />
        </View>
      </Surface>
      <View className="flex-row justify-end gap-2">
        <Button
          label="휴지통"
          variant="ghost"
          iconLeft={<Icon name="trash-2" size={14} color="#9aa1ae" />}
          onPress={() => router.push('/trash')}
        />
        {!isDesktop ? (
          <Button
            label="로그아웃"
            variant="ghost"
            iconLeft={<Icon name="x-circle" size={14} color="#9aa1ae" />}
            onPress={async () => {
              const error = await signOut();
              if (error) {
                showToast(error.message, 'error');
                return;
              }
              showToast('로그아웃되었습니다.', 'success');
              router.replace('/sign-in');
            }}
          />
        ) : null}
      </View>

      {inboxTasks.length === 0 ? <EmptyState title="인박스 할 일이 없습니다" /> : null}
      {inboxTasks.map((task) => {
        const plan = plans[task.planId];
        const active = selectedTask?.id === task.id;
        const pan = isDesktop ? createDragResponder(task.id, task.title) : null;

        return (
          <View key={task.id} {...(pan ? pan.panHandlers : {})}>
            <Card className={active ? 'border-accent bg-surface-2' : ''}>
              <Pressable onPress={() => setSelectedTaskId(task.id)} onLongPress={() => !isDesktop && setSheetTaskId(task.id)} delayLongPress={200}>
                <Label className="text-base">{task.title}</Label>
              </Pressable>
              <View className="flex-row items-center gap-2">
                <Icon name="target" size={13} color="#9aa1ae" />
                <Label muted className="text-sm">목표: {goals[task.goalId]?.title ?? '인박스'}</Label>
              </View>
              <View className="flex-row items-center gap-2">
                <Icon name="calendar" size={13} color="#9aa1ae" />
                <Label muted className="text-sm">주차: {plan?.periodStart ?? '-'}</Label>
              </View>
              {isDesktop ? <Label muted className="mb-2 text-xs">카드를 누른 채로 이동하면 드래그됩니다.</Label> : null}
              <View className="flex-row gap-2">
                {!isDesktop ? (
                  <Button
                    label="배정"
                    variant="secondary"
                    iconLeft={<Icon name="arrow-right-circle" size={14} color="#9aa1ae" />}
                    onPress={() => router.push({ pathname: '/assign-goal', params: { taskId: task.id } })}
                  />
                ) : null}
                <Button
                  label="삭제"
                  variant="danger"
                  iconLeft={<Icon name="trash-2" size={14} color="#ff6b63" />}
                  onPress={() => onDelete(task.id)}
                />
              </View>
            </Card>
          </View>
        );
      })}
    </ScrollView>
  );

  const centerPanel = (
    <ScrollView className="flex-1" contentContainerStyle={{ gap: 12 }}>
      {isDesktop ? (
        <>
          <Surface>
            <Label className="mb-1 text-lg font-semibold">드래그로 배정</Label>
            <Label muted className="text-sm">왼쪽 할 일을 드래그해 목표 카드 위에 놓으세요.</Label>
          </Surface>
          <View className="flex-row flex-wrap gap-3">
            {assignableGoals.map((goal) => {
              const isHovered = hoverGoalId === goal.id && Boolean(draggingTask);

              return (
                <Animated.View
                  key={goal.id}
                  ref={(node: any) => {
                    goalRefs.current[goal.id] = node;
                  }}
                  onLayout={refreshGoalRects}
                  style={
                    isHovered
                      ? {
                          transform: [
                            {
                              scale: pulse.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 1.03],
                              }),
                            },
                          ],
                        }
                      : undefined
                  }
                  className="w-[48%]"
                >
                  <Card className={isHovered ? 'border-2 border-accent bg-surface-2' : 'border border-border bg-surface'}>
                    <View className="flex-row items-start justify-between gap-2">
                      <Label className="text-base font-semibold">{goal.title}</Label>
                      {isHovered ? (
                        <View className="rounded-full border border-accent bg-accent/20 px-2 py-1">
                          <Text className="text-[11px] font-semibold text-accent">여기에 놓기</Text>
                        </View>
                      ) : (
                        <View className="rounded-full border border-border bg-surface-2 px-2 py-1">
                          <Text className="text-[11px] font-semibold text-text-muted">드롭 영역</Text>
                        </View>
                      )}
                    </View>
                    <GoalDueBadge goal={goal} style={{ marginTop: 6, marginBottom: 2 }} />
                    <Label muted className="mt-1 text-sm">드래그 중 카드가 올라오면 자동 강조됩니다.</Label>
                    <View className="mt-3">
                      <Button
                        label="선택 항목 배정"
                        variant="ghost"
                        iconLeft={<Icon name="arrow-right-circle" size={14} color="#9aa1ae" />}
                        onPress={() => {
                          if (!selectedTask) {
                            showToast('먼저 인박스 할 일을 선택하세요.', 'error');
                            return;
                          }
                          assignTaskAndNavigate(selectedTask.id, goal.id);
                        }}
                      />
                    </View>
                  </Card>
                </Animated.View>
              );
            })}
          </View>
        </>
      ) : selectedTask ? (
        <Surface>
          <Label className="mb-2 text-lg font-semibold">선택된 인박스 할 일</Label>
          <Label className="mb-1 text-base">{selectedTask.title}</Label>
          <Label muted className="text-sm">길게 눌러 목표 선택 시트를 여세요.</Label>
        </Surface>
      ) : (
        <EmptyState title="선택된 할 일이 없습니다" description="왼쪽 리스트에서 인박스 할 일을 선택하세요." />
      )}
    </ScrollView>
  );

  const sheetTask = sheetTaskId ? inboxTasks.find((task) => task.id === sheetTaskId) : null;

  return (
    <>
      <ResponsiveShell
        section="inbox"
        mobile={<ScrollView className="flex-1 bg-bg p-4">{leftPanel}</ScrollView>}
        desktopLeft={leftPanel}
        desktopCenter={centerPanel}
      />

      {draggingTask ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: dragX,
            top: dragY,
            transform: [{ translateX: -50 }, { translateY: -18 }, { scale: dragScale }],
            opacity: dragOpacity,
            zIndex: 999,
          }}
        >
          <View className="rounded-[10px] border border-accent bg-surface-2 px-3 py-2">
            <Text className="max-w-[220px] text-sm text-text">{draggingTask.title}</Text>
          </View>
        </Animated.View>
      ) : null}

      <Modal visible={Boolean(sheetTask)} transparent animationType="slide" onRequestClose={() => setSheetTaskId(null)}>
        <View className="flex-1 justify-end bg-black/45">
          <View className="max-h-[70%] rounded-t-[16px] border border-border bg-surface p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Label className="text-base font-semibold">목표 선택</Label>
              <Button label="닫기" variant="ghost" size="sm" onPress={() => setSheetTaskId(null)} />
            </View>
            <Label muted className="mb-3 text-sm">{sheetTask?.title ?? ''}</Label>

            <ScrollView contentContainerStyle={{ gap: 8 }}>
              {assignableGoals.map((goal) => (
                <Card key={goal.id}>
                  <View className="gap-2">
                    <View className="flex-row items-center justify-between gap-2">
                      <Label className="text-sm">{goal.title}</Label>
                    <Button
                      label="배정"
                      variant="primary"
                      size="sm"
                      iconLeft={<Icon name="arrow-right-circle" size={13} color="#f2f4f8" />}
                      onPress={() => {
                        if (!sheetTask) return;
                        assignTaskAndNavigate(sheetTask.id, goal.id);
                          setSheetTaskId(null);
                        }}
                      />
                    </View>
                    <GoalDueBadge goal={goal} />
                  </View>
                </Card>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
