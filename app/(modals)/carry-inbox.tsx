import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { applyCarryActionsAndEnsureNextPlan } from '@/src/services/carryService';
import { useToast } from '@/src/components/toast/ToastProvider';
import { selectTasksByPlan } from '@/src/state/selectors/planSelectors';
import { selectCarryDraft } from '@/src/state/selectors/reviewSelectors';
import { useAppStore } from '@/src/state/store';

const ACTIONS = ['carry', 'split', 'drop', 'rescope'] as const;

export default function CarryInboxModal() {
  const router = useRouter();
  const { showToast } = useToast();

  const selectedPlanId = useAppStore((state) => state.selectedPlanId);
  const plans = useAppStore((state) => state.plans);
  const goals = useAppStore((state) => state.goals);
  const setSelectedPlanId = useAppStore((state) => state.setSelectedPlanId);
  const setSelectedWeekStart = useAppStore((state) => state.setSelectedWeekStart);

  const setCarryDecision = useAppStore((state) => state.setCarryDecision);
  const setDropNote = useAppStore((state) => state.setDropNote);
  const setRescopeTitle = useAppStore((state) => state.setRescopeTitle);
  const setSplitChildren = useAppStore((state) => state.setSplitChildren);
  const bulkCarryUndecided = useAppStore((state) => state.bulkCarryUndecided);

  const plan = selectedPlanId ? plans[selectedPlanId] : null;
  const tasks = useAppStore((state) => (plan ? selectTasksByPlan(state, plan.id) : []));
  const draft = useAppStore((state) => (plan ? selectCarryDraft(state, plan.id) : {}));

  const incompleteTasks = useMemo(() => tasks.filter((task) => task.status === 'todo'), [tasks]);

  const validateBeforeApply = () => {
    for (const task of incompleteTasks) {
      const decision = draft[task.id];

      if (decision?.action === 'rescope' && !decision.rescopeTitle.trim()) {
        showToast(`"${task.title}"의 Rescope 제목을 입력하세요.`, 'error');
        return false;
      }

      if (decision?.action === 'split') {
        const validChildren = decision.splitTitles.map((title) => title.trim()).filter(Boolean);
        if (validChildren.length === 0) {
          showToast(`"${task.title}"의 Split 하위 Task를 1개 이상 입력하세요.`, 'error');
          return false;
        }
      }
    }
    return true;
  };

  const applyAndClose = () => {
    if (!plan) {
      return;
    }

    if (!validateBeforeApply()) {
      return;
    }

    const nextPlanId = applyCarryActionsAndEnsureNextPlan(useAppStore.getState(), plan.id, {
      defaultUndecidedToCarry: true,
    });
    const latestState = useAppStore.getState();
    const nextPlan = latestState.plans[nextPlanId];
    if (nextPlan) {
      setSelectedWeekStart(nextPlan.periodStart);
      setSelectedPlanId(nextPlanId);
    }

    showToast('Carry 적용 후 다음 주 목표 플랜으로 이동합니다.', 'success');
    router.dismiss();
    router.replace('/plan');
  };

  if (!plan) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text style={styles.title}>Carry Inbox</Text>
        <Text style={styles.subtitle}>선택된 목표 플랜이 없습니다. Review에서 플랜을 먼저 선택하세요.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Carry Inbox</Text>
      <Text style={styles.subtitle}>{goals[plan.goalId]?.title ?? 'Unknown'} · 미완료 Task 처리</Text>

      <Pressable
        style={styles.ghostButton}
        onPress={() => {
          bulkCarryUndecided(
            plan.id,
            incompleteTasks.map((task) => task.id),
          );
          showToast('미선택 항목을 carry로 지정했습니다.', 'info');
        }}
      >
        <Text style={styles.ghostButtonText}>일괄 Carry (미선택만)</Text>
      </Pressable>

      {incompleteTasks.map((task) => {
        const decision = draft[task.id];
        const splitTitles = decision?.splitTitles?.length ? decision.splitTitles : [''];

        return (
          <View key={task.id} style={styles.card}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <View style={styles.actionRow}>
              {ACTIONS.map((action) => (
                <Pressable
                  key={action}
                  style={[
                    styles.actionChip,
                    decision?.action === action ? styles.actionChipSelected : undefined,
                  ]}
                  onPress={() => setCarryDecision(plan.id, task.id, action)}
                >
                  <Text style={styles.actionText}>{action}</Text>
                </Pressable>
              ))}
            </View>

            {decision?.action === 'drop' ? (
              <TextInput
                style={styles.input}
                placeholder="Drop 사유 (선택)"
                value={decision.note}
                onChangeText={(text) => setDropNote(plan.id, task.id, text)}
              />
            ) : null}

            {decision?.action === 'rescope' ? (
              <>
                <TextInput
                  style={[styles.input, !decision.rescopeTitle.trim() ? styles.inputWarning : undefined]}
                  placeholder="더 작은 버전 제목 (필수)"
                  value={decision.rescopeTitle}
                  onChangeText={(text) => setRescopeTitle(plan.id, task.id, text)}
                />
                {!decision.rescopeTitle.trim() ? (
                  <Text style={styles.warningText}>Rescope 제목이 필요합니다.</Text>
                ) : null}
              </>
            ) : null}

            {decision?.action === 'split' ? (
              <View style={styles.splitWrap}>
                {splitTitles.map((title, idx) => (
                  <TextInput
                    key={`${task.id}-split-${idx}`}
                    style={styles.input}
                    placeholder={`하위 Task ${idx + 1}`}
                    value={title}
                    onChangeText={(text) => {
                      const next = [...splitTitles];
                      next[idx] = text;
                      setSplitChildren(plan.id, task.id, next);
                    }}
                  />
                ))}
                {splitTitles.map((title) => title.trim()).filter(Boolean).length === 0 ? (
                  <Text style={styles.warningText}>Split 하위 Task를 1개 이상 입력하세요.</Text>
                ) : null}
                <Pressable
                  style={styles.smallButton}
                  onPress={() => setSplitChildren(plan.id, task.id, [...splitTitles, ''])}
                >
                  <Text style={styles.smallButtonText}>+ add subtask</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}

      <Pressable style={styles.primaryButton} onPress={applyAndClose}>
        <Text style={styles.primaryButtonText}>Apply & Next Week Plan</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 12 },
  empty: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#475569' },
  ghostButton: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingVertical: 10,
    alignItems: 'center',
  },
  ghostButtonText: { fontWeight: '600', color: '#334155' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 10,
    gap: 8,
  },
  taskTitle: { fontWeight: '700', fontSize: 15 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  actionChipSelected: { borderColor: '#0f766e', backgroundColor: '#ccfbf1' },
  actionText: { color: '#334155', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inputWarning: { borderColor: '#f59e0b' },
  warningText: { color: '#b45309', fontSize: 12 },
  splitWrap: { gap: 8 },
  smallButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallButtonText: { color: '#334155', fontWeight: '600' },
  primaryButton: {
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
});
