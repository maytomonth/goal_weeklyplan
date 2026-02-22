import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface DatePickerCalendarProps {
  value?: string;
  onChange: (dateKey: string) => void;
}

interface CalendarDay {
  year: number;
  month: number;
  day: number;
  key: string;
}

const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'];
const DAY_MS = 24 * 60 * 60 * 1000;

function todayDateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function parseDateKey(value?: string): { year: number; month: number; day: number } | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return { year, month, day };
}

function normalizeDateKey(value?: string): string {
  const parsed = parseDateKey(value);
  if (!parsed) return todayDateKey();
  return `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`;
}

function buildCalendarDays(anchorYear: number, anchorMonth: number): CalendarDay[] {
  const firstOfMonthMs = Date.UTC(anchorYear, anchorMonth - 1, 1, 12, 0, 0, 0);
  const first = new Date(firstOfMonthMs);
  const dayOfWeek = first.getUTCDay();
  const daysFromMonday = (dayOfWeek + 6) % 7;
  const firstCellMs = firstOfMonthMs - daysFromMonday * DAY_MS;

  return Array.from({ length: 42 }, (_, idx) => {
    const cell = new Date(firstCellMs + idx * DAY_MS);
    const year = cell.getUTCFullYear();
    const month = cell.getUTCMonth() + 1;
    const day = cell.getUTCDate();
    return {
      year,
      month,
      day,
      key: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    };
  });
}

export function DatePickerCalendar({ value, onChange }: DatePickerCalendarProps) {
  const selectedKey = normalizeDateKey(value);
  const selectedParts = parseDateKey(selectedKey)!;
  const [monthAnchor, setMonthAnchor] = useState({
    year: selectedParts.year,
    month: selectedParts.month,
  });

  useEffect(() => {
    const next = parseDateKey(selectedKey);
    if (!next) return;
    setMonthAnchor({ year: next.year, month: next.month });
  }, [selectedKey]);

  const todayKey = todayDateKey();
  const days = useMemo(() => buildCalendarDays(monthAnchor.year, monthAnchor.month), [monthAnchor]);
  const rows = useMemo(() => Array.from({ length: 6 }, (_, row) => days.slice(row * 7, row * 7 + 7)), [days]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable
          style={styles.monthButton}
          onPress={() =>
            setMonthAnchor((prev) => {
              const month = prev.month - 1;
              if (month < 1) {
                return { year: prev.year - 1, month: 12 };
              }
              return { year: prev.year, month };
            })
          }
        >
          <Text style={styles.monthButtonText}>←</Text>
        </Pressable>
        <Text style={styles.monthLabel}>
          {monthAnchor.year}.{String(monthAnchor.month).padStart(2, '0')}
        </Text>
        <Pressable
          style={styles.monthButton}
          onPress={() =>
            setMonthAnchor((prev) => {
              const month = prev.month + 1;
              if (month > 12) {
                return { year: prev.year + 1, month: 1 };
              }
              return { year: prev.year, month };
            })
          }
        >
          <Text style={styles.monthButtonText}>→</Text>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {DAY_NAMES.map((name, idx) => (
          <Text key={`${name}-${idx}`} style={styles.weekdayText}>
            {name}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {rows.map((row, rowIdx) => (
          <View key={`date-row-${rowIdx}`} style={styles.weekRow}>
            {row.map((day) => {
              const inMonth = day.month === monthAnchor.month;
              const selected = day.key === selectedKey;
              const today = day.key === todayKey;
              return (
                <Pressable
                  key={day.key}
                  style={[
                    styles.dayCell,
                    !inMonth ? styles.dayOutOfMonth : undefined,
                    selected ? styles.daySelected : undefined,
                    today ? styles.dayToday : undefined,
                  ]}
                  onPress={() => onChange(day.key)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !inMonth ? styles.dayTextOutOfMonth : undefined,
                      selected ? styles.dayTextSelected : undefined,
                    ]}
                  >
                    {day.day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#2a2d36',
    borderRadius: 14,
    backgroundColor: '#121319',
    padding: 10,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2d36',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1c24',
  },
  monthButtonText: { color: '#f2f4f8', fontWeight: '700' },
  monthLabel: { color: '#f2f4f8', fontWeight: '700', fontSize: 15 },
  weekdayRow: { flexDirection: 'row' },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    color: '#9aa1ae',
    fontSize: 12,
    fontWeight: '600',
  },
  grid: { gap: 4 },
  weekRow: { flexDirection: 'row' },
  dayCell: {
    flex: 1,
    minHeight: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#121319',
    marginHorizontal: 2,
  },
  dayOutOfMonth: { opacity: 0.45 },
  daySelected: {
    borderColor: '#0a84ff',
    backgroundColor: '#16263a',
  },
  dayToday: { borderColor: '#4e5563' },
  dayText: {
    color: '#f2f4f8',
    fontSize: 12,
    fontWeight: '600',
  },
  dayTextOutOfMonth: { color: '#657083' },
  dayTextSelected: { color: '#9ad5ff' },
});
