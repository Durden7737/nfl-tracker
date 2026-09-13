// ═══════════════════════════════════════════════════════════════════
// NFL BETS — SUPABASE CLIENT + CONSTANTS
// ═══════════════════════════════════════════════════════════════════
//
// SETUP (one-time, ~5 minutes):
//   1) Uses the FOOTBALL-BETTING Supabase project (dtmnpveiyvjotpotibdv).
//      Moved here 2026-09-13: the tennis-betting project wedged (DB unreachable
//      while the dashboard still said ACTIVE_HEALTHY) and took NFL down with it.
//   2) Open that project's SQL Editor and paste in nfl_setup.sql (in the
//      NFL folder). It creates the
//      nfl_bets / nfl_staged_bets tables and the calc view.
//   3) That's it — URL + key below are already filled in.
//
// Until the nfl_bets table exists, the tracker falls back to LOCAL-ONLY
// mode (data lives only in this browser, no iPhone↔Mac sync). The page
// still works for testing.
// ═══════════════════════════════════════════════════════════════════

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://dtmnpveiyvjotpotibdv.supabase.co'
const SUPABASE_KEY = 'sb_publishable_9IEe7t4ueVybhzyswyr-Xw_jijWSF8Q'

const isConfigured =
  SUPABASE_URL && SUPABASE_KEY &&
  !SUPABASE_URL.startsWith('YOUR_') &&
  !SUPABASE_KEY.startsWith('YOUR_')

export const SUPABASE_CONFIGURED = isConfigured

// Real client OR local-only shim — same interface either way.
export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : makeLocalShim()

// ── FORMATTERS ────────────────────────────────────────────────────
export function COP(value) {
  const n = Number(value) || 0
  return n.toLocaleString('es-CO', {
    style: 'currency', currency: 'COP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  })
}

export function PCT(value) {
  const n = Number(value) || 0
  const pct = Math.abs(n) <= 1 ? n * 100 : n
  return pct.toFixed(1) + '%'
}

// ── DROPDOWN CONSTANTS ────────────────────────────────────────────

/** Conference / competition family — drives the colored dot beside each bet. */
export const REGIONS = [
  'AFC',
  'NFC',
  'Interconference',
  'Playoffs',
  'College',
  'International',
  'Other',
]

/** Week / round labels covering the NFL season + playoffs + specials. */
export const MATCHDAYS = [
  'Regular Season',
  'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6',
  'Week 7', 'Week 8', 'Week 9', 'Week 10', 'Week 11', 'Week 12',
  'Week 13', 'Week 14', 'Week 15', 'Week 16', 'Week 17', 'Week 18',
  'Thursday Night Football',
  'Sunday Night Football',
  'Monday Night Football',
  'International Series',
  'Wild Card',
  'Divisional Round',
  'Conference Championship',
  'Super Bowl',
  'Pro Bowl Games',
  'Preseason W1', 'Preseason W2', 'Preseason W3',
  'Hall of Fame Game',
  'Bowl Game',
  'CFP First Round', 'CFP Quarterfinal', 'CFP Semifinal',
  'National Championship',
  'Conference Title Game',
  'Rivalry Week',
  'Other',
]

/** Bet markets — full american-football coverage (ML, spread, totals, halves/quarters, TD scorers, player props, futures, etc.). */
export const BET_TYPES = [
  'Moneyline',
  'Point Spread',
  'Alternate Spread',
  'Total Points (Over/Under)',
  'Alternate Total',
  'Team Total Points',
  '1st Half — Moneyline',
  '1st Half — Spread',
  '1st Half — Total',
  '2nd Half — Moneyline',
  '2nd Half — Spread',
  '2nd Half — Total',
  '1st Quarter — Moneyline/Spread/Total',
  'Quarter Betting (any quarter)',
  'First Team To Score',
  'Last Team To Score',
  'Race To 10/20 Points',
  'Winning Margin',
  'Both Teams To Score 20+',
  'Highest Scoring Half',
  'Overtime (Yes/No)',
  'Anytime Touchdown Scorer',
  'First Touchdown Scorer',
  'Last Touchdown Scorer',
  '2+ Touchdowns',
  'QB Passing Yards',
  'QB Passing TDs',
  'QB Completions / Attempts',
  'QB Interceptions Thrown',
  'QB Rushing Yards',
  'Rushing Yards',
  'Rushing Attempts',
  'Receiving Yards',
  'Receptions',
  'Rush + Rec Yards',
  'Longest Reception / Rush',
  'Kicking Points',
  'Field Goals Made',
  'Sacks',
  'Tackles + Assists',
  'Interceptions (defense)',
  'Defense / Special Teams TD',
  'Player Props',
  'Game Props',
  'Same Game Parlay',
  'Futures (Division/Conference/Super Bowl)',
  'Season Win Total',
  'Awards (MVP/OPOY/DPOY/ROY)',
  'Draft Specials',
  'Specials',
  'Live',
  'System',
  'Parlay',
  'Other',
  'Tracking (Win %)',
]

/** Competition categories. */
export const COMPETITION_TYPES = [
  'Regular Season',
  'Playoffs',
  'Preseason',
  'All-Star Event',
  'College Football',
  'International Series',
  'Other Pro League',
  'Other',
]

/**
 * Preloaded competitions for the autocomplete.
 * Each entry: [name, region, competition_type] — picking one auto-fills region + type.
 */
export const COMPETITIONS = [
  // ───── NFL SEASON ─────
  ['NFL Regular Season',              'Interconference', 'Regular Season'],
  ['NFL Regular Season (AFC)',        'AFC',             'Regular Season'],
  ['NFL Regular Season (NFC)',        'NFC',             'Regular Season'],
  ['NFL Preseason',                   'Other',           'Preseason'],
  ['NFL Hall of Fame Game',           'Other',           'Preseason'],
  ['NFL Kickoff Game',                'Interconference', 'Regular Season'],
  ['NFL Thanksgiving',                'Interconference', 'Regular Season'],
  ['NFL Christmas Games',             'Interconference', 'Regular Season'],

  // ───── PLAYOFFS ─────
  ['NFL Wild Card Round',             'Playoffs',        'Playoffs'],
  ['NFL Divisional Round',            'Playoffs',        'Playoffs'],
  ['AFC Championship Game',           'AFC',             'Playoffs'],
  ['NFC Championship Game',           'NFC',             'Playoffs'],
  ['Super Bowl',                      'Playoffs',        'Playoffs'],

  // ───── ALL-STAR ─────
  ['Pro Bowl Games',                  'Interconference', 'All-Star Event'],

  // ───── INTERNATIONAL SERIES ─────
  ['NFL London Games',                'International',   'International Series'],
  ['NFL Germany Games',               'International',   'International Series'],
  ['NFL Brazil Game',                 'International',   'International Series'],
  ['NFL Mexico Game',                 'International',   'International Series'],

  // ───── COLLEGE ─────
  ['NCAA Football (FBS)',             'College',         'College Football'],
  ['SEC',                             'College',         'College Football'],
  ['Big Ten',                         'College',         'College Football'],
  ['Big 12',                          'College',         'College Football'],
  ['ACC',                             'College',         'College Football'],
  ['Pac-12',                          'College',         'College Football'],
  ['College Football Playoff',        'College',         'College Football'],
  ['NCAA Bowl Games',                 'College',         'College Football'],

  // ───── OTHER PRO LEAGUES ─────
  ['UFL',                             'Other',           'Other Pro League'],
  ['CFL',                             'Other',           'Other Pro League'],
  ['Arena Football',                  'Other',           'Other Pro League'],
]

// ═══════════════════════════════════════════════════════════════════
// LOCAL-ONLY SHIM — used until Supabase is configured.
// Mimics just enough of the supabase-js API for this app: from(table)
// .select / .insert / .update / .delete / .eq / .order, returning
// { data, error } promises.
// ═══════════════════════════════════════════════════════════════════
function makeLocalShim() {
  const STORAGE_KEY = 'nfl_local_bets'
  const NEXT_ID_KEY = 'nfl_local_next_id'

  const load = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  }
  const save = (rows) => localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  const nextId = () => {
    const v = parseInt(localStorage.getItem(NEXT_ID_KEY) || '1', 10)
    localStorage.setItem(NEXT_ID_KEY, String(v + 1))
    return v
  }
  const compute = (b) => {
    const stake = Number(b.stake_cop) || 0
    const odds  = Number(b.odds) || 0
    const tracking = b.bet_type === 'Tracking (Win %)'
    const potential_cop = tracking ? 0 : stake * odds
    let pl_cop = null
    if (b.result === 1)      pl_cop = tracking ? 0 : (potential_cop - stake)
    else if (b.result === 0) pl_cop = tracking ? 0 : -stake
    return { ...b, potential_cop, pl_cop }
  }

  const from = (table) => {
    // We support nfl_bets (writes) and nfl_bets_with_calc (reads)
    const isViewName = (table === 'nfl_bets_with_calc')
    let _filterField = null
    let _filterValue = null
    let _orderField  = null
    let _orderAsc    = true

    const builder = {
      select() { return builder },
      eq(field, value) { _filterField = field; _filterValue = value; return builder },
      order(field, opts = {}) { _orderField = field; _orderAsc = !!opts.ascending; return builder },
      then(resolve) {
        let out = isViewName ? load().map(compute) : load()
        if (_filterField !== null) out = out.filter(r => r[_filterField] === _filterValue)
        if (_orderField) {
          out.sort((a, b) => {
            const av = a[_orderField], bv = b[_orderField]
            if (av === bv) return 0
            return (av > bv ? 1 : -1) * (_orderAsc ? 1 : -1)
          })
        }
        resolve({ data: out, error: null })
      },
      insert(payloads) {
        const cur = load()
        const items = Array.isArray(payloads) ? payloads : [payloads]
        items.forEach(p => cur.push({ id: nextId(), result: null, ...p }))
        save(cur)
        return Promise.resolve({ data: items, error: null })
      },
      update(patch) {
        return {
          eq(field, value) {
            const cur = load()
            const i = cur.findIndex(r => r[field] === value)
            if (i === -1) return Promise.resolve({ data: null, error: { message: 'Not found' } })
            cur[i] = { ...cur[i], ...patch }
            save(cur)
            return Promise.resolve({ data: cur[i], error: null })
          }
        }
      },
      delete() {
        return {
          eq(field, value) {
            const cur = load().filter(r => r[field] !== value)
            save(cur)
            return Promise.resolve({ data: null, error: null })
          }
        }
      },
    }
    return builder
  }

  return { from }
}
