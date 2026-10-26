// Formation slot layouts for the lineup board. Coordinates in percent:
// x = 0 (own goal line) to 100 (opponent goal line), y = 0 (top touchline) to 100.
export interface Slot { id: string; label: string; x: number; y: number; role: string }

const S = (id: string, label: string, x: number, y: number, role: string): Slot => ({ id, label, x, y, role })
const GK = S('GK', '1', 5, 50, 'GK')

export const FORMATIONS: Record<number, Record<string, Slot[]>> = {
  11: {
    '4-3-3': [GK, S('RB', '2', 26, 86, 'FB'), S('RCB', '4', 22, 63, 'CB'), S('LCB', '5', 22, 37, 'CB'), S('LB', '3', 26, 14, 'FB'),
      S('DM', '6', 40, 50, 'DM'), S('RCM', '8', 54, 68, 'CM'), S('LCM', '10', 54, 32, 'CM'),
      S('RW', '7', 76, 88, 'W'), S('ST', '9', 82, 50, 'ST'), S('LW', '11', 76, 12, 'W')],
    '4-2-3-1': [GK, S('RB', '2', 26, 86, 'FB'), S('RCB', '4', 22, 63, 'CB'), S('LCB', '5', 22, 37, 'CB'), S('LB', '3', 26, 14, 'FB'),
      S('RDM', '6', 42, 62, 'DM'), S('LDM', '8', 42, 38, 'CM'), S('AM', '10', 62, 50, 'AM'),
      S('RW', '7', 72, 86, 'W'), S('ST', '9', 84, 50, 'ST'), S('LW', '11', 72, 14, 'W')],
    '3-4-3': [GK, S('RCB', '4', 22, 72, 'CB'), S('CB', '5', 20, 50, 'CB'), S('LCB', '3', 22, 28, 'CB'),
      S('RWB', '2', 50, 90, 'FB'), S('RCM', '6', 44, 60, 'DM'), S('LCM', '8', 44, 40, 'CM'), S('LWB', '14', 50, 10, 'FB'),
      S('RW', '7', 76, 76, 'W'), S('ST', '9', 84, 50, 'ST'), S('LW', '11', 76, 24, 'W')],
    '4-4-2': [GK, S('RB', '2', 26, 86, 'FB'), S('RCB', '4', 22, 63, 'CB'), S('LCB', '5', 22, 37, 'CB'), S('LB', '3', 26, 14, 'FB'),
      S('RM', '7', 54, 86, 'W'), S('RCM', '6', 48, 60, 'DM'), S('LCM', '8', 48, 40, 'CM'), S('LM', '11', 54, 14, 'W'),
      S('RS', '9', 80, 60, 'ST'), S('LS', '10', 80, 40, 'ST')],
    '3-5-2': [GK, S('RCB', '4', 22, 72, 'CB'), S('CB', '5', 20, 50, 'CB'), S('LCB', '3', 22, 28, 'CB'),
      S('RWB', '2', 52, 90, 'FB'), S('DM', '6', 42, 50, 'DM'), S('RCM', '8', 56, 66, 'CM'), S('LCM', '10', 56, 34, 'CM'), S('LWB', '14', 52, 10, 'FB'),
      S('RS', '9', 82, 60, 'ST'), S('LS', '11', 82, 40, 'ST')],
  },
  9: {
    '3-3-2': [GK, S('RCB', '2', 24, 76, 'CB'), S('CB', '4', 20, 50, 'CB'), S('LCB', '3', 24, 24, 'CB'),
      S('RM', '7', 54, 80, 'W'), S('CM', '6', 48, 50, 'DM'), S('LM', '11', 54, 20, 'W'), S('RS', '9', 80, 62, 'ST'), S('LS', '10', 80, 38, 'ST')],
    '3-2-3': [GK, S('RCB', '2', 24, 76, 'CB'), S('CB', '4', 20, 50, 'CB'), S('LCB', '3', 24, 24, 'CB'),
      S('RDM', '6', 46, 62, 'DM'), S('LDM', '8', 46, 38, 'CM'), S('RW', '7', 76, 84, 'W'), S('ST', '9', 82, 50, 'ST'), S('LW', '11', 76, 16, 'W')],
  },
  8: {
    '3-3-1': [GK, S('RCB', '2', 24, 76, 'CB'), S('CB', '4', 20, 50, 'CB'), S('LCB', '3', 24, 24, 'CB'),
      S('RM', '7', 54, 80, 'W'), S('CM', '6', 50, 50, 'DM'), S('LM', '11', 54, 20, 'W'), S('ST', '9', 82, 50, 'ST')],
    '2-3-2': [GK, S('RCB', '2', 24, 66, 'CB'), S('LCB', '3', 24, 34, 'CB'),
      S('RM', '7', 52, 82, 'W'), S('CM', '6', 46, 50, 'DM'), S('LM', '11', 52, 18, 'W'), S('RS', '9', 80, 62, 'ST'), S('LS', '10', 80, 38, 'ST')],
  },
  7: {
    '2-3-1': [GK, S('RCB', '2', 26, 68, 'CB'), S('LCB', '3', 26, 32, 'CB'), S('RM', '7', 56, 82, 'W'), S('CM', '6', 50, 50, 'DM'), S('LM', '11', 56, 18, 'W'), S('ST', '9', 82, 50, 'ST')],
    '3-2-1': [GK, S('RCB', '2', 26, 76, 'CB'), S('CB', '4', 22, 50, 'CB'), S('LCB', '3', 26, 24, 'CB'), S('RCM', '6', 54, 64, 'DM'), S('LCM', '8', 54, 36, 'CM'), S('ST', '9', 82, 50, 'ST')],
    '3-1-2': [GK, S('RCB', '2', 26, 76, 'CB'), S('CB', '4', 22, 50, 'CB'), S('LCB', '3', 26, 24, 'CB'), S('CM', '6', 50, 50, 'DM'), S('RS', '9', 80, 64, 'ST'), S('LS', '10', 80, 36, 'ST')],
  },
  5: {
    '1-2-1': [GK, S('CB', '4', 28, 50, 'CB'), S('RM', '7', 55, 78, 'W'), S('LM', '11', 55, 22, 'W'), S('ST', '9', 82, 50, 'ST')],
    '2-2': [GK, S('RD', '2', 30, 68, 'CB'), S('LD', '3', 30, 32, 'CB'), S('RA', '7', 70, 68, 'W'), S('LA', '9', 70, 32, 'ST')],
  },
}

export const DEFAULT_FORMATION: Record<number, string> = { 11: '4-3-3', 9: '3-2-3', 8: '3-3-1', 7: '2-3-1', 5: '1-2-1' }

export function formationSlots(format: number, formation: string): Slot[] {
  const f = FORMATIONS[format] || FORMATIONS[11]
  return f[formation] || f[DEFAULT_FORMATION[format]] || Object.values(f)[0]
}

export const POSITIONS = ['GK', 'CB', 'FB', 'DM', 'CM', 'AM', 'W', 'ST'] as const
