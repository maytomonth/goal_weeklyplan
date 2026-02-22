import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useToast } from '@/src/components/toast/ToastProvider';
import { selectTasksByPlan } from '@/src/state/selectors/planSelectors';
import { selectCarryDraft } from '@/src/state/selectors/reviewSelectors';
import { useAppStore } from '@/src/state/store';
import { Icon } from '@/src/ui/components';

const ACTIONS = ['carry', 'split', 'drop', 'rescope'] as const;
const ACTION_LABELS: Record<(typeof ACTIONS)[number], string> = {
  carry: '이월',
  split: '쪼개기',
  drop: '중단',
  rescope: '재정의',
};

export default function CarryInboxModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planId?: string }>();
  const { showToast } = useToast();

  const selectedPlanId = useAppStore((state) => state.selectedPlanId);
  const plans = useAppStore((state) => state.plans);
  const goals = useAppStore((state) => state.goals);

  const setCarryDecision = useAppStore((state) => state.setCarryDecision);
  const setDropNote = useAppStore((state) => state.setDropNote);
  const setRescopeTitle = useAppStore((state) => state.setRescopeTitle);
  const setSplitChildren = useAppStore((state) => state.setSplitChildren);
  const bulkCarryUndecided = useAppStore((state) => state.bulkCarryUndecided);

  const paramPlanId = typeof params.planId === 'string' ? params.planId : null;
  const planId = paramPlanId ?? selectedPlanId;
  const plan = planId ? plans[planId] : null;
  const tasks = useAppStore((state) => (plan ? selectTasksByPlan(state, plan.id) : []));
  const draft = useAppStore((state) => (plan ? selectCarryDraft(state, plan.id) : {}));

  const incompleteTasks = useMemo(() => tasks.filter((task) => task.status === 'todo'), [tasks]);

  const validateDraft = () => {
    for (const task of incompleteTasks) {
      const decision = draft[task.id];
      if (!decision?.action) {
        continue;
      }

      if (decision.action === 'rescope' && !decision.rescopeTitle.trim()) {
        showToast(`"${task.title}"의 재정의 제목을 입력하세요.`, 'error');
        return false;
      }

      if (decision.action === 'split') {
        const validChildren = decision.splitTitles.map((title) => title.trim()).filter(Boolean);
        if (validChildren.length === 0) {
          showToast(`"${task.title}"의 쪼개기 하위 할 일을 1개 이상 입력하세요.`, 'error');
          return false;
        }
      }
    }
    return true;
  };

  const onSaveDraft = () => {
    if (!plan) return;
    if (!validateDraft()) return;
    showToast('저장됨', 'success');
    router.dismiss();
  };

  if (!plan) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text style={styles.title}>미완료 정리</Text>
        <Text style={styles.subtitle}>선택된 목표 플랜이 없습니다. 리뷰에서 플랜을 먼저 선택하세요.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerTexts}>
          <View style={styles.inlineRow}>
            <Icon name="inbox" size={18} color="#f2f4f8" />
            <Text style={styles.title}>미완료 정리</Text>
          </View>
          <Text style={styles.subtitle}>다음 주로 넘길지, 쪼갤지, 제외할지 결정하세요</Text>
          <Text style={styles.goalName}>{goals[plan.goalId]?.title ?? '알 수 없는 목표'}</Text>
        </View>
        <Pressable style={styles.closeButton} onPress={() => router.dismiss()}>
          <Icon name="x" size={14} color="#f2f4f8" />
        </Pressable>
      </View>

      <Pressable
        style={styles.ghostButton}
        onPress={() => {
          bulkCarryUndecided(
            plan.id,
            incompleteTasks.map((task) => task.id),
          );
          showToast('미선택 항목을 이월로 지정했습니다.', 'info');
        }}
      >
        <Text style={styles.ghostButtonText}>일괄 이월</Text>
      </Pressable>

      {incompleteTasks.map((task) => {
        const decision = draft[task.id];
        const splitTitles = decision?.splitTitles?.length ? decision.splitTitles : ['', ''];

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
                  <View style={styles.inlineRow}>
                    {action === 'carry' ? <Icon name="corner-up-right" size={12} color="#f2f4f8" /> : null}
                    {action === 'split' ? <Icon name="git-branch" size={12} color="#f2f4f8" /> : null}
                    {action === 'drop' ? <Icon name="x-circle" size={12} color="#f2f4f8" /> : null}
                    {action === 'rescope' ? <Icon name="circle-alert" size={12} color="#f2f4f8" /> : null}
                    <Text style={styles.actionText}>{ACTION_LABELS[action]}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {decision?.action === 'drop' ? (
              <TextInput
                style={styles.input}
                placeholder="중단 사유 (선택)"
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
                  <Text style={styles.warningText}>재정의 제목이 필요합니다.</Text>
                ) : null}
              </>
            ) : null}

            {decision?.action === 'split' ? (
              <View style={styles.splitWrap}>
                {splitTitles.map((title, idx) => (
                  <TextInput
                    key={`${task.id}-split-${idx}`}
                    style={styles.input}
                    placeholder={`하위 할 일 ${idx + 1}`}
                    value={title}
                    onChangeText={(text) => {
                      const next = [...splitTitles];
                      next[idx] = text;
                      setSplitChildren(plan.id, task.id, next);
                    }}
                  />
                ))}
                {splitTitles.map((title) => title.trim()).filter(Boolean).length === 0 ? (
                  <Text style={styles.warningText}>쪼개기 하위 할 일을 1개 이상 입력하세요.</Text>
                ) : null}
                <Pressable
                  style={styles.smallButton}
                  onPress={() => setSplitChildren(plan.id, task.id, [...splitTitles, ''])}
                >
                  <View style={styles.inlineRow}>
                    <Icon name="plus" size={12} color="#f2f4f8" />
                    <Text style={styles.smallButtonText}>하위 할 일 추가</Text>
                  </View>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}

      <Pressable style={styles.primaryButton} onPress={onSaveDraft}>
        <Text style={styles.primaryButtonText}>저장</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0f' },
  content: { padding: 16, gap: 12 },
  empty: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  headerTexts: { flex: 1, gap: 2 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#9aa1ae' },
  goalName: { color: '#f2f4f8', fontWeight: '700' },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#2a2d36',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121319',
  },
  closeButtonText: { color: '#f2f4f8', fontWeight: '700' },
  ghostButton: {
    borderWidth: 1,
    borderColor: '#2a2d36',
    borderRadius: 10,
    backgroundColor: '#121319',
    paddingVertical: 10,
    alignItems: 'center',
  },
  ghostButtonText: { fontWeight: '600', color: '#f2f4f8' },
  card: {
    backgroundColor: '#121319',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2d36',
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
    backgroundColor: '#121319',
  },
  actionChipSelected: { borderColor: '#0a84ff', backgroundColor: '#10263a' },
  actionText: { color: '#f2f4f8', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#2a2d36',
    borderRadius: 8,
    backgroundColor: '#121319',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inputWarning: { borderColor: '#ffd60a' },
  warningText: { color: '#ffd60a', fontSize: 12 },
  splitWrap: { gap: 8 },
  smallButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#2a2d36',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallButtonText: { color: '#f2f4f8', fontWeight: '600' },
  primaryButton: {
    backgroundColor: '#0a84ff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: { color: '#121319', fontWeight: '700' },
});
