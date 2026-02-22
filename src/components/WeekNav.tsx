import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getWeekPeriod } from '@/src/core/time/week';

interface WeekNavProps {
  weekStartIso: string;
  onSelectWeekStart: (weekStartIso: string) => void;
  onMoveCurrentWeek: () => void;
}

interface KstDay {
  year: number;
  month: number;
  day: number;
  weekday: number;
  key: string;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toKstShifted(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

function fromKstShifted(shifted: Date): Date {
  return new Date(shifted.getTime() - KST_OFFSET_MS);
}

function toKstParts(date: Date): KstDay {
  const shifted = toKstShifted(date);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const weekday = shifted.getUTCDay();

  return {
    year,
    month,
    day,
    weekday,
    key: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

function kstPartsToStableDate(year: number, month: number, day: number): Date {
  const shiftedMs = Date.UTC(year, month - 1, day, 12, 0, 0, 0);
  return fromKstShifted(new Date(shiftedMs));
}

function monthLabel(year: number, month: number): string {
  return `${year}.${String(month).padStart(2, '0')}`;
}

function addKstDays(base: KstDay, delta: number): KstDay {
  const shiftedMs = Date.UTC(base.year, base.month - 1, base.day, 12, 0, 0, 0) + delta * DAY_MS;
  const shifted = new Date(shiftedMs);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    key: `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`,
  };
}

function buildCalendarDays(anchorYear: number, anchorMonth: number): KstDay[] {
  const firstOfMonthShiftedMs = Date.UTC(anchorYear, anchorMonth - 1, 1, 12, 0, 0, 0);
  const firstOfMonthShifted = new Date(firstOfMonthShiftedMs);
  const dayOfWeek = firstOfMonthShifted.getUTCDay();
  // Calendar view starts on Sunday while week logic stays Monday-based.
  const daysFromSunday = dayOfWeek;
  const firstCellShiftedMs = firstOfMonthShiftedMs - daysFromSunday * DAY_MS;

  return Array.from({ length: 42 }, (_, index) => {
    const shifted = new Date(firstCellShiftedMs + index * DAY_MS);
    const year = shifted.getUTCFullYear();
    const month = shifted.getUTCMonth() + 1;
    const day = shifted.getUTCDate();

    return {
      year,
      month,
      day,
      weekday: shifted.getUTCDay(),
      key: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    };
  });
}

export function WeekNav({ weekStartIso, onSelectWeekStart, onMoveCurrentWeek }: WeekNavProps) {
  const selectedWeekStart = new Date(weekStartIso);
  const selectedKst = toKstParts(selectedWeekStart);
  const [monthAnchor, setMonthAnchor] = useState({
    year: selectedKst.year,
    month: selectedKst.month,
  });

  useEffect(() => {
    const next = toKstParts(new Date(weekStartIso));
    setMonthAnchor({
      year: next.year,
      month: next.month,
    });
  }, [weekStartIso]);

  const nowWeekStart = getWeekPeriod(new Date()).start.toISOString();
  const isCurrentWeek = weekStartIso === nowWeekStart;

  const calendarDays = useMemo(() => buildCalendarDays(monthAnchor.year, monthAnchor.month), [monthAnchor]);
  const weekRows = useMemo(() => Array.from({ length: 6 }, (_, row) => calendarDays.slice(row * 7, row * 7 + 7)), [calendarDays]);

  const selectedWeekKeys = useMemo(() => {
    const weekStartKst = toKstParts(selectedWeekStart);
    return new Set(Array.from({ length: 7 }, (_, index) => addKstDays(weekStartKst, index).key));
  }, [selectedWeekStart]);
  const selectedWeekStartKey = useMemo(() => toKstParts(selectedWeekStart).key, [selectedWeekStart]);
  const selectedWeekEndKey = useMemo(
    () => addKstDays(toKstParts(selectedWeekStart), 6).key,
    [selectedWeekStart],
  );

  const onPickDay = (day: KstDay) => {
    const stableDate = kstPartsToStableDate(day.year, day.month, day.day);
    const weekStart = getWeekPeriod(stableDate).start;
    onSelectWeekStart(weekStart.toISOString());
  };

  const todayKey = toKstParts(new Date()).key;

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
        <Text style={styles.monthLabel}>{monthLabel(monthAnchor.year, monthAnchor.month)}</Text>
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
        {weekRows.map((row, rowIndex) => (
          <View key={`week-row-${rowIndex}`} style={styles.weekRow}>
            {row.map((day) => {
              const isInMonth = day.month === monthAnchor.month;
              const inSelectedWeek = selectedWeekKeys.has(day.key);
              const isToday = day.key === todayKey;
              const isWeekStart = day.key === selectedWeekStartKey;
              const isWeekEnd = day.key === selectedWeekEndKey;
              const isWeekMiddle = inSelectedWeek && !isWeekStart && !isWeekEnd;

              return (
                <Pressable
                  key={day.key}
                  style={[
                    styles.dayCell,
                    !isInMonth ? styles.dayOutOfMonth : undefined,
                    inSelectedWeek ? styles.dayInSelectedWeek : undefined,
                    isWeekStart ? styles.dayWeekStart : undefined,
                    isWeekMiddle ? styles.dayWeekMiddle : undefined,
                    isWeekEnd ? styles.dayWeekEnd : undefined,
                    isToday ? styles.dayToday : undefined,
                  ]}
                  onPress={() => onPickDay(day)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !isInMonth ? styles.dayTextOutOfMonth : undefined,
                      inSelectedWeek ? styles.dayTextSelectedWeek : undefined,
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

      <View style={styles.weekActionRow}>
        <Pressable
          style={styles.weekNavButton}
          onPress={() => {
            const prevStart = new Date(selectedWeekStart.getTime() - 7 * DAY_MS);
            onSelectWeekStart(prevStart.toISOString());
          }}
        >
          <Text style={styles.weekNavButtonText}>← 이전 주</Text>
        </Pressable>

        <Pressable
          style={[styles.currentButton, isCurrentWeek ? styles.currentButtonDisabled : undefined]}
          onPress={onMoveCurrentWeek}
          disabled={isCurrentWeek}
        >
          <Text style={styles.currentButtonText}>이번 주</Text>
        </Pressable>

        <Pressable
          style={styles.weekNavButton}
          onPress={() => {
            const nextStart = new Date(selectedWeekStart.getTime() + 7 * DAY_MS);
            onSelectWeekStart(nextStart.toISOString());
          }}
        >
          <Text style={styles.weekNavButtonText}>다음 주 →</Text>
        </Pressable>
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
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    color: '#9aa1ae',
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    gap: 4,
  },
  weekRow: {
    flexDirection: 'row',
  },
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
  dayOutOfMonth: {
    opacity: 0.45,
  },
  dayInSelectedWeek: {
    borderColor: '#0a84ff66',
    backgroundColor: '#16263a',
  },
  dayWeekStart: {
    marginLeft: 2,
    marginRight: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  dayWeekMiddle: {
    marginHorizontal: 0,
    borderRadius: 0,
  },
  dayWeekEnd: {
    marginLeft: 0,
    marginRight: 2,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  dayToday: {
    borderColor: '#4e5563',
  },
  dayText: {
    color: '#f2f4f8',
    fontSize: 12,
    fontWeight: '600',
  },
  dayTextOutOfMonth: {
    color: '#657083',
  },
  dayTextSelectedWeek: {
    color: '#9ad5ff',
  },
  currentButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0a84ff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#1a2538',
  },
  currentButtonDisabled: { opacity: 0.45 },
  currentButtonText: { color: '#7cc3ff', fontWeight: '700' },
  weekActionRow: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 8,
  },
  weekNavButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2d36',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#1a1c24',
  },
  weekNavButtonText: {
    color: '#c7cddb',
    fontWeight: '700',
  },
});
